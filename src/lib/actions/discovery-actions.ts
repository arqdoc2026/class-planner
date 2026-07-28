"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { requireInstitutionContext } from "../auth";
import { prisma } from "../prisma";

export type PlanFilters = {
  query?: string;
  status?: string;
  area?: string;
  subject?: string;
  grade?: string;
  authorId?: string;
  shared?: boolean;
  reviewRequired?: boolean;
  commentsPending?: boolean;
  campusId?: string;
  academicYearId?: string;
  academicPeriodId?: string;
  groupId?: string;
  coordinatorId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
};

export async function searchInstitutionPlans(filters: PlanFilters = {}) {
  const context = await requireInstitutionContext();
  const page = Math.max(1, Math.trunc(filters.page || 1));
  const pageSize = 20;
  const elevated = context.role === "INSTITUTION_ADMIN" || context.role === "COORDINATOR";
  const query = String(filters.query || "").trim().slice(0, 200);
  const and: Prisma.ClassPlanWhereInput[] = [];
  if (!elevated) and.push({ OR: [{ authorId: context.profile.id }, { collaborators: { some: { profileId: context.profile.id } } }] });
  if (query) and.push({ OR: [
    { unitTitle: { contains: query, mode: "insensitive" } },
    { subject: { contains: query, mode: "insensitive" } },
    { area: { contains: query, mode: "insensitive" } },
  ] });
  const where: Prisma.ClassPlanWhereInput = {
    institutionId: context.institutionId,
    deletedAt: null,
    ...(and.length ? { AND: and } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.area ? { area: filters.area } : {}),
    ...(filters.subject ? { subject: filters.subject } : {}),
    ...(filters.grade ? { grade: filters.grade } : {}),
    ...(filters.authorId ? { authorId: filters.authorId } : {}),
    ...(filters.shared ? { collaborators: { some: { profileId: context.profile.id } } } : {}),
    ...(filters.reviewRequired ? { status: { in: ["READY_FOR_REVIEW", "IN_REVIEW"] } } : {}),
    ...(filters.commentsPending ? { comments: { some: { resolvedAt: null, deletedAt: null } } } : {}),
    ...(filters.campusId ? { campusId: filters.campusId } : {}),
    ...(filters.academicYearId ? { academicYearId: filters.academicYearId } : {}),
    ...(filters.academicPeriodId ? { academicPeriodId: filters.academicPeriodId } : {}),
    ...(filters.groupId ? { courseGroupId: filters.groupId } : {}),
    ...(filters.coordinatorId ? { reviews: { some: { reviewerId: filters.coordinatorId } } } : {}),
    ...((filters.dateFrom || filters.dateTo) ? { classDate: {
      ...(filters.dateFrom ? { gte: new Date(`${filters.dateFrom}T00:00:00`) } : {}),
      ...(filters.dateTo ? { lte: new Date(`${filters.dateTo}T23:59:59`) } : {}),
    } } : {}),
  };
  const [plans, total, facets, savedFilters, campuses, years, grades, people] = await Promise.all([
    prisma.classPlan.findMany({
      where, include: { author: { select: { fullName: true } }, campus: true, academicYear: true, academicPeriod: true, courseGroup: true, _count: { select: { sessions: true, comments: true } } },
      orderBy: { updatedAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize,
    }),
    prisma.classPlan.count({ where }),
    prisma.classPlan.findMany({
      where: { institutionId: context.institutionId, deletedAt: null },
      select: { area: true, subject: true, grade: true },
      distinct: ["area", "subject", "grade"],
    }),
    prisma.savedFilter.findMany({ where: { institutionId: context.institutionId, profileId: context.profile.id }, orderBy: { createdAt: "desc" } }),
    prisma.campus.findMany({ where: { institutionId: context.institutionId, active: true }, orderBy: { name: "asc" } }),
    prisma.academicYear.findMany({ where: { institutionId: context.institutionId, active: true }, include: { periods: { orderBy: { sequence: "asc" } } }, orderBy: { startDate: "desc" } }),
    prisma.academicGrade.findMany({ where: { institutionId: context.institutionId, active: true }, include: { groups: { where: { active: true } } }, orderBy: [{ level: "asc" }, { name: "asc" }] }),
    prisma.institutionMembership.findMany({ where: { institutionId: context.institutionId, status: "ACTIVE", deletedAt: null }, include: { profile: { select: { id: true, fullName: true } } }, orderBy: { profile: { fullName: "asc" } } }),
  ]);
  return { plans, total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)), facets, savedFilters, campuses, years, grades, people, role: context.role };
}

export async function savePlanFilter(formData: FormData) {
  const context = await requireInstitutionContext();
  const name = String(formData.get("name") || "").trim().slice(0, 100);
  if (!name) return { success: false, error: "Escribe un nombre para el filtro." };
  const filters = {
    query: String(formData.get("query") || "").slice(0, 200),
    status: String(formData.get("status") || "").slice(0, 50),
    area: String(formData.get("area") || "").slice(0, 200),
    subject: String(formData.get("subject") || "").slice(0, 200),
    grade: String(formData.get("grade") || "").slice(0, 100),
    campusId: String(formData.get("campusId") || "").slice(0, 100),
    academicYearId: String(formData.get("academicYearId") || "").slice(0, 100),
    academicPeriodId: String(formData.get("academicPeriodId") || "").slice(0, 100),
    groupId: String(formData.get("groupId") || "").slice(0, 100),
    authorId: String(formData.get("authorId") || "").slice(0, 100),
    coordinatorId: String(formData.get("coordinatorId") || "").slice(0, 100),
    dateFrom: String(formData.get("dateFrom") || "").slice(0, 10),
    dateTo: String(formData.get("dateTo") || "").slice(0, 10),
    shared: formData.get("shared") === "true",
    reviewRequired: formData.get("reviewRequired") === "true",
    commentsPending: formData.get("commentsPending") === "true",
  };
  await prisma.savedFilter.upsert({
    where: { institutionId_profileId_name: { institutionId: context.institutionId, profileId: context.profile.id, name } },
    update: { filters },
    create: { institutionId: context.institutionId, profileId: context.profile.id, name, filters },
  });
  revalidatePath("/plans");
  return { success: true };
}

export async function getDashboardMetrics() {
  const context = await requireInstitutionContext();
  const base = { institutionId: context.institutionId, deletedAt: null };
  const own = context.role === "TEACHER" ? { authorId: context.profile.id } : {};
  const [total, drafts, review, changes, approved, unresolved, users, aiToday] = await Promise.all([
    prisma.classPlan.count({ where: { ...base, ...own } }),
    prisma.classPlan.count({ where: { ...base, ...own, status: { in: ["DRAFT", "IN_PROGRESS"] } } }),
    prisma.classPlan.count({ where: { ...base, ...own, status: { in: ["READY_FOR_REVIEW", "IN_REVIEW"] } } }),
    prisma.classPlan.count({ where: { ...base, ...own, status: "CHANGES_REQUESTED" } }),
    prisma.classPlan.count({ where: { ...base, ...own, status: "APPROVED" } }),
    prisma.planComment.count({ where: { plan: base, resolvedAt: null, deletedAt: null } }),
    prisma.institutionMembership.count({ where: { institutionId: context.institutionId, status: "ACTIVE", deletedAt: null } }),
    prisma.aiRequest.count({ where: { institutionId: context.institutionId, createdAt: { gte: new Date(Date.now() - 86_400_000) } } }),
  ]);
  return { context, metrics: { total, drafts, review, changes, approved, unresolved, users, aiToday } };
}

export async function getNotifications() {
  const context = await requireInstitutionContext();
  return prisma.notification.findMany({
    where: { institutionId: context.institutionId, profileId: context.profile.id },
    orderBy: { createdAt: "desc" }, take: 50,
  });
}

export async function markNotificationRead(id: string) {
  const context = await requireInstitutionContext();
  await prisma.notification.updateMany({
    where: { id, institutionId: context.institutionId, profileId: context.profile.id },
    data: { readAt: new Date() },
  });
  revalidatePath("/notifications");
}

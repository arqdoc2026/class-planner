"use server";

import { revalidatePath } from "next/cache";
import { requireInstitutionContext } from "../auth";
import { assertPermission } from "../authorization/permissions";
import { prisma } from "../prisma";

const text = (formData: FormData, key: string, max = 50_000) => String(formData.get(key) || "").trim().slice(0, max);

export async function getActivityBank() {
  const context = await requireInstitutionContext();
  return prisma.activityTemplate.findMany({ where: { institutionId: context.institutionId, active: true }, orderBy: { updatedAt: "desc" } });
}

export async function getEditableSessionsForActivityBank() {
  const context = await requireInstitutionContext();
  return prisma.session.findMany({
    where: {
      plan: {
        institutionId: context.institutionId,
        deletedAt: null,
        status: { in: ["DRAFT", "IN_PROGRESS", "CHANGES_REQUESTED", "CORRECTED"] },
        ...(context.role === "INSTITUTION_ADMIN" || context.role === "COORDINATOR"
          ? {}
          : { OR: [{ authorId: context.profile.id }, { collaborators: { some: { profileId: context.profile.id, role: "EDITOR" } } }] }),
      },
    },
    select: { id: true, sessionNumber: true, plan: { select: { id: true, unitTitle: true, grade: true } } },
    orderBy: [{ plan: { updatedAt: "desc" } }, { sessionNumber: "asc" }],
    take: 200,
  });
}

export async function createActivityTemplate(formData: FormData) {
  const context = await requireInstitutionContext();
  assertPermission(context.role, "plans.edit");
  const title = text(formData, "title", 1_000);
  const description = text(formData, "description");
  if (!title || !description) return { success: false, error: "Título y descripción son obligatorios." };
  await prisma.activityTemplate.create({
    data: {
      institutionId: context.institutionId, createdById: context.profile.id, title, description,
      classMoment: text(formData, "classMoment", 50) || "DEVELOPMENT",
      estimatedMinutes: Math.max(1, Math.min(1_440, Number(formData.get("estimatedMinutes")) || 1)),
      groupingType: text(formData, "groupingType", 100) || null,
      resources: text(formData, "resources") || null,
      pedagogicalPurpose: text(formData, "pedagogicalPurpose") || null,
      expectedEvidence: text(formData, "expectedEvidence") || null,
      assessmentStrategy: text(formData, "assessmentStrategy") || null,
      differentiationStrategy: text(formData, "differentiationStrategy") || null,
      ignatianElements: formData.getAll("ignatianElements").map(String),
    },
  });
  revalidatePath("/activities");
  return { success: true };
}

export async function addBankActivityToSession(templateId: string, formData: FormData) {
  const context = await requireInstitutionContext();
  assertPermission(context.role, "plans.edit");
  const sessionId = text(formData, "sessionId", 100);
  const [template, session] = await Promise.all([
    prisma.activityTemplate.findFirst({ where: { id: templateId, institutionId: context.institutionId, active: true } }),
    prisma.session.findFirst({
      where: {
        id: sessionId,
        plan: {
          institutionId: context.institutionId, deletedAt: null,
          ...(context.role === "INSTITUTION_ADMIN" || context.role === "COORDINATOR"
            ? {}
            : { OR: [{ authorId: context.profile.id }, { collaborators: { some: { profileId: context.profile.id, role: "EDITOR" } } }] }),
        },
      },
      include: { _count: { select: { activities: true } } },
    }),
  ]);
  if (!template || !session) return { success: false, error: "Actividad o sesión no válida." };
  await prisma.activity.create({
    data: {
      sessionId, title: template.title, description: template.description, classMoment: template.classMoment,
      estimatedMinutes: template.estimatedMinutes, groupingType: template.groupingType, resources: template.resources,
      pedagogicalPurpose: template.pedagogicalPurpose, expectedEvidence: template.expectedEvidence,
      assessmentStrategy: template.assessmentStrategy, differentiationStrategy: template.differentiationStrategy,
      ignatianElements: template.ignatianElements, position: session._count.activities,
    },
  });
  revalidatePath("/activities");
  return { success: true };
}

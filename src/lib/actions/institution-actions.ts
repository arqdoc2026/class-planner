"use server";

import { revalidatePath } from "next/cache";
import { requireInstitutionContext, requireInstitutionRole } from "../auth";
import { prisma } from "../prisma";

function text(formData: FormData, key: string, max = 200) {
  return String(formData.get(key) || "").trim().slice(0, max);
}

export async function getInstitutionSettings() {
  const context = await requireInstitutionContext();
  const [campuses, areas, grades, years] = await Promise.all([
    prisma.campus.findMany({ where: { institutionId: context.institutionId }, orderBy: { name: "asc" } }),
    prisma.academicArea.findMany({
      where: { institutionId: context.institutionId },
      include: { subjects: { orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    }),
    prisma.academicGrade.findMany({
      where: { institutionId: context.institutionId },
      include: { groups: { orderBy: { name: "asc" } } },
      orderBy: [{ level: "asc" }, { name: "asc" }],
    }),
    prisma.academicYear.findMany({
      where: { institutionId: context.institutionId },
      include: { periods: { orderBy: { sequence: "asc" } } },
      orderBy: { startDate: "desc" },
    }),
  ]);
  return { institution: context.institution, campuses, areas, grades, years };
}

export async function createCampus(formData: FormData) {
  const context = await requireInstitutionRole(["INSTITUTION_ADMIN"]);
  const name = text(formData, "name");
  if (name.length < 2) return { success: false, error: "Escribe el nombre de la sede." };
  await prisma.campus.create({
    data: { institutionId: context.institutionId, name, code: text(formData, "code", 50) || null },
  });
  revalidatePath("/admin/institution");
  return { success: true };
}

export async function createArea(formData: FormData) {
  const context = await requireInstitutionRole(["INSTITUTION_ADMIN"]);
  const name = text(formData, "name");
  if (name.length < 2) return { success: false, error: "Escribe el nombre del área." };
  await prisma.academicArea.create({
    data: { institutionId: context.institutionId, name, code: text(formData, "code", 50) || null },
  });
  revalidatePath("/admin/institution");
  return { success: true };
}

export async function createSubject(formData: FormData) {
  const context = await requireInstitutionRole(["INSTITUTION_ADMIN"]);
  const name = text(formData, "name");
  const areaId = text(formData, "areaId", 100);
  const area = await prisma.academicArea.findFirst({ where: { id: areaId, institutionId: context.institutionId } });
  if (!area || name.length < 2) return { success: false, error: "Área o asignatura no válida." };
  await prisma.academicSubject.create({
    data: { institutionId: context.institutionId, areaId, name, code: text(formData, "code", 50) || null },
  });
  revalidatePath("/admin/institution");
  return { success: true };
}

export async function createGrade(formData: FormData) {
  const context = await requireInstitutionRole(["INSTITUTION_ADMIN"]);
  const name = text(formData, "name", 100);
  const levelValue = Number(formData.get("level"));
  if (!name) return { success: false, error: "Escribe el grado." };
  await prisma.academicGrade.create({
    data: { institutionId: context.institutionId, name, level: Number.isInteger(levelValue) ? levelValue : null },
  });
  revalidatePath("/admin/institution");
  return { success: true };
}

export async function createAcademicYear(formData: FormData) {
  const context = await requireInstitutionRole(["INSTITUTION_ADMIN"]);
  const name = text(formData, "name", 100);
  const startDate = new Date(text(formData, "startDate", 20));
  const endDate = new Date(text(formData, "endDate", 20));
  if (!name || Number.isNaN(startDate.valueOf()) || Number.isNaN(endDate.valueOf()) || startDate >= endDate) {
    return { success: false, error: "El año lectivo no es válido." };
  }
  await prisma.academicYear.create({ data: { institutionId: context.institutionId, name, startDate, endDate } });
  revalidatePath("/admin/institution");
  return { success: true };
}

export async function createCourseGroup(formData: FormData) {
  const context = await requireInstitutionRole(["INSTITUTION_ADMIN"]);
  const gradeId = text(formData, "gradeId", 100);
  const name = text(formData, "name", 100);
  const grade = await prisma.academicGrade.findFirst({ where: { id: gradeId, institutionId: context.institutionId } });
  if (!grade || !name) return { success: false, error: "Grado o grupo no válido." };
  await prisma.courseGroup.create({ data: { institutionId: context.institutionId, gradeId, name } });
  revalidatePath("/admin/institution");
  return { success: true };
}

export async function createAcademicPeriod(formData: FormData) {
  const context = await requireInstitutionRole(["INSTITUTION_ADMIN"]);
  const academicYearId = text(formData, "academicYearId", 100);
  const name = text(formData, "name", 100);
  const sequence = Number(formData.get("sequence"));
  const startDate = new Date(text(formData, "startDate", 20));
  const endDate = new Date(text(formData, "endDate", 20));
  const year = await prisma.academicYear.findFirst({ where: { id: academicYearId, institutionId: context.institutionId } });
  if (!year || !name || !Number.isInteger(sequence) || sequence < 1 || startDate >= endDate) return { success: false, error: "Periodo no válido." };
  await prisma.academicPeriod.create({ data: { academicYearId, name, sequence, startDate, endDate, periodType: text(formData, "periodType", 30) || "TRIMESTER" } });
  revalidatePath("/admin/institution");
  return { success: true };
}

export async function updateInstitutionAiSettings(formData: FormData) {
  const context = await requireInstitutionRole(["INSTITUTION_ADMIN"]);
  const current = (context.institution.settings as Record<string, unknown> | null) || {};
  const aiDailyLimit = Math.max(1, Math.min(10_000, Number(formData.get("aiDailyLimit")) || 200));
  const disabledRoles = formData.getAll("disabledRoles").map(String).filter((role) => ["COORDINATOR", "TEACHER", "VIEWER"].includes(role));
  await prisma.institution.update({ where: { id: context.institutionId }, data: { settings: { ...current, aiDailyLimit, aiDisabledRoles: disabledRoles } } });
  revalidatePath("/admin/institution");
  return { success: true };
}

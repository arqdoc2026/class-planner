"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { requireInstitutionContext } from "../auth";
import { assertPermission } from "../authorization/permissions";
import { prisma } from "../prisma";

export async function getInstitutionRubrics() {
  const context = await requireInstitutionContext();
  return prisma.rubric.findMany({ where: { institutionId: context.institutionId, deletedAt: null }, orderBy: { updatedAt: "desc" } });
}

export async function createStructuredRubric(formData: FormData) {
  const context = await requireInstitutionContext();
  assertPermission(context.role, "plans.edit");
  const name = String(formData.get("name") || "").trim().slice(0, 200);
  const criteria = String(formData.get("criteria") || "").split("\n").map((item) => item.trim()).filter(Boolean).slice(0, 50);
  const levels = String(formData.get("levels") || "").split("\n").map((item) => item.trim()).filter(Boolean).slice(0, 10);
  if (!name || !criteria.length || levels.length < 2) return { success: false, error: "Incluye nombre, criterios y al menos dos niveles." };
  const structure = {
    levels: levels.map((level, index) => ({ id: `level-${index + 1}`, name: level, score: null })),
    criteria: criteria.map((criterion, index) => ({
      id: `criterion-${index + 1}`, name: criterion, weight: null,
      descriptions: Object.fromEntries(levels.map((_, levelIndex) => [`level-${levelIndex + 1}`, ""])),
    })),
  };
  await prisma.rubric.create({ data: { institutionId: context.institutionId, name, structure, reusable: true } });
  revalidatePath("/rubrics");
  return { success: true };
}

export async function duplicateRubric(id: string) {
  const context = await requireInstitutionContext();
  const rubric = await prisma.rubric.findFirst({ where: { id, institutionId: context.institutionId, deletedAt: null } });
  if (!rubric) return { success: false, error: "Rúbrica no encontrada." };
  await prisma.rubric.create({ data: { institutionId: context.institutionId, name: `${rubric.name} — Copia`, description: rubric.description, structure: rubric.structure as Prisma.InputJsonValue, reusable: true } });
  revalidatePath("/rubrics");
  return { success: true };
}

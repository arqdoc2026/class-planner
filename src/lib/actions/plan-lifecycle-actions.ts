"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireInstitutionContext } from "../auth";
import { assertPermission } from "../authorization/permissions";
import { prisma } from "../prisma";

export async function duplicatePlan(planId: string, formData?: FormData) {
  const context = await requireInstitutionContext();
  assertPermission(context.role, "plans.create");
  const source = await prisma.classPlan.findFirst({
    where: {
      id: planId, institutionId: context.institutionId, deletedAt: null,
      ...(context.role === "INSTITUTION_ADMIN" || context.role === "COORDINATOR"
        ? {}
        : { OR: [{ authorId: context.profile.id }, { collaborators: { some: { profileId: context.profile.id } } }] }),
    },
    include: { sessions: { include: { activities: { orderBy: { position: "asc" } } }, orderBy: { sessionNumber: "asc" } } },
  });
  if (!source) return { success: false, error: "Planeación no encontrada." };
  const targetGrade = String(formData?.get("grade") || source.grade || "").trim().slice(0, 100);
  const copy = await prisma.classPlan.create({
    data: {
      institutionId: context.institutionId, authorId: context.profile.id,
      templateId: source.templateId, trimesterConfigId: source.trimesterConfigId,
      formatVersionId: source.formatVersionId, formatSnapshot: source.formatSnapshot || undefined,
      area: source.area, subject: source.subject, grade: targetGrade,
      unitTitle: `${source.unitTitle || "Planeación"} — Copia`,
      learningObjective: source.learningObjective, essentialQuestions: source.essentialQuestions,
      pblCompetence: source.pblCompetence, knowledge: source.knowledge, skills: source.skills,
      performanceTask: source.performanceTask, otherEvidences: source.otherEvidences,
      alignmentReflection: source.alignmentReflection, curricularAdjustments: source.curricularAdjustments,
      classEvaluation: source.classEvaluation, otherObservations: source.otherObservations,
      expectedResults: source.expectedResults || undefined, evaluationEvidence: source.evaluationEvidence || undefined,
      finalReflection: source.finalReflection || undefined,
      teacherName: context.profile.fullName, coordinatorName: source.coordinatorName, status: "DRAFT",
      sessions: {
        create: source.sessions.map((session) => ({
          sessionNumber: session.sessionNumber, plannedDate: null, durationMinutes: session.durationMinutes,
          status: "PLANNED", learningResults: session.learningResults, resources: session.resources,
          startActivity: session.startActivity, developmentActivity: session.developmentActivity,
          closingActivity: session.closingActivity, formativeAssessment: session.formativeAssessment,
          differentiation: session.differentiation, individualWork: session.individualWork, teamwork: session.teamwork,
          wholeClassInstruction: session.wholeClassInstruction, exchangeOfIdeas: session.exchangeOfIdeas,
          commitments: session.commitments, responsible: context.profile.fullName, observations: null,
          ignatianElements: session.ignatianElements, personalizationStrategies: session.personalizationStrategies,
          activities: { create: session.activities.map((activity) => ({
            title: activity.title, description: activity.description, classMoment: activity.classMoment,
            estimatedMinutes: activity.estimatedMinutes, groupingType: activity.groupingType, resources: activity.resources,
            pedagogicalPurpose: activity.pedagogicalPurpose, expectedEvidence: activity.expectedEvidence,
            assessmentStrategy: activity.assessmentStrategy, differentiationStrategy: activity.differentiationStrategy,
            ignatianElements: activity.ignatianElements, position: activity.position,
          })) },
        })),
      },
    },
  });
  await prisma.activityLog.create({
    data: { institutionId: context.institutionId, actorId: context.profile.id, action: "PLAN_DUPLICATED", entityType: "ClassPlan", entityId: copy.id, metadata: { sourcePlanId: planId } },
  });
  redirect(`/plans/${copy.id}/edit`);
}

export async function softDeletePlan(planId: string) {
  const context = await requireInstitutionContext();
  const plan = await prisma.classPlan.findFirst({ where: { id: planId, institutionId: context.institutionId, deletedAt: null } });
  if (!plan) return { success: false, error: "Planeación no encontrada." };
  if (context.role !== "INSTITUTION_ADMIN" && plan.authorId !== context.profile.id) return { success: false, error: "No tienes permiso." };
  await prisma.classPlan.update({ where: { id: planId }, data: { deletedAt: new Date() } });
  await prisma.activityLog.create({ data: { institutionId: context.institutionId, actorId: context.profile.id, action: "PLAN_SOFT_DELETED", entityType: "ClassPlan", entityId: planId } });
  revalidatePath("/plans");
  redirect("/plans");
}

export async function getDeletedPlans() {
  const context = await requireInstitutionContext();
  return prisma.classPlan.findMany({
    where: {
      institutionId: context.institutionId, deletedAt: { not: null },
      ...(context.role === "INSTITUTION_ADMIN" ? {} : { authorId: context.profile.id }),
    },
    orderBy: { deletedAt: "desc" },
  });
}

export async function restoreDeletedPlan(planId: string) {
  const context = await requireInstitutionContext();
  const result = await prisma.classPlan.updateMany({
    where: {
      id: planId, institutionId: context.institutionId, deletedAt: { not: null },
      ...(context.role === "INSTITUTION_ADMIN" ? {} : { authorId: context.profile.id }),
    },
    data: { deletedAt: null },
  });
  if (!result.count) return { success: false, error: "No se pudo restaurar." };
  await prisma.activityLog.create({ data: { institutionId: context.institutionId, actorId: context.profile.id, action: "PLAN_RESTORED", entityType: "ClassPlan", entityId: planId } });
  revalidatePath("/trash");
  revalidatePath("/plans");
  return { success: true };
}

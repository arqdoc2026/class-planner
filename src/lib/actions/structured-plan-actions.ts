"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireInstitutionContext } from "../auth";
import { assertPermission } from "../authorization/permissions";
import { DEFAULT_FORMAT_CONFIGURATION, EMPTY_STRUCTURED_CONTENT, type StructuredPlanContent } from "../institutional-format";
import { prisma } from "../prisma";

function clean(value: unknown, max = 50_000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanList(value: unknown) {
  return Array.isArray(value) ? value.map((item) => clean(item, 10_000)).filter(Boolean).slice(0, 100) : [];
}

export async function createStructuredPlan(formData: FormData) {
  const context = await requireInstitutionContext();
  assertPermission(context.role, "plans.create");
  const title = clean(formData.get("unitTitle"), 1_000);
  if (!title) return { success: false, error: "Escribe el título de la unidad." };
  const formatVersion = await prisma.institutionalTemplateVersion.findFirst({
    where: { institutionId: context.institutionId },
    orderBy: { effectiveFrom: "desc" },
  });
  const formatSnapshot = formatVersion
    ? { id: formatVersion.id, version: formatVersion.version, formatCode: formatVersion.formatCode, name: formatVersion.name, configuration: formatVersion.configuration }
    : { version: "01", formatCode: "MGF-03-R05", name: "Formato institucional", configuration: DEFAULT_FORMAT_CONFIGURATION };
  const catalogIds = {
    campusId: clean(formData.get("campusId"), 100) || null,
    academicAreaId: clean(formData.get("academicAreaId"), 100) || null,
    academicSubjectId: clean(formData.get("academicSubjectId"), 100) || null,
    academicGradeId: clean(formData.get("academicGradeId"), 100) || null,
    courseGroupId: clean(formData.get("courseGroupId"), 100) || null,
    academicYearId: clean(formData.get("academicYearId"), 100) || null,
    academicPeriodId: clean(formData.get("academicPeriodId"), 100) || null,
  };
  const [campus, area, subject, grade, group, year, period] = await Promise.all([
    catalogIds.campusId ? prisma.campus.findFirst({ where: { id: catalogIds.campusId, institutionId: context.institutionId } }) : null,
    catalogIds.academicAreaId ? prisma.academicArea.findFirst({ where: { id: catalogIds.academicAreaId, institutionId: context.institutionId } }) : null,
    catalogIds.academicSubjectId ? prisma.academicSubject.findFirst({ where: { id: catalogIds.academicSubjectId, institutionId: context.institutionId } }) : null,
    catalogIds.academicGradeId ? prisma.academicGrade.findFirst({ where: { id: catalogIds.academicGradeId, institutionId: context.institutionId } }) : null,
    catalogIds.courseGroupId ? prisma.courseGroup.findFirst({ where: { id: catalogIds.courseGroupId, institutionId: context.institutionId } }) : null,
    catalogIds.academicYearId ? prisma.academicYear.findFirst({ where: { id: catalogIds.academicYearId, institutionId: context.institutionId } }) : null,
    catalogIds.academicPeriodId ? prisma.academicPeriod.findFirst({ where: { id: catalogIds.academicPeriodId, academicYear: { institutionId: context.institutionId } } }) : null,
  ]);
  const plan = await prisma.classPlan.create({
    data: {
      institutionId: context.institutionId,
      authorId: context.profile.id,
      unitTitle: title,
      area: area?.name || "",
      subject: subject?.name || "",
      grade: grade?.name || "",
      campusId: campus?.id,
      academicAreaId: area?.id,
      academicSubjectId: subject?.id,
      academicGradeId: grade?.id,
      courseGroupId: group && grade && group.gradeId === grade.id ? group.id : null,
      academicYearId: year?.id,
      academicPeriodId: period && year && period.academicYearId === year.id ? period.id : null,
      teacherName: context.profile.fullName,
      status: "DRAFT",
      formatVersionId: formatVersion?.id,
      formatSnapshot,
      expectedResults: EMPTY_STRUCTURED_CONTENT.expectedResults,
      evaluationEvidence: EMPTY_STRUCTURED_CONTENT.evaluationEvidence,
      finalReflection: EMPTY_STRUCTURED_CONTENT.finalReflection,
      sessions: {
        create: { sessionNumber: 1, status: "PLANNED", ignatianElements: [], personalizationStrategies: [] },
      },
    },
  });
  await prisma.activityLog.create({
    data: { institutionId: context.institutionId, actorId: context.profile.id, action: "PLAN_CREATED", entityType: "ClassPlan", entityId: plan.id },
  });
  redirect(`/plans/${plan.id}/edit`);
}

export async function getStructuredPlan(planId: string) {
  const context = await requireInstitutionContext();
  const plan = await prisma.classPlan.findFirst({
    where: {
      id: planId, institutionId: context.institutionId, deletedAt: null,
      ...(context.role === "INSTITUTION_ADMIN" || context.role === "COORDINATOR"
        ? {}
        : { OR: [{ authorId: context.profile.id }, { collaborators: { some: { profileId: context.profile.id } } }] }),
    },
    include: { sessions: { include: { activities: { orderBy: { position: "asc" } } }, orderBy: { sessionNumber: "asc" } } },
  });
  if (!plan) throw new Error("PLAN_NOT_FOUND");
  return { context, plan };
}

export async function saveStructuredPlan(input: {
  id: string;
  versionNumber: number;
  unitTitle: string;
  area: string;
  subject: string;
  grade: string;
  content: StructuredPlanContent;
}) {
  const { context, plan } = await getStructuredPlan(input.id);
  assertPermission(context.role, "plans.edit");
  if (["READY_FOR_REVIEW", "IN_REVIEW", "APPROVED", "ARCHIVED"].includes(plan.status)) {
    return { success: false, error: "El estado actual no permite editar la planeación." };
  }
  if (plan.versionNumber !== input.versionNumber) {
    return { success: false, conflict: true, error: "Existe una versión más reciente. Recarga para conservar los cambios de la otra persona." };
  }
  const expected = input.content?.expectedResults || EMPTY_STRUCTURED_CONTENT.expectedResults;
  const evidence = input.content?.evaluationEvidence || EMPTY_STRUCTURED_CONTENT.evaluationEvidence;
  const reflection = input.content?.finalReflection || EMPTY_STRUCTURED_CONTENT.finalReflection;
  const sanitized = {
    expectedResults: {
      learningObjectives: cleanList(expected.learningObjectives),
      essentialQuestions: cleanList(expected.essentialQuestions),
      pblQuestions: cleanList(expected.pblQuestions),
      pblCompetence: clean(expected.pblCompetence),
      knowledge: cleanList(expected.knowledge),
      skills: cleanList(expected.skills),
      institutionalCompetencies: cleanList(expected.institutionalCompetencies),
      learningResults: cleanList(expected.learningResults),
      enduringUnderstandings: cleanList(expected.enduringUnderstandings),
      curricularStandards: cleanList(expected.curricularStandards),
      achievementIndicators: cleanList(expected.achievementIndicators),
    },
    evaluationEvidence: {
      performanceTask: clean(evidence.performanceTask),
      applicationScenario: clean(evidence.applicationScenario),
      otherEvidence: cleanList(evidence.otherEvidence),
      formativeAssessments: cleanList(evidence.formativeAssessments),
      summativeAssessments: cleanList(evidence.summativeAssessments),
      workSamples: cleanList(evidence.workSamples),
      observations: clean(evidence.observations),
      questionnaires: cleanList(evidence.questionnaires),
      tests: cleanList(evidence.tests),
      journals: cleanList(evidence.journals),
      assessmentCriteria: cleanList(evidence.assessmentCriteria),
      assessmentInstruments: cleanList(evidence.assessmentInstruments),
    },
    finalReflection: {
      alignment: clean(reflection.alignment),
      contentAdjustments: clean(reflection.contentAdjustments),
      instructionAdjustments: clean(reflection.instructionAdjustments),
      environmentAdjustments: clean(reflection.environmentAdjustments),
      diversityAttention: clean(reflection.diversityAttention),
      whatWorked: clean(reflection.whatWorked),
      whatDidNotWork: clean(reflection.whatDidNotWork),
      recommendedChanges: clean(reflection.recommendedChanges),
      otherObservations: clean(reflection.otherObservations),
      finalReflection: clean(reflection.finalReflection),
    },
  };
  const updated = await prisma.classPlan.update({
    where: { id: input.id },
    data: {
      unitTitle: clean(input.unitTitle, 1_000), area: clean(input.area, 500), subject: clean(input.subject, 500), grade: clean(input.grade, 100),
      expectedResults: sanitized.expectedResults,
      evaluationEvidence: sanitized.evaluationEvidence,
      finalReflection: sanitized.finalReflection,
      learningObjective: sanitized.expectedResults.learningObjectives.join("\n"),
      essentialQuestions: sanitized.expectedResults.essentialQuestions.join("\n"),
      pblCompetence: sanitized.expectedResults.pblCompetence,
      knowledge: sanitized.expectedResults.knowledge.join("\n"),
      skills: sanitized.expectedResults.skills.join("\n"),
      performanceTask: sanitized.evaluationEvidence.performanceTask,
      otherEvidences: sanitized.evaluationEvidence.otherEvidence.join("\n"),
      alignmentReflection: sanitized.finalReflection.alignment,
      curricularAdjustments: [sanitized.finalReflection.contentAdjustments, sanitized.finalReflection.instructionAdjustments, sanitized.finalReflection.environmentAdjustments].filter(Boolean).join("\n"),
      classEvaluation: [sanitized.finalReflection.whatWorked, sanitized.finalReflection.whatDidNotWork].filter(Boolean).join("\n"),
      otherObservations: sanitized.finalReflection.otherObservations,
      status: plan.status === "DRAFT" ? "IN_PROGRESS" : plan.status,
      versionNumber: { increment: 1 },
    },
    select: { id: true, versionNumber: true, updatedAt: true },
  });
  await prisma.activityLog.create({
    data: { institutionId: context.institutionId, actorId: context.profile.id, action: "STRUCTURED_PLAN_AUTOSAVED", entityType: "ClassPlan", entityId: input.id, metadata: { versionNumber: updated.versionNumber } },
  });
  revalidatePath(`/plans/${input.id}/edit`);
  revalidatePath("/dashboard");
  return { success: true, data: updated };
}

export type StructuredActivityInput = {
  id?: string;
  title: string;
  description: string;
  classMoment: string;
  estimatedMinutes: number | null;
  groupingType: string;
  resources: string;
  pedagogicalPurpose: string;
  expectedEvidence: string;
  assessmentStrategy: string;
  differentiationStrategy: string;
  ignatianElements: string[];
};

export type StructuredSessionInput = {
  id?: string;
  plannedDate: string;
  status: string;
  durationMinutes: number | null;
  learningResults: string;
  resources: string;
  observations: string;
  responsible: string;
  startActivity: string;
  developmentActivity: string;
  closingActivity: string;
  formativeAssessment: string;
  differentiation: string;
  individualWork: string;
  teamwork: string;
  wholeClassInstruction: string;
  exchangeOfIdeas: string;
  commitments: string;
  generatedEvidence: string;
  ignatianElements: string[];
  personalizationStrategies: string[];
  activities: StructuredActivityInput[];
};

export async function saveStructuredSessions(input: { planId: string; versionNumber: number; sessions: StructuredSessionInput[] }) {
  const { context, plan } = await getStructuredPlan(input.planId);
  assertPermission(context.role, "plans.edit");
  if (["READY_FOR_REVIEW", "IN_REVIEW", "APPROVED", "ARCHIVED"].includes(plan.status)) {
    return { success: false, error: "El estado actual no permite editar sesiones." };
  }
  if (plan.versionNumber !== input.versionNumber) {
    return { success: false, conflict: true, error: "Otra persona guardó una versión más reciente." };
  }
  if (!Array.isArray(input.sessions) || !input.sessions.length || input.sessions.length > 100) {
    return { success: false, error: "La planeación debe contener entre 1 y 100 sesiones." };
  }
  const existingIds = input.sessions.flatMap((session) => session.id && !session.id.startsWith("new-") ? [session.id] : []);
  if (existingIds.some((id) => !plan.sessions.some((session) => session.id === id))) {
    return { success: false, error: "Una sesión no pertenece a esta planeación." };
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.session.deleteMany({ where: { planId: input.planId, ...(existingIds.length ? { id: { notIn: existingIds } } : {}) } });
    await tx.session.updateMany({ where: { planId: input.planId }, data: { sessionNumber: { increment: 1000 } } });
    for (const [index, session] of input.sessions.entries()) {
      const sessionData = {
        sessionNumber: index + 1,
        plannedDate: session.plannedDate ? new Date(`${session.plannedDate}T12:00:00`) : null,
        status: clean(session.status, 50) || "PLANNED",
        durationMinutes: session.durationMinutes && session.durationMinutes > 0 ? Math.min(session.durationMinutes, 1_440) : null,
        learningResults: clean(session.learningResults),
        resources: clean(session.resources),
        observations: clean(session.observations),
        responsible: clean(session.responsible, 500),
        startActivity: clean(session.startActivity),
        developmentActivity: clean(session.developmentActivity),
        closingActivity: clean(session.closingActivity),
        formativeAssessment: clean(session.formativeAssessment),
        differentiation: clean(session.differentiation),
        individualWork: clean(session.individualWork),
        teamwork: clean(session.teamwork),
        wholeClassInstruction: clean(session.wholeClassInstruction),
        exchangeOfIdeas: clean(session.exchangeOfIdeas),
        commitments: clean(session.commitments),
        generatedEvidence: clean(session.generatedEvidence),
        ignatianElements: cleanList(session.ignatianElements),
        personalizationStrategies: cleanList(session.personalizationStrategies),
      };
      const saved = session.id && !session.id.startsWith("new-")
        ? await tx.session.update({ where: { id: session.id }, data: sessionData })
        : await tx.session.create({ data: { ...sessionData, planId: input.planId } });
      await tx.activity.deleteMany({ where: { sessionId: saved.id } });
      const activities = session.activities.slice(0, 100).map((activity, position) => ({
        sessionId: saved.id,
        title: clean(activity.title, 1_000) || `Actividad ${position + 1}`,
        description: clean(activity.description),
        classMoment: clean(activity.classMoment, 50) || "DEVELOPMENT",
        estimatedMinutes: activity.estimatedMinutes && activity.estimatedMinutes > 0 ? Math.min(activity.estimatedMinutes, 1_440) : null,
        groupingType: clean(activity.groupingType, 100) || null,
        resources: clean(activity.resources) || null,
        pedagogicalPurpose: clean(activity.pedagogicalPurpose) || null,
        expectedEvidence: clean(activity.expectedEvidence) || null,
        assessmentStrategy: clean(activity.assessmentStrategy) || null,
        differentiationStrategy: clean(activity.differentiationStrategy) || null,
        ignatianElements: cleanList(activity.ignatianElements),
        position,
      }));
      if (activities.length) await tx.activity.createMany({ data: activities });
    }
    const updated = await tx.classPlan.update({
      where: { id: input.planId },
      data: { versionNumber: { increment: 1 }, status: plan.status === "DRAFT" ? "IN_PROGRESS" : plan.status },
      select: { versionNumber: true, updatedAt: true },
    });
    await tx.activityLog.create({
      data: {
        institutionId: context.institutionId, actorId: context.profile.id,
        action: "PLAN_SESSIONS_AUTOSAVED", entityType: "ClassPlan", entityId: input.planId,
        metadata: { versionNumber: updated.versionNumber, sessionCount: input.sessions.length },
      },
    });
    return updated;
  });
  revalidatePath(`/plans/${input.planId}/edit`);
  revalidatePath("/dashboard");
  return { success: true, data: result };
}

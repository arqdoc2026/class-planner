"use server";

import { revalidatePath } from "next/cache";
import { requireInstitutionContext } from "../auth";
import { assertPermission } from "../authorization/permissions";
import { canTransitionPlan, validateReviewReadiness } from "../plan-workflow";
import { prisma } from "../prisma";

async function accessiblePlan(planId: string) {
  const context = await requireInstitutionContext();
  const plan = await prisma.classPlan.findFirst({
    where: {
      id: planId,
      institutionId: context.institutionId,
      deletedAt: null,
      ...(context.role === "INSTITUTION_ADMIN" || context.role === "COORDINATOR"
        ? {}
        : { OR: [{ authorId: context.profile.id }, { collaborators: { some: { profileId: context.profile.id } } }] }),
    },
    include: {
      sessions: { orderBy: { sessionNumber: "asc" } },
      comments: { where: { deletedAt: null }, include: { author: true }, orderBy: { createdAt: "asc" } },
      collaborators: { include: { profile: true } },
      reviews: { include: { reviewer: true }, orderBy: { createdAt: "desc" } },
      approvals: { include: { approver: true }, orderBy: { approvedAt: "desc" } },
      versions: { orderBy: { versionNumber: "desc" } },
      attachments: { where: { deletedAt: null }, include: { uploader: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!plan) throw new Error("PLAN_NOT_FOUND");
  return { context, plan };
}

export async function getPlanReview(planId: string) {
  const result = await accessiblePlan(planId);
  const members = await prisma.institutionMembership.findMany({
    where: { institutionId: result.context.institutionId, status: "ACTIVE", deletedAt: null },
    include: { profile: true },
    orderBy: { profile: { fullName: "asc" } },
  });
  return { ...result, members: members.map((item) => ({ id: item.profile.id, name: item.profile.fullName, role: item.role })) };
}

export async function submitPlanForReview(planId: string) {
  const { context, plan } = await accessiblePlan(planId);
  assertPermission(context.role, "plans.edit");
  if (plan.authorId !== context.profile.id && !plan.collaborators.some((item) => item.profileId === context.profile.id && item.role === "EDITOR")) {
    return { success: false, error: "Solo un autor o colaborador editor puede enviar la planeación." };
  }
  const formatSnapshot = plan.formatSnapshot as { configuration?: { requiredFields?: string[] } } | null;
  const pending = validateReviewReadiness(plan, formatSnapshot?.configuration?.requiredFields);
  if (pending.length) return { success: false, error: `Completa antes de enviar: ${pending.slice(0, 5).join(", ")}.`, pending };
  if (!canTransitionPlan(plan.status, "READY_FOR_REVIEW")) return { success: false, error: "La planeación no se puede enviar desde su estado actual." };

  await prisma.$transaction(async (tx) => {
    const versionNumber = plan.versionNumber;
    await tx.planVersion.upsert({
      where: { planId_versionNumber: { planId, versionNumber } },
      update: { snapshot: JSON.parse(JSON.stringify(plan)), reason: "Envío a revisión", createdById: context.profile.id },
      create: {
        planId, institutionId: context.institutionId, versionNumber,
        snapshot: JSON.parse(JSON.stringify(plan)), reason: "Envío a revisión", createdById: context.profile.id,
      },
    });
    await tx.classPlan.update({ where: { id: planId }, data: { status: "READY_FOR_REVIEW" } });
    await tx.activityLog.create({
      data: { institutionId: context.institutionId, actorId: context.profile.id, action: "PLAN_SUBMITTED", entityType: "ClassPlan", entityId: planId, metadata: { versionNumber } },
    });
  });
  revalidatePath("/dashboard");
  revalidatePath(`/plans/${planId}/review`);
  return { success: true };
}

export async function startPlanReview(planId: string) {
  const { context, plan } = await accessiblePlan(planId);
  assertPermission(context.role, "plans.review");
  if (!canTransitionPlan(plan.status, "IN_REVIEW")) return { success: false, error: "La planeación no está lista para revisión." };
  await prisma.$transaction([
    prisma.classPlan.update({ where: { id: planId }, data: { status: "IN_REVIEW" } }),
    prisma.planReview.create({ data: { planId, reviewerId: context.profile.id, versionNumber: plan.versionNumber } }),
    prisma.activityLog.create({ data: { institutionId: context.institutionId, actorId: context.profile.id, action: "REVIEW_STARTED", entityType: "ClassPlan", entityId: planId } }),
  ]);
  revalidatePath(`/plans/${planId}/review`);
  return { success: true };
}

export async function decidePlanReview(planId: string, decision: "CHANGES_REQUESTED" | "APPROVED", observations: string) {
  const { context, plan } = await accessiblePlan(planId);
  assertPermission(context.role, decision === "APPROVED" ? "plans.approve" : "plans.review");
  if (!canTransitionPlan(plan.status, decision)) return { success: false, error: "La decisión no es válida para el estado actual." };
  const note = observations.trim().slice(0, 20_000);
  if (decision === "CHANGES_REQUESTED" && !note) return { success: false, error: "Describe los cambios solicitados." };

  await prisma.$transaction(async (tx) => {
    await tx.classPlan.update({
      where: { id: planId },
      data: { status: decision, ...(decision === "APPROVED" ? { approvalDate: new Date() } : {}) },
    });
    await tx.planReview.updateMany({
      where: { planId, decision: "PENDING" },
      data: { decision, observations: note || null, decidedAt: new Date() },
    });
    if (decision === "APPROVED") {
      await tx.planApproval.create({
        data: { planId, approverId: context.profile.id, versionNumber: plan.versionNumber, observations: note || null },
      });
    }
    await tx.activityLog.create({
      data: { institutionId: context.institutionId, actorId: context.profile.id, action: decision, entityType: "ClassPlan", entityId: planId, metadata: { versionNumber: plan.versionNumber, observations: note } },
    });
    if (plan.authorId) {
      await tx.notification.create({
        data: {
          institutionId: context.institutionId, profileId: plan.authorId,
          type: decision, title: decision === "APPROVED" ? "Planeación aprobada" : "Cambios solicitados",
          body: note || null, entityType: "ClassPlan", entityId: planId,
        },
      });
    }
  });
  revalidatePath("/dashboard");
  revalidatePath(`/plans/${planId}/review`);
  return { success: true };
}

export async function addPlanComment(planId: string, formData: FormData) {
  const { context } = await accessiblePlan(planId);
  const body = String(formData.get("body") || "").trim().slice(0, 20_000);
  const sectionKey = String(formData.get("sectionKey") || "").trim().slice(0, 200) || null;
  if (!body) return { success: false, error: "Escribe un comentario." };
  const comment = await prisma.planComment.create({ data: { planId, authorId: context.profile.id, body, sectionKey } });
  const usernames = Array.from(new Set(Array.from(body.matchAll(/@([a-z0-9._-]{3,30})/gi), (match) => match[1].toLowerCase())));
  const mentioned = usernames.length ? await prisma.institutionMembership.findMany({
    where: {
      institutionId: context.institutionId, status: "ACTIVE", deletedAt: null,
      profile: { username: { in: usernames } },
    },
    include: { profile: true },
  }) : [];
  await prisma.$transaction([
    prisma.activityLog.create({
      data: { institutionId: context.institutionId, actorId: context.profile.id, action: "COMMENT_CREATED", entityType: "ClassPlan", entityId: planId, metadata: { sectionKey, mentionedProfileIds: mentioned.map((item) => item.profileId) } },
    }),
    ...mentioned.filter((item) => item.profileId !== context.profile.id).map((item) => prisma.notification.create({
      data: {
        institutionId: context.institutionId, profileId: item.profileId, type: "COMMENT_MENTION",
        title: `${context.profile.fullName} te mencionó`, body: body.slice(0, 500),
        entityType: "PlanComment", entityId: comment.id,
      },
    })),
  ]);
  revalidatePath(`/plans/${planId}/review`);
  return { success: true };
}

export async function resolvePlanComment(commentId: string) {
  const context = await requireInstitutionContext();
  const comment = await prisma.planComment.findFirst({
    where: { id: commentId, plan: { institutionId: context.institutionId } },
    include: { plan: true },
  });
  if (!comment) return { success: false, error: "Comentario no encontrado." };
  const elevated = context.role === "INSTITUTION_ADMIN" || context.role === "COORDINATOR";
  if (!elevated && comment.authorId !== context.profile.id && comment.plan.authorId !== context.profile.id) {
    return { success: false, error: "No tienes permiso para resolverlo." };
  }
  await prisma.$transaction([
    prisma.planComment.update({ where: { id: commentId }, data: { resolvedAt: new Date() } }),
    prisma.activityLog.create({
      data: {
        institutionId: context.institutionId, actorId: context.profile.id,
        action: "COMMENT_RESOLVED", entityType: "PlanComment", entityId: commentId,
        metadata: { planId: comment.planId },
      },
    }),
    ...(comment.authorId !== context.profile.id ? [prisma.notification.create({
      data: {
        institutionId: context.institutionId, profileId: comment.authorId, type: "COMMENT_RESOLVED",
        title: "Tu comentario fue resuelto", body: comment.body.slice(0, 500),
        entityType: "ClassPlan", entityId: comment.planId,
      },
    })] : []),
  ]);
  revalidatePath(`/plans/${comment.planId}/review`);
  return { success: true };
}

export async function addPlanCollaborator(planId: string, formData: FormData) {
  const { context, plan } = await accessiblePlan(planId);
  const canManage = context.role === "INSTITUTION_ADMIN" || context.role === "COORDINATOR" || plan.authorId === context.profile.id;
  if (!canManage) return { success: false, error: "No tienes permiso para administrar colaboradores." };
  const profileId = String(formData.get("profileId") || "");
  const role = ["EDITOR", "REVIEWER", "VIEWER"].includes(String(formData.get("role"))) ? String(formData.get("role")) : "EDITOR";
  const membership = await prisma.institutionMembership.findFirst({
    where: { institutionId: context.institutionId, profileId, status: "ACTIVE", deletedAt: null },
  });
  if (!membership || profileId === plan.authorId) return { success: false, error: "El miembro no es válido." };
  await prisma.$transaction([
    prisma.planCollaborator.upsert({
      where: { planId_profileId: { planId, profileId } },
      update: { role },
      create: { planId, profileId, role },
    }),
    prisma.notification.create({
      data: {
        institutionId: context.institutionId, profileId, type: "PLAN_COLLABORATOR_ASSIGNED",
        title: "Te asignaron a una planeación", body: plan.unitTitle || "Planeación institucional",
        entityType: "ClassPlan", entityId: planId,
      },
    }),
    prisma.activityLog.create({
      data: {
        institutionId: context.institutionId, actorId: context.profile.id,
        action: "COLLABORATOR_ASSIGNED", entityType: "ClassPlan", entityId: planId,
        metadata: { profileId, role },
      },
    }),
  ]);
  revalidatePath(`/plans/${planId}/review`);
  return { success: true };
}

export async function removePlanCollaborator(planId: string, profileId: string) {
  const { context, plan } = await accessiblePlan(planId);
  const canManage = context.role === "INSTITUTION_ADMIN" || context.role === "COORDINATOR" || plan.authorId === context.profile.id;
  if (!canManage) return { success: false, error: "No tienes permiso para administrar colaboradores." };
  await prisma.planCollaborator.deleteMany({ where: { planId, profileId } });
  await prisma.activityLog.create({
    data: {
      institutionId: context.institutionId, actorId: context.profile.id,
      action: "COLLABORATOR_REMOVED", entityType: "ClassPlan", entityId: planId, metadata: { profileId },
    },
  });
  revalidatePath(`/plans/${planId}/review`);
  return { success: true };
}

export async function restorePlanVersion(planId: string, versionNumber: number) {
  const { context, plan } = await accessiblePlan(planId);
  assertPermission(context.role, "plans.edit");
  if (["APPROVED", "ARCHIVED"].includes(plan.status)) return { success: false, error: "Crea una nueva versión antes de modificar una planeación aprobada." };
  const version = await prisma.planVersion.findFirst({
    where: { planId, institutionId: context.institutionId, versionNumber },
  });
  if (!version) return { success: false, error: "La versión no existe." };
  const snapshot = version.snapshot as Record<string, unknown>;
  const allowed = {
    area: typeof snapshot.area === "string" ? snapshot.area : null,
    subject: typeof snapshot.subject === "string" ? snapshot.subject : null,
    grade: typeof snapshot.grade === "string" ? snapshot.grade : null,
    unitTitle: typeof snapshot.unitTitle === "string" ? snapshot.unitTitle : null,
    learningObjective: typeof snapshot.learningObjective === "string" ? snapshot.learningObjective : null,
    essentialQuestions: typeof snapshot.essentialQuestions === "string" ? snapshot.essentialQuestions : null,
    pblCompetence: typeof snapshot.pblCompetence === "string" ? snapshot.pblCompetence : null,
    knowledge: typeof snapshot.knowledge === "string" ? snapshot.knowledge : null,
    skills: typeof snapshot.skills === "string" ? snapshot.skills : null,
    performanceTask: typeof snapshot.performanceTask === "string" ? snapshot.performanceTask : null,
    otherEvidences: typeof snapshot.otherEvidences === "string" ? snapshot.otherEvidences : null,
    expectedResults: snapshot.expectedResults ?? undefined,
    evaluationEvidence: snapshot.evaluationEvidence ?? undefined,
    finalReflection: snapshot.finalReflection ?? undefined,
  };
  const updated = await prisma.classPlan.update({
    where: { id: planId },
    data: { ...allowed, versionNumber: { increment: 1 }, status: "DRAFT" },
  });
  await prisma.activityLog.create({
    data: {
      institutionId: context.institutionId, actorId: context.profile.id,
      action: "PLAN_VERSION_RESTORED", entityType: "ClassPlan", entityId: planId,
      metadata: { restoredVersion: versionNumber, newVersion: updated.versionNumber },
    },
  });
  revalidatePath(`/plans/${planId}/review`);
  revalidatePath(`/plans/${planId}/edit`);
  return { success: true };
}

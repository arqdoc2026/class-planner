// Ruta: src/lib/actions/dashboard-actions.ts
"use server";

import { prisma } from "../prisma";
import { revalidatePath } from "next/cache";
import type { EditablePlanInput, EditableSession } from "../types/planner";
import { requireInstitutionContext } from "../auth";
import { assertPermission } from "../authorization/permissions";

const MAX_TEXT_LENGTH = 50_000;

function cleanText(value: unknown, maxLength = MAX_TEXT_LENGTH) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function cleanSession(session: EditableSession, index: number) {
  return {
    id: typeof session.id === "string" && !session.id.startsWith("new-") ? session.id : undefined,
    sessionNumber: index + 1,
    learningResults: cleanText(session.learningResults),
    resources: cleanText(session.resources),
    startActivity: cleanText(session.startActivity),
    developmentActivity: cleanText(session.developmentActivity),
    closingActivity: cleanText(session.closingActivity),
  };
}

export async function getDashboardPlans() {
  try {
    const context = await requireInstitutionContext();
    assertPermission(context.role, "plans.read");
    const plans = await prisma.classPlan.findMany({
      where: {
        institutionId: context.institutionId,
        deletedAt: null,
        ...(context.role === "INSTITUTION_ADMIN" || context.role === "COORDINATOR"
          ? {}
          : {
              OR: [
                { authorId: context.profile.id },
                { collaborators: { some: { profileId: context.profile.id } } },
              ],
            }),
      },
      include: {
        sessions: {
          orderBy: { sessionNumber: 'asc' } // Ordenamos las sesiones de la 1 a la X
        }
      },
      orderBy: { createdAt: 'desc' } // Mostramos los planes más recientes primero
    });

    return { success: true, data: plans };
  } catch (error) {
    console.error("Error cargando el dashboard:", error);
    return { success: false, error: "No se pudieron cargar las clases." };
  }
}

export async function updateClassPlan(input: EditablePlanInput) {
  try {
    const context = await requireInstitutionContext();
    assertPermission(context.role, "plans.edit");
    if (!input || typeof input.id !== "string") {
      return { success: false, error: "La planeación no es válida." };
    }

    if (!Array.isArray(input.sessions) || input.sessions.length === 0) {
      return { success: false, error: "La planeación debe tener al menos una sesión." };
    }

    if (input.sessions.length > 100) {
      return { success: false, error: "Una planeación no puede superar 100 sesiones." };
    }

    const sessions = input.sessions.map(cleanSession);
    const existingIds = sessions.flatMap((session) => session.id ? [session.id] : []);

    const updatedPlan = await prisma.$transaction(async (tx) => {
      const plan = await tx.classPlan.findUnique({
        where: { id: input.id },
        select: { id: true, authorId: true, institutionId: true, versionNumber: true, status: true },
      });

      if (!plan) throw new Error("PLAN_NOT_FOUND");
      if (plan.institutionId !== context.institutionId) throw new Error("FORBIDDEN");
      if (!Number.isInteger(input.versionNumber) || input.versionNumber !== plan.versionNumber) throw new Error("VERSION_CONFLICT");
      const elevated = context.role === "INSTITUTION_ADMIN" || context.role === "COORDINATOR";
      if (!elevated && plan.authorId !== context.profile.id) {
        const collaborator = await tx.planCollaborator.findUnique({
          where: { planId_profileId: { planId: input.id, profileId: context.profile.id } },
        });
        if (collaborator?.role !== "EDITOR") throw new Error("FORBIDDEN");
      }
      if (plan.status === "APPROVED" || plan.status === "ARCHIVED") throw new Error("PLAN_LOCKED");

      const ownedSessions = existingIds.length === 0 ? [] : await tx.session.findMany({
        where: { id: { in: existingIds }, planId: input.id },
        select: { id: true },
      });

      if (ownedSessions.length !== existingIds.length) {
        throw new Error("INVALID_SESSION");
      }

      await tx.session.deleteMany({
        where: {
          planId: input.id,
          ...(existingIds.length > 0 ? { id: { notIn: existingIds } } : {}),
        },
      });

      // Libera temporalmente los números para permitir reordenar sin colisiones.
      await tx.session.updateMany({
        where: { planId: input.id },
        data: { sessionNumber: { increment: 1000 } },
      });

      for (const session of sessions) {
        const data = {
          sessionNumber: session.sessionNumber,
          learningResults: session.learningResults,
          resources: session.resources,
          startActivity: session.startActivity,
          developmentActivity: session.developmentActivity,
          closingActivity: session.closingActivity,
        };

        if (session.id) {
          await tx.session.update({ where: { id: session.id }, data });
        } else {
          await tx.session.create({ data: { ...data, planId: input.id } });
        }
      }

      const snapshot = await tx.classPlan.findUnique({
        where: { id: input.id },
        include: { sessions: { orderBy: { sessionNumber: "asc" } } },
      });
      if (snapshot) {
        await tx.planVersion.create({
          data: {
            planId: input.id,
            institutionId: context.institutionId,
            versionNumber: plan.versionNumber,
            snapshot: JSON.parse(JSON.stringify(snapshot)),
            reason: "Guardado del editor",
            createdById: context.profile.id,
          },
        });
      }

      const result = await tx.classPlan.update({
        where: { id: input.id },
        data: {
          area: cleanText(input.area, 500),
          subject: cleanText(input.subject, 500),
          grade: cleanText(input.grade, 100),
          unitTitle: cleanText(input.unitTitle, 1_000),
          learningObjective: cleanText(input.learningObjective),
          essentialQuestions: cleanText(input.essentialQuestions),
          pblCompetence: cleanText(input.pblCompetence),
          knowledge: cleanText(input.knowledge),
          skills: cleanText(input.skills),
          performanceTask: cleanText(input.performanceTask),
          otherEvidences: cleanText(input.otherEvidences),
          alignmentReflection: cleanText(input.alignmentReflection),
          curricularAdjustments: cleanText(input.curricularAdjustments),
          classEvaluation: cleanText(input.classEvaluation),
          otherObservations: cleanText(input.otherObservations),
          teacherName: cleanText(input.teacherName, 500),
          coordinatorName: cleanText(input.coordinatorName, 500),
          completedSessions: Math.min(
            sessions.length,
            Math.max(0, Number.isFinite(input.completedSessions) ? Math.trunc(input.completedSessions) : 0),
          ),
          status: ["DRAFT", "IN_PROGRESS", "CHANGES_REQUESTED", "CORRECTED"].includes(input.status) ? input.status : "DRAFT",
          versionNumber: { increment: 1 },
        },
        include: { sessions: { orderBy: { sessionNumber: "asc" } } },
      });
      await tx.activityLog.create({
        data: {
          institutionId: context.institutionId,
          actorId: context.profile.id,
          action: "PLAN_UPDATED",
          entityType: "ClassPlan",
          entityId: input.id,
          metadata: { versionNumber: result.versionNumber },
        },
      });
      return result;
    });

    revalidatePath("/dashboard");
    return { success: true, data: updatedPlan };
  } catch (error) {
    console.error("Error actualizando la planeación:", error);
    if (error instanceof Error && error.message === "PLAN_NOT_FOUND") {
      return { success: false, error: "La planeación ya no existe." };
    }
    if (error instanceof Error && error.message === "INVALID_SESSION") {
      return { success: false, error: "Una de las sesiones no pertenece a esta planeación." };
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return { success: false, error: "No tienes permiso para editar esta planeación." };
    }
    if (error instanceof Error && error.message === "PLAN_LOCKED") {
      return { success: false, error: "Una planeación aprobada o archivada no se puede editar directamente." };
    }
    if (error instanceof Error && error.message === "VERSION_CONFLICT") {
      return { success: false, error: "Otra persona modificó esta planeación. Recarga antes de continuar para evitar sobrescribir cambios." };
    }
    return { success: false, error: "No se pudieron guardar los cambios." };
  }
}

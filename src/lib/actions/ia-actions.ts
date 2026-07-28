"use server";

import { GoogleGenAI } from "@google/genai";
import { revalidatePath } from "next/cache";
import { assertInstitutionAiEnabled, assertPermission } from "../authorization/permissions";
import { requireInstitutionContext } from "../auth";
import { generateTrimesterSchedule } from "../planner-logic";
import { prisma } from "../prisma";

type GeneratedSession = {
  learningResults: string;
  startActivity: string;
  developmentActivity: string;
  closingActivity: string;
};

type GeneratedPlan = {
  unitTitle: string;
  grade: string;
  learningObjective: string;
  essentialQuestions: string;
  classDate: string;
  sessions: Array<GeneratedSession & { sessionNumber: number; plannedDate: string }>;
};

function text(value: unknown, max = 20_000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function parseSuggestion(raw: string, unitTitle: string, grade: string, schedule: ReturnType<typeof generateTrimesterSchedule>): GeneratedPlan {
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const rawSessions = Array.isArray(parsed.sessions) ? parsed.sessions : [];
  const questions = Array.isArray(parsed.essentialQuestions)
    ? parsed.essentialQuestions.map((item) => text(item, 1_000)).filter(Boolean).join("\n")
    : text(parsed.essentialQuestions);

  return {
    unitTitle,
    grade,
    learningObjective: text(parsed.learningObjective),
    essentialQuestions: questions,
    classDate: schedule[0].classDate.toISOString(),
    sessions: schedule.map((date, index) => {
      const candidate = (rawSessions[index] || {}) as Record<string, unknown>;
      return {
        sessionNumber: date.session,
        plannedDate: date.classDate.toISOString(),
        learningResults: text(candidate.learningResults) || "Pendiente de completar",
        startActivity: text(candidate.startActivity) || "Pendiente de completar",
        developmentActivity: text(candidate.developmentActivity) || "Pendiente de completar",
        closingActivity: text(candidate.closingActivity) || "Pendiente de completar",
      };
    }),
  };
}

export async function generatePlanWithIA(formData: FormData) {
  let requestId: string | null = null;
  try {
    const context = await requireInstitutionContext();
    assertPermission(context.role, "ai.use");
    assertInstitutionAiEnabled(context.role, context.institution.settings);
    if (!process.env.GEMINI_API_KEY) return { success: false, error: "La clave de Gemini no está configurada." };

    const configId = text(formData.get("configId"), 100);
    const unitTitle = text(formData.get("unitTitle"), 300);
    if (!configId || !unitTitle) return { success: false, error: "Selecciona una configuración y escribe el título." };

    const config = await prisma.trimesterConfig.findFirst({
      where: {
        id: configId,
        institutionId: context.institutionId,
        ...(context.role === "INSTITUTION_ADMIN" ? {} : { authorId: context.profile.id }),
      },
    });
    if (!config) return { success: false, error: "La configuración no existe o no está autorizada." };

    const since = new Date(Date.now() - 24 * 60 * 60 * 1_000);
    const [requestCount, schedule] = await Promise.all([
      prisma.aiRequest.count({ where: { institutionId: context.institutionId, createdAt: { gte: since } } }),
      Promise.resolve(generateTrimesterSchedule(
        config.startDate.toISOString().slice(0, 10),
        config.endDate.toISOString().slice(0, 10),
        config.classDay,
      )),
    ]);
    const limit = Math.max(1, Math.min(
      Number((context.institution.settings as { aiDailyLimit?: number } | null)?.aiDailyLimit || 200),
      10_000,
    ));
    if (requestCount >= limit) return { success: false, error: "La institución alcanzó su límite diario de IA." };
    if (!schedule.length) return { success: false, error: "La configuración no contiene fechas de clase válidas." };

    const prompt = `Eres un docente experto en diseño curricular escolar colombiano.
Genera una propuesta para ${schedule.length} sesiones.
Contexto institucional seleccionado por el profesor:
- Grado: ${text(config.grade, 100)}
- Tema: ${unitTitle}
- Objetivo macro: ${text(config.mainObjective, 3_000) || "No definido"}
- Referentes curriculares: ${text(config.conceptualReferences, 5_000) || "No definidos"}

Devuelve únicamente JSON válido con esta forma:
{"learningObjective":"texto","essentialQuestions":"1 a 3 preguntas abiertas","sessions":[{"learningResults":"texto","startActivity":"texto","developmentActivity":"texto","closingActivity":"texto"}]}
No incluyas datos personales ni contenido ajeno a este contexto.`;

    const request = await prisma.aiRequest.create({
      data: {
        institutionId: context.institutionId,
        profileId: context.profile.id,
        action: "generate:complete-plan",
        status: "PENDING",
        inputLength: prompt.length,
      },
    });
    requestId = request.id;

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    const raw = response.text || "{}";
    const suggestion = parseSuggestion(raw, `Trimestre ${config.trimester} - ${unitTitle}`, config.grade, schedule);

    await prisma.$transaction([
      prisma.aiRequest.update({
        where: { id: request.id },
        data: { status: "SUGGESTED", outputLength: raw.length, suggestion },
      }),
      prisma.activityLog.create({
        data: {
          institutionId: context.institutionId,
          actorId: context.profile.id,
          action: "AI_PLAN_SUGGESTION_CREATED",
          entityType: "AiRequest",
          entityId: request.id,
          metadata: { configId, sessionCount: schedule.length },
        },
      }),
    ]);
    return { success: true, requestId: request.id, suggestion };
  } catch (error) {
    console.error("Error al generar sugerencia completa:", error);
    if (requestId) {
      await prisma.aiRequest.update({ where: { id: requestId }, data: { status: "FAILED" } }).catch(() => undefined);
    }
    return { success: false, error: "No fue posible generar la sugerencia. Intenta nuevamente." };
  }
}

export async function acceptGeneratedPlanSuggestion(requestId: string) {
  const context = await requireInstitutionContext();
  assertPermission(context.role, "plans.create");
  const request = await prisma.aiRequest.findFirst({
    where: {
      id: requestId,
      institutionId: context.institutionId,
      profileId: context.profile.id,
      status: "SUGGESTED",
    },
  });
  if (!request?.suggestion) return { success: false, error: "La sugerencia ya no está disponible." };
  const suggestion = request.suggestion as unknown as GeneratedPlan;

  const created = await prisma.$transaction(async (tx) => {
    const plan = await tx.classPlan.create({
      data: {
        institutionId: context.institutionId,
        authorId: context.profile.id,
        grade: text(suggestion.grade, 100),
        unitTitle: text(suggestion.unitTitle, 300),
        learningObjective: text(suggestion.learningObjective),
        essentialQuestions: text(suggestion.essentialQuestions),
        classDate: new Date(suggestion.classDate),
        status: "DRAFT",
        sessions: {
          create: suggestion.sessions.map((session) => ({
            sessionNumber: session.sessionNumber,
            plannedDate: new Date(session.plannedDate),
            learningResults: text(session.learningResults),
            startActivity: text(session.startActivity),
            developmentActivity: text(session.developmentActivity),
            closingActivity: text(session.closingActivity),
          })),
        },
      },
    });
    await tx.aiRequest.update({
      where: { id: request.id },
      data: { status: "ACCEPTED", acceptedAt: new Date(), planId: plan.id },
    });
    await tx.activityLog.create({
      data: {
        institutionId: context.institutionId,
        actorId: context.profile.id,
        action: "AI_PLAN_SUGGESTION_ACCEPTED",
        entityType: "ClassPlan",
        entityId: plan.id,
        metadata: { aiRequestId: request.id },
      },
    });
    return plan;
  });
  revalidatePath("/");
  revalidatePath("/plans");
  return { success: true, planId: created.id };
}

export async function discardGeneratedPlanSuggestion(requestId: string) {
  const context = await requireInstitutionContext();
  const result = await prisma.aiRequest.updateMany({
    where: {
      id: requestId,
      institutionId: context.institutionId,
      profileId: context.profile.id,
      status: "SUGGESTED",
    },
    data: { status: "DISCARDED" },
  });
  return { success: result.count === 1 };
}

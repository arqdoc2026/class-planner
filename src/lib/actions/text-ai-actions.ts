"use server";

import { GoogleGenAI } from "@google/genai";
import { requireInstitutionContext } from "../auth";
import { assertInstitutionAiEnabled, assertPermission } from "../authorization/permissions";
import { prisma } from "../prisma";

type AssistMode = "improve" | "generate" | "custom";

type AssistTextInput = {
  mode: AssistMode;
  field: string;
  text: string;
  instruction?: string;
  context: {
    grade?: string;
    area?: string;
    subject?: string;
    unitTitle?: string;
    sessionNumber?: number;
    period?: string;
    sessionCount?: number;
    sessionDuration?: number;
    objectives?: string;
    expectedResults?: string;
    knowledge?: string;
    skills?: string;
    availableResources?: string;
    groupNeeds?: string;
    differentiation?: string;
    institutionalApproach?: string;
  };
};

const MAX_INPUT_LENGTH = 20_000;

function limitedText(value: unknown, max = MAX_INPUT_LENGTH) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function assistPlannerText(input: AssistTextInput) {
  let requestId: string | null = null;
  try {
    const context = await requireInstitutionContext();
    assertPermission(context.role, "ai.use");
    assertInstitutionAiEnabled(context.role, context.institution.settings);
    if (!process.env.GEMINI_API_KEY) {
      return { success: false, error: "La clave de Gemini no está configurada." };
    }

    if (!input || !["improve", "generate", "custom"].includes(input.mode)) {
      return { success: false, error: "La solicitud de IA no es válida." };
    }

    const text = limitedText(input.text);
    const instruction = limitedText(input.instruction, 2_000);
    if (input.mode === "improve" && !text) {
      return { success: false, error: "Escribe un borrador antes de mejorarlo." };
    }
    if (input.mode === "custom" && !instruction) {
      return { success: false, error: "Escribe una instrucción para la IA." };
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const requestCount = await prisma.aiRequest.count({
      where: { institutionId: context.institutionId, createdAt: { gte: since } },
    });
    const configuredLimit = Number(
      (context.institution.settings as { aiDailyLimit?: number } | null)?.aiDailyLimit || 200,
    );
    if (requestCount >= Math.max(1, Math.min(configuredLimit, 10_000))) {
      return { success: false, error: "La institución alcanzó su límite diario de solicitudes de IA." };
    }

    const request = await prisma.aiRequest.create({
      data: {
        institutionId: context.institutionId,
        profileId: context.profile.id,
        action: `${input.mode}:${limitedText(input.field, 200)}`,
        status: "PENDING",
        inputLength: text.length + instruction.length,
      },
    });
    requestId = request.id;

    const task = input.mode === "improve"
      ? "Mejora la claridad, precisión pedagógica, gramática y coherencia del borrador sin cambiar su intención."
      : input.mode === "generate"
        ? "Genera contenido pedagógico concreto, aplicable y listo para usar en este campo."
        : `Aplica esta instrucción al contenido: ${instruction}`;

    const prompt = `
Eres un docente experto en diseño curricular escolar colombiano.

CONTEXTO DE LA PLANEACIÓN
- Grado: ${limitedText(input.context.grade, 100) || "No indicado"}
- Área: ${limitedText(input.context.area, 200) || "No indicada"}
- Asignatura: ${limitedText(input.context.subject, 200) || "No indicada"}
- Unidad: ${limitedText(input.context.unitTitle, 500) || "No indicada"}
- Periodo: ${limitedText(input.context.period, 100) || "No indicado"}
- Cantidad de sesiones: ${input.context.sessionCount || "No indicada"}
- Duración de sesión: ${input.context.sessionDuration || "No indicada"} minutos
- Sesión: ${input.context.sessionNumber || "No aplica"}
- Campo: ${limitedText(input.field, 200)}
- Objetivos: ${limitedText(input.context.objectives, 2_000) || "No indicados"}
- Resultados esperados: ${limitedText(input.context.expectedResults, 2_000) || "No indicados"}
- Conocimientos: ${limitedText(input.context.knowledge, 2_000) || "No indicados"}
- Habilidades: ${limitedText(input.context.skills, 2_000) || "No indicadas"}
- Recursos disponibles: ${limitedText(input.context.availableResources, 2_000) || "No indicados"}
- Necesidades del grupo: ${limitedText(input.context.groupNeeds, 2_000) || "No indicadas"}
- Diferenciación existente: ${limitedText(input.context.differentiation, 2_000) || "No indicada"}
- Enfoque institucional: ${limitedText(input.context.institutionalApproach, 2_000) || "No indicado"}

TAREA
${task}

BORRADOR ACTUAL
<borrador>${text || "El campo está vacío."}</borrador>

REGLAS
- Responde en español.
- Conserva un tono profesional y apropiado para el grado.
- No agregues explicaciones, títulos, comillas ni Markdown.
- Devuelve únicamente el texto que debe insertarse en el campo.
`;

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    const result = limitedText(response.text, 50_000);

    if (!result) return { success: false, error: "La IA no devolvió contenido." };
    await prisma.aiRequest.update({
      where: { id: request.id },
      data: { status: "SUGGESTED", outputLength: result.length, suggestion: { text: result } },
    });
    await prisma.activityLog.create({
      data: {
        institutionId: context.institutionId,
        actorId: context.profile.id,
        action: "AI_SUGGESTION_CREATED",
        entityType: "AiRequest",
        entityId: request.id,
        metadata: { field: limitedText(input.field, 200), mode: input.mode },
      },
    });
    return { success: true, text: result, requestId: request.id };
  } catch (error) {
    console.error("Error en el asistente de texto:", error);
    if (requestId) {
      await prisma.aiRequest.update({ where: { id: requestId }, data: { status: "FAILED" } }).catch(() => undefined);
    }
    if (error instanceof Error && /capacity|resource exhausted|429/i.test(error.message)) {
      return { success: false, error: "Gemini está ocupado en este momento. Espera unos segundos e intenta nuevamente." };
    }
    if (error instanceof Error && error.message === "AI_DISABLED_FOR_ROLE") {
      return { success: false, error: "La institución desactivó la IA para tu rol." };
    }
    return { success: false, error: "No se pudo generar el texto. Intenta nuevamente." };
  }
}

export async function acceptAiSuggestion(requestId: string) {
  const context = await requireInstitutionContext();
  const result = await prisma.aiRequest.updateMany({
    where: { id: requestId, institutionId: context.institutionId, profileId: context.profile.id, status: "SUGGESTED" },
    data: { status: "ACCEPTED", acceptedAt: new Date() },
  });
  return { success: result.count === 1 };
}

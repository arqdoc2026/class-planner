export const PLAN_STATUSES = [
  "DRAFT",
  "IN_PROGRESS",
  "READY_FOR_REVIEW",
  "IN_REVIEW",
  "CHANGES_REQUESTED",
  "CORRECTED",
  "APPROVED",
  "ARCHIVED",
] as const;

export type PlanStatus = (typeof PLAN_STATUSES)[number];

const transitions: Record<PlanStatus, readonly PlanStatus[]> = {
  DRAFT: ["IN_PROGRESS", "READY_FOR_REVIEW"],
  IN_PROGRESS: ["READY_FOR_REVIEW"],
  READY_FOR_REVIEW: ["IN_REVIEW"],
  IN_REVIEW: ["CHANGES_REQUESTED", "APPROVED"],
  CHANGES_REQUESTED: ["CORRECTED", "READY_FOR_REVIEW"],
  CORRECTED: ["READY_FOR_REVIEW"],
  APPROVED: ["ARCHIVED"],
  ARCHIVED: [],
};

export function canTransitionPlan(from: string, to: string) {
  return PLAN_STATUSES.includes(from as PlanStatus)
    && PLAN_STATUSES.includes(to as PlanStatus)
    && transitions[from as PlanStatus].includes(to as PlanStatus);
}

export function validateReviewReadiness(plan: {
  unitTitle: string | null;
  learningObjective: string | null;
  sessions: Array<{ learningResults: string | null; startActivity: string | null; developmentActivity: string | null; closingActivity: string | null }>;
}, requiredFields: readonly string[] = ["unitTitle", "learningObjectives", "sessions"]) {
  const pending: string[] = [];
  const required = new Set(requiredFields);
  if (required.has("unitTitle") && !plan.unitTitle?.trim()) pending.push("Título de la unidad");
  if ((required.has("learningObjectives") || required.has("learningObjective")) && !plan.learningObjective?.trim()) pending.push("Objetivo de aprendizaje");
  if (required.has("sessions") && !plan.sessions.length) pending.push("Al menos una sesión");
  plan.sessions.forEach((session, index) => {
    if (required.has("sessionLearningResults") && !session.learningResults?.trim()) pending.push(`Resultado de aprendizaje de la sesión ${index + 1}`);
    if (required.has("sessionStart") && !session.startActivity?.trim()) pending.push(`Inicio de la sesión ${index + 1}`);
    if (required.has("sessionDevelopment") && !session.developmentActivity?.trim()) pending.push(`Desarrollo de la sesión ${index + 1}`);
    if (required.has("sessionClosing") && !session.closingActivity?.trim()) pending.push(`Cierre de la sesión ${index + 1}`);
  });
  return pending;
}

export type CoherenceFinding = {
  level: "CORRECT" | "RECOMMENDATION" | "WARNING" | "PENDING" | "INCONSISTENCY";
  code: string;
  message: string;
  section: string;
};

type ReviewablePlan = {
  learningObjective: string | null;
  performanceTask: string | null;
  otherEvidences: string | null;
  essentialQuestions: string | null;
  sessions: Array<{
    durationMinutes?: number | null;
    learningResults: string | null;
    resources: string | null;
    startActivity: string | null;
    developmentActivity: string | null;
    closingActivity: string | null;
  }>;
};

export function analyzePlanCoherence(plan: ReviewablePlan): CoherenceFinding[] {
  const findings: CoherenceFinding[] = [];
  if (!plan.learningObjective?.trim()) {
    findings.push({ level: "PENDING", code: "OBJECTIVE_MISSING", message: "Falta el objetivo de aprendizaje.", section: "stage-1" });
  }
  if (!plan.performanceTask?.trim() && !plan.otherEvidences?.trim()) {
    findings.push({ level: "WARNING", code: "EVIDENCE_MISSING", message: "No se identifican evidencias de evaluación.", section: "stage-2" });
  }
  if (plan.essentialQuestions?.trim() && !plan.essentialQuestions.includes("?")) {
    findings.push({ level: "RECOMMENDATION", code: "QUESTION_FORMAT", message: "Revisa que las preguntas esenciales estén formuladas como preguntas abiertas.", section: "stage-1" });
  }
  plan.sessions.forEach((session, index) => {
    const number = index + 1;
    if (!session.learningResults?.trim()) findings.push({ level: "PENDING", code: "RESULT_MISSING", message: `La sesión ${number} no tiene resultado de aprendizaje.`, section: `session-${number}` });
    if (!session.closingActivity?.trim()) findings.push({ level: "WARNING", code: "CLOSURE_MISSING", message: `La sesión ${number} no tiene cierre o reflexión.`, section: `session-${number}` });
    if (!session.resources?.trim()) findings.push({ level: "RECOMMENDATION", code: "RESOURCES_MISSING", message: `La sesión ${number} no especifica recursos.`, section: `session-${number}` });
    if (session.durationMinutes && session.durationMinutes > 240) findings.push({ level: "WARNING", code: "SESSION_OVERLOAD", message: `La duración de la sesión ${number} parece excesiva.`, section: `session-${number}` });
  });
  if (!findings.length) findings.push({ level: "CORRECT", code: "BASE_ALIGNMENT", message: "La planeación cumple las comprobaciones estructurales disponibles.", section: "general" });
  return findings;
}

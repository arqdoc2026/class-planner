import { getStructuredPlan } from "../../../../../lib/actions/structured-plan-actions";
import { prisma } from "../../../../../lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { context, plan } = await getStructuredPlan(id);
  const rows = plan.sessions.map((session) => `
    <h2>Sesión ${session.sessionNumber}</h2>
    <table>
      <tr><th>Fecha prevista</th><td>${escape(session.plannedDate?.toLocaleDateString("es-CO") || "Pendiente")}</td><th>Duración</th><td>${session.durationMinutes || "—"} min</td></tr>
      <tr><th>Resultados</th><td colspan="3">${paragraph(session.learningResults)}</td></tr>
      <tr><th>Inicio</th><td>${paragraph(session.startActivity)}</td><th>Desarrollo</th><td>${paragraph(session.developmentActivity)}</td></tr>
      <tr><th>Cierre</th><td>${paragraph(session.closingActivity)}</td><th>Evaluación formativa</th><td>${paragraph(session.formativeAssessment)}</td></tr>
      <tr><th>Diferenciación</th><td>${paragraph(session.differentiation)}</td><th>Recursos</th><td>${paragraph(session.resources)}</td></tr>
    </table>
    ${session.activities.map((activity) => `<h3>${escape(activity.title)}</h3><p>${paragraph(activity.description)}</p><p><b>Momento:</b> ${escape(activity.classMoment)} · <b>Tiempo:</b> ${activity.estimatedMinutes || "—"} min</p>`).join("")}
  `).join("");
  const format = plan.formatSnapshot as { formatCode?: string; version?: string; name?: string } | null;
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    @page { size: letter portrait; margin: 1.2cm; }
    body { font-family: Calibri, Arial, sans-serif; font-size: 10pt; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th, td { border: 1px solid #000; padding: 6px; vertical-align: top; }
    h1 { text-align: center; font-size: 15pt; } h2 { background: #ddd; border: 1px solid #000; padding: 6px; page-break-after: avoid; }
    table, h3 { page-break-inside: avoid; }
  </style></head><body>
    <table><tr><th>${escape(format?.name || "FORMATO DE PLANEACIÓN")}</th><th>Código: ${escape(format?.formatCode || "MGF-03-R05")}</th><th>Versión: ${escape(format?.version || "01")}</th></tr></table>
    <h1>${escape(plan.unitTitle || "Planeación académica")}</h1>
    <table><tr><th>Área</th><td>${escape(plan.area || "")}</td><th>Asignatura</th><td>${escape(plan.subject || "")}</td></tr><tr><th>Grado</th><td>${escape(plan.grade || "")}</td><th>Profesor</th><td>${escape(plan.teacherName || "")}</td></tr></table>
    <h2>Etapa 1: Resultados esperados</h2><p><b>Objetivo:</b> ${paragraph(plan.learningObjective)}</p><p><b>Preguntas esenciales:</b> ${paragraph(plan.essentialQuestions)}</p>
    <h2>Etapa 2: Evidencias de evaluación</h2><p><b>Tarea de desempeño:</b> ${paragraph(plan.performanceTask)}</p><p><b>Otras evidencias:</b> ${paragraph(plan.otherEvidences)}</p>
    <h2>Etapa 3: Plan de aprendizaje</h2>${rows}
    <h2>Etapa 4: Evaluar y reflexionar</h2><p><b>Alineación:</b> ${paragraph(plan.alignmentReflection)}</p><p><b>Evaluación:</b> ${paragraph(plan.classEvaluation)}</p>
    <table><tr><td>Elaborado por:<br><br>${escape(plan.teacherName || "")}</td><td>Aprobado por:<br><br>${escape(plan.coordinatorName || "")}<br>${escape(plan.approvalDate?.toLocaleDateString("es-CO") || "")}</td></tr></table>
  </body></html>`;
  await prisma.activityLog.create({
    data: { institutionId: context.institutionId, actorId: context.profile.id, action: "PLAN_EXPORTED_WORD", entityType: "ClassPlan", entityId: id },
  });
  const safeName = (plan.unitTitle || "planeacion").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 80);
  return new Response(html, {
    headers: {
      "Content-Type": "application/msword; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName}.doc"`,
      "Cache-Control": "private, no-store",
    },
  });
}

function escape(value: string) { return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] || character); }
function paragraph(value: string | null) { return escape(value || "—").replace(/\n/g, "<br>"); }

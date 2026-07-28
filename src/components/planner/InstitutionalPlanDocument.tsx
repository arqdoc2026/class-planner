import type { StructuredPlanContent } from "../../lib/institutional-format";
import { planStatusLabel } from "../../lib/status-labels";
import Image from "next/image";

type DocumentPlan = Awaited<ReturnType<typeof import("../../lib/actions/structured-plan-actions").getStructuredPlan>>["plan"];

export default function InstitutionalPlanDocument({ plan }: { plan: DocumentPlan }) {
  const expected = plan.expectedResults as StructuredPlanContent["expectedResults"] | null;
  const evidence = plan.evaluationEvidence as StructuredPlanContent["evaluationEvidence"] | null;
  const reflection = plan.finalReflection as StructuredPlanContent["finalReflection"] | null;
  const format = plan.formatSnapshot as { formatCode?: string; version?: string; name?: string } | null;
  return (
    <article className="institutional-document mx-auto max-w-[8.5in] bg-white p-8 text-[11px] text-black">
      <table className="mb-4 w-full border-collapse">
        <tbody>
          <tr><td rowSpan={2} className="w-[19%] border border-black p-2 text-center"><Image src="/branding/colegio-san-jose-logo.png" width={92} height={88} alt={plan.institution?.name || "Colegio San José"} className="mx-auto h-20 w-20 object-contain" /></td><td rowSpan={2} className="w-[56%] border border-black p-3 text-center text-base font-black">PLANEACIÓN</td><td className="w-[25%] border border-black bg-[#f2f2f2] p-2 text-center text-sm font-bold">Código:</td></tr>
          <tr><td className="border border-black bg-[#f2f2f2] p-2 text-center text-sm font-black">{format?.formatCode || "MGF-03-R05"}</td></tr>
        </tbody>
      </table>
      <table className="mb-5 w-full border-collapse">
        <tbody>
          <Row label="Área" value={plan.area} secondLabel="Asignatura" secondValue={plan.subject} />
          <Row label="Grado" value={plan.grade} secondLabel="Unidad" secondValue={plan.unitTitle} />
          <Row label="Sede" value={plan.campus?.name} secondLabel="Grupo" secondValue={plan.courseGroup?.name} />
          <Row label="Año lectivo" value={plan.academicYear?.name} secondLabel="Periodo" secondValue={plan.academicPeriod?.name} />
          <Row label="Sesiones planeadas" value={String(plan.sessions.length)} secondLabel="Sesiones completadas" secondValue={String(plan.sessions.filter((session) => session.status === "COMPLETED").length)} />
          <Row label="Profesor(es)" value={plan.teacherName || plan.authorId} secondLabel="Estado" secondValue={planStatusLabel(plan.status)} />
        </tbody>
      </table>

      <Stage title="Etapa 1: Resultados esperados">
        <ListRow label="Objetivos de aprendizaje" values={expected?.learningObjectives || split(plan.learningObjective)} />
        <ListRow label="Preguntas esenciales" values={expected?.essentialQuestions || split(plan.essentialQuestions)} />
        <ListRow label="Preguntas PBL" values={expected?.pblQuestions || []} />
        <TextRow label="Competencia PBL" value={expected?.pblCompetence || plan.pblCompetence} />
        <ListRow label="Conocimientos" values={expected?.knowledge || split(plan.knowledge)} />
        <ListRow label="Habilidades" values={expected?.skills || split(plan.skills)} />
        <ListRow label="Competencias institucionales" values={expected?.institutionalCompetencies || []} />
        <ListRow label="Resultados de aprendizaje" values={expected?.learningResults || []} />
        <ListRow label="Comprensiones duraderas" values={expected?.enduringUnderstandings || []} />
        <ListRow label="Estándares o referentes curriculares" values={expected?.curricularStandards || []} />
        <ListRow label="Indicadores de logro" values={expected?.achievementIndicators || []} />
      </Stage>

      <Stage title="Etapa 2: Evidencias de evaluación">
        <TextRow label="Tarea auténtica de desempeño" value={evidence?.performanceTask || plan.performanceTask} />
        <TextRow label="Escenario de aplicación" value={evidence?.applicationScenario} />
        <ListRow label="Otras evidencias" values={evidence?.otherEvidence || []} />
        <ListRow label="Evaluación formativa" values={evidence?.formativeAssessments || []} />
        <ListRow label="Evaluación sumativa" values={evidence?.summativeAssessments || []} />
        <ListRow label="Muestras de trabajo" values={evidence?.workSamples || []} />
        <TextRow label="Observaciones" value={evidence?.observations} />
        <ListRow label="Cuestionarios" values={evidence?.questionnaires || []} />
        <ListRow label="Pruebas" values={evidence?.tests || []} />
        <ListRow label="Diarios" values={evidence?.journals || []} />
        <ListRow label="Criterios de evaluación" values={evidence?.assessmentCriteria || []} />
        <ListRow label="Instrumentos de evaluación" values={evidence?.assessmentInstruments || []} />
        {plan.rubricFileUrl && <TextRow label="Rúbrica adjunta" value={plan.rubricFileUrl} />}
      </Stage>

      <Stage title="Etapa 3: Plan de aprendizaje">
        {plan.sessions.map((session) => (
          <section key={session.id} className="session-print mb-5 break-inside-avoid border border-black">
            <h3 className="border-b border-black bg-slate-200 p-2 text-sm font-black">Sesión {session.sessionNumber} · {session.plannedDate?.toLocaleDateString("es-CO") || "Fecha pendiente"} · {session.durationMinutes || "—"} min</h3>
            <TextBlock label="Resultado(s)" value={session.learningResults} />
            <div className="grid grid-cols-3"><TextBlock label="Inicio" value={session.startActivity} /><TextBlock label="Desarrollo" value={session.developmentActivity} /><TextBlock label="Cierre" value={session.closingActivity} /></div>
            <TextBlock label="Evaluación formativa" value={session.formativeAssessment} />
            <TextBlock label="Diferenciación" value={session.differentiation} />
            <TextBlock label="Recursos" value={session.resources} />
            <TextBlock label="PPI" value={session.ignatianElements.join(", ")} />
            <TextBlock label="Educación personalizada" value={session.personalizationStrategies.join(", ")} />
            {session.activities.map((activity) => <div key={activity.id} className="border-t border-black p-2"><strong>{activity.position + 1}. {activity.title}</strong><p>{activity.description}</p><small>{activity.classMoment} · {activity.estimatedMinutes || "—"} min · {activity.groupingType || "Sin agrupación"}</small></div>)}
          </section>
        ))}
      </Stage>

      <Stage title="Etapa 4: Evaluar y reflexionar">
        <TextRow label="Alineación" value={reflection?.alignment || plan.alignmentReflection} />
        <TextRow label="Ajustes intencionados al contenido" value={reflection?.contentAdjustments} />
        <TextRow label="Ajustes a las prácticas de instrucción" value={reflection?.instructionAdjustments} />
        <TextRow label="Ajustes al entorno de aprendizaje" value={reflection?.environmentAdjustments} />
        <TextRow label="Atención a necesidades y diversidades" value={reflection?.diversityAttention} />
        <TextRow label="Qué funcionó" value={reflection?.whatWorked} />
        <TextRow label="Qué no funcionó" value={reflection?.whatDidNotWork} />
        <TextRow label="Cambios recomendados" value={reflection?.recommendedChanges} />
        <TextRow label="Otras observaciones" value={reflection?.otherObservations || plan.otherObservations} />
        <TextRow label="Reflexión final" value={reflection?.finalReflection} />
      </Stage>
      <div className="mt-10 grid grid-cols-2 gap-16 text-center"><div className="border-t border-black pt-2">Elaborado por<br />{plan.teacherName || "Profesor responsable"}</div><div className="border-t border-black pt-2">Aprobado por<br />{plan.coordinatorName || "Coordinación académica"}<br />{plan.approvalDate?.toLocaleDateString("es-CO") || ""}</div></div>
    </article>
  );
}

function split(value: string | null) { return value?.split("\n").map((item) => item.trim()).filter(Boolean) || []; }
function Stage({ title, children }: { title: string; children: React.ReactNode }) { return <section className="mb-6"><h2 className="border border-black bg-slate-300 p-2 text-center text-sm font-black">{title}</h2><table className="w-full border-collapse"><tbody>{children}</tbody></table></section>; }
function Row({ label, value, secondLabel, secondValue }: { label: string; value?: string | null; secondLabel: string; secondValue?: string | null }) { return <tr><th className="border border-black p-2 text-left">{label}</th><td className="border border-black p-2">{value || "—"}</td><th className="border border-black p-2 text-left">{secondLabel}</th><td className="border border-black p-2">{secondValue || "—"}</td></tr>; }
function ListRow({ label, values }: { label: string; values: string[] }) { return <tr><th className="w-1/4 border border-black p-2 text-left align-top">{label}</th><td className="border border-black p-2"><ul className="list-disc pl-5">{values.map((value, index) => <li key={`${value}-${index}`}>{value}</li>)}</ul>{!values.length && "—"}</td></tr>; }
function TextRow({ label, value }: { label: string; value?: string | null }) { return <tr><th className="w-1/4 border border-black p-2 text-left align-top">{label}</th><td className="whitespace-pre-wrap border border-black p-2">{value || "—"}</td></tr>; }
function TextBlock({ label, value }: { label: string; value?: string | null }) { return <div className="border-black p-2"><strong>{label}: </strong><span className="whitespace-pre-wrap">{value || "—"}</span></div>; }

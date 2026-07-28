import type { StructuredPlanContent } from "../../lib/institutional-format";
import Image from "next/image";

type DocumentPlan = Awaited<ReturnType<typeof import("../../lib/actions/structured-plan-actions").getStructuredPlan>>["plan"];

export default function InstitutionalPlanDocument({ plan }: { plan: DocumentPlan }) {
  const expected = plan.expectedResults as StructuredPlanContent["expectedResults"] | null;
  const evidence = plan.evaluationEvidence as StructuredPlanContent["evaluationEvidence"] | null;
  const reflection = plan.finalReflection as StructuredPlanContent["finalReflection"] | null;
  const format = plan.formatSnapshot as { formatCode?: string; version?: string; name?: string } | null;
  const sessionDates = plan.sessions.flatMap((session) => session.plannedDate ? [session.plannedDate] : []).sort((a, b) => a.valueOf() - b.valueOf());
  return (
    <article id="institutional-plan-document" className="institutional-document mx-auto w-[11in] max-w-[11in] box-border bg-white p-[0.5in] text-black">
      <table className="mb-5 w-full table-fixed border-collapse">
        <colgroup><col style={{ width: "20.53%" }} /><col style={{ width: "9.86%" }} /><col style={{ width: "2.3%" }} /><col style={{ width: "17.8%" }} /><col style={{ width: "1.82%" }} /><col style={{ width: "23.93%" }} /><col style={{ width: "9.91%" }} /><col style={{ width: "13.85%" }} /></colgroup>
        <tbody>
          <tr><td rowSpan={5} className="border border-black p-0 text-center align-top"><Image src="/branding/colegio-san-jose-logo.png" width={120} height={107} alt={plan.institution?.name || "Colegio San José"} className="mx-auto h-[1.114in] w-[1.25in] object-contain" /></td><td rowSpan={2} colSpan={5} className="border border-black p-3 text-center text-base font-black">PLANEACIÓN</td><td colSpan={2} className="border border-black bg-[#f2f2f2] p-2 text-center text-sm font-bold">Código:</td></tr>
          <tr><td colSpan={2} className="border border-black bg-[#f2f2f2] p-2 text-center text-sm font-black">{format?.formatCode || "MGF-03-R05"}</td></tr>
          <tr><td colSpan={5} className="border border-black p-1"><strong>Área:</strong> {plan.area || "—"}</td><td colSpan={2} className="border border-black p-1"><strong>Asignatura:</strong> {plan.subject || "—"}</td></tr>
          <tr><th className="border border-black p-1">Fecha</th><td colSpan={3} className="border border-black p-1"><strong>Desde:</strong> {sessionDates[0]?.toLocaleDateString("es-CO") || "—"}</td><td className="border border-black p-1"><strong>Hasta:</strong> {sessionDates.at(-1)?.toLocaleDateString("es-CO") || "—"}</td><td colSpan={2} className="border border-black p-1 text-center font-bold">Número de sesiones<br />{plan.sessions.length}</td></tr>
          <tr><td colSpan={2} className="border border-black p-1"><strong>Grado:</strong> {plan.grade || "—"}</td><td className="border border-black p-1"><strong>Trimestre / Semestre:</strong><br />{plan.academicPeriod?.name || "—"}</td><td colSpan={2} className="border border-black p-1"><strong>Fecha de elaboración:</strong><br />{plan.createdAt.toLocaleDateString("es-CO")}</td><td className="border border-black p-1"><strong>Planeadas:</strong><br />{plan.sessions.length}</td><td className="border border-black p-1"><strong>Completadas:</strong><br />{plan.sessions.filter((session) => session.status === "COMPLETED").length}</td></tr>
        </tbody>
      </table>

      <PrintExpected plan={plan} expected={expected} />
      <PrintEvidence plan={plan} evidence={evidence} />
      <PrintSessions plan={plan} />
      <PrintReflection plan={plan} reflection={reflection} />
      <p className="mt-2 text-right text-xs">V-21- 11/2025</p>
    </article>
  );
}

function split(value: string | null) { return value?.split("\n").map((item) => item.trim()).filter(Boolean) || []; }

function Values({ values }: { values: string[] }) {
  return values.length ? <ul className="list-disc pl-5">{values.map((value, index) => <li key={`${value}-${index}`}>{value}</li>)}</ul> : <span>—</span>;
}

function PrintExpected({ plan, expected }: { plan: DocumentPlan; expected: StructuredPlanContent["expectedResults"] | null }) {
  return <section className="mb-6 break-inside-avoid"><table className="w-full table-fixed border-collapse"><colgroup><col style={{ width: "20.26%" }} /><col style={{ width: "30.2%" }} /><col style={{ width: "49.54%" }} /></colgroup><tbody>
    <tr><th colSpan={3} className="h-8 border border-black bg-[#e0e0e0] text-center text-sm">Etapa 1 - Resultados esperados</th></tr>
    <tr><td colSpan={3} className="h-8 border border-black" /></tr>
    <tr><th className="border border-black bg-[#e0e0e0] p-1 text-left">Título de la unidad</th><td colSpan={2} className="border border-black p-1">{plan.unitTitle || "—"}</td></tr>
    <tr><th colSpan={3} className="border border-black bg-[#e0e0e0] p-1 text-left">Objetivo de aprendizaje</th></tr>
    <tr><td colSpan={3} className="h-12 border border-black p-2"><Values values={expected?.learningObjectives || split(plan.learningObjective)} /></td></tr>
    <tr><th colSpan={2} className="border border-black bg-[#e0e0e0] p-1 text-center">Preguntas esenciales</th><th className="border border-black bg-[#e0e0e0] p-1 text-center">PBL</th></tr>
    <tr><td colSpan={2} className="border border-black bg-[#e0e0e0] p-2 text-center">¿Qué preguntas provocativas fomentarán la investigación sobre el contenido? (preguntas abiertas que estimulan el pensamiento y la investigación vinculados al contenido de la comprensión duradera)</td><td className="border border-black bg-[#e0e0e0] p-2 text-center italic">Competencia PBL</td></tr>
    <tr><td colSpan={2} className="h-24 border border-black p-2 align-top"><Values values={expected?.essentialQuestions || split(plan.essentialQuestions)} /></td><td className="border border-black p-2 align-top"><Values values={expected?.pblQuestions || []} /><p className="mt-2 whitespace-pre-wrap italic">{expected?.pblCompetence || plan.pblCompetence || "—"}</p></td></tr>
    <tr><th colSpan={2} className="border border-black bg-[#e0e0e0] p-1 text-center">Conocimiento</th><th className="border border-black bg-[#e0e0e0] p-1 text-center">Habilidades</th></tr>
    <tr><td colSpan={2} className="border border-black bg-[#e0e0e0] p-2">¿Qué conocimientos adquirirá el estudiante como resultado de esta unidad?</td><td className="border border-black bg-[#e0e0e0] p-2">Enumerar las habilidades y/o comportamientos relacionados con las competencias que los estudiantes podrán exhibir como resultado de su trabajo en esta unidad.</td></tr>
    <tr><td colSpan={2} className="h-16 border border-black p-2 align-top"><Values values={expected?.knowledge || split(plan.knowledge)} /></td><td className="border border-black p-2 align-top"><Values values={expected?.skills || split(plan.skills)} /></td></tr>
  </tbody></table></section>;
}

function PrintEvidence({ plan, evidence }: { plan: DocumentPlan; evidence: StructuredPlanContent["evaluationEvidence"] | null }) {
  return <section className="mb-6 break-inside-avoid"><table className="w-full table-fixed border-collapse"><colgroup><col style={{ width: "45.51%" }} /><col style={{ width: "54.49%" }} /></colgroup><tbody>
    <tr><th colSpan={2} className="h-8 border border-black bg-[#e0e0e0] text-center text-sm">Etapa 2 – Evidencias de evaluación</th></tr>
    <tr><td colSpan={2} className="h-8 border border-black" /></tr>
    <tr><th className="border border-black bg-[#e0e0e0] p-1 text-center">Tarea de desempeño</th><th className="border border-black bg-[#e0e0e0] p-1 text-center">Otras evidencias</th></tr>
    <tr><td className="border border-black bg-[#e0e0e0] p-2 text-center">¿A través de qué tarea auténtica de desempeño los estudiantes demostrarán los entendimientos, conocimientos y habilidades deseados? Describa un escenario de aplicación real.</td><td className="border border-black bg-[#e0e0e0] p-2 text-center">¿A través de qué otra evidencia demostrarán el logro? Incluya muestras de trabajo, observaciones, cuestionarios, pruebas, diarios y evaluaciones formativas y sumativas.</td></tr>
    <tr><td className="h-48 border border-black p-2 align-top whitespace-pre-wrap">{[evidence?.performanceTask || plan.performanceTask, evidence?.applicationScenario].filter(Boolean).join("\n\n") || "—"}</td><td className="border border-black p-2 align-top"><Values values={[...(evidence?.otherEvidence || []), ...(evidence?.formativeAssessments || []), ...(evidence?.summativeAssessments || []), ...(evidence?.workSamples || [])]} /></td></tr>
    <tr><td className="border border-black p-2 text-center">Adjunte la rúbrica aquí</td><td className="border border-black p-2">{plan.rubricFileUrl || "—"}</td></tr>
  </tbody></table></section>;
}

function PrintSessions({ plan }: { plan: DocumentPlan }) {
  return <section className="mb-6"><table className="w-full table-fixed border-collapse"><colgroup><col style={{ width: "7.86%" }} /><col style={{ width: "15.85%" }} /><col style={{ width: "49.54%" }} /><col style={{ width: "26.75%" }} /></colgroup><thead>
    <tr><th colSpan={4} className="border border-black bg-[#d9d9d9] p-2 text-center text-sm">Etapa 3 – Plan de aprendizaje</th></tr>
    <tr><td colSpan={4} className="border border-black bg-[#d9d9d9] p-2 text-center">El cuadro contiene las actividades previstas para cada sesión, el Paradigma Pedagógico Ignaciano, educación personalizada, diferenciación y evaluación formativa continua.</td></tr>
    <tr><th className="border border-black bg-[#d9d9d9] p-2">Sesión</th><th className="border border-black bg-[#d9d9d9] p-2">Resultados de aprendizaje</th><th className="border border-black bg-[#d9d9d9] p-2">Actividades de instrucción</th><th className="border border-black bg-[#d9d9d9] p-2">Recursos</th></tr>
  </thead>{plan.sessions.map((session) => <tbody key={session.id} className="break-inside-avoid">
    <tr><td rowSpan={6} className="border border-black p-2 text-center align-top text-sm font-bold">{session.sessionNumber}</td><td rowSpan={6} className="border border-black p-2 align-top whitespace-pre-wrap">{session.learningResults || "—"}</td><th className="border border-black bg-[#d0d0d0] p-1 text-left">Inicio</th><td rowSpan={6} className="border border-black p-2 align-top whitespace-pre-wrap">{session.resources || "—"}</td></tr>
    <tr><td className="h-16 border border-black p-2 align-top whitespace-pre-wrap">{session.startActivity || "—"}</td></tr><tr><th className="border border-black bg-[#d0d0d0] p-1 text-left">Actividades de la clase</th></tr><tr><td className="h-16 border border-black p-2 align-top whitespace-pre-wrap">{session.developmentActivity || "—"}</td></tr><tr><th className="border border-black bg-[#d0d0d0] p-1 text-left">Cierre</th></tr><tr><td className="h-16 border border-black p-2 align-top whitespace-pre-wrap">{session.closingActivity || "—"}</td></tr>
  </tbody>)}</table></section>;
}

function PrintReflection({ plan, reflection }: { plan: DocumentPlan; reflection: StructuredPlanContent["finalReflection"] | null }) {
  const cells = [
    ["¿De qué manera se alinean los objetivos de aprendizaje, las evaluaciones de desempeño y las actividades de instrucción para crear un proceso cohesivo?", reflection?.alignment || plan.alignmentReflection],
    ["¿Qué ajustes intencionados se hicieron al contenido, las prácticas de instrucción y/o el entorno para satisfacer las necesidades y diversidades?", [reflection?.contentAdjustments, reflection?.instructionAdjustments, reflection?.environmentAdjustments, reflection?.diversityAttention].filter(Boolean).join("\n\n")],
    ["¿Qué funcionó y qué no funcionó?", [reflection?.whatWorked, reflection?.whatDidNotWork].filter(Boolean).join("\n\n")],
    ["Otras observaciones", reflection?.otherObservations || plan.otherObservations],
  ];
  return <section className="mb-6 break-inside-avoid"><table className="w-full table-fixed border-collapse"><colgroup><col style={{ width: "26.72%" }} /><col style={{ width: "18.99%" }} /><col style={{ width: "7.79%" }} /><col style={{ width: "22.81%" }} /><col style={{ width: "23.69%" }} /></colgroup><tbody>
    <tr><th colSpan={5} className="h-[35px] border border-black bg-[#e0e0e0] p-2 text-center text-sm">Etapa 4 – Evaluar y reflexionar</th></tr>
    <tr><td className="h-[72px] border border-black p-2 text-center align-top">{cells[0][0]}</td><td colSpan={2} className="border border-black p-2 text-center align-top">{cells[1][0]}</td><td className="border border-black p-2 text-center align-top">{cells[2][0]}</td><td className="border border-black p-2 text-center align-top">{cells[3][0]}</td></tr>
    <tr><td className="h-[28px] border border-black p-2 align-top whitespace-pre-wrap">{cells[0][1] || "—"}</td><td colSpan={2} className="border border-black p-2 align-top whitespace-pre-wrap">{cells[1][1] || "—"}</td><td className="border border-black p-2 align-top whitespace-pre-wrap">{cells[2][1] || "—"}</td><td className="border border-black p-2 align-top whitespace-pre-wrap">{cells[3][1] || "—"}</td></tr>
    <tr><td colSpan={2} className="border border-black p-2">Elaborado por:<br />{plan.teacherName || "—"}</td><td colSpan={3} className="border border-black p-2">Aprobado:<br /><br />________________________<br />Coordinador/a de área<br />Fecha de aprobación: {plan.approvalDate?.toLocaleDateString("es-CO") || "—"}</td></tr>
  </tbody></table></section>;
}

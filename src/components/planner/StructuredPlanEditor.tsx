"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { saveStructuredPlan, type StructuredSessionInput } from "../../lib/actions/structured-plan-actions";
import type { StructuredPlanContent } from "../../lib/institutional-format";
import StructuredSessionEditor from "./StructuredSessionEditor";
import { heartbeatPlanPresence, lockPlanSection, unlockPlanSection } from "../../lib/actions/presence-actions";

type InitialPlan = {
  id: string;
  versionNumber: number;
  unitTitle: string;
  area: string;
  subject: string;
  grade: string;
  institutionName: string;
  campusName: string;
  academicYearName: string;
  academicPeriodName: string;
  courseGroupName: string;
  teacherName: string;
  coordinatorName: string;
  status: string;
  formatName: string;
  formatCode: string;
  formatVersion: string;
  elaborationDate: string;
  expectedResults: StructuredPlanContent["expectedResults"];
  evaluationEvidence: StructuredPlanContent["evaluationEvidence"];
  finalReflection: StructuredPlanContent["finalReflection"];
  sessions: StructuredSessionInput[];
};

const sections = [
  ["document-header", "Encabezado"],
  ["expected-results", "Etapa 1 · Resultados"],
  ["assessment-evidence", "Etapa 2 · Evidencias"],
  ["learning-plan", "Etapa 3 · Sesiones"],
  ["reflection", "Etapa 4 · Reflexión"],
] as const;

export default function StructuredPlanEditor({ initialPlan }: { initialPlan: InitialPlan }) {
  const [plan, setPlan] = useState(initialPlan);
  const [activeSection, setActiveSection] = useState("document-header");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error" | "conflict">("saved");
  const [otherEditors, setOtherEditors] = useState<Array<{ name: string; sectionKey: string | null }>>([]);
  const [lockWarning, setLockWarning] = useState("");
  const mounted = useRef(false);
  const versionRef = useRef(initialPlan.versionNumber);
  const content = useMemo<StructuredPlanContent>(() => ({
    expectedResults: plan.expectedResults,
    evaluationEvidence: plan.evaluationEvidence,
    finalReflection: plan.finalReflection,
  }), [plan.expectedResults, plan.evaluationEvidence, plan.finalReflection]);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    setSaveState("saving");
    const timer = window.setTimeout(async () => {
      const result = await saveStructuredPlan({
        id: plan.id, versionNumber: versionRef.current, unitTitle: plan.unitTitle,
        area: plan.area, subject: plan.subject, grade: plan.grade, content,
      });
      if (result.success && result.data) {
        versionRef.current = result.data.versionNumber;
        setPlan((current) => ({ ...current, versionNumber: result.data!.versionNumber }));
        setSaveState("saved");
      } else {
        setSaveState(result.conflict ? "conflict" : "error");
      }
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [plan.unitTitle, plan.area, plan.subject, plan.grade, content, plan.id]);

  const update = <K extends keyof InitialPlan>(key: K, value: InitialPlan[K]) => setPlan((current) => ({ ...current, [key]: value }));
  const updateVersion = useCallback((versionNumber: number) => {
    versionRef.current = versionNumber;
    setPlan((current) => ({ ...current, versionNumber }));
  }, []);

  useEffect(() => {
    const sectionKey = activeSection;
    let active = true;
    const heartbeat = async () => {
      const result = await heartbeatPlanPresence(plan.id, sectionKey);
      if (active && result.success) setOtherEditors(result.editors);
    };
    lockPlanSection(plan.id, sectionKey).then((result) => {
      if (active) setLockWarning(result.success ? "" : result.error || "Sección bloqueada.");
    });
    heartbeat();
    const interval = window.setInterval(heartbeat, 30_000);
    return () => {
      active = false;
      window.clearInterval(interval);
      void unlockPlanSection(plan.id, sectionKey);
    };
  }, [plan.id, activeSection]);

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div><p className="text-xs font-black uppercase tracking-widest text-slate-400">Documento institucional editable</p><h1 className="text-xl font-black">{plan.unitTitle || "Sin título"}</h1></div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-bold ${saveState === "saved" ? "text-emerald-700" : saveState === "saving" ? "text-blue-700" : "text-red-700"}`}>
              {saveState === "saved" ? "Guardado" : saveState === "saving" ? "Guardando…" : saveState === "conflict" ? "Conflicto: recarga la página" : "No se pudo guardar"}
            </span>
            {otherEditors.length > 0 && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">{otherEditors.map((item) => `${item.name}${item.sectionKey ? ` (${item.sectionKey})` : ""}`).join(", ")} editando</span>}
            <Link href={`/plans/${plan.id}/print`} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold">Vista de impresión</Link>
            <Link href={`/plans/${plan.id}/review`} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white">Revisión</Link>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1400px] gap-6 p-4 md:p-6 lg:grid-cols-[250px_1fr]">
        <aside className="h-fit rounded-2xl bg-white p-4 shadow-sm lg:sticky lg:top-24">
          <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">Navegación del documento</p>
          <nav className="space-y-1">{sections.map(([key, name], index) => <a key={key} href={`#${key}`} onClick={() => setActiveSection(key)} className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${activeSection === key ? "bg-slate-950 font-bold text-white" : "text-slate-600 hover:bg-slate-100"}`}>{index + 1}. {name}</a>)}</nav>
          <div className="mt-4 rounded-lg bg-blue-50 p-3 text-xs text-blue-900">Escribe directamente en las celdas. El documento se guarda automáticamente.</div>
        </aside>
        <main className="min-w-0">
          {lockWarning && <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm font-bold text-amber-800">{lockWarning} Puedes consultar, pero evita sobrescribir contenido.</p>}
          <article className="institutional-editor mx-auto min-h-[8.5in] w-full max-w-[11in] bg-white p-[0.5in] text-black shadow-xl">
            <DocumentHeader plan={plan} update={update} onFocus={() => setActiveSection("document-header")} />
            <DocumentStage id="expected-results" title="Etapa 1: Resultados esperados" onFocus={() => setActiveSection("expected-results")}>
              <Expected unitTitle={plan.unitTitle} onTitleChange={(value) => update("unitTitle", value)} value={plan.expectedResults} onChange={(value) => update("expectedResults", value)} />
            </DocumentStage>
            <DocumentStage id="assessment-evidence" title="Etapa 2: Evidencias de evaluación" onFocus={() => setActiveSection("assessment-evidence")}>
              <Evidence value={plan.evaluationEvidence} onChange={(value) => update("evaluationEvidence", value)} />
            </DocumentStage>
            <DocumentStage id="learning-plan" title="Etapa 3: Plan de aprendizaje" onFocus={() => setActiveSection("learning-plan")}>
              <StructuredSessionEditor planId={plan.id} versionNumber={plan.versionNumber} initialSessions={plan.sessions} onVersion={updateVersion} />
              <div className="mt-3 flex flex-wrap gap-2"><Link href="/rubrics" className="rounded border border-black px-3 py-2 font-bold">Gestionar rúbrica</Link><Link href="/activities" className="rounded border border-black px-3 py-2 font-bold">Banco de actividades</Link></div>
            </DocumentStage>
            <DocumentStage id="reflection" title="Etapa 4: Evaluar y reflexionar" onFocus={() => setActiveSection("reflection")}>
              <Reflection value={plan.finalReflection} onChange={(value) => update("finalReflection", value)} />
              <div className="grid grid-cols-[45.71%_54.29%]"><div className="min-h-20 border-x border-b border-black p-2"><strong>Elaborado por:</strong><br />{plan.teacherName || "Profesor responsable"}</div><div className="min-h-20 border-r border-b border-black p-2 text-center"><strong className="block text-left">Aprobado:</strong><br />________________________<br />Coordinador/a de área<br />Fecha de aprobación:</div></div>
            </DocumentStage>
            <p className="mt-2 text-right text-xs">V-21- 11/2025</p>
          </article>
        </main>
      </div>
    </div>
  );
}

function DocumentHeader({ plan, update, onFocus }: { plan: InitialPlan; update: <K extends keyof InitialPlan>(key: K, value: InitialPlan[K]) => void; onFocus: () => void }) {
  const dates = plan.sessions.map((session) => session.plannedDate).filter(Boolean).sort();
  return <section id="document-header" onFocus={onFocus} className="mb-5 scroll-mt-28">
    <table className="w-full border-collapse">
      <colgroup><col style={{ width: "20.53%" }} /><col style={{ width: "9.86%" }} /><col style={{ width: "2.3%" }} /><col style={{ width: "17.8%" }} /><col style={{ width: "1.82%" }} /><col style={{ width: "23.93%" }} /><col style={{ width: "9.91%" }} /><col style={{ width: "13.85%" }} /></colgroup>
      <tbody>
        <tr>
          <td rowSpan={5} className="border border-black p-0 text-center align-top"><Image src="/branding/colegio-san-jose-logo.png" width={120} height={107} alt="Colegio San José" className="mx-auto h-[1.114in] w-[1.25in] object-contain" /></td>
          <td rowSpan={2} colSpan={5} className="border border-black p-3 text-center text-base font-black">PLANEACIÓN</td>
          <td colSpan={2} className="border border-black bg-[#f2f2f2] p-2 text-center text-sm font-bold">Código:</td>
        </tr>
        <tr><td colSpan={2} className="border border-black bg-[#f2f2f2] p-2 text-center text-sm font-black">{plan.formatCode}</td></tr>
        <tr><td colSpan={5} className="border border-black p-0"><label className="flex items-center"><strong className="p-1">Área:</strong><input value={plan.area} onChange={(event) => update("area", event.target.value)} className="min-w-0 flex-1 bg-transparent p-1 outline-none focus:bg-blue-50" /></label></td><td colSpan={2} className="border border-black p-0"><label className="flex items-center"><strong className="p-1">Asignatura:</strong><input value={plan.subject} onChange={(event) => update("subject", event.target.value)} className="min-w-0 flex-1 bg-transparent p-1 outline-none focus:bg-blue-50" /></label></td></tr>
        <tr><th className="border border-black p-1">Fecha</th><td colSpan={3} className="border border-black p-1"><strong>Desde:</strong> {dates[0] || "—"}</td><td className="border border-black p-1"><strong>Hasta:</strong> {dates.at(-1) || "—"}</td><td colSpan={2} className="border border-black p-1 text-center font-bold">Número de sesiones<br />{plan.sessions.length}</td></tr>
        <tr><td colSpan={2} className="border border-black p-0"><label className="flex items-center"><strong className="p-1">Grado:</strong><input value={plan.grade} onChange={(event) => update("grade", event.target.value)} className="min-w-0 flex-1 bg-transparent p-1 outline-none focus:bg-blue-50" /></label></td><td className="border border-black p-1"><strong>Trimestre / Semestre:</strong><br />{plan.academicPeriodName || "—"}</td><td colSpan={2} className="border border-black p-1"><strong>Fecha de elaboración:</strong><br />{plan.elaborationDate}</td><td className="border border-black p-1"><strong>Planeadas:</strong><br />{plan.sessions.length}</td><td className="border border-black p-1"><strong>Completadas:</strong><br />{plan.sessions.filter((session) => session.status === "COMPLETED").length}</td></tr>
      </tbody>
    </table>
  </section>;
}

function Expected({ unitTitle, onTitleChange, value, onChange }: { unitTitle: string; onTitleChange: (value: string) => void; value: StructuredPlanContent["expectedResults"]; onChange: (value: StructuredPlanContent["expectedResults"]) => void }) {
  return <div className="border-x border-b border-black">
    <div className="h-8 border-b border-black" aria-hidden="true" />
    <div className="grid grid-cols-2 border-b border-black"><strong className="bg-[#d9d9d9] p-1">Título de la unidad</strong><input value={unitTitle} onChange={(event) => onTitleChange(event.target.value)} className="bg-transparent p-1 outline-none focus:bg-blue-50" /></div>
    <SourceField title="Objetivo de aprendizaje"><CompactList value={value.learningObjectives} onChange={(items) => onChange({ ...value, learningObjectives: items })} /></SourceField>
    <div className="grid grid-cols-2">
      <div className="border-r border-black">
        <SourceHeading title="Preguntas esenciales" instruction="¿Qué preguntas provocativas fomentarán la investigación sobre el contenido? (preguntas abiertas que estimulan el pensamiento y la investigación vinculados al contenido de la comprensión duradera)" />
        <CompactList value={value.essentialQuestions} onChange={(items) => onChange({ ...value, essentialQuestions: items })} />
      </div>
      <div>
        <SourceHeading title="PBL" instruction="Preguntas abiertas y competencia PBL" />
        <CompactList value={value.pblQuestions} onChange={(items) => onChange({ ...value, pblQuestions: items })} />
        <textarea value={value.pblCompetence} onChange={(event) => onChange({ ...value, pblCompetence: event.target.value })} rows={2} placeholder="Competencia PBL" className="w-full resize-y border-t border-black bg-transparent p-2 italic outline-none focus:bg-blue-50" />
      </div>
    </div>
    <div className="grid grid-cols-2 border-t border-black">
      <div className="border-r border-black"><SourceHeading title="Conocimiento" instruction="¿Qué conocimientos adquirirá el estudiante como resultado de esta unidad?" /><CompactList value={value.knowledge} onChange={(items) => onChange({ ...value, knowledge: items })} /></div>
      <div><SourceHeading title="Habilidades" instruction="Enumerar las habilidades y/o comportamientos relacionados con las competencias que los estudiantes podrán exhibir como resultado de su trabajo en esta unidad." /><CompactList value={value.skills} onChange={(items) => onChange({ ...value, skills: items })} /></div>
    </div>
    <details className="border-t border-black p-2"><summary className="cursor-pointer font-bold">Campos curriculares complementarios</summary><div className="mt-2 divide-y divide-black border border-black"><List label="Competencias institucionales" value={value.institutionalCompetencies} onChange={(items) => onChange({ ...value, institutionalCompetencies: items })} /><List label="Resultados de aprendizaje" value={value.learningResults} onChange={(items) => onChange({ ...value, learningResults: items })} /><List label="Comprensiones duraderas" value={value.enduringUnderstandings} onChange={(items) => onChange({ ...value, enduringUnderstandings: items })} /><List label="Estándares o referentes curriculares" value={value.curricularStandards} onChange={(items) => onChange({ ...value, curricularStandards: items })} /><List label="Indicadores de logro" value={value.achievementIndicators} onChange={(items) => onChange({ ...value, achievementIndicators: items })} /></div></details>
  </div>;
}

function Evidence({ value, onChange }: { value: StructuredPlanContent["evaluationEvidence"]; onChange: (value: StructuredPlanContent["evaluationEvidence"]) => void }) {
  return <div className="border-x border-b border-black">
    <div className="h-8 border-b border-black" aria-hidden="true" />
    <div className="grid grid-cols-2">
      <div className="border-r border-black"><SourceHeading title="Tarea de desempeño" instruction="¿A través de qué tarea auténtica de desempeño los estudiantes demostrarán los entendimientos, conocimientos y habilidades deseados?" /><textarea value={value.performanceTask} onChange={(event) => onChange({ ...value, performanceTask: event.target.value })} rows={7} placeholder="Tarea auténtica de desempeño" className="w-full resize-y bg-transparent p-2 outline-none focus:bg-blue-50" /><textarea value={value.applicationScenario} onChange={(event) => onChange({ ...value, applicationScenario: event.target.value })} rows={3} placeholder="Escenario o situación de aplicación" className="w-full resize-y border-t border-black bg-transparent p-2 outline-none focus:bg-blue-50" /></div>
      <div><SourceHeading title="Otras evidencias" instruction="¿A través de qué otra evidencia los estudiantes demostrarán el logro de los resultados deseados? Incluya evaluaciones formativas y sumativas." /><p className="border-b border-black bg-slate-50 p-1 font-bold">Otras evidencias</p><CompactList value={value.otherEvidence} onChange={(items) => onChange({ ...value, otherEvidence: items })} /><p className="border-y border-black bg-slate-50 p-1 font-bold">Formativas</p><CompactList value={value.formativeAssessments} onChange={(items) => onChange({ ...value, formativeAssessments: items })} /><p className="border-y border-black bg-slate-50 p-1 font-bold">Sumativas</p><CompactList value={value.summativeAssessments} onChange={(items) => onChange({ ...value, summativeAssessments: items })} /></div>
    </div>
    <div className="border-t border-black bg-[#d9d9d9] p-2 text-center font-bold">Adjunte la rúbrica aquí</div>
    <details className="p-2"><summary className="cursor-pointer font-bold">Detalle estructurado de evidencias</summary><div className="mt-2 divide-y divide-black border border-black"><List label="Muestras de trabajo" value={value.workSamples} onChange={(items) => onChange({ ...value, workSamples: items })} /><TextArea label="Observaciones" value={value.observations} onChange={(text) => onChange({ ...value, observations: text })} /><List label="Cuestionarios" value={value.questionnaires} onChange={(items) => onChange({ ...value, questionnaires: items })} /><List label="Pruebas" value={value.tests} onChange={(items) => onChange({ ...value, tests: items })} /><List label="Diarios" value={value.journals} onChange={(items) => onChange({ ...value, journals: items })} /><List label="Criterios de evaluación" value={value.assessmentCriteria} onChange={(items) => onChange({ ...value, assessmentCriteria: items })} /><List label="Instrumentos de evaluación" value={value.assessmentInstruments} onChange={(items) => onChange({ ...value, assessmentInstruments: items })} /></div></details>
  </div>;
}

function List({ label, value, onChange }: { label: string; value: string[]; onChange: (value: string[]) => void }) {
  return <div className="grid min-h-16 grid-cols-[28%_1fr]"><div className="border-r border-black bg-slate-50 p-2 font-bold"><div className="flex flex-wrap items-start justify-between gap-1"><span>{label}</span><button type="button" onClick={() => onChange([...value, ""])} className="text-[10px] font-bold text-blue-700">+ Agregar</button></div></div><div className="space-y-1 p-2">{value.map((item, index) => <div key={index} className="flex gap-1"><span className="pt-1">•</span><textarea value={item} rows={1} onChange={(event) => onChange(value.map((current, currentIndex) => currentIndex === index ? event.target.value : current))} className="min-h-7 w-full resize-y bg-transparent px-1 outline-none focus:bg-blue-50" /><button type="button" onClick={() => onChange(value.filter((_, currentIndex) => currentIndex !== index))} className="px-1 text-red-600" aria-label={`Eliminar ${label} ${index + 1}`}>×</button></div>)}{!value.length && <button type="button" onClick={() => onChange([""])} className="text-left text-slate-400">Haz clic para escribir…</button>}</div></div>;
}

function SourceField({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="border-t border-black"><div className="bg-[#d9d9d9] p-1 font-bold">{title}</div>{children}</div>;
}

function SourceHeading({ title, instruction }: { title: string; instruction: string }) {
  return <div className="min-h-20 border-b border-black bg-[#d9d9d9] p-2 text-center"><strong className="block text-sm">{title}</strong><span className="mt-1 block leading-tight">{instruction}</span></div>;
}

function CompactList({ value, onChange }: { value: string[]; onChange: (value: string[]) => void }) {
  return <div className="min-h-24 space-y-1 p-2">{value.map((item, index) => <div key={index} className="flex gap-1"><span>•</span><textarea rows={1} value={item} onChange={(event) => onChange(value.map((current, currentIndex) => currentIndex === index ? event.target.value : current))} className="min-h-6 w-full resize-y bg-transparent outline-none focus:bg-blue-50" /><button type="button" onClick={() => onChange(value.filter((_, currentIndex) => currentIndex !== index))} className="text-red-600">×</button></div>)}<button type="button" onClick={() => onChange([...value, ""])} className="text-[10px] font-bold text-blue-700">+ Agregar</button></div>;
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="grid min-h-20 grid-cols-[28%_1fr]"><span className="border-r border-black bg-slate-50 p-2 font-bold">{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} placeholder="Haz clic para escribir…" className="w-full resize-y bg-transparent p-2 outline-none focus:bg-blue-50" /></label>; }

function Reflection({ value, onChange }: { value: StructuredPlanContent["finalReflection"]; onChange: (value: StructuredPlanContent["finalReflection"]) => void }) {
  return <div className="border-x border-b border-black">
    <div className="grid grid-cols-[26.72%_26.78%_22.81%_23.69%]">
      <ReflectionCell prompt="¿De qué manera se alinean los objetivos de aprendizaje, las evaluaciones de desempeño y las actividades de instrucción para crear un proceso de aprendizaje cohesivo y significativo?" value={value.alignment} onChange={(text) => onChange({ ...value, alignment: text })} />
      <ReflectionCell prompt="¿Qué ajustes intencionados se hicieron al contenido del currículo, las prácticas de instrucción y/o el entorno para satisfacer las necesidades y diversidades de aprendizaje?" value={value.contentAdjustments} onChange={(text) => onChange({ ...value, contentAdjustments: text })} />
      <ReflectionCell prompt="¿Qué funcionó y qué no funcionó?" value={value.whatWorked} onChange={(text) => onChange({ ...value, whatWorked: text })} />
      <ReflectionCell prompt="Otras observaciones" value={value.otherObservations} onChange={(text) => onChange({ ...value, otherObservations: text })} last />
    </div>
    <details className="border-t border-black p-2"><summary className="cursor-pointer font-bold">Reflexión detallada y cambios recomendados</summary><div className="mt-2 divide-y divide-black border border-black"><TextArea label="Qué no funcionó" value={value.whatDidNotWork} onChange={(text) => onChange({ ...value, whatDidNotWork: text })} /><TextArea label="Ajustes a las prácticas de instrucción" value={value.instructionAdjustments} onChange={(text) => onChange({ ...value, instructionAdjustments: text })} /><TextArea label="Ajustes al entorno de aprendizaje" value={value.environmentAdjustments} onChange={(text) => onChange({ ...value, environmentAdjustments: text })} /><TextArea label="Atención a necesidades y diversidades" value={value.diversityAttention} onChange={(text) => onChange({ ...value, diversityAttention: text })} /><TextArea label="Cambios recomendados" value={value.recommendedChanges} onChange={(text) => onChange({ ...value, recommendedChanges: text })} /><TextArea label="Reflexión final" value={value.finalReflection} onChange={(text) => onChange({ ...value, finalReflection: text })} /></div></details>
  </div>;
}

function ReflectionCell({ prompt, value, onChange, last = false }: { prompt: string; value: string; onChange: (value: string) => void; last?: boolean }) {
  return <label className={`grid min-h-52 grid-rows-[auto_1fr] ${last ? "" : "border-r border-black"}`}><span className="min-h-24 p-2 text-center leading-tight">{prompt}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} className="w-full resize-y border-t border-black bg-transparent p-2 outline-none focus:bg-blue-50" /></label>;
}

function DocumentStage({ id, title, children, onFocus }: { id: string; title: string; children: React.ReactNode; onFocus: () => void }) {
  return <section id={id} onFocus={onFocus} className="mb-6 scroll-mt-28"><h2 className="border border-black bg-slate-300 p-2 text-center text-sm font-black">{title}</h2>{children}</section>;
}

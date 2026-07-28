"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { saveStructuredPlan, type StructuredSessionInput } from "../../lib/actions/structured-plan-actions";
import type { StructuredPlanContent } from "../../lib/institutional-format";
import StructuredSessionEditor from "./StructuredSessionEditor";
import { heartbeatPlanPresence, lockPlanSection, unlockPlanSection } from "../../lib/actions/presence-actions";
import { planStatusLabel } from "../../lib/status-labels";

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
          <article className="institutional-editor mx-auto min-h-[11in] w-full max-w-[8.5in] bg-white p-5 text-[11px] text-black shadow-xl md:p-8">
            <DocumentHeader plan={plan} update={update} onFocus={() => setActiveSection("document-header")} />
            <DocumentStage id="expected-results" title="Etapa 1: Resultados esperados" onFocus={() => setActiveSection("expected-results")}>
              <Expected value={plan.expectedResults} onChange={(value) => update("expectedResults", value)} />
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
              <div className="mt-10 grid grid-cols-2 gap-16 text-center"><div className="border-t border-black pt-2">Elaborado por<br />{plan.teacherName || "Profesor responsable"}</div><div className="border-t border-black pt-2">Aprobado por<br />{plan.coordinatorName || "Coordinación académica"}</div></div>
            </DocumentStage>
          </article>
        </main>
      </div>
    </div>
  );
}

function DocumentHeader({ plan, update, onFocus }: { plan: InitialPlan; update: <K extends keyof InitialPlan>(key: K, value: InitialPlan[K]) => void; onFocus: () => void }) {
  return <section id="document-header" onFocus={onFocus} className="mb-5 scroll-mt-28">
    <table className="w-full border-collapse">
      <tbody>
        <tr><td rowSpan={2} className="w-1/4 border border-black p-3 text-center font-black">{plan.institutionName}</td><td className="border border-black p-2 text-center text-sm font-black">{plan.formatName}</td><td className="w-1/5 border border-black p-2 font-bold">Código: {plan.formatCode}</td></tr>
        <tr><td className="border border-black p-2 text-center font-bold">GESTIÓN ACADÉMICA Y PEDAGÓGICA</td><td className="border border-black p-2 font-bold">Versión: {plan.formatVersion}</td></tr>
      </tbody>
    </table>
    <table className="mt-3 w-full border-collapse">
      <tbody>
        <HeaderRow label="Área" value={plan.area} onChange={(value) => update("area", value)} secondLabel="Asignatura" secondValue={plan.subject} onSecondChange={(value) => update("subject", value)} />
        <HeaderRow label="Grado" value={plan.grade} onChange={(value) => update("grade", value)} secondLabel="Grupo" secondValue={plan.courseGroupName} readOnlySecond />
        <HeaderRow label="Sede" value={plan.campusName} readOnly secondLabel="Año / periodo" secondValue={[plan.academicYearName, plan.academicPeriodName].filter(Boolean).join(" · ")} readOnlySecond />
        <HeaderRow label="Profesor(es)" value={plan.teacherName} readOnly secondLabel="Estado" secondValue={planStatusLabel(plan.status)} readOnlySecond />
        <tr><th className="border border-black bg-slate-100 p-2 text-left">Título de la unidad</th><td colSpan={3} className="border border-black p-0"><input value={plan.unitTitle} onChange={(event) => update("unitTitle", event.target.value)} className="w-full bg-transparent p-2 font-bold outline-none focus:bg-blue-50" /></td></tr>
      </tbody>
    </table>
  </section>;
}

function Expected({ value, onChange }: { value: StructuredPlanContent["expectedResults"]; onChange: (value: StructuredPlanContent["expectedResults"]) => void }) {
  return <div className="divide-y divide-black border-x border-b border-black"><List label="Objetivos de aprendizaje" value={value.learningObjectives} onChange={(items) => onChange({ ...value, learningObjectives: items })} /><List label="Preguntas esenciales" value={value.essentialQuestions} onChange={(items) => onChange({ ...value, essentialQuestions: items })} /><List label="Preguntas PBL" value={value.pblQuestions} onChange={(items) => onChange({ ...value, pblQuestions: items })} /><TextArea label="Competencia PBL" value={value.pblCompetence} onChange={(text) => onChange({ ...value, pblCompetence: text })} /><List label="Conocimientos" value={value.knowledge} onChange={(items) => onChange({ ...value, knowledge: items })} /><List label="Habilidades" value={value.skills} onChange={(items) => onChange({ ...value, skills: items })} /><List label="Competencias institucionales" value={value.institutionalCompetencies} onChange={(items) => onChange({ ...value, institutionalCompetencies: items })} /><List label="Resultados de aprendizaje" value={value.learningResults} onChange={(items) => onChange({ ...value, learningResults: items })} /><List label="Comprensiones duraderas" value={value.enduringUnderstandings} onChange={(items) => onChange({ ...value, enduringUnderstandings: items })} /><List label="Estándares o referentes curriculares" value={value.curricularStandards} onChange={(items) => onChange({ ...value, curricularStandards: items })} /><List label="Indicadores de logro" value={value.achievementIndicators} onChange={(items) => onChange({ ...value, achievementIndicators: items })} /></div>;
}

function Evidence({ value, onChange }: { value: StructuredPlanContent["evaluationEvidence"]; onChange: (value: StructuredPlanContent["evaluationEvidence"]) => void }) {
  return <div className="divide-y divide-black border-x border-b border-black"><TextArea label="Tarea auténtica de desempeño" value={value.performanceTask} onChange={(text) => onChange({ ...value, performanceTask: text })} /><TextArea label="Escenario o situación de aplicación" value={value.applicationScenario} onChange={(text) => onChange({ ...value, applicationScenario: text })} /><List label="Otras evidencias" value={value.otherEvidence} onChange={(items) => onChange({ ...value, otherEvidence: items })} /><List label="Evaluaciones formativas" value={value.formativeAssessments} onChange={(items) => onChange({ ...value, formativeAssessments: items })} /><List label="Evaluaciones sumativas" value={value.summativeAssessments} onChange={(items) => onChange({ ...value, summativeAssessments: items })} /><List label="Muestras de trabajo" value={value.workSamples} onChange={(items) => onChange({ ...value, workSamples: items })} /><TextArea label="Observaciones" value={value.observations} onChange={(text) => onChange({ ...value, observations: text })} /><List label="Cuestionarios" value={value.questionnaires} onChange={(items) => onChange({ ...value, questionnaires: items })} /><List label="Pruebas" value={value.tests} onChange={(items) => onChange({ ...value, tests: items })} /><List label="Diarios" value={value.journals} onChange={(items) => onChange({ ...value, journals: items })} /><List label="Criterios de evaluación" value={value.assessmentCriteria} onChange={(items) => onChange({ ...value, assessmentCriteria: items })} /><List label="Instrumentos de evaluación" value={value.assessmentInstruments} onChange={(items) => onChange({ ...value, assessmentInstruments: items })} /></div>;
}

function List({ label, value, onChange }: { label: string; value: string[]; onChange: (value: string[]) => void }) {
  return <div className="grid min-h-16 grid-cols-[28%_1fr]"><div className="border-r border-black bg-slate-50 p-2 font-bold"><div className="flex flex-wrap items-start justify-between gap-1"><span>{label}</span><button type="button" onClick={() => onChange([...value, ""])} className="text-[10px] font-bold text-blue-700">+ Agregar</button></div></div><div className="space-y-1 p-2">{value.map((item, index) => <div key={index} className="flex gap-1"><span className="pt-1">•</span><textarea value={item} rows={1} onChange={(event) => onChange(value.map((current, currentIndex) => currentIndex === index ? event.target.value : current))} className="min-h-7 w-full resize-y bg-transparent px-1 outline-none focus:bg-blue-50" /><button type="button" onClick={() => onChange(value.filter((_, currentIndex) => currentIndex !== index))} className="px-1 text-red-600" aria-label={`Eliminar ${label} ${index + 1}`}>×</button></div>)}{!value.length && <button type="button" onClick={() => onChange([""])} className="text-left text-slate-400">Haz clic para escribir…</button>}</div></div>;
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="grid min-h-20 grid-cols-[28%_1fr]"><span className="border-r border-black bg-slate-50 p-2 font-bold">{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} placeholder="Haz clic para escribir…" className="w-full resize-y bg-transparent p-2 outline-none focus:bg-blue-50" /></label>; }

function Reflection({ value, onChange }: { value: StructuredPlanContent["finalReflection"]; onChange: (value: StructuredPlanContent["finalReflection"]) => void }) {
  return <div className="divide-y divide-black border-x border-b border-black"><TextArea label="Alineación entre objetivos, evaluaciones y actividades" value={value.alignment} onChange={(text) => onChange({ ...value, alignment: text })} /><TextArea label="Ajustes intencionados al contenido" value={value.contentAdjustments} onChange={(text) => onChange({ ...value, contentAdjustments: text })} /><TextArea label="Ajustes a las prácticas de instrucción" value={value.instructionAdjustments} onChange={(text) => onChange({ ...value, instructionAdjustments: text })} /><TextArea label="Ajustes al entorno de aprendizaje" value={value.environmentAdjustments} onChange={(text) => onChange({ ...value, environmentAdjustments: text })} /><TextArea label="Atención a necesidades y diversidades" value={value.diversityAttention} onChange={(text) => onChange({ ...value, diversityAttention: text })} /><TextArea label="Qué funcionó" value={value.whatWorked} onChange={(text) => onChange({ ...value, whatWorked: text })} /><TextArea label="Qué no funcionó" value={value.whatDidNotWork} onChange={(text) => onChange({ ...value, whatDidNotWork: text })} /><TextArea label="Cambios recomendados" value={value.recommendedChanges} onChange={(text) => onChange({ ...value, recommendedChanges: text })} /><TextArea label="Otras observaciones" value={value.otherObservations} onChange={(text) => onChange({ ...value, otherObservations: text })} /><TextArea label="Reflexión final" value={value.finalReflection} onChange={(text) => onChange({ ...value, finalReflection: text })} /></div>;
}

function DocumentStage({ id, title, children, onFocus }: { id: string; title: string; children: React.ReactNode; onFocus: () => void }) {
  return <section id={id} onFocus={onFocus} className="mb-6 scroll-mt-28"><h2 className="border border-black bg-slate-300 p-2 text-center text-sm font-black">{title}</h2>{children}</section>;
}

function HeaderRow({ label, value, onChange, readOnly = false, secondLabel, secondValue, onSecondChange, readOnlySecond = false }: { label: string; value: string; onChange?: (value: string) => void; readOnly?: boolean; secondLabel: string; secondValue: string; onSecondChange?: (value: string) => void; readOnlySecond?: boolean }) {
  const cell = (current: string, change?: (value: string) => void, locked = false) => locked ? <span className="block p-2">{current || "—"}</span> : <input value={current} onChange={(event) => change?.(event.target.value)} className="w-full bg-transparent p-2 outline-none focus:bg-blue-50" />;
  return <tr><th className="w-[16%] border border-black bg-slate-100 p-2 text-left">{label}</th><td className="w-[34%] border border-black p-0">{cell(value, onChange, readOnly)}</td><th className="w-[16%] border border-black bg-slate-100 p-2 text-left">{secondLabel}</th><td className="w-[34%] border border-black p-0">{cell(secondValue, onSecondChange, readOnlySecond)}</td></tr>;
}

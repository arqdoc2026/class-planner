"use client";

import Link from "next/link";
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
  expectedResults: StructuredPlanContent["expectedResults"];
  evaluationEvidence: StructuredPlanContent["evaluationEvidence"];
  finalReflection: StructuredPlanContent["finalReflection"];
  sessions: StructuredSessionInput[];
};

const steps = ["Información general", "Resultados esperados", "Evidencias", "Sesiones", "Rúbrica", "Coherencia", "Vista previa", "Envío"];

export default function StructuredPlanEditor({ initialPlan }: { initialPlan: InitialPlan }) {
  const [plan, setPlan] = useState(initialPlan);
  const [step, setStep] = useState(0);
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

  const progress = Math.round(((step + 1) / steps.length) * 100);
  const update = <K extends keyof InitialPlan>(key: K, value: InitialPlan[K]) => setPlan((current) => ({ ...current, [key]: value }));
  const updateVersion = useCallback((versionNumber: number) => {
    versionRef.current = versionNumber;
    setPlan((current) => ({ ...current, versionNumber }));
  }, []);

  useEffect(() => {
    const sectionKey = `step-${step + 1}`;
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
  }, [plan.id, step]);

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div><p className="text-xs font-black uppercase tracking-widest text-slate-400">Editor estructurado</p><h1 className="text-xl font-black">{plan.unitTitle || "Sin título"}</h1></div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-bold ${saveState === "saved" ? "text-emerald-700" : saveState === "saving" ? "text-blue-700" : "text-red-700"}`}>
              {saveState === "saved" ? "Guardado" : saveState === "saving" ? "Guardando…" : saveState === "conflict" ? "Conflicto: recarga la página" : "No se pudo guardar"}
            </span>
            {otherEditors.length > 0 && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">{otherEditors.map((item) => `${item.name}${item.sectionKey ? ` (${item.sectionKey})` : ""}`).join(", ")} editando</span>}
            <Link href={`/plans/${plan.id}/review`} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white">Revisión</Link>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 p-6 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-4 h-2 overflow-hidden rounded bg-slate-100"><div className="h-full bg-blue-600" style={{ width: `${progress}%` }} /></div>
          <p className="mb-4 text-xs font-bold text-slate-500">{progress}% del recorrido</p>
          <nav className="space-y-1">{steps.map((name, index) => <button key={name} onClick={() => setStep(index)} className={`w-full rounded-lg px-3 py-2 text-left text-sm ${step === index ? "bg-slate-950 font-bold text-white" : "text-slate-600 hover:bg-slate-100"}`}>{index + 1}. {name}</button>)}</nav>
        </aside>
        <main className="rounded-2xl bg-white p-6 shadow-sm">
          {lockWarning && <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm font-bold text-amber-800">{lockWarning} Puedes consultar, pero evita sobrescribir contenido.</p>}
          {step === 0 && <General plan={plan} update={update} />}
          {step === 1 && <Expected value={plan.expectedResults} onChange={(value) => update("expectedResults", value)} />}
          {step === 2 && <Evidence value={plan.evaluationEvidence} onChange={(value) => update("evaluationEvidence", value)} />}
          {step === 3 && <StructuredSessionEditor planId={plan.id} versionNumber={plan.versionNumber} initialSessions={plan.sessions} onVersion={updateVersion} />}
          {step === 4 && <Placeholder title="Rúbrica" text="Las rúbricas reutilizables y los archivos adjuntos se gestionan desde la planeación y conservan el aislamiento institucional." />}
          {step === 5 && <Placeholder title="Revisión de coherencia" text="Consulta advertencias y recomendaciones en la vista de revisión. No bloquean el guardado." link={`/plans/${plan.id}/review`} />}
          {step === 6 && <Placeholder title="Vista previa institucional" text="La vista de impresión conserva el código y la versión congelados del formato usado por esta planeación." link={`/plans/${plan.id}/print`} />}
          {step === 7 && <Placeholder title="Envío a revisión" text="La validación final, snapshot y envío se realizan en la vista de revisión." link={`/plans/${plan.id}/review`} />}
          <div className="mt-8 flex justify-between border-t border-slate-100 pt-5">
            <button disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))} className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-bold disabled:opacity-40">Anterior</button>
            <button disabled={step === steps.length - 1} onClick={() => setStep((value) => Math.min(steps.length - 1, value + 1))} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">Siguiente</button>
          </div>
        </main>
      </div>
    </div>
  );
}

function General({ plan, update }: { plan: InitialPlan; update: <K extends keyof InitialPlan>(key: K, value: InitialPlan[K]) => void }) {
  return <Section title="Información general"><Text label="Título de la unidad" value={plan.unitTitle} onChange={(value) => update("unitTitle", value)} /><div className="grid gap-4 md:grid-cols-3"><Text label="Área" value={plan.area} onChange={(value) => update("area", value)} /><Text label="Asignatura" value={plan.subject} onChange={(value) => update("subject", value)} /><Text label="Grado" value={plan.grade} onChange={(value) => update("grade", value)} /></div></Section>;
}

function Expected({ value, onChange }: { value: StructuredPlanContent["expectedResults"]; onChange: (value: StructuredPlanContent["expectedResults"]) => void }) {
  return <Section title="Etapa 1: Resultados esperados"><List label="Objetivos de aprendizaje" value={value.learningObjectives} onChange={(items) => onChange({ ...value, learningObjectives: items })} /><List label="Preguntas esenciales" value={value.essentialQuestions} onChange={(items) => onChange({ ...value, essentialQuestions: items })} /><List label="Preguntas PBL" value={value.pblQuestions} onChange={(items) => onChange({ ...value, pblQuestions: items })} /><TextArea label="Competencia PBL" value={value.pblCompetence} onChange={(text) => onChange({ ...value, pblCompetence: text })} /><List label="Conocimientos" value={value.knowledge} onChange={(items) => onChange({ ...value, knowledge: items })} /><List label="Habilidades" value={value.skills} onChange={(items) => onChange({ ...value, skills: items })} /><List label="Resultados de aprendizaje" value={value.learningResults} onChange={(items) => onChange({ ...value, learningResults: items })} /></Section>;
}

function Evidence({ value, onChange }: { value: StructuredPlanContent["evaluationEvidence"]; onChange: (value: StructuredPlanContent["evaluationEvidence"]) => void }) {
  return <Section title="Etapa 2: Evidencias de evaluación"><TextArea label="Tarea auténtica de desempeño" value={value.performanceTask} onChange={(text) => onChange({ ...value, performanceTask: text })} /><TextArea label="Escenario de aplicación" value={value.applicationScenario} onChange={(text) => onChange({ ...value, applicationScenario: text })} /><List label="Evaluaciones formativas" value={value.formativeAssessments} onChange={(items) => onChange({ ...value, formativeAssessments: items })} /><List label="Evaluaciones sumativas" value={value.summativeAssessments} onChange={(items) => onChange({ ...value, summativeAssessments: items })} /><List label="Criterios de evaluación" value={value.assessmentCriteria} onChange={(items) => onChange({ ...value, assessmentCriteria: items })} /><List label="Instrumentos de evaluación" value={value.assessmentInstruments} onChange={(items) => onChange({ ...value, assessmentInstruments: items })} /></Section>;
}

function List({ label, value, onChange }: { label: string; value: string[]; onChange: (value: string[]) => void }) {
  return <div><div className="mb-2 flex items-center justify-between"><label className="text-sm font-bold">{label}</label><button type="button" onClick={() => onChange([...value, ""])} className="text-xs font-bold text-blue-700">+ Agregar</button></div><div className="space-y-2">{value.map((item, index) => <div key={index} className="flex gap-2"><input value={item} onChange={(event) => onChange(value.map((current, currentIndex) => currentIndex === index ? event.target.value : current))} className="w-full rounded-lg border border-slate-300 px-3 py-2" /><button type="button" onClick={() => onChange(value.filter((_, currentIndex) => currentIndex !== index))} className="px-2 text-red-600" aria-label={`Eliminar ${label} ${index + 1}`}>×</button></div>)}</div>{!value.length && <p className="text-sm text-slate-400">Sin elementos. Puedes guardar el borrador incompleto.</p>}</div>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section className="space-y-5"><h2 className="text-2xl font-black">{title}</h2>{children}</section>; }
function Text({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block"><span className="mb-1 block text-sm font-bold">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3" /></label>; }
function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block"><span className="mb-1 block text-sm font-bold">{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} className="w-full rounded-xl border border-slate-300 p-3" /></label>; }
function Placeholder({ title, text, link }: { title: string; text: string; link?: string }) { return <Section title={title}><p className="rounded-xl bg-slate-50 p-5 text-slate-600">{text}</p>{link && <Link href={link} className="inline-block rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white">Abrir módulo</Link>}</Section>; }

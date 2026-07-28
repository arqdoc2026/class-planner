"use client";

import { useEffect, useRef, useState } from "react";
import { saveStructuredSessions, type StructuredSessionInput } from "../../lib/actions/structured-plan-actions";

const ppi = ["Contexto", "Experiencia", "Reflexión", "Acción", "Evaluación"];
const personalization = [
  "Trabajo individual", "Trabajo en parejas", "Trabajo en equipo", "Instrucción de toda la clase",
  "Sesión de intercambio de ideas", "Acompañamiento diferenciado", "Adaptación de recursos",
  "Ajuste de tiempos", "Diferentes formas de participación", "Diferentes formas de demostrar el aprendizaje",
];

export default function StructuredSessionEditor({
  planId, versionNumber, initialSessions, onVersion,
}: {
  planId: string;
  versionNumber: number;
  initialSessions: StructuredSessionInput[];
  onVersion: (version: number) => void;
}) {
  const [sessions, setSessions] = useState(initialSessions);
  const [state, setState] = useState<"saved" | "saving" | "error" | "conflict">("saved");
  const mounted = useRef(false);
  const versionRef = useRef(versionNumber);
  useEffect(() => { versionRef.current = versionNumber; }, [versionNumber]);
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    setState("saving");
    const timer = window.setTimeout(async () => {
      const result = await saveStructuredSessions({ planId, versionNumber: versionRef.current, sessions });
      if (result.success && result.data) {
        versionRef.current = result.data.versionNumber;
        onVersion(result.data.versionNumber);
        setState("saved");
      } else setState(result.conflict ? "conflict" : "error");
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [sessions, planId, onVersion]);

  const change = (index: number, patch: Partial<StructuredSessionInput>) => {
    setSessions((current) => current.map((session, currentIndex) => currentIndex === index ? { ...session, ...patch } : session));
  };
  const addSession = () => setSessions((current) => [...current, emptySession(current.length + 1)]);

  return (
    <section>
      <div className="flex items-center justify-between border-x border-b border-black p-2">
        <p className="text-xs font-bold">{state === "saved" ? "Sesiones guardadas" : state === "saving" ? "Guardando sesiones…" : state === "conflict" ? "Conflicto: recarga antes de continuar" : "Error al guardar"}</p>
        <button onClick={addSession} className="rounded bg-blue-700 px-3 py-1 text-xs font-bold text-white">+ Sesión</button>
      </div>
      <table className="w-full table-fixed border-collapse">
        <colgroup><col style={{ width: "7.86%" }} /><col style={{ width: "15.85%" }} /><col style={{ width: "49.54%" }} /><col style={{ width: "26.75%" }} /></colgroup>
        <thead>
          <tr><td colSpan={4} className="border border-black bg-[#d9d9d9] p-2 text-center leading-tight">El siguiente cuadro debe contener todas las actividades previstas para cada sesión, incluidos los elementos del Paradigma Pedagógico Ignaciano (Contexto, Experiencia, Reflexión, Acción, Evaluación); los instrumentos de la educación personalizada, estrategias de diferenciación y evaluación formativa continua.</td></tr>
          <tr className="bg-[#d9d9d9] text-center font-bold"><th className="border border-black p-2">Sesión</th><th className="border border-black p-2">Resultados de aprendizaje</th><th className="border border-black p-2">Actividades de instrucción</th><th className="border border-black p-2">Recursos</th></tr>
        </thead>
        {sessions.map((session, index) => (
          <tbody key={session.id || `session-${index}`}>
            <tr><td rowSpan={6} className="border border-black p-2 text-center align-top text-lg font-bold">{index + 1}<input type="date" value={session.plannedDate} onChange={(event) => change(index, { plannedDate: event.target.value })} className="mt-2 w-full bg-transparent text-[9px] font-normal outline-none" /></td><td rowSpan={6} className="border border-black p-0 align-top"><textarea value={session.learningResults} onChange={(event) => change(index, { learningResults: event.target.value })} className="min-h-64 w-full resize-y bg-transparent p-2 outline-none focus:bg-blue-50" /></td><th className="border border-black bg-[#d0d0d0] p-1 text-left">Inicio</th><td rowSpan={6} className="border border-black p-0 align-top"><textarea value={session.resources} onChange={(event) => change(index, { resources: event.target.value })} className="min-h-64 w-full resize-y bg-transparent p-2 outline-none focus:bg-blue-50" /></td></tr>
            <tr><td className="border border-black p-0"><textarea value={session.startActivity} onChange={(event) => change(index, { startActivity: event.target.value })} rows={4} className="w-full resize-y bg-transparent p-2 outline-none focus:bg-blue-50" /></td></tr>
            <tr><th className="border border-black bg-[#d0d0d0] p-1 text-left">Actividades de la clase</th></tr>
            <tr><td className="border border-black p-0"><textarea value={session.developmentActivity} onChange={(event) => change(index, { developmentActivity: event.target.value })} rows={4} className="w-full resize-y bg-transparent p-2 outline-none focus:bg-blue-50" /></td></tr>
            <tr><th className="border border-black bg-[#d0d0d0] p-1 text-left">Cierre</th></tr>
            <tr><td className="border border-black p-0"><textarea value={session.closingActivity} onChange={(event) => change(index, { closingActivity: event.target.value })} rows={4} className="w-full resize-y bg-transparent p-2 outline-none focus:bg-blue-50" /></td></tr>
            <tr><td colSpan={4} className="border border-black p-2">
              <details>
                <summary className="cursor-pointer font-bold">Datos complementarios de la sesión {index + 1}</summary>
                <div className="mt-3 space-y-3">
                  <div className="grid gap-2 md:grid-cols-4">
                    <label><span className="block text-xs font-bold">Estado</span><select value={session.status} onChange={(event) => change(index, { status: event.target.value })} className="w-full rounded border p-2"><option value="PLANNED">Planeada</option><option value="IN_PROGRESS">En ejecución</option><option value="COMPLETED">Completada</option><option value="CANCELLED">Cancelada</option></select></label>
                    <Input label="Duración (min)" type="number" value={session.durationMinutes?.toString() || ""} onChange={(value) => change(index, { durationMinutes: Number(value) || null })} />
                    <Input label="Responsable" value={session.responsible} onChange={(value) => change(index, { responsible: value })} />
                    {sessions.length > 1 && <button type="button" onClick={() => setSessions((current) => current.filter((_, currentIndex) => currentIndex !== index))} className="text-sm font-bold text-red-600">Eliminar sesión</button>}
                  </div>
                  <div className="grid gap-2 md:grid-cols-2"><Area label="Evaluación formativa" value={session.formativeAssessment} onChange={(value) => change(index, { formativeAssessment: value })} /><Area label="Diferenciación" value={session.differentiation} onChange={(value) => change(index, { differentiation: value })} /><Area label="Tareas o compromisos" value={session.commitments} onChange={(value) => change(index, { commitments: value })} /><Area label="Evidencias generadas" value={session.generatedEvidence} onChange={(value) => change(index, { generatedEvidence: value })} /><Area label="Observaciones" value={session.observations} onChange={(value) => change(index, { observations: value })} /></div>
                  <Checks label="Paradigma Pedagógico Ignaciano" options={ppi} selected={session.ignatianElements} onChange={(value) => change(index, { ignatianElements: value })} />
                  <Checks label="Educación personalizada" options={personalization} selected={session.personalizationStrategies} onChange={(value) => change(index, { personalizationStrategies: value })} />
                  <div className="space-y-3 bg-slate-50 p-3">
            <div className="flex justify-between"><h4 className="font-black">Actividades estructuradas</h4><button onClick={() => change(index, { activities: [...session.activities, emptyActivity()] })} className="text-sm font-bold text-blue-700">+ Actividad</button></div>
            {session.activities.map((activity, activityIndex) => (
              <div key={activity.id || `activity-${activityIndex}`} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex justify-between"><strong>Actividad {activityIndex + 1}</strong><button onClick={() => change(index, { activities: session.activities.filter((_, current) => current !== activityIndex) })} className="text-xs font-bold text-red-600">Eliminar</button></div>
                <div className="grid gap-3 md:grid-cols-3">
                  <Input label="Título" value={activity.title} onChange={(value) => updateActivity(session, index, activityIndex, { title: value }, change)} />
                  <Input label="Momento" value={activity.classMoment} onChange={(value) => updateActivity(session, index, activityIndex, { classMoment: value }, change)} />
                  <Input label="Tiempo (min)" type="number" value={activity.estimatedMinutes?.toString() || ""} onChange={(value) => updateActivity(session, index, activityIndex, { estimatedMinutes: Number(value) || null }, change)} />
                </div>
                <Area label="Descripción" value={activity.description} onChange={(value) => updateActivity(session, index, activityIndex, { description: value }, change)} />
                <div className="grid gap-3 md:grid-cols-2">
                  <Input label="Agrupación" value={activity.groupingType} onChange={(value) => updateActivity(session, index, activityIndex, { groupingType: value }, change)} />
                  <Input label="Recursos" value={activity.resources} onChange={(value) => updateActivity(session, index, activityIndex, { resources: value }, change)} />
                  <Area label="Propósito pedagógico" value={activity.pedagogicalPurpose} onChange={(value) => updateActivity(session, index, activityIndex, { pedagogicalPurpose: value }, change)} />
                  <Area label="Evidencia esperada" value={activity.expectedEvidence} onChange={(value) => updateActivity(session, index, activityIndex, { expectedEvidence: value }, change)} />
                  <Area label="Estrategia de evaluación" value={activity.assessmentStrategy} onChange={(value) => updateActivity(session, index, activityIndex, { assessmentStrategy: value }, change)} />
                  <Area label="Estrategia de diferenciación" value={activity.differentiationStrategy} onChange={(value) => updateActivity(session, index, activityIndex, { differentiationStrategy: value }, change)} />
                </div>
              </div>
            ))}
                  </div>
                </div>
              </details>
            </td></tr>
          </tbody>
        ))}
      </table>
    </section>
  );
}

function updateActivity(session: StructuredSessionInput, sessionIndex: number, activityIndex: number, patch: Partial<StructuredSessionInput["activities"][number]>, change: (index: number, patch: Partial<StructuredSessionInput>) => void) {
  change(sessionIndex, { activities: session.activities.map((activity, index) => index === activityIndex ? { ...activity, ...patch } : activity) });
}
function emptyActivity() { return { title: "", description: "", classMoment: "DEVELOPMENT", estimatedMinutes: null, groupingType: "", resources: "", pedagogicalPurpose: "", expectedEvidence: "", assessmentStrategy: "", differentiationStrategy: "", ignatianElements: [] }; }
function emptySession(index: number): StructuredSessionInput { return { id: `new-${Date.now()}-${index}`, plannedDate: "", status: "PLANNED", durationMinutes: null, learningResults: "", resources: "", observations: "", responsible: "", startActivity: "", developmentActivity: "", closingActivity: "", formativeAssessment: "", differentiation: "", individualWork: "", teamwork: "", wholeClassInstruction: "", exchangeOfIdeas: "", commitments: "", generatedEvidence: "", ignatianElements: [], personalizationStrategies: [], activities: [] }; }
function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) { return <label className="block"><span className="mb-1 block text-xs font-bold text-slate-600">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>; }
function Area({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block"><span className="mb-1 block text-xs font-bold text-slate-600">{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} className="w-full rounded-lg border border-slate-300 p-2 text-sm" /></label>; }
function Checks({ label, options, selected, onChange }: { label: string; options: string[]; selected: string[]; onChange: (value: string[]) => void }) { return <fieldset><legend className="mb-2 text-sm font-black">{label}</legend><div className="flex flex-wrap gap-2">{options.map((option) => <label key={option} className={`cursor-pointer rounded-full border px-3 py-1 text-xs ${selected.includes(option) ? "border-blue-700 bg-blue-50 text-blue-700" : "border-slate-200"}`}><input className="sr-only" type="checkbox" checked={selected.includes(option)} onChange={() => onChange(selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option])} />{option}</label>)}</div></fieldset>; }

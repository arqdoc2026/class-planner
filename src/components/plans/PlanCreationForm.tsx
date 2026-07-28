"use client";

import Link from "next/link";
import { type FormEvent, useMemo, useState } from "react";
import { createStructuredPlan } from "../../lib/actions/structured-plan-actions";

type Option = { id: string; name: string };
type Area = Option & { subjects: Option[] };
type Grade = Option & { groups: Option[] };
type Year = Option & { periods: Option[] };

const selectClass = "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";

export default function PlanCreationForm({
  campuses,
  areas,
  grades,
  years,
}: {
  campuses: Option[];
  areas: Area[];
  grades: Grade[];
  years: Year[];
}) {
  const [areaId, setAreaId] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [yearId, setYearId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const subjects = useMemo(() => areas.find((area) => area.id === areaId)?.subjects || [], [areaId, areas]);
  const groups = useMemo(() => grades.find((grade) => grade.id === gradeId)?.groups || [], [gradeId, grades]);
  const periods = useMemo(() => years.find((year) => year.id === yearId)?.periods || [], [yearId, years]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const result = await createStructuredPlan(new FormData(event.currentTarget));
      if (result?.success === false) setError(result.error);
    } catch {
      setError("No fue posible crear la planeación. Intenta nuevamente.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field name="unitTitle" label="Título de la unidad" />
      <Select name="campusId" label="Sede" options={campuses} placeholder="Selecciona una sede" />
      <Select name="academicAreaId" label="Área" options={areas} placeholder="Selecciona un área" value={areaId} onChange={setAreaId} />
      <Select name="academicSubjectId" label="Asignatura" options={subjects} placeholder={areaId ? "Selecciona una asignatura" : "Primero selecciona el área"} disabled={!areaId} />
      <Select name="academicGradeId" label="Grado" options={grades} placeholder="Selecciona un grado" value={gradeId} onChange={setGradeId} />
      <Select name="courseGroupId" label="Grupo" options={groups} placeholder={gradeId ? "Selecciona un grupo" : "Primero selecciona el grado"} disabled={!gradeId} />
      <Select name="academicYearId" label="Año lectivo" options={years} placeholder="Selecciona un año lectivo" value={yearId} onChange={setYearId} />
      <Select name="academicPeriodId" label="Periodo" options={periods} placeholder={yearId ? "Selecciona un periodo" : "Primero selecciona el año lectivo"} disabled={!yearId} />
      <div className="flex flex-wrap gap-3 pt-2">
        <button disabled={pending} className="rounded-xl bg-slate-950 px-6 py-3 font-bold text-white disabled:opacity-50">{pending ? "Creando…" : "Crear y continuar"}</button>
        <Link href="/overview" className="rounded-xl bg-slate-100 px-6 py-3 font-bold text-slate-700">Cancelar</Link>
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p>}
    </form>
  );
}

function Select({
  name,
  label,
  options,
  placeholder,
  disabled = false,
  value,
  onChange,
}: {
  name: string;
  label: string;
  options: Option[];
  placeholder: string;
  disabled?: boolean;
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-slate-700">{label}</span>
      <select
        name={name}
        required
        disabled={disabled}
        value={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        className={selectClass}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
      </select>
    </label>
  );
}

function Field({ name, label }: { name: string; label: string }) {
  return <label className="block"><span className="mb-1 block text-sm font-bold text-slate-700">{label}</span><input name={name} required maxLength={1_000} className="w-full rounded-xl border border-slate-300 px-4 py-3" /></label>;
}

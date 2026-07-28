"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPlatformCatalogEntry } from "../../lib/actions/platform-actions";

type Option = { id: string; name: string };
type CatalogData = {
  campuses: Option[];
  areas: Array<Option & { subjects: Option[] }>;
  grades: Array<Option & { groups: Option[] }>;
  years: Array<Option & { periods: Option[] }>;
};
type Kind = "campus" | "area" | "subject" | "grade" | "group" | "year" | "period";

const inputClass = "min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white";
const buttonClass = "rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50";

export default function SuperAdminCatalogManager({ institutionId, data }: { institutionId: string; data: CatalogData }) {
  const router = useRouter();
  const [pending, setPending] = useState<Kind | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(kind: Kind, formData: FormData) {
    setPending(kind);
    setMessage(null);
    const values = Object.fromEntries(Array.from(formData.entries()).map(([key, value]) => [key, String(value)]));
    const result = await createPlatformCatalogEntry({ institutionId, kind, values });
    setMessage({ ok: result.success, text: result.success ? "Registro creado correctamente." : result.error || "No se pudo crear." });
    setPending(null);
    if (result.success) {
      (document.getElementById(`catalog-${kind}`) as HTMLFormElement | null)?.reset();
      router.refresh();
    }
  }

  return (
    <section className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div><h2 className="text-lg font-black">Configuración académica</h2><p className="mt-1 text-sm text-slate-400">Los profesores verán estos datos al crear una planeación.</p></div>
      {message && <p role="status" className={`rounded-lg p-3 text-sm font-bold ${message.ok ? "bg-emerald-950 text-emerald-300" : "bg-red-950 text-red-300"}`}>{message.text}</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        <CatalogCard title="Sedes" items={data.campuses.map((item) => item.name)}>
          <CatalogForm id="catalog-campus" action={(formData) => submit("campus", formData)}>
            <input name="name" required placeholder="Nombre de la sede" className={inputClass} />
            <input name="code" placeholder="Código" className={inputClass} />
            <Submit pending={pending === "campus"} />
          </CatalogForm>
        </CatalogCard>
        <CatalogCard title="Áreas" items={data.areas.map((item) => item.name)}>
          <CatalogForm id="catalog-area" action={(formData) => submit("area", formData)}>
            <input name="name" required placeholder="Nombre del área" className={inputClass} />
            <input name="code" placeholder="Código" className={inputClass} />
            <Submit pending={pending === "area"} />
          </CatalogForm>
        </CatalogCard>
        <CatalogCard title="Asignaturas" items={data.areas.flatMap((area) => area.subjects.map((subject) => `${area.name} · ${subject.name}`))}>
          <CatalogForm id="catalog-subject" action={(formData) => submit("subject", formData)}>
            <select name="parentId" required className={inputClass}><option value="">Selecciona área</option>{data.areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select>
            <input name="name" required placeholder="Asignatura" className={inputClass} />
            <Submit pending={pending === "subject"} />
          </CatalogForm>
        </CatalogCard>
        <CatalogCard title="Grados" items={data.grades.map((item) => item.name)}>
          <CatalogForm id="catalog-grade" action={(formData) => submit("grade", formData)}>
            <input name="name" required placeholder="Grado" className={inputClass} />
            <input name="level" type="number" placeholder="Orden" className={inputClass} />
            <Submit pending={pending === "grade"} />
          </CatalogForm>
        </CatalogCard>
        <CatalogCard title="Grupos" items={data.grades.flatMap((grade) => grade.groups.map((group) => `${grade.name} · ${group.name}`))}>
          <CatalogForm id="catalog-group" action={(formData) => submit("group", formData)}>
            <select name="parentId" required className={inputClass}><option value="">Selecciona grado</option>{data.grades.map((grade) => <option key={grade.id} value={grade.id}>{grade.name}</option>)}</select>
            <input name="name" required placeholder="Grupo A" className={inputClass} />
            <Submit pending={pending === "group"} />
          </CatalogForm>
        </CatalogCard>
        <CatalogCard title="Años lectivos" items={data.years.map((item) => item.name)}>
          <CatalogForm id="catalog-year" action={(formData) => submit("year", formData)}>
            <input name="name" required placeholder="2026" className={inputClass} />
            <input name="startDate" type="date" required className={inputClass} />
            <input name="endDate" type="date" required className={inputClass} />
            <Submit pending={pending === "year"} />
          </CatalogForm>
        </CatalogCard>
        <CatalogCard title="Periodos" items={data.years.flatMap((year) => year.periods.map((period) => `${year.name} · ${period.name}`))}>
          <CatalogForm id="catalog-period" action={(formData) => submit("period", formData)}>
            <select name="parentId" required className={inputClass}><option value="">Selecciona año</option>{data.years.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}</select>
            <input name="name" required placeholder="Primer periodo" className={inputClass} />
            <input name="sequence" type="number" min={1} required placeholder="Orden" className={inputClass} />
            <select name="periodType" className={inputClass}><option value="PERIOD">Periodo</option><option value="TRIMESTER">Trimestre</option><option value="SEMESTER">Semestre</option></select>
            <input name="startDate" type="date" required className={inputClass} />
            <input name="endDate" type="date" required className={inputClass} />
            <Submit pending={pending === "period"} />
          </CatalogForm>
        </CatalogCard>
      </div>
    </section>
  );
}

function CatalogForm({ id, action, children }: { id: string; action: (formData: FormData) => void | Promise<void>; children: React.ReactNode }) {
  return <form id={id} action={action} className="flex flex-wrap gap-2">{children}</form>;
}
function Submit({ pending }: { pending: boolean }) {
  return <button disabled={pending} className={buttonClass}>{pending ? "Guardando…" : "Agregar"}</button>;
}
function CatalogCard({ title, items, children }: { title: string; items: string[]; children: React.ReactNode }) {
  return <article className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4"><h3 className="font-black">{title}</h3>{children}<div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto">{items.length ? items.map((item) => <span key={item} className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">{item}</span>) : <span className="text-xs text-amber-300">Sin registros</span>}</div></article>;
}

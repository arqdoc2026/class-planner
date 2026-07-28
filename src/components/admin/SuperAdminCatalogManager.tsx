"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPlatformCatalogEntry, updatePlatformCatalogEntry } from "../../lib/actions/platform-actions";

type Option = { id: string; name: string; code?: string | null; active?: boolean };
type Subject = Option & { areaId: string };
type Group = Option & { gradeId: string };
type Period = Option & { academicYearId: string; sequence: number; startDate: string; endDate: string; periodType: string };
type CatalogData = {
  campuses: Option[];
  areas: Array<Option & { subjects: Subject[] }>;
  grades: Array<Option & { level?: number | null; groups: Group[] }>;
  years: Array<Option & { startDate: string; endDate: string; periods: Period[] }>;
};
type Kind = "campus" | "area" | "subject" | "grade" | "group" | "year" | "period";
type EditableItem = Option & {
  kind: Kind;
  parentId?: string;
  level?: number | null;
  startDate?: string;
  endDate?: string;
  sequence?: number;
  periodType?: string;
};

const inputClass = "min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white";
const buttonClass = "rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50";

export default function SuperAdminCatalogManager({ institutionId, data }: { institutionId: string; data: CatalogData }) {
  const router = useRouter();
  const [pending, setPending] = useState<Kind | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [editing, setEditing] = useState<EditableItem | null>(null);

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

  async function update(formData: FormData) {
    if (!editing) return;
    setPending(editing.kind);
    setMessage(null);
    const values = Object.fromEntries(Array.from(formData.entries()).map(([key, value]) => [key, String(value)]));
    const result = await updatePlatformCatalogEntry({ institutionId, kind: editing.kind, id: editing.id, values });
    setMessage({ ok: result.success, text: result.success ? "Registro actualizado correctamente." : result.error || "No se pudo actualizar." });
    setPending(null);
    if (result.success) {
      setEditing(null);
      router.refresh();
    }
  }

  const campusItems: EditableItem[] = data.campuses.map((item) => ({ ...item, kind: "campus" }));
  const areaItems: EditableItem[] = data.areas.map((item) => ({ ...item, kind: "area" }));
  const subjectItems: EditableItem[] = data.areas.flatMap((area) => area.subjects.map((item) => ({ ...item, kind: "subject", parentId: area.id })));
  const gradeItems: EditableItem[] = data.grades.map((item) => ({ ...item, kind: "grade" }));
  const groupItems: EditableItem[] = data.grades.flatMap((grade) => grade.groups.map((item) => ({ ...item, kind: "group", parentId: grade.id })));
  const yearItems: EditableItem[] = data.years.map((item) => ({ ...item, kind: "year" }));
  const periodItems: EditableItem[] = data.years.flatMap((year) => year.periods.map((item) => ({ ...item, kind: "period", parentId: year.id })));

  return (
    <section className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div><h2 className="text-lg font-black">Configuración académica</h2><p className="mt-1 text-sm text-slate-400">Los profesores verán estos datos al crear una planeación.</p></div>
      {message && <p role="status" className={`rounded-lg p-3 text-sm font-bold ${message.ok ? "bg-emerald-950 text-emerald-300" : "bg-red-950 text-red-300"}`}>{message.text}</p>}
      {editing && <EditPanel item={editing} data={data} pending={pending === editing.kind} onSubmit={update} onCancel={() => setEditing(null)} />}
      <div className="grid gap-4 lg:grid-cols-2">
        <CatalogCard title="Sedes" items={campusItems} onEdit={setEditing}>
          <CatalogForm id="catalog-campus" action={(formData) => submit("campus", formData)}>
            <input name="name" required placeholder="Nombre de la sede" className={inputClass} />
            <input name="code" placeholder="Código" className={inputClass} />
            <Submit pending={pending === "campus"} />
          </CatalogForm>
        </CatalogCard>
        <CatalogCard title="Áreas" items={areaItems} onEdit={setEditing}>
          <CatalogForm id="catalog-area" action={(formData) => submit("area", formData)}>
            <input name="name" required placeholder="Nombre del área" className={inputClass} />
            <input name="code" placeholder="Código" className={inputClass} />
            <Submit pending={pending === "area"} />
          </CatalogForm>
        </CatalogCard>
        <CatalogCard title="Asignaturas" items={subjectItems} onEdit={setEditing} label={(item) => `${data.areas.find((area) => area.id === item.parentId)?.name} · ${item.name}`}>
          <CatalogForm id="catalog-subject" action={(formData) => submit("subject", formData)}>
            <select name="parentId" required className={inputClass}><option value="">Selecciona área</option>{data.areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select>
            <input name="name" required placeholder="Asignatura" className={inputClass} />
            <Submit pending={pending === "subject"} />
          </CatalogForm>
        </CatalogCard>
        <CatalogCard title="Grados" items={gradeItems} onEdit={setEditing}>
          <CatalogForm id="catalog-grade" action={(formData) => submit("grade", formData)}>
            <input name="name" required placeholder="Grado" className={inputClass} />
            <input name="level" type="number" placeholder="Orden" className={inputClass} />
            <Submit pending={pending === "grade"} />
          </CatalogForm>
        </CatalogCard>
        <CatalogCard title="Grupos" items={groupItems} onEdit={setEditing} label={(item) => `${data.grades.find((grade) => grade.id === item.parentId)?.name} · ${item.name}`}>
          <CatalogForm id="catalog-group" action={(formData) => submit("group", formData)}>
            <select name="parentId" required className={inputClass}><option value="">Selecciona grado</option>{data.grades.map((grade) => <option key={grade.id} value={grade.id}>{grade.name}</option>)}</select>
            <input name="name" required placeholder="Grupo A" className={inputClass} />
            <Submit pending={pending === "group"} />
          </CatalogForm>
        </CatalogCard>
        <CatalogCard title="Años lectivos" items={yearItems} onEdit={setEditing}>
          <CatalogForm id="catalog-year" action={(formData) => submit("year", formData)}>
            <input name="name" required placeholder="2026" className={inputClass} />
            <input name="startDate" type="date" required className={inputClass} />
            <input name="endDate" type="date" required className={inputClass} />
            <Submit pending={pending === "year"} />
          </CatalogForm>
        </CatalogCard>
        <CatalogCard title="Periodos" items={periodItems} onEdit={setEditing} label={(item) => `${data.years.find((year) => year.id === item.parentId)?.name} · ${item.name}`}>
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
function CatalogCard({ title, items, children, onEdit, label = (item) => item.name }: { title: string; items: EditableItem[]; children: React.ReactNode; onEdit: (item: EditableItem) => void; label?: (item: EditableItem) => string }) {
  return <article className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4"><h3 className="font-black">{title}</h3>{children}<div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto">{items.length ? items.map((item) => <button type="button" key={item.id} onClick={() => onEdit(item)} className="rounded-full bg-slate-800 px-3 py-1 text-left text-xs text-slate-300 hover:bg-blue-900 hover:text-white">{label(item)} · Editar</button>) : <span className="text-xs text-amber-300">Sin registros</span>}</div></article>;
}

function EditPanel({ item, data, pending, onSubmit, onCancel }: { item: EditableItem; data: CatalogData; pending: boolean; onSubmit: (formData: FormData) => void | Promise<void>; onCancel: () => void }) {
  const hasActive = item.kind !== "period";
  return (
    <form key={`${item.kind}-${item.id}`} action={onSubmit} className="space-y-3 rounded-xl border border-blue-700 bg-slate-950 p-4">
      <div className="flex items-center justify-between gap-3"><h3 className="font-black">Editar {kindLabel(item.kind)}</h3><button type="button" onClick={onCancel} className="text-sm font-bold text-slate-400">Cerrar</button></div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {(item.kind === "subject" || item.kind === "group" || item.kind === "period") && (
          <select name="parentId" required defaultValue={item.parentId} className={inputClass}>
            {(item.kind === "subject" ? data.areas : item.kind === "group" ? data.grades : data.years).map((parent) => <option key={parent.id} value={parent.id}>{parent.name}</option>)}
          </select>
        )}
        <input name="name" required defaultValue={item.name} aria-label="Nombre" className={inputClass} />
        {(item.kind === "campus" || item.kind === "area" || item.kind === "subject") && <input name="code" defaultValue={item.code || ""} placeholder="Código" aria-label="Código" className={inputClass} />}
        {item.kind === "grade" && <input name="level" type="number" defaultValue={item.level ?? ""} placeholder="Orden" aria-label="Orden del grado" className={inputClass} />}
        {(item.kind === "year" || item.kind === "period") && <input name="startDate" type="date" required defaultValue={item.startDate} aria-label="Fecha inicial" className={inputClass} />}
        {(item.kind === "year" || item.kind === "period") && <input name="endDate" type="date" required defaultValue={item.endDate} aria-label="Fecha final" className={inputClass} />}
        {item.kind === "period" && <input name="sequence" type="number" min={1} required defaultValue={item.sequence} aria-label="Orden del periodo" className={inputClass} />}
        {item.kind === "period" && <select name="periodType" defaultValue={item.periodType} className={inputClass}><option value="PERIOD">Periodo</option><option value="TRIMESTER">Trimestre</option><option value="SEMESTER">Semestre</option></select>}
        {hasActive && <select name="active" defaultValue={String(item.active !== false)} className={inputClass}><option value="true">Activo</option><option value="false">Inactivo</option></select>}
      </div>
      <button disabled={pending} className={buttonClass}>{pending ? "Actualizando…" : "Guardar cambios"}</button>
    </form>
  );
}

function kindLabel(kind: Kind) {
  return ({ campus: "sede", area: "área", subject: "asignatura", grade: "grado", group: "grupo", year: "año lectivo", period: "periodo" } as const)[kind];
}

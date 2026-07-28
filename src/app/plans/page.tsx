import Link from "next/link";
import { savePlanFilter, searchInstitutionPlans } from "../../lib/actions/discovery-actions";

const statusOptions = ["DRAFT", "IN_PROGRESS", "READY_FOR_REVIEW", "IN_REVIEW", "CHANGES_REQUESTED", "CORRECTED", "APPROVED", "ARCHIVED"];

export default async function PlansPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const value = (key: string) => typeof raw[key] === "string" ? raw[key] as string : "";
  const filters = {
    query: value("query"), status: value("status"), area: value("area"), subject: value("subject"), grade: value("grade"),
    campusId: value("campusId"), academicYearId: value("academicYearId"), academicPeriodId: value("academicPeriodId"),
    groupId: value("groupId"), authorId: value("authorId"), coordinatorId: value("coordinatorId"),
    dateFrom: value("dateFrom"), dateTo: value("dateTo"), shared: value("shared") === "true",
    reviewRequired: value("reviewRequired") === "true", commentsPending: value("commentsPending") === "true",
    page: Number(value("page")) || 1,
  };
  const data = await searchInstitutionPlans(filters);
  const areas = unique(data.facets.map((item) => item.area));
  const subjects = unique(data.facets.map((item) => item.subject));
  const grades = unique(data.facets.map((item) => item.grade));
  return (
    <main className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-xs font-black uppercase tracking-widest text-slate-400">Repositorio institucional</p><h1 className="text-3xl font-black">Planeaciones</h1></div>
          <div className="flex gap-2"><Link href="/overview" className="rounded-lg bg-white px-4 py-2 font-bold">Resumen</Link><Link href="/plans/new" className="rounded-lg bg-slate-950 px-4 py-2 font-bold text-white">Nueva planeación</Link></div>
        </header>
        <form className="grid gap-3 rounded-2xl bg-white p-5 shadow-sm md:grid-cols-4">
          <input name="query" defaultValue={filters.query} placeholder="Título, área o asignatura" className="rounded-lg border border-slate-300 px-3 py-2 md:col-span-2" />
          <Select name="status" value={filters.status} options={statusOptions} label="Estado" />
          <Select name="area" value={filters.area} options={areas} label="Área" />
          <Select name="subject" value={filters.subject} options={subjects} label="Asignatura" />
          <Select name="grade" value={filters.grade} options={grades} label="Grado" />
          <IdSelect name="campusId" value={filters.campusId} options={data.campuses} label="Sede" />
          <IdSelect name="academicYearId" value={filters.academicYearId} options={data.years} label="Año lectivo" />
          <IdSelect name="academicPeriodId" value={filters.academicPeriodId} options={data.years.flatMap((year) => year.periods)} label="Periodo" />
          <IdSelect name="groupId" value={filters.groupId} options={data.grades.flatMap((grade) => grade.groups.map((group) => ({ id: group.id, name: `${grade.name} · ${group.name}` })))} label="Grupo" />
          <IdSelect name="authorId" value={filters.authorId} options={data.people.map((item) => ({ id: item.profile.id, name: item.profile.fullName }))} label="Profesor" />
          <IdSelect name="coordinatorId" value={filters.coordinatorId} options={data.people.filter((item) => item.role === "COORDINATOR").map((item) => ({ id: item.profile.id, name: item.profile.fullName }))} label="Coordinador" />
          <input type="date" name="dateFrom" defaultValue={filters.dateFrom} aria-label="Fecha desde" className="rounded-lg border border-slate-300 px-3 py-2" />
          <input type="date" name="dateTo" defaultValue={filters.dateTo} aria-label="Fecha hasta" className="rounded-lg border border-slate-300 px-3 py-2" />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="shared" value="true" defaultChecked={filters.shared} /> Compartidas conmigo</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="reviewRequired" value="true" defaultChecked={filters.reviewRequired} /> Requieren revisión</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="commentsPending" value="true" defaultChecked={filters.commentsPending} /> Comentarios pendientes</label>
          <button className="rounded-lg bg-blue-700 px-4 py-2 font-bold text-white">Filtrar</button>
          <Link href="/plans" className="rounded-lg bg-slate-100 px-4 py-2 text-center font-bold">Limpiar</Link>
        </form>
        <form action={async (formData) => { "use server"; await savePlanFilter(formData); }} className="flex flex-wrap gap-2 rounded-2xl bg-white p-4">
          <input name="name" required placeholder="Nombre del filtro" className="rounded-lg border border-slate-300 px-3 py-2" />
          {Object.entries(filters).filter(([key]) => key !== "page").map(([key, current]) => <input key={key} type="hidden" name={key} value={String(current)} />)}
          <button className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold text-white">Guardar filtro actual</button>
          {data.savedFilters.map((filter) => <Link key={filter.id} href={`/plans?${new URLSearchParams(filter.filters as Record<string, string>).toString()}`} className="rounded-full bg-slate-100 px-3 py-2 text-xs font-bold">{filter.name}</Link>)}
        </form>
        <p className="text-sm font-bold text-slate-500">{data.total} resultado(s)</p>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Unidad</th><th className="p-4">Clasificación</th><th className="p-4">Periodo / sede</th><th className="p-4">Responsable</th><th className="p-4">Estado</th><th className="p-4">Acciones</th></tr></thead>
            <tbody>{data.plans.map((plan) => <tr key={plan.id} className="border-t border-slate-100"><td className="p-4 font-bold">{plan.unitTitle || "Sin título"}</td><td className="p-4 text-slate-600">{[plan.area, plan.subject, plan.grade, plan.courseGroup?.name].filter(Boolean).join(" · ")}</td><td className="p-4 text-slate-600">{[plan.academicYear?.name, plan.academicPeriod?.name, plan.campus?.name].filter(Boolean).join(" · ") || "Sin clasificar"}</td><td className="p-4">{plan.author?.fullName || "Sin asignar"}</td><td className="p-4"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{plan.status}</span></td><td className="p-4"><div className="flex gap-2"><Link href={`/plans/${plan.id}/edit`} className="font-bold text-blue-700">Editar</Link><Link href={`/plans/${plan.id}/review`} className="font-bold text-violet-700">Revisar</Link></div></td></tr>)}</tbody>
          </table>
          {!data.plans.length && <p className="p-8 text-center text-slate-500">No hay planeaciones que coincidan.</p>}
        </div>
        <nav className="flex justify-center gap-3"><PageLink page={data.page - 1} disabled={data.page <= 1} filters={filters}>Anterior</PageLink><span className="px-3 py-2 text-sm">Página {data.page} de {data.pages}</span><PageLink page={data.page + 1} disabled={data.page >= data.pages} filters={filters}>Siguiente</PageLink></nav>
      </div>
    </main>
  );
}

function unique(values: Array<string | null>) { return Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort(); }
function Select({ name, value, options, label }: { name: string; value: string; options: string[]; label: string }) { return <select name={name} defaultValue={value} className="rounded-lg border border-slate-300 px-3 py-2"><option value="">{label}: todos</option>{options.map((option) => <option key={option}>{option}</option>)}</select>; }
function IdSelect({ name, value, options, label }: { name: string; value: string; options: Array<{ id: string; name: string }>; label: string }) { return <select name={name} defaultValue={value} className="rounded-lg border border-slate-300 px-3 py-2"><option value="">{label}: todos</option>{options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select>; }
function PageLink({ page, disabled, filters, children }: { page: number; disabled: boolean; filters: Record<string, string | number | boolean>; children: React.ReactNode }) { const params = new URLSearchParams(Object.entries({ ...filters, page }).filter(([, value]) => Boolean(value)).map(([key, value]) => [key, String(value)])); return disabled ? <span className="rounded-lg bg-slate-200 px-4 py-2 text-sm text-slate-400">{children}</span> : <Link href={`/plans?${params}`} className="rounded-lg bg-white px-4 py-2 text-sm font-bold">{children}</Link>; }

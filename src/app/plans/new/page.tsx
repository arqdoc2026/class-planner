import Link from "next/link";
import { createStructuredPlan } from "../../../lib/actions/structured-plan-actions";
import { requireInstitutionContext } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

export default async function NewPlanPage() {
  const context = await requireInstitutionContext();
  const [campuses, areas, grades, years] = await Promise.all([
    prisma.campus.findMany({ where: { institutionId: context.institutionId, active: true }, orderBy: { name: "asc" } }),
    prisma.academicArea.findMany({ where: { institutionId: context.institutionId, active: true }, include: { subjects: { where: { active: true }, orderBy: { name: "asc" } } }, orderBy: { name: "asc" } }),
    prisma.academicGrade.findMany({ where: { institutionId: context.institutionId, active: true }, include: { groups: { where: { active: true }, orderBy: { name: "asc" } } }, orderBy: [{ level: "asc" }, { name: "asc" }] }),
    prisma.academicYear.findMany({ where: { institutionId: context.institutionId, active: true }, include: { periods: { orderBy: { sequence: "asc" } } }, orderBy: { startDate: "desc" } }),
  ]);
  return (
    <main className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-2xl space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Nueva planeación</p>
          <h1 className="text-3xl font-black">Información general</h1>
          <p className="mt-2 text-sm text-slate-500">Se utilizará la versión vigente del formato institucional y quedará congelada en la planeación.</p>
        </div>
        <form action={async (formData) => { "use server"; await createStructuredPlan(formData); }} className="space-y-4">
          <Field name="unitTitle" label="Título de la unidad" required />
          <Select name="campusId" label="Sede" options={campuses.map((item) => ({ id: item.id, label: item.name }))} />
          <Select name="academicAreaId" label="Área" options={areas.map((item) => ({ id: item.id, label: item.name }))} />
          <Select name="academicSubjectId" label="Asignatura" options={areas.flatMap((area) => area.subjects.map((item) => ({ id: item.id, label: `${area.name} · ${item.name}` })))} />
          <Select name="academicGradeId" label="Grado" options={grades.map((item) => ({ id: item.id, label: item.name }))} />
          <Select name="courseGroupId" label="Grupo" options={grades.flatMap((grade) => grade.groups.map((item) => ({ id: item.id, label: `${grade.name} · ${item.name}` })))} />
          <Select name="academicYearId" label="Año lectivo" options={years.map((item) => ({ id: item.id, label: item.name }))} />
          <Select name="academicPeriodId" label="Periodo" options={years.flatMap((year) => year.periods.map((item) => ({ id: item.id, label: `${year.name} · ${item.name}` })))} />
          <div className="flex gap-3">
            <button className="rounded-xl bg-slate-950 px-6 py-3 font-bold text-white">Crear y continuar</button>
            <Link href="/dashboard" className="rounded-xl bg-slate-100 px-6 py-3 font-bold text-slate-700">Cancelar</Link>
          </div>
        </form>
      </div>
    </main>
  );
}

function Select({ name, label, options }: { name: string; label: string; options: Array<{ id: string; label: string }> }) {
  return <label className="block"><span className="mb-1 block text-sm font-bold text-slate-700">{label}</span><select name={name} className="w-full rounded-xl border border-slate-300 px-4 py-3"><option value="">Sin seleccionar</option>{options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>;
}

function Field({ name, label, required = false }: { name: string; label: string; required?: boolean }) {
  return <label className="block"><span className="mb-1 block text-sm font-bold text-slate-700">{label}</span><input name={name} required={required} className="w-full rounded-xl border border-slate-300 px-4 py-3" /></label>;
}

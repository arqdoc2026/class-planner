import Link from "next/link";
import {
  createAcademicYear,
  createAcademicPeriod,
  createArea,
  createCampus,
  createGrade,
  createCourseGroup,
  createSubject,
  getInstitutionSettings,
  updateInstitutionAiSettings,
} from "../../../lib/actions/institution-actions";
import { requireInstitutionRole } from "../../../lib/auth";

const inputClass = "rounded-lg border border-slate-300 px-3 py-2 text-sm";
const buttonClass = "rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white";

export default async function InstitutionPage() {
  await requireInstitutionRole(["INSTITUTION_ADMIN"]);
  const data = await getInstitutionSettings();
  return (
    <main className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Administración institucional</p>
            <h1 className="text-3xl font-black text-slate-950">{data.institution.name}</h1>
          </div>
          <Link href="/dashboard" className={buttonClass}>Volver al panel</Link>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          <Section title="Sedes" items={data.campuses.map((item) => item.name)}>
            <form action={async (formData) => { "use server"; await createCampus(formData); }} className="flex flex-wrap gap-2">
              <input className={inputClass} name="name" required placeholder="Nombre de la sede" />
              <input className={inputClass} name="code" placeholder="Código" />
              <button className={buttonClass}>Agregar</button>
            </form>
          </Section>

          <Section title="Áreas" items={data.areas.map((item) => item.name)}>
            <form action={async (formData) => { "use server"; await createArea(formData); }} className="flex flex-wrap gap-2">
              <input className={inputClass} name="name" required placeholder="Nombre del área" />
              <input className={inputClass} name="code" placeholder="Código" />
              <button className={buttonClass}>Agregar</button>
            </form>
          </Section>

          <Section title="Asignaturas" items={data.areas.flatMap((area) => area.subjects.map((subject) => `${area.name}: ${subject.name}`))}>
            <form action={async (formData) => { "use server"; await createSubject(formData); }} className="flex flex-wrap gap-2">
              <select className={inputClass} name="areaId" required>
                <option value="">Selecciona un área</option>
                {data.areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}
              </select>
              <input className={inputClass} name="name" required placeholder="Asignatura" />
              <button className={buttonClass}>Agregar</button>
            </form>
          </Section>

          <Section title="Grados" items={data.grades.map((item) => item.name)}>
            <form action={async (formData) => { "use server"; await createGrade(formData); }} className="flex flex-wrap gap-2">
              <input className={inputClass} name="name" required placeholder="Grado" />
              <input className={inputClass} name="level" type="number" placeholder="Orden" />
              <button className={buttonClass}>Agregar</button>
            </form>
          </Section>

          <Section title="Años lectivos" items={data.years.map((item) => item.name)}>
            <form action={async (formData) => { "use server"; await createAcademicYear(formData); }} className="grid gap-2 sm:grid-cols-2">
              <input className={inputClass} name="name" required placeholder="2026" />
              <input className={inputClass} name="startDate" type="date" required />
              <input className={inputClass} name="endDate" type="date" required />
              <button className={buttonClass}>Agregar</button>
            </form>
          </Section>

          <Section title="Grupos" items={data.grades.flatMap((grade) => grade.groups.map((group) => `${grade.name} — ${group.name}`))}>
            <form action={async (formData) => { "use server"; await createCourseGroup(formData); }} className="flex flex-wrap gap-2">
              <select name="gradeId" required className={inputClass}><option value="">Grado</option>{data.grades.map((grade) => <option key={grade.id} value={grade.id}>{grade.name}</option>)}</select>
              <input name="name" required placeholder="Grupo A" className={inputClass} />
              <button className={buttonClass}>Agregar</button>
            </form>
          </Section>

          <Section title="Periodos académicos" items={data.years.flatMap((year) => year.periods.map((period) => `${year.name} — ${period.name}`))}>
            <form action={async (formData) => { "use server"; await createAcademicPeriod(formData); }} className="grid gap-2 sm:grid-cols-2">
              <select name="academicYearId" required className={inputClass}><option value="">Año lectivo</option>{data.years.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}</select>
              <input name="name" required placeholder="Primer trimestre" className={inputClass} />
              <input name="sequence" type="number" min={1} required placeholder="Orden" className={inputClass} />
              <select name="periodType" className={inputClass}><option value="TRIMESTER">Trimestre</option><option value="SEMESTER">Semestre</option><option value="PERIOD">Periodo</option></select>
              <input name="startDate" type="date" required className={inputClass} />
              <input name="endDate" type="date" required className={inputClass} />
              <button className={buttonClass}>Agregar periodo</button>
            </form>
          </Section>

          <Section title="Inteligencia artificial" items={["Configura cuota y roles deshabilitados"]}>
            <form action={async (formData) => { "use server"; await updateInstitutionAiSettings(formData); }} className="space-y-3">
              <input name="aiDailyLimit" type="number" min={1} max={10000} defaultValue={200} className={inputClass} aria-label="Límite diario de IA" />
              <div className="flex flex-wrap gap-3 text-sm">{["COORDINATOR", "TEACHER", "VIEWER"].map((role) => <label key={role}><input type="checkbox" name="disabledRoles" value={role} /> Desactivar para {role}</label>)}</div>
              <button className={buttonClass}>Guardar IA</button>
            </form>
          </Section>
        </div>
      </div>
    </main>
  );
}

function Section({ title, items, children }: { title: string; items: string[]; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-black text-slate-900">{title}</h2>
      {children}
      <ul className="space-y-1 text-sm text-slate-600">
        {items.length ? items.map((item) => <li key={item} className="rounded bg-slate-50 px-3 py-2">{item}</li>) : <li>Sin registros.</li>}
      </ul>
    </section>
  );
}

import Link from "next/link";
import { requireInstitutionContext } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import AppNavigation from "../../../components/navigation/AppNavigation";
import PlanCreationForm from "../../../components/plans/PlanCreationForm";

export default async function NewPlanPage() {
  const context = await requireInstitutionContext();
  const [campuses, areas, grades, years] = await Promise.all([
    prisma.campus.findMany({ where: { institutionId: context.institutionId, active: true }, orderBy: { name: "asc" } }),
    prisma.academicArea.findMany({ where: { institutionId: context.institutionId, active: true }, include: { subjects: { where: { active: true }, orderBy: { name: "asc" } } }, orderBy: { name: "asc" } }),
    prisma.academicGrade.findMany({ where: { institutionId: context.institutionId, active: true }, include: { groups: { where: { active: true }, orderBy: { name: "asc" } } }, orderBy: [{ level: "asc" }, { name: "asc" }] }),
    prisma.academicYear.findMany({ where: { institutionId: context.institutionId, active: true }, include: { periods: { orderBy: { sequence: "asc" } } }, orderBy: { startDate: "desc" } }),
  ]);
  const missing = [
    !campuses.length && "sedes",
    !areas.length && "áreas",
    !areas.some((area) => area.subjects.length) && "asignaturas",
    !grades.length && "grados",
    !grades.some((grade) => grade.groups.length) && "grupos",
    !years.length && "años lectivos",
    !years.some((year) => year.periods.length) && "periodos",
  ].filter((item): item is string => Boolean(item));
  return (
    <div className="min-h-screen bg-slate-100">
      <AppNavigation role={context.role} institutionName={context.institution.name} userName={context.profile.fullName} isSuperAdmin={context.profile.isSuperAdmin} />
    <main className="p-5 md:p-10">
      <div className="mx-auto max-w-2xl space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Nueva planeación</p>
          <h1 className="text-3xl font-black">Información general</h1>
          <p className="mt-2 text-sm text-slate-500">Se utilizará la versión vigente del formato institucional y quedará congelada en la planeación.</p>
        </div>
        {missing.length ? (
          <div className="space-y-4 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950">
            <div><h2 className="font-black">Falta configurar la institución</h2><p className="mt-1 text-sm">No se puede crear una planeación hasta registrar: {missing.join(", ")}.</p></div>
            {context.role === "INSTITUTION_ADMIN"
              ? <Link href="/admin/institution" className="inline-block rounded-xl bg-amber-900 px-5 py-3 font-bold text-white">Configurar datos institucionales</Link>
              : <p className="text-sm font-semibold">Solicita al administrador institucional que complete estos catálogos.</p>}
            <div><Link href="/overview" className="text-sm font-bold underline">Volver al panel</Link></div>
          </div>
        ) : (
          <PlanCreationForm
            campuses={campuses.map(({ id, name }) => ({ id, name }))}
            areas={areas.map(({ id, name, subjects }) => ({ id, name, subjects: subjects.map(({ id: subjectId, name: subjectName }) => ({ id: subjectId, name: subjectName })) }))}
            grades={grades.map(({ id, name, groups }) => ({ id, name, groups: groups.map(({ id: groupId, name: groupName }) => ({ id: groupId, name: groupName })) }))}
            years={years.map(({ id, name, periods }) => ({ id, name, periods: periods.map(({ id: periodId, name: periodName }) => ({ id: periodId, name: periodName })) }))}
          />
        )}
      </div>
    </main></div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import SuperAdminUserManager from "../../../../components/admin/SuperAdminUserManager";
import SuperAdminCatalogManager from "../../../../components/admin/SuperAdminCatalogManager";
import LogoutButton from "../../../../components/auth/LogoutButton";
import { getPlatformInstitution } from "../../../../lib/actions/platform-actions";
import { requireSuperAdmin } from "../../../../lib/auth";

export default async function InstitutionProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [institution, superAdmin] = await Promise.all([getPlatformInstitution(id), requireSuperAdmin()]);
  if (!institution) notFound();
  const managerInstitution = {
    id: institution.id,
    name: institution.name,
    active: institution.active,
    members: institution.memberships.map((membership) => ({
      id: membership.id,
      profileId: membership.profileId,
      fullName: membership.profile.fullName,
      username: membership.profile.username,
      role: membership.role,
      active: membership.status === "ACTIVE",
      isSuperAdmin: membership.profile.isSuperAdmin,
    })),
    removedMembers: institution.removedMemberships.map((membership) => ({
      id: membership.id,
      profileId: membership.profileId,
      fullName: membership.profile.fullName,
      username: membership.profile.username,
      role: membership.role,
    })),
  };

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">Perfil institucional</p>
            <h1 className="text-3xl font-black">{institution.name}</h1>
            <p className="mt-1 text-sm text-slate-400">{institution.slug}</p>
          </div>
          <div className="flex gap-2"><Link href="/superadmin" className="rounded-lg border border-slate-700 px-4 py-2 font-bold text-slate-200 hover:bg-slate-900">Volver a instituciones</Link><LogoutButton dark /></div>
        </header>
        <div className="grid gap-4 sm:grid-cols-3">
          <Metric label="Miembros" value={institution._count.memberships} />
          <Metric label="Planeaciones" value={institution._count.plans} />
          <Metric label="Sedes" value={institution._count.campuses} />
        </div>
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="font-black">Información institucional</h2>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <p><span className="block text-xs uppercase text-slate-500">Estado</span>{institution.active ? "Activa" : "Suspendida"}</p>
            <p><span className="block text-xs uppercase text-slate-500">Identificador</span>{institution.slug}</p>
            <p><span className="block text-xs uppercase text-slate-500">Sedes</span>{institution.campuses.map((campus) => campus.name).join(", ") || "Sin sedes"}</p>
          </div>
        </section>
        <SuperAdminCatalogManager
          institutionId={institution.id}
          data={{
            campuses: institution.campuses.map(({ id, name, code, active }) => ({ id, name, code, active })),
            areas: institution.areas.map(({ id, name, code, active, subjects }) => ({ id, name, code, active, subjects: subjects.map(({ id: subjectId, name: subjectName, code: subjectCode, active: subjectActive, areaId }) => ({ id: subjectId, name: subjectName, code: subjectCode, active: subjectActive, areaId })) })),
            grades: institution.grades.map(({ id, name, level, active, groups }) => ({ id, name, level, active, groups: groups.map(({ id: groupId, name: groupName, active: groupActive, gradeId }) => ({ id: groupId, name: groupName, active: groupActive, gradeId })) })),
            years: institution.years.map(({ id, name, active, startDate, endDate, periods }) => ({ id, name, active, startDate: startDate.toISOString().slice(0, 10), endDate: endDate.toISOString().slice(0, 10), periods: periods.map(({ id: periodId, name: periodName, academicYearId, sequence, startDate: periodStart, endDate: periodEnd, periodType }) => ({ id: periodId, name: periodName, academicYearId, sequence, startDate: periodStart.toISOString().slice(0, 10), endDate: periodEnd.toISOString().slice(0, 10), periodType })) })),
          }}
        />
        <SuperAdminUserManager institutions={[managerInstitution]} currentUserId={superAdmin.id} />
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><strong className="mt-2 block text-4xl">{value}</strong></article>;
}

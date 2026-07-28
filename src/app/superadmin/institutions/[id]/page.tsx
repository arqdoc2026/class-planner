import Link from "next/link";
import { notFound } from "next/navigation";
import SuperAdminUserManager from "../../../../components/admin/SuperAdminUserManager";
import { getPlatformInstitution } from "../../../../lib/actions/platform-actions";

export default async function InstitutionProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const institution = await getPlatformInstitution(id);
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
          <Link href="/superadmin" className="rounded-lg border border-slate-700 px-4 py-2 font-bold text-slate-200 hover:bg-slate-900">Volver a instituciones</Link>
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
        <SuperAdminUserManager institutions={[managerInstitution]} />
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><strong className="mt-2 block text-4xl">{value}</strong></article>;
}

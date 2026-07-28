import SuperAdminUserManager from "../../components/admin/SuperAdminUserManager";
import { createInstitution, getPlatformOverview, setInstitutionActive } from "../../lib/actions/platform-actions";

export default async function SuperAdminPage() {
  const data = await getPlatformOverview();
  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <header>
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">Plataforma global</p>
          <h1 className="text-3xl font-black">Superadministración</h1>
        </header>
        <div className="grid gap-4 md:grid-cols-4">
          {Object.entries(data.metrics).map(([name, value]) => <article key={name} className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><p className="text-xs uppercase text-slate-500">{name}</p><strong className="text-4xl">{value}</strong></article>)}
        </div>
        <form action={async (formData) => { "use server"; await createInstitution(formData); }} className="flex flex-wrap gap-3 rounded-2xl bg-white p-5 text-slate-950">
          <input name="name" required placeholder="Nombre de institución" className="rounded-lg border px-3 py-2" />
          <input name="slug" required placeholder="identificador-url" className="rounded-lg border px-3 py-2" />
          <button className="rounded-lg bg-slate-950 px-4 py-2 font-bold text-white">Crear institución</button>
        </form>
        <SuperAdminUserManager institutions={data.institutions.map(({ id, name, active, memberships }) => ({
          id,
          name,
          active,
          members: memberships.map((membership) => ({
            id: membership.id,
            profileId: membership.profileId,
            fullName: membership.profile.fullName,
            username: membership.profile.username,
            role: membership.role,
            active: membership.status === "ACTIVE",
            isSuperAdmin: membership.profile.isSuperAdmin,
          })),
        }))} />
        <div className="overflow-hidden rounded-2xl bg-white text-slate-950">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100"><tr><th className="p-4">Institución</th><th className="p-4">Miembros</th><th className="p-4">Planeaciones</th><th className="p-4">Estado</th></tr></thead>
            <tbody>
              {data.institutions.map((institution) => (
                <tr key={institution.id} className="border-t align-top">
                  <td className="p-4"><strong>{institution.name}</strong><br /><small>{institution.slug}</small></td>
                  <td className="p-4">
                    <strong>{institution._count.memberships}</strong>
                    <ul className="mt-2 space-y-1 text-xs text-slate-500">
                      {institution.memberships.slice(0, 6).map((membership) => <li key={membership.id}>{membership.profile.fullName} · {membership.role}</li>)}
                    </ul>
                  </td>
                  <td className="p-4">{institution._count.plans}</td>
                  <td className="p-4">
                    <form action={async () => { "use server"; await setInstitutionActive(institution.id, !institution.active); }}>
                      <button className={`rounded-full px-3 py-1 text-xs font-bold ${institution.active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{institution.active ? "Activa" : "Suspendida"}</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

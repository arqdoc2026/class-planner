import Link from "next/link";
import TeamManager from "../../../components/admin/TeamManager";
import { requireAdmin } from "../../../lib/auth";
import { getTeamProfiles } from "../../../lib/actions/team-actions";
import AppNavigation from "../../../components/navigation/AppNavigation";
import { requireInstitutionContext } from "../../../lib/auth";

export default async function TeamPage() {
  const [admin, members, context] = await Promise.all([requireAdmin(), getTeamProfiles(), requireInstitutionContext()]);
  return (
    <div className="min-h-screen bg-slate-100">
      <AppNavigation role={context.role} institutionName={context.institution.name} userName={context.profile.fullName} isSuperAdmin={context.profile.isSuperAdmin} />
    <main className="p-5 md:p-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex items-center justify-between gap-4">
          <div><p className="text-xs font-black uppercase tracking-widest text-slate-400">Administración</p><h1 className="text-3xl font-black text-slate-950">Equipo docente</h1></div>
          <Link href="/overview" className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white">Volver al panel</Link>
        </div>
        <TeamManager members={members} currentUserId={admin.id} />
      </div>
    </main></div>
  );
}

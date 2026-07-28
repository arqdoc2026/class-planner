import AppNavigation from "../../components/navigation/AppNavigation";
import ProfileForm from "../../components/profile/ProfileForm";
import { requireInstitutionContext } from "../../lib/auth";

export default async function ProfilePage() {
  const context = await requireInstitutionContext();
  return (
    <div className="min-h-screen bg-slate-100">
      <AppNavigation role={context.role} institutionName={context.institution.name} userName={context.profile.fullName} isSuperAdmin={context.profile.isSuperAdmin} />
      <main className="mx-auto max-w-2xl space-y-6 p-5 md:p-10">
        <header><p className="text-xs font-black uppercase tracking-widest text-blue-700">Cuenta personal</p><h1 className="mt-1 text-3xl font-black text-slate-950">Mi perfil</h1><p className="mt-2 text-slate-500">Actualiza tu identidad de acceso y tu PIN.</p></header>
        <ProfileForm fullName={context.profile.fullName} username={context.profile.username} />
      </main>
    </div>
  );
}

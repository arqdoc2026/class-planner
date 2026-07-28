import AuthForm from "../../../components/auth/AuthForm";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ invite?: string }> }) {
  const { invite = "" } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <p className="mb-2 text-xs font-black uppercase tracking-[0.25em] text-slate-400">GYMPLAN</p>
        <h1 className="mb-2 text-3xl font-black text-slate-950">Crear perfil docente</h1>
        <p className="mb-8 text-sm text-slate-500">{invite ? "Completa tu registro para aceptar la invitación institucional." : "El primer perfil puede crear la institución. Los demás usuarios requieren invitación."}</p>
        <AuthForm mode="signup" inviteToken={invite} />
      </section>
    </main>
  );
}

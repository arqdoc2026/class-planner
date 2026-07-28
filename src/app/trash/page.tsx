import AppNavigation from "../../components/navigation/AppNavigation";
import { getDeletedPlans, restoreDeletedPlan } from "../../lib/actions/plan-lifecycle-actions";
import { requireInstitutionContext } from "../../lib/auth";

export default async function TrashPage() {
  const [plans, context] = await Promise.all([getDeletedPlans(), requireInstitutionContext()]);
  return (
    <div className="min-h-screen bg-slate-100">
      <AppNavigation role={context.role} institutionName={context.institution.name} userName={context.profile.fullName} isSuperAdmin={context.profile.isSuperAdmin} />
      <main className="mx-auto max-w-4xl space-y-6 p-5 md:p-10">
        <header><p className="text-xs font-black uppercase tracking-widest text-blue-700">Eliminación lógica</p><h1 className="text-3xl font-black">Papelera</h1><p className="mt-2 text-slate-500">Restaura documentos eliminados sin perder su historial.</p></header>
        <div className="space-y-3">{plans.map((plan) => <article key={plan.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-5"><div><strong>{plan.unitTitle || "Sin título"}</strong><p className="text-xs text-slate-500">Eliminada: {plan.deletedAt?.toLocaleString("es-CO")}</p></div><form action={async () => { "use server"; await restoreDeletedPlan(plan.id); }}><button className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white">Restaurar</button></form></article>)}{!plans.length && <p className="rounded-2xl bg-white p-8 text-center text-slate-500">No hay planeaciones eliminadas.</p>}</div>
      </main>
    </div>
  );
}

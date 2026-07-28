import Link from "next/link";
import { getDeletedPlans, restoreDeletedPlan } from "../../lib/actions/plan-lifecycle-actions";

export default async function TrashPage() {
  const plans = await getDeletedPlans();
  return <main className="min-h-screen bg-slate-100 p-6 md:p-10"><div className="mx-auto max-w-4xl space-y-6"><header className="flex justify-between"><div><p className="text-xs font-black uppercase text-slate-400">Eliminación lógica</p><h1 className="text-3xl font-black">Papelera</h1></div><Link href="/plans" className="rounded-lg bg-white px-4 py-2 font-bold">Volver</Link></header><div className="space-y-3">{plans.map((plan) => <article key={plan.id} className="flex items-center justify-between rounded-2xl bg-white p-5"><div><strong>{plan.unitTitle || "Sin título"}</strong><p className="text-xs text-slate-500">Eliminada: {plan.deletedAt?.toLocaleString("es-CO")}</p></div><form action={async () => { "use server"; await restoreDeletedPlan(plan.id); }}><button className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white">Restaurar</button></form></article>)}{!plans.length && <p className="rounded-2xl bg-white p-8 text-center text-slate-500">No hay planeaciones eliminadas.</p>}</div></div></main>;
}

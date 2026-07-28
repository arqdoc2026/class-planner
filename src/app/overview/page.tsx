import Link from "next/link";
import LogoutButton from "../../components/auth/LogoutButton";
import { getDashboardMetrics } from "../../lib/actions/discovery-actions";

export default async function OverviewPage() {
  const { context, metrics } = await getDashboardMetrics();
  const title = context.role === "INSTITUTION_ADMIN" ? "Panel administrativo" : context.role === "COORDINATOR" ? "Panel de coordinación" : context.role === "TEACHER" ? "Panel del profesor" : "Panel de consulta";
  const cards = [
    ["Planeaciones", metrics.total], ["Borradores", metrics.drafts], ["En revisión", metrics.review],
    ["Cambios solicitados", metrics.changes], ["Aprobadas", metrics.approved], ["Comentarios pendientes", metrics.unresolved],
  ];
  if (context.role === "INSTITUTION_ADMIN") cards.push(["Usuarios activos", metrics.users], ["Solicitudes IA (24h)", metrics.aiToday]);
  return <main className="min-h-screen bg-slate-100 p-6 md:p-10"><div className="mx-auto max-w-6xl space-y-8"><header className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-widest text-slate-400">{context.institution.name}</p><h1 className="text-3xl font-black">{title}</h1></div><div className="flex flex-wrap gap-2"><Link href="/plans" className="rounded-lg bg-white px-4 py-2 font-bold">Buscar</Link><Link href="/notifications" className="rounded-lg bg-slate-950 px-4 py-2 font-bold text-white">Notificaciones</Link><LogoutButton /></div></header><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{cards.map(([label, number]) => <article key={label} className="rounded-2xl bg-white p-6 shadow-sm"><p className="text-xs font-bold uppercase text-slate-400">{label}</p><strong className="mt-2 block text-4xl text-slate-950">{number}</strong></article>)}</div></div></main>;
}

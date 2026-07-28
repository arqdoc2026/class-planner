import Link from "next/link";
import { getNotifications, markNotificationRead } from "../../lib/actions/discovery-actions";

export default async function NotificationsPage() {
  const notifications = await getNotifications();
  return <main className="min-h-screen bg-slate-100 p-6 md:p-10"><div className="mx-auto max-w-3xl space-y-6"><header className="flex justify-between"><h1 className="text-3xl font-black">Notificaciones</h1><Link href="/overview" className="rounded-lg bg-white px-4 py-2 font-bold">Volver</Link></header><div className="space-y-3">{notifications.map((item) => <article key={item.id} className={`rounded-2xl border p-5 ${item.readAt ? "border-slate-200 bg-white" : "border-blue-200 bg-blue-50"}`}><div className="flex justify-between gap-3"><div><strong>{item.title}</strong><p className="mt-1 text-sm text-slate-600">{item.body}</p><time className="mt-2 block text-xs text-slate-400">{item.createdAt.toLocaleString("es-CO")}</time></div>{!item.readAt && <form action={async () => { "use server"; await markNotificationRead(item.id); }}><button className="text-xs font-bold text-blue-700">Marcar leída</button></form>}</div></article>)}{!notifications.length && <p className="rounded-2xl bg-white p-8 text-center text-slate-500">No tienes notificaciones.</p>}</div></div></main>;
}

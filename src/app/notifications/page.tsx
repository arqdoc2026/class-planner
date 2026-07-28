import AppNavigation from "../../components/navigation/AppNavigation";
import { getNotifications, markNotificationRead } from "../../lib/actions/discovery-actions";
import { requireInstitutionContext } from "../../lib/auth";

export default async function NotificationsPage() {
  const [notifications, context] = await Promise.all([getNotifications(), requireInstitutionContext()]);
  return (
    <div className="min-h-screen bg-slate-100">
      <AppNavigation role={context.role} institutionName={context.institution.name} userName={context.profile.fullName} isSuperAdmin={context.profile.isSuperAdmin} />
      <main className="mx-auto max-w-3xl space-y-6 p-5 md:p-10">
        <header><p className="text-xs font-black uppercase tracking-widest text-blue-700">Centro de novedades</p><h1 className="text-3xl font-black">Notificaciones</h1></header>
        <div className="space-y-3">
          {notifications.map((item) => <article key={item.id} className={`rounded-2xl border p-5 ${item.readAt ? "border-slate-200 bg-white" : "border-blue-200 bg-blue-50"}`}><div className="flex flex-wrap justify-between gap-3"><div><strong>{item.title}</strong><p className="mt-1 text-sm text-slate-600">{item.body}</p><time className="mt-2 block text-xs text-slate-400">{item.createdAt.toLocaleString("es-CO")}</time></div>{!item.readAt && <form action={async () => { "use server"; await markNotificationRead(item.id); }}><button className="text-xs font-bold text-blue-700">Marcar como leída</button></form>}</div></article>)}
          {!notifications.length && <p className="rounded-2xl bg-white p-8 text-center text-slate-500">No tienes notificaciones.</p>}
        </div>
      </main>
    </div>
  );
}

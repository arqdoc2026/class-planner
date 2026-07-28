import AppNavigation from "../../components/navigation/AppNavigation";
import AsyncActionForm from "../../components/ui/AsyncActionForm";
import { addBankActivityToSession, createActivityTemplate, getActivityBank, getEditableSessionsForActivityBank } from "../../lib/actions/activity-bank-actions";
import { requireInstitutionContext } from "../../lib/auth";

const momentLabels: Record<string, string> = { START: "Inicio", DEVELOPMENT: "Desarrollo", CLOSING: "Cierre" };

export default async function ActivitiesPage() {
  const [activities, sessions, context] = await Promise.all([
    getActivityBank(),
    getEditableSessionsForActivityBank(),
    requireInstitutionContext(),
  ]);
  return (
    <div className="min-h-screen bg-slate-100">
      <AppNavigation role={context.role} institutionName={context.institution.name} userName={context.profile.fullName} isSuperAdmin={context.profile.isSuperAdmin} />
      <main className="mx-auto max-w-6xl space-y-6 p-5 md:p-10">
        <header><p className="text-xs font-black uppercase tracking-widest text-blue-700">Reutilización institucional</p><h1 className="text-3xl font-black text-slate-950">Banco de actividades</h1><p className="mt-2 text-slate-500">Crea experiencias reutilizables e insértalas directamente en una sesión editable.</p></header>
        <AsyncActionForm action={createActivityTemplate} successMessage="Actividad guardada en el banco." resetOnSuccess className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2">
          <input name="title" required placeholder="Título" className="rounded-lg border p-3" />
          <select name="classMoment" className="rounded-lg border p-3"><option value="START">Inicio</option><option value="DEVELOPMENT">Desarrollo</option><option value="CLOSING">Cierre</option></select>
          <textarea name="description" required placeholder="Descripción" className="rounded-lg border p-3 md:col-span-2" />
          <input name="estimatedMinutes" type="number" min={1} placeholder="Minutos" className="rounded-lg border p-3" />
          <input name="groupingType" placeholder="Tipo de agrupación" className="rounded-lg border p-3" />
          <input name="resources" placeholder="Recursos" className="rounded-lg border p-3" />
          <input name="pedagogicalPurpose" placeholder="Propósito pedagógico" className="rounded-lg border p-3" />
          <button className="rounded-lg bg-slate-950 px-4 py-3 font-bold text-white md:col-span-2">Guardar en el banco</button>
        </AsyncActionForm>
        <div className="grid gap-4 md:grid-cols-2">
          {activities.map((activity) => (
            <article key={activity.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-black text-slate-950">{activity.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{activity.description}</p>
              <p className="mt-2 text-xs font-bold text-slate-400">{momentLabels[activity.classMoment] || activity.classMoment} · {activity.estimatedMinutes || "—"} min</p>
              <AsyncActionForm action={addBankActivityToSession.bind(null, activity.id)} successMessage="Actividad insertada en la sesión." className="mt-4 flex flex-col gap-2 sm:flex-row">
                <select name="sessionId" required className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm">
                  <option value="">Selecciona una sesión</option>
                  {sessions.map((session) => <option key={session.id} value={session.id}>{session.plan.unitTitle || "Sin título"} · Grado {session.plan.grade || "—"} · Sesión {session.sessionNumber}</option>)}
                </select>
                <button className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white">Insertar</button>
              </AsyncActionForm>
            </article>
          ))}
          {!activities.length && <p className="rounded-2xl bg-white p-8 text-center text-slate-500 md:col-span-2">El banco todavía no contiene actividades.</p>}
        </div>
      </main>
    </div>
  );
}

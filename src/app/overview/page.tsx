import Link from "next/link";
import AppNavigation from "../../components/navigation/AppNavigation";
import { getDashboardMetrics } from "../../lib/actions/discovery-actions";

const roleNames = {
  INSTITUTION_ADMIN: "Panel administrativo",
  COORDINATOR: "Panel de coordinación",
  TEACHER: "Panel del profesor",
  VIEWER: "Panel de consulta",
} as const;

export default async function OverviewPage() {
  const { context, metrics } = await getDashboardMetrics();
  const cards = [
    ["Planeaciones", metrics.total, "/plans"],
    ["Borradores", metrics.drafts, "/plans?status=DRAFT"],
    ["En revisión", metrics.review, "/plans?reviewRequired=true"],
    ["Cambios solicitados", metrics.changes, "/plans?status=CHANGES_REQUESTED"],
    ["Aprobadas", metrics.approved, "/plans?status=APPROVED"],
    ["Comentarios pendientes", metrics.unresolved, "/plans?commentsPending=true"],
  ];
  if (context.role === "INSTITUTION_ADMIN") {
    cards.push(["Usuarios activos", metrics.users, "/admin/team"], ["Solicitudes IA (24 h)", metrics.aiToday, "/admin/institution"]);
  }
  const quickLinks = context.role === "INSTITUTION_ADMIN"
    ? [
        ["/admin/institution", "Configurar institución", "Sedes, áreas, grados, grupos y periodos."],
        ["/admin/team", "Gestionar usuarios", "Invitaciones, roles y estado de los miembros."],
        ["/config/template", "Formato institucional", "Código, versión, encabezado y publicación."],
        ["/plans", "Revisar planeaciones", "Consulta el repositorio completo de la institución."],
      ]
    : context.role === "COORDINATOR"
      ? [
          ["/plans?reviewRequired=true", "Pendientes de revisión", "Planeaciones listas para tu revisión."],
          ["/plans?commentsPending=true", "Comentarios pendientes", "Conversaciones académicas sin resolver."],
          ["/plans", "Repositorio institucional", "Busca por profesor, grado, área o estado."],
          ["/rubrics", "Banco de rúbricas", "Consulta y reutiliza instrumentos institucionales."],
        ]
      : context.role === "TEACHER"
        ? [
            ["/plans/new", "Crear planeación", "Comienza con el formato institucional vigente."],
            ["/plans?status=DRAFT", "Continuar borradores", "Retoma las planeaciones incompletas."],
            ["/activities", "Banco de actividades", "Guarda y reutiliza experiencias de aprendizaje."],
            ["/dashboard", "Editor clásico", "Accede temporalmente al panel heredado."],
          ]
        : [
            ["/plans", "Consultar planeaciones", "Abre los documentos autorizados."],
            ["/notifications", "Notificaciones", "Revisa novedades y menciones."],
          ];

  return (
    <div className="min-h-screen bg-slate-100">
      <AppNavigation role={context.role} institutionName={context.institution.name} userName={context.profile.fullName} isSuperAdmin={context.profile.isSuperAdmin} />
      <main className="mx-auto max-w-7xl space-y-8 p-5 md:p-10">
        <header>
          <p className="text-xs font-black uppercase tracking-widest text-blue-700">{context.institution.name}</p>
          <h1 className="mt-1 text-3xl font-black text-slate-950 md:text-4xl">{roleNames[context.role]}</h1>
          <p className="mt-2 text-slate-500">Hola, {context.profile.fullName}. Estas son tus prioridades actuales.</p>
        </header>
        <section aria-label="Indicadores" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(([label, number, href]) => (
            <Link key={label} href={String(href)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
              <strong className="mt-2 block text-4xl text-slate-950">{number}</strong>
            </Link>
          ))}
        </section>
        <section>
          <h2 className="mb-4 text-xl font-black text-slate-900">Accesos rápidos</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {quickLinks.map(([href, title, description]) => (
              <Link key={href} href={href} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-blue-300">
                <h3 className="font-black text-slate-950">{title}</h3>
                <p className="mt-1 text-sm text-slate-500">{description}</p>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

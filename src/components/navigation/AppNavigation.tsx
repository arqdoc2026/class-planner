import Link from "next/link";
import LogoutButton from "../auth/LogoutButton";
import type { InstitutionRole } from "../../lib/auth";

type NavigationProps = {
  role: InstitutionRole;
  institutionName: string;
  userName: string;
  isSuperAdmin?: boolean;
};

const commonLinks = [
  { href: "/overview", label: "Inicio" },
  { href: "/plans", label: "Planeaciones" },
  { href: "/notifications", label: "Notificaciones" },
  { href: "/profile", label: "Mi perfil" },
];

export default function AppNavigation({ role, institutionName, userName, isSuperAdmin = false }: NavigationProps) {
  const links = [
    ...commonLinks,
    ...(role !== "VIEWER" ? [{ href: "/plans/new", label: "Crear planeación" }] : []),
    ...(role === "TEACHER" || role === "COORDINATOR" || role === "INSTITUTION_ADMIN"
      ? [{ href: "/activities", label: "Actividades" }, { href: "/rubrics", label: "Rúbricas" }]
      : []),
    ...(role === "INSTITUTION_ADMIN"
      ? [{ href: "/admin/institution", label: "Institución" }, { href: "/admin/team", label: "Usuarios" }, { href: "/config/template", label: "Formato" }]
      : []),
    ...(isSuperAdmin ? [{ href: "/superadmin", label: "Plataforma global" }] : []),
  ];
  return (
    <header className="border-b border-slate-800 bg-slate-950 text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4">
        <div className="min-w-0">
          <Link href="/overview" className="text-lg font-black tracking-tight">GYM<span className="font-light text-slate-400">PLAN</span></Link>
          <p className="truncate text-xs text-slate-400">{institutionName} · {userName}</p>
        </div>
        <nav aria-label="Navegación principal" className="order-3 flex w-full gap-1 overflow-x-auto pb-1 lg:order-2 lg:w-auto lg:flex-wrap lg:justify-center">
          {links.map((link) => <Link key={link.href} href={link.href} className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold text-slate-300 hover:bg-slate-800 hover:text-white">{link.label}</Link>)}
        </nav>
        <div className="order-2 lg:order-3"><LogoutButton dark /></div>
      </div>
    </header>
  );
}

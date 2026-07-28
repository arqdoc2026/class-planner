"use client";

import { usePathname, useRouter } from "next/navigation";

function safeFallback(pathname: string) {
  if (pathname.startsWith("/superadmin/institutions/")) return "/superadmin";
  if (pathname.startsWith("/superadmin")) return "/overview";
  if (pathname.startsWith("/plans/")) return "/plans";
  if (pathname.startsWith("/admin/")) return "/overview";
  if (pathname.startsWith("/config/")) return "/overview";
  return "/overview";
}

export default function GlobalBackButton() {
  const pathname = usePathname();
  const router = useRouter();
  if (pathname === "/" || pathname.startsWith("/auth/")) return null;

  function goBack() {
    const hasInternalReferrer = Boolean(document.referrer) && new URL(document.referrer).origin === window.location.origin;
    if (hasInternalReferrer) router.back();
    else router.push(safeFallback(pathname));
  }

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label="Regresar a la pantalla anterior"
      className="fixed bottom-5 left-5 z-50 inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-800 shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600 print:hidden"
    >
      <span aria-hidden="true">←</span>
      Regresar
    </button>
  );
}

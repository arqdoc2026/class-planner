// Ruta: src/app/page.tsx
"use client";

import Link from "next/link";
import { Sparkles, PenTool, Settings, LayoutDashboard, Database, ArrowRight } from "lucide-react";

export default function HomePage() {
  const actions = [
    {
      title: "Generación IA",
      desc: "Crea el trimestre completo con inteligencia artificial en segundos.",
      icon: <Sparkles className="w-7 h-7" />,
      href: "/generator-ia",
      color: "bg-[#020617] text-white border-slate-800",
      iconBg: "bg-slate-800/50"
    },
    {
      title: "Planeación Manual",
      desc: "Diligencia campos desde cero usando plantillas predefinidas.",
      icon: <PenTool className="w-7 h-7" />,
      href: "/planner-manual",
      color: "bg-white text-slate-900 border-slate-200",
      iconBg: "bg-slate-100"
    },
    {
      title: "Configuración",
      desc: "Ajusta trimestres, objetivos y el formato maestro Icontec.",
      icon: <Settings className="w-7 h-7" />,
      href: "/config/template",
      color: "bg-white text-slate-900 border-slate-200",
      iconBg: "bg-slate-100"
    }
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">

      {/* HEADER PREMIUM (Cohesivo con el Dashboard) */}
      <header className="bg-[#020617] border-b border-slate-800 text-white p-6 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-slate-400 to-slate-600 rounded-xl flex items-center justify-center shadow-lg">
              <Database className="w-5 h-5 text-[#020617]" />
            </div>
            <h1 className="text-xl font-black tracking-tighter">
              GYM<span className="text-slate-500 font-light">PLAN</span>
            </h1>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 px-4 py-1.5 rounded-full text-slate-300 font-mono text-[10px] uppercase tracking-widest font-bold">
            Formato institucional
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto w-full p-8 md:p-12 space-y-16">

        {/* SECCIÓN DE CREACIÓN */}
        <section>
          <div className="mb-8">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Herramientas de Creación</h2>
            <p className="text-slate-500 mt-1">Selecciona el método para generar tus planeaciones de clase.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {actions.map((item, i) => (
              <Link
                href={item.href}
                key={i}
                className={`group p-8 rounded-3xl border shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${item.color} relative overflow-hidden flex flex-col h-full`}
              >
                {/* Efecto de luz de fondo en hover */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 -mr-16 -mt-16 rounded-full transition-transform duration-500 group-hover:scale-150"></div>

                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 relative z-10 transition-colors ${item.iconBg}`}>
                  {item.icon}
                </div>

                <h3 className="text-2xl font-black mb-3 relative z-10 tracking-tight">{item.title}</h3>
                <p className="text-sm opacity-70 leading-relaxed relative z-10 flex-grow">{item.desc}</p>

                <div className="mt-8 flex items-center gap-2 text-xs font-bold uppercase tracking-widest relative z-10 opacity-60 group-hover:opacity-100 transition-opacity">
                  Comenzar <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* LÍNEA DIVISORIA DISCRETA */}
        <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent w-full"></div>

        {/* SECCIÓN DE GESTIÓN (BANNER PREMIUM) */}
        <section>
           <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Auditoría y Gestión</h2>

           <div className="bg-white border border-slate-200 p-8 md:p-10 rounded-3xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden group hover:border-slate-300 hover:shadow-md transition-all">

              {/* Elemento decorativo de fondo */}
              <div className="absolute right-0 top-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none transition-transform group-hover:scale-110"></div>

              <div className="flex items-center gap-6 relative z-10">
                <div className="w-20 h-20 bg-[#020617] rounded-2xl flex items-center justify-center text-white shadow-lg rotate-3 group-hover:rotate-6 transition-transform duration-300 shrink-0">
                  <LayoutDashboard className="w-10 h-10" />
                </div>
                <div className="text-center md:text-left">
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Panel de Control Diario</h2>
                  <p className="text-slate-500 max-w-md text-sm leading-relaxed">Accede a tus clases programadas, revisa el estado de las firmas y genera los documentos en formato PDF listos para impresión Icontec.</p>
                </div>
              </div>

              <Link href="/dashboard" className="px-8 py-4 bg-[#020617] text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-all flex items-center gap-3 relative z-10 whitespace-nowrap">
                Abrir Mi Panel <ArrowRight className="w-5 h-5" />
              </Link>
           </div>
        </section>

      </main>
    </div>
  );
}

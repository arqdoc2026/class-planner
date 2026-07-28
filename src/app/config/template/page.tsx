// Ruta: src/app/config/template/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Building2, Image as ImageIcon, CheckCircle, AlertCircle, X } from "lucide-react";
import { getInstitutionalTemplate, publishInstitutionalTemplate, updateInstitutionalTemplate } from "../../../lib/actions/template-actions";

export default function TemplateConfigPage() {
  const [template, setTemplate] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Nuevo sistema de alertas modernas
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const res = await getInstitutionalTemplate();
      if (res.success && res.data) {
        setTemplate(res.data);
      } else {
        setTemplate({});
      }
      setIsLoading(false);
    }
    load();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMsg(null); // Limpiamos errores anteriores

    const res = await updateInstitutionalTemplate(template);
    setIsSaving(false);

    if (res.success) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 4000);
    } else {
      // Usamos el estado en lugar de window.alert()
      setErrorMsg("Ocurrió un problema al guardar. Verifica tu conexión a internet o a la base de datos.");
      setTimeout(() => setErrorMsg(null), 6000);
    }
  };

  const handleChange = (field: string, value: string) => {
    setTemplate({ ...template, [field]: value });
  };

  const handlePublish = async () => {
    setIsSaving(true);
    const saved = await updateInstitutionalTemplate(template);
    const result = saved.success ? await publishInstitutionalTemplate() : saved;
    setIsSaving(false);
    if (result.success) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 4000);
    } else {
      setErrorMsg(result.error || "No se pudo publicar el formato.");
    }
  };

  if (isLoading) return <div className="p-20 text-center font-bold text-slate-500 animate-pulse">Cargando configuración institucional...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* NAVEGACIÓN Y BOTÓN */}
        <div className="flex justify-between items-center">
          <Link href="/" className="inline-flex items-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2 px-5 rounded-full transition-all text-sm">
            <ArrowLeft className="w-4 h-4" /> Volver al Inicio
          </Link>
          <div className="flex gap-2">
            <Link href="/config/template/fields" className="rounded-full bg-slate-200 px-5 py-2 font-bold text-slate-700">Configurar campos</Link>
            <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-full font-bold transition-all shadow-md disabled:bg-slate-400">
              <Save className="w-4 h-4"/> Guardar borrador
            </button>
            <button onClick={handlePublish} disabled={isSaving} className="rounded-full bg-emerald-700 px-5 py-2 font-bold text-white disabled:bg-slate-400">
              Publicar versión
            </button>
          </div>
        </div>

        {/* HEADER */}
        <div className="bg-slate-900 rounded-2xl p-8 text-white shadow-xl">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Building2 className="w-8 h-8 text-blue-400" /> Plantilla Institucional Maestra
          </h1>
          <p className="text-slate-300 mt-2">
            Los datos ingresados aquí se usarán como base para todos los formatos MGF-03-R05.
          </p>
        </div>

        {/* ALERTAS MODERNAS (Cero años 80s) */}
        {showSuccess && (
          <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 rounded-r-lg shadow-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
            <CheckCircle className="w-6 h-6 text-green-500"/>
            <span className="font-bold">¡Guardado Exitoso!</span> Los cambios en la plantilla se han registrado correctamente.
          </div>
        )}

        {errorMsg && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-r-lg shadow-sm flex items-center justify-between animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-500"/>
              <span className="font-bold">¡Ups! Algo salió mal:</span> {errorMsg}
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-700 transition-colors">
              <X className="w-5 h-5"/>
            </button>
          </div>
        )}

        {/* FORMULARIO */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 space-y-8">

          <section>
            <h3 className="text-xl font-black text-slate-800 border-b pb-2 mb-4 flex items-center gap-2">
              1. Encabezado del Documento
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nombre de la Institución</label>
                <input value={template?.schoolName || ""} onChange={e => handleChange('schoolName', e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-bold" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">URL del Logo Institucional</label>
                <div className="flex relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <ImageIcon className="h-5 w-5 text-slate-400" />
                  </div>
                  <input placeholder="Ej: https://misitio.com/logo.png" value={template?.logoUrl || ""} onChange={e => handleChange('logoUrl', e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-10 pr-4 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Título del Formato</label>
                <input value={template?.formatName || ""} onChange={e => handleChange('formatName', e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 uppercase" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Código ISO/ICONTEC</label>
                  <input value={template?.formatCode || ""} onChange={e => handleChange('formatCode', e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-mono" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Versión</label>
                  <input value={template?.version || ""} onChange={e => handleChange('version', e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-center" />
                </div>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xl font-black text-slate-800 border-b pb-2 mb-4">
              2. Valores por Defecto (Auto-llenado)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Área Predeterminada</label>
                <input value={template?.defaultArea || ""} onChange={e => handleChange('defaultArea', e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Asignatura Predeterminada</label>
                <input value={template?.defaultSubject || ""} onChange={e => handleChange('defaultSubject', e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Docente que Elabora</label>
                <input value={template?.defaultTeacher || ""} onChange={e => handleChange('defaultTeacher', e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 uppercase font-bold text-blue-800" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Coordinador/a (Aprueba)</label>
                <input value={template?.defaultCoordinator || ""} onChange={e => handleChange('defaultCoordinator', e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 uppercase font-bold text-green-800" />
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}

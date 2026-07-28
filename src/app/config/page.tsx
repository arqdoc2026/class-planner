// Ruta: src/app/config/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { saveTrimesterConfig, getTrimesterConfigs, deleteTrimesterConfig } from "../../lib/actions/config-actions";
import { Settings, BookOpen, Pencil, Trash2, ArrowLeft, Check, X, CalendarDays, Bookmark } from "lucide-react"; // MEJORA: Añadimos el icono Bookmark

const dayNames: Record<number, string> = { 1: "Lunes", 2: "Martes", 3: "Miércoles", 4: "Jueves", 5: "Viernes" };

export default function ConfigPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [configs, setConfigs] = useState<any[]>([]);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    grade: "10",
    trimester: "1",
    startDate: "",
    endDate: "",
    mainObjective: "",
    classDay: "1",
    conceptualReferences: "" // MEJORA: Referentes Conceptuales (Estado Inicial)
  });

  const loadConfigs = async () => {
    const result = await getTrimesterConfigs();
    if (result.success && result.data) {
      setConfigs(result.data);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");

    const dataToSend = new FormData(event.currentTarget);
    const result = await saveTrimesterConfig(dataToSend);

    if (result.success) {
      setMessage("¡Configuración institucional guardada con éxito!");
      // MEJORA: Referentes Conceptuales (Limpiar formulario)
      setFormData({ grade: "10", trimester: "1", startDate: "", endDate: "", mainObjective: "", classDay: "1", conceptualReferences: "" });
      await loadConfigs();
    } else {
      setMessage("Error al guardar la configuración.");
    }
    setIsLoading(false);
  }

  const handleEdit = (config: any) => {
    const startStr = new Date(config.startDate).toISOString().split('T')[0];
    const endStr = new Date(config.endDate).toISOString().split('T')[0];

    setFormData({
      grade: config.grade,
      trimester: config.trimester.toString(),
      startDate: startStr,
      endDate: endStr,
      mainObjective: config.mainObjective,
      classDay: config.classDay?.toString() || "1",
      conceptualReferences: config.conceptualReferences || "" // MEJORA: Referentes Conceptuales (Cargar para editar)
    });

    setConfirmDeleteId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setMessage("Editando configuración. Haz tus cambios y guarda.");
  };

  const executeDelete = async (id: string) => {
    const result = await deleteTrimesterConfig(id);
    if (result.success) {
      setMessage("Configuración eliminada correctamente.");
      setConfirmDeleteId(null);
      await loadConfigs();
    } else {
      setMessage("Error al eliminar la configuración.");
    }
  };

  const groupedConfigs = configs.reduce((acc, config) => {
    if (!acc[config.grade]) acc[config.grade] = [];
    acc[config.grade].push(config);
    return acc;
  }, {} as Record<string, any[]>);

  const gradeOrder = ["K5", "Transicion", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"];
  const sortedGrades = Object.keys(groupedConfigs).sort((a, b) => gradeOrder.indexOf(a) - gradeOrder.indexOf(b));

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-12">

        <div className="flex justify-between items-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2 px-5 rounded-full transition-all text-sm shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al Inicio
          </Link>
          <div className="bg-slate-200 px-3 py-1 rounded text-slate-700 font-mono text-sm font-bold shadow-inner">
            Panel de Administrador
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
          <div className="bg-slate-900 p-8 text-white">
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <Settings className="w-8 h-8 text-slate-300" />
              Configuración Académica Institucional
            </h1>
            <p className="text-slate-300">
              Define las fechas oficiales de los trimestres y los objetivos de aprendizaje por grado.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-xl border border-slate-100">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Grado a Configurar</label>
                <select name="grade" value={formData.grade} onChange={handleChange} required className="w-full border-slate-300 rounded-lg p-3 bg-white outline-none focus:ring-2 focus:ring-slate-900">
                  <optgroup label="Preescolar">
                    <option value="K5">Kinder 5 (K5)</option>
                    <option value="Transicion">Transición</option>
                  </optgroup>
                  <optgroup label="Primaria">
                    <option value="1">1° Grado</option>
                    <option value="2">2° Grado</option>
                    <option value="3">3° Grado</option>
                    <option value="4">4° Grado</option>
                    <option value="5">5° Grado</option>
                  </optgroup>
                  <optgroup label="Bachillerato">
                    <option value="6">6° Grado</option>
                    <option value="7">7° Grado</option>
                    <option value="8">8° Grado</option>
                    <option value="9">9° Grado</option>
                    <option value="10">10° Grado</option>
                    <option value="11">11° Grado</option>
                  </optgroup>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Trimestre</label>
                <select name="trimester" value={formData.trimester} onChange={handleChange} required className="w-full border-slate-300 rounded-lg p-3 bg-white outline-none focus:ring-2 focus:ring-slate-900">
                  <option value="1">Primer Trimestre</option>
                  <option value="2">Segundo Trimestre</option>
                  <option value="3">Tercer Trimestre</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Día de Clase (Fijo)</label>
                <select name="classDay" value={formData.classDay} onChange={handleChange} required className="w-full border-blue-300 rounded-lg p-3 bg-blue-50 text-blue-900 font-bold outline-none focus:ring-2 focus:ring-blue-900">
                  <option value="1">Lunes</option>
                  <option value="2">Martes</option>
                  <option value="3">Miércoles</option>
                  <option value="4">Jueves</option>
                  <option value="5">Viernes</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Fecha Oficial de Inicio</label>
                <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} required className="w-full border-slate-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-slate-900" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Fecha Oficial de Fin</label>
                <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} required className="w-full border-slate-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-slate-900" />
              </div>
            </div>

            {/* MEJORA: Referentes Conceptuales y Objetivo Macro organizados verticalmente */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Objetivo Macro del Trimestre</label>
                <textarea name="mainObjective" value={formData.mainObjective} onChange={handleChange} required rows={3} placeholder="Ej: Los estudiantes comprenderán las leyes fundamentales..." className="w-full border-slate-300 rounded-lg p-4 outline-none focus:ring-2 focus:ring-slate-900 resize-none"></textarea>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Referentes Conceptuales</label>
                <textarea name="conceptualReferences" value={formData.conceptualReferences} onChange={handleChange} required rows={2} placeholder="Ej: Leyes de Newton, Termodinámica, Cinética..." className="w-full border-slate-300 rounded-lg p-4 outline-none focus:ring-2 focus:ring-slate-900 resize-none"></textarea>
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all disabled:bg-slate-400 shadow-lg">
              {isLoading ? "Guardando..." : "Guardar Configuración"}
            </button>

            {message && (
              <div className={`p-4 rounded-lg text-center font-bold border-2 ${message.includes("Error") ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700"}`}>
                {message}
              </div>
            )}
          </form>
        </div>

        <section>
          <div className="flex items-center gap-3 mb-6 border-b-2 border-slate-200 pb-3">
            <BookOpen className="w-7 h-7 text-slate-900" />
            <h2 className="text-2xl font-bold text-slate-900">Base de Conocimiento de la IA</h2>
          </div>

          {sortedGrades.length === 0 ? (
             <div className="bg-white border-2 border-dashed border-slate-300 rounded-xl p-10 text-center text-slate-500 font-medium">
               Aún no hay objetivos configurados. ¡Guarda el primero arriba!
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedGrades.map((grade) => (
                <div key={grade} className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden flex flex-col">

                  <div className="bg-slate-900 text-white p-4 text-center border-b-4 border-slate-300">
                    <h3 className="font-black text-xl tracking-wide">
                      Grado {grade === "Transicion" ? "Transición" : grade}
                    </h3>
                  </div>

                  <div className="p-4 space-y-4 flex-grow bg-slate-50">
                    {groupedConfigs[grade].map((config: any) => (
                      <div key={config.id} className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm relative group hover:border-slate-400 transition-colors">

                        <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100">
                          <span className="font-black text-slate-900">Trimestre {config.trimester}</span>
                          <span className="flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded-full">
                            <CalendarDays className="w-3 h-3" />
                            {dayNames[config.classDay || 1]}
                          </span>
                        </div>

                        <div className="mb-4 space-y-3">
                          <p className="text-sm text-slate-600">
                            <strong>Objetivo:</strong> {config.mainObjective}
                          </p>
                          {/* MEJORA: Referentes Conceptuales mostrados en la tarjeta con un estilo sutil */}
                          <div className="bg-slate-100 p-2 rounded-md border border-slate-200">
                            <p className="text-xs text-slate-500 font-bold mb-1 flex items-center gap-1">
                              <Bookmark className="w-3 h-3" /> Referentes Conceptuales:
                            </p>
                            <p className="text-sm text-slate-700">
                              {config.conceptualReferences}
                            </p>
                          </div>
                        </div>

                        <div className="flex justify-end gap-4 pt-3 border-t border-slate-100">
                          {confirmDeleteId === config.id ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-red-600 font-bold mr-1">¿Eliminar?</span>
                              <button
                                onClick={() => executeDelete(config.id)}
                                className="bg-red-600 text-white hover:bg-red-700 p-1.5 rounded-md transition-colors"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="bg-slate-200 text-slate-700 hover:bg-slate-300 p-1.5 rounded-md transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEdit(config)}
                                className="text-slate-400 hover:text-slate-900 flex items-center gap-1 text-xs font-bold transition-colors"
                              >
                                <Pencil className="w-3 h-3" /> Editar
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(config.id)}
                                className="text-slate-400 hover:text-red-600 flex items-center gap-1 text-xs font-bold transition-colors"
                              >
                                <Trash2 className="w-3 h-3" /> Eliminar
                              </button>
                            </>
                          )}
                        </div>

                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
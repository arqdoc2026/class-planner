// Ruta: src/app/planner-manual/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
// MEJORA: Agregamos CalendarDays a la importación
import { ArrowLeft, Calendar, CheckCircle2, LayoutTemplate, CalendarDays } from "lucide-react";
import { getTrimesterConfigs } from "../../lib/actions/config-actions";
import { createQuarterlyPlans } from "../../lib/actions/generate-plans";

// MEJORA: Diccionario para traducir el número a texto
const dayNames: Record<number, string> = { 1: "Lunes", 2: "Martes", 3: "Miércoles", 4: "Jueves", 5: "Viernes" };

export default function PlannerManualPage() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [isLoadingConfigs, setIsLoadingConfigs] = useState(true);

  const [selectedConfig, setSelectedConfig] = useState<any>(null);
  const [unitTitle, setUnitTitle] = useState("");
  // MEJORA: Eliminamos const [classDay, setClassDay] = useState("1"); ¡Ya no se necesita!

  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    async function loadData() {
      const result = await getTrimesterConfigs();
      if (result.success && result.data) {
        setConfigs(result.data);
      }
      setIsLoadingConfigs(false);
    }
    loadData();
  }, []);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedConfig) {
      setMessage({ type: 'error', text: "Por favor, selecciona un trimestre de la lista." });
      return;
    }

    setIsGenerating(true);
    setMessage(null);

    const startStr = new Date(selectedConfig.startDate).toISOString().split('T')[0];
    const endStr = new Date(selectedConfig.endDate).toISOString().split('T')[0];

    // MEJORA MAGISTRAL: Extraemos el día guardado silenciosamente. Si no existe, usamos "1" por defecto.
    const assignedClassDay = selectedConfig.classDay?.toString() || "1";

    const formData = new FormData();
    formData.append("startDate", startStr);
    formData.append("endDate", endStr);
    formData.append("classDay", assignedClassDay); // MEJORA: Lo inyectamos sin que el usuario lo escriba
    formData.append("unitTitle", unitTitle);

    const result = await createQuarterlyPlans(formData);

    if (result.success) {
      // MEJORA: Informamos al usuario qué día se usó
      setMessage({ type: 'success', text: `¡Éxito! Se generaron ${result.count} sesiones (Clases los ${dayNames[parseInt(assignedClassDay)]}). Puedes verlas en tu Panel Diario.` });
      setUnitTitle("");
      setSelectedConfig(null);
    } else {
      setMessage({ type: 'error', text: "Hubo un error al generar las planeaciones." });
    }
    setIsGenerating(false);
  }

  const groupedConfigs = configs.reduce((acc, config) => {
    if (!acc[config.grade]) acc[config.grade] = [];
    acc[config.grade].push(config);
    return acc;
  }, {} as Record<string, any[]>);

  const gradeOrder = ["K5", "Transicion", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"];
  const sortedGrades = Object.keys(groupedConfigs).sort((a, b) => gradeOrder.indexOf(a) - gradeOrder.indexOf(b));

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-10">

        <div className="flex justify-between items-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2 px-5 rounded-full transition-all text-sm shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al Inicio
          </Link>
          <div className="bg-slate-200 px-3 py-1 rounded text-slate-700 font-mono text-sm font-bold shadow-inner">
            Planeación Manual
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl shadow-xl overflow-hidden border-b-4 border-slate-300 p-8 text-white">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-slate-900 font-bold border-2 border-slate-300">
              <LayoutTemplate className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-wide">Colegio San José</h1>
              <p className="text-slate-300 mt-1">Generador de Cronograma (Basado en Configuración Institucional)</p>
            </div>
          </div>
        </div>

        <section>
          <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <span className="bg-slate-900 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
            Selecciona el Grado y Trimestre Base
          </h2>

          {isLoadingConfigs ? (
            <div className="text-center p-10 text-slate-500 font-medium">Cargando base de conocimiento...</div>
          ) : sortedGrades.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-300 rounded-xl p-10 text-center text-slate-500 font-medium">
              No hay trimestres configurados. Ve a &quot;Configuración&quot; primero para establecer las fechas y objetivos institucionales.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedGrades.map((grade) => (
                groupedConfigs[grade].map((config: any) => {
                  const isSelected = selectedConfig?.id === config.id;

                  return (
                    <div
                      key={config.id}
                      onClick={() => setSelectedConfig(config)}
                      className={`cursor-pointer rounded-xl transition-all duration-200 relative overflow-hidden ${
                        isSelected
                          ? "ring-4 ring-slate-900 bg-white shadow-xl scale-[1.02]"
                          : "border-2 border-slate-200 bg-white hover:border-slate-400 hover:shadow-md opacity-80 hover:opacity-100"
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-3 right-3 text-slate-900 animate-in fade-in zoom-in">
                          <CheckCircle2 className="w-6 h-6 fill-slate-100" />
                        </div>
                      )}

                      <div className={`p-4 border-b ${isSelected ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-900"}`}>
                        <h3 className="font-black text-lg">
                          Grado {grade === "Transicion" ? "Transición" : grade}
                        </h3>
                        <p className={`text-sm font-medium ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                          Trimestre {config.trimester}
                        </p>
                      </div>

                      <div className="p-5 space-y-4">
                        {/* MEJORA: Añadimos el indicador visual del día en las tarjetas de selección */}
                        <div className="flex items-center justify-between text-sm text-slate-600 font-mono bg-slate-100 p-2 rounded">
                          <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {new Date(config.startDate).toLocaleDateString()}</span>
                          <span className="flex items-center gap-1 font-bold text-blue-700 bg-blue-100 px-2 rounded-full">
                            <CalendarDays className="w-3 h-3"/> {dayNames[config.classDay || 1]}
                          </span>
                        </div>
                        <div className="text-sm text-slate-600 line-clamp-3">
                          <strong>Objetivo:</strong> {config.mainObjective}
                        </div>
                      </div>
                    </div>
                  );
                })
              ))}
            </div>
          )}
        </section>

        {selectedConfig && (
          <section className="animate-in slide-in-from-bottom-4 fade-in duration-300">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <span className="bg-slate-900 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span>
              Detalles de tu Clase
            </h2>

            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
              <form onSubmit={handleGenerate} className="space-y-6">

                {/* MEJORA: Limpiamos la grilla, ahora solo pedimos el título en ancho completo */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Tema / Título de la Unidad</label>
                  <input
                    type="text"
                    value={unitTitle}
                    onChange={(e) => setUnitTitle(e.target.value)}
                    required
                    placeholder="Ej: Biología Celular"
                    className="w-full text-xl border-2 border-slate-200 rounded-lg p-4 focus:border-slate-900 outline-none transition-all"
                  />
                </div>

                {message && (
                  <div className={`p-4 rounded-lg text-center font-bold border-2 ${message.type === 'error' ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700"}`}>
                    {message.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isGenerating || !unitTitle}
                  className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all disabled:bg-slate-400 text-lg shadow-xl hover:shadow-2xl"
                >
                  {isGenerating ? "Generando clases y saltando festivos..." : "Crear Cronograma en 1 Clic"}
                </button>
              </form>
            </div>
          </section>
        )}

      </div>
    </div>
  );
}

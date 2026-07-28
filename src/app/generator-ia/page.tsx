// Ruta: src/app/generator-ia/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, CalendarDays, BrainCircuit, Sparkles, Bookmark } from "lucide-react";
import { getTrimesterConfigs } from "../../lib/actions/config-actions";
import { acceptGeneratedPlanSuggestion, discardGeneratedPlanSuggestion, generatePlanWithIA } from "../../lib/actions/ia-actions";

type PlanSuggestion = {
  unitTitle: string;
  learningObjective: string;
  essentialQuestions: string;
  sessions: Array<{
    sessionNumber: number;
    learningResults: string;
    startActivity: string;
    developmentActivity: string;
    closingActivity: string;
  }>;
};

const dayNames: Record<number, string> = { 1: "Lunes", 2: "Martes", 3: "Miércoles", 4: "Jueves", 5: "Viernes" };

export default function IAGeneratorPage() {
  const router = useRouter();
  const [configs, setConfigs] = useState<any[]>([]);
  const [isLoadingConfigs, setIsLoadingConfigs] = useState(true);

  const [selectedConfig, setSelectedConfig] = useState<any>(null);
  const [unitTitle, setUnitTitle] = useState("");

  // Estados para la simulación visual de la IA
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [suggestion, setSuggestion] = useState<PlanSuggestion | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);

  useEffect(() => {
    async function loadData() {
      const result = await getTrimesterConfigs();
      if (result.success && result.data) setConfigs(result.data);
      setIsLoadingConfigs(false);
    }
    loadData();
  }, []);

  // Efecto visual para simular los pasos de "pensamiento" de la IA
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < 3 ? prev + 1 : 3));
      }, 1000);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  const loadingMessages = [
    "Inicializando conexión con el modelo pedagógico...",
    "Analizando Referentes Conceptuales y Objetivo Macro...",
    "Calculando fechas matemáticas y omitiendo festivos...",
    "Redactando actividades de inicio, desarrollo y cierre..."
  ];

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedConfig) return;

    setIsGenerating(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("configId", selectedConfig.id); // Solo enviamos el ID, el servidor busca el resto
    formData.append("unitTitle", unitTitle);

    const result = await generatePlanWithIA(formData);

    if (result.success && result.suggestion && result.requestId) {
      setSuggestion(result.suggestion);
      setRequestId(result.requestId);
      setMessage({ type: 'success', text: "Sugerencia generada. Revísala: todavía no se ha guardado como planeación." });
    } else {
      setMessage({ type: 'error', text: result.error || "Hubo un error en el motor de IA." });
    }
    setIsGenerating(false);
  }

  async function handleAccept() {
    if (!requestId) return;
    setIsAccepting(true);
    const result = await acceptGeneratedPlanSuggestion(requestId);
    if (result.success && result.planId) router.push(`/plans/${result.planId}/edit`);
    else setMessage({ type: "error", text: result.error || "No se pudo guardar la sugerencia." });
    setIsAccepting(false);
  }

  async function handleDiscard() {
    if (requestId) await discardGeneratedPlanSuggestion(requestId);
    setSuggestion(null);
    setRequestId(null);
    setMessage(null);
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
          <Link href="/" className="inline-flex items-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2 px-5 rounded-full transition-all text-sm shadow-sm">
            <ArrowLeft className="w-4 h-4" /> Volver al Inicio
          </Link>
          <div className="bg-slate-200 px-3 py-1 rounded text-slate-700 font-mono text-sm font-bold shadow-inner">
            Asistente de Inteligencia Artificial
          </div>
        </div>

        {/* ENCABEZADO IA (Estilo diferente al manual) */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl shadow-xl overflow-hidden border-b-4 border-yellow-400 p-8 text-white relative">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <BrainCircuit className="w-48 h-48" />
          </div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-14 h-14 bg-yellow-400 rounded-full flex items-center justify-center text-slate-900 font-bold shadow-lg">
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-wide">Motor Pedagógico IA</h1>
              <p className="text-slate-300 mt-1">Generación automática de actividades basada en tus Referentes Conceptuales.</p>
            </div>
          </div>
        </div>

        {/* PASO 1: SELECCIONAR TARJETA */}
        <section>
          <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <span className="bg-slate-900 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
            ¿Qué Base de Conocimiento debe usar la IA?
          </h2>

          {isLoadingConfigs ? (
            <div className="text-center p-10 text-slate-500 font-medium">Cargando base de conocimiento...</div>
          ) : sortedGrades.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-300 rounded-xl p-10 text-center text-slate-500 font-medium">
              No hay configuraciones disponibles. Ve al Panel de Administrador.
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
                        isSelected ? "ring-4 ring-yellow-400 bg-white shadow-xl scale-[1.02]" : "border-2 border-slate-200 bg-white hover:border-slate-400 hover:shadow-md opacity-80 hover:opacity-100"
                      }`}
                    >
                      {isSelected && <div className="absolute top-3 right-3 text-yellow-500 animate-in fade-in zoom-in"><CheckCircle2 className="w-6 h-6 fill-yellow-100" /></div>}

                      <div className={`p-4 border-b ${isSelected ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-900"}`}>
                        <h3 className="font-black text-lg">Grado {grade === "Transicion" ? "Transición" : grade}</h3>
                        <p className={`text-sm font-medium ${isSelected ? "text-slate-300" : "text-slate-500"}`}>Trimestre {config.trimester}</p>
                      </div>

                      <div className="p-5 space-y-4">
                        <div className="flex items-center justify-between text-sm text-slate-600 font-mono bg-slate-100 p-2 rounded">
                          <span className="flex items-center gap-1 font-bold text-blue-700"><CalendarDays className="w-4 h-4"/> Días: {dayNames[config.classDay || 1]}</span>
                        </div>
                        {/* Mostramos los referentes para que el usuario sepa de qué va a hablar la IA */}
                        <div className="text-sm text-slate-600">
                          <strong className="flex items-center gap-1 text-slate-800 mb-1"><Bookmark className="w-4 h-4"/> Referentes Base:</strong>
                          <p className="line-clamp-2 italic text-slate-500">{config.conceptualReferences || "Sin referentes definidos"}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              ))}
            </div>
          )}
        </section>

        {/* PASO 2: TEMA Y GENERACIÓN */}
        {selectedConfig && (
          <section className="animate-in slide-in-from-bottom-4 fade-in duration-300">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <span className="bg-slate-900 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span>
              Instrucción para la Inteligencia Artificial
            </h2>

            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 relative overflow-hidden">

              {/* Overlay de carga estilo IA */}
              {isGenerating && (
                <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-white animate-in fade-in p-8 text-center">
                  <BrainCircuit className="w-16 h-16 text-yellow-400 animate-pulse mb-6" />
                  <h3 className="text-2xl font-bold mb-2">La Inteligencia Artificial está redactando...</h3>
                  <p className="text-slate-300 text-lg mb-8 font-mono">{loadingMessages[loadingStep]}</p>

                  {/* Barra de progreso */}
                  <div className="w-full max-w-md bg-slate-700 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-yellow-400 h-2.5 rounded-full transition-all duration-1000 ease-out" style={{ width: `${(loadingStep + 1) * 25}%` }}></div>
                  </div>
                </div>
              )}

              <form onSubmit={handleGenerate} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Tema Específico a Redactar</label>
                  <input
                    type="text"
                    value={unitTitle}
                    onChange={(e) => setUnitTitle(e.target.value)}
                    required
                    placeholder="Ej: Análisis Cinético de la Primera Ley de Newton"
                    className="w-full text-xl border-2 border-slate-200 rounded-lg p-4 focus:border-yellow-400 outline-none transition-all"
                  />
                  <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                    <Sparkles className="w-3 h-3"/> La IA cruzará este tema con los referentes de la tarjeta seleccionada.
                  </p>
                </div>

                {message && (
                  <div className={`p-4 rounded-lg text-center font-bold border-2 ${message.type === 'error' ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700"}`}>
                    {message.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isGenerating || !unitTitle}
                  className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all disabled:bg-slate-400 text-lg shadow-xl flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-5 h-5 text-yellow-400"/>
                  Generar sugerencia de planeación
                </button>
              </form>
            </div>
          </section>
        )}

        {suggestion && (
          <section className="rounded-2xl border-2 border-yellow-300 bg-white p-8 shadow-lg" aria-live="polite">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-yellow-700">Contenido sugerido por IA</p>
                <h2 className="mt-1 text-2xl font-black text-slate-900">{suggestion.unitTitle}</h2>
                <p className="mt-2 text-sm text-slate-600">Nada se incorporará a la plataforma hasta que selecciones “Aceptar y crear borrador”.</p>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={handleDiscard} className="rounded-lg border border-slate-300 px-4 py-2 font-bold text-slate-700">Descartar</button>
                <button type="button" disabled={isAccepting} onClick={handleAccept} className="rounded-lg bg-slate-900 px-4 py-2 font-bold text-white disabled:opacity-50">
                  {isAccepting ? "Creando…" : "Aceptar y crear borrador"}
                </button>
              </div>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <article className="rounded-xl bg-slate-50 p-5">
                <h3 className="font-bold text-slate-900">Objetivo</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{suggestion.learningObjective}</p>
              </article>
              <article className="rounded-xl bg-slate-50 p-5">
                <h3 className="font-bold text-slate-900">Preguntas esenciales</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{suggestion.essentialQuestions}</p>
              </article>
            </div>
            <div className="mt-6 space-y-3">
              {suggestion.sessions.map((session) => (
                <details key={session.sessionNumber} className="rounded-xl border border-slate-200 p-4">
                  <summary className="cursor-pointer font-bold text-slate-900">Sesión {session.sessionNumber}: {session.learningResults}</summary>
                  <div className="mt-3 grid gap-3 text-sm text-slate-700 md:grid-cols-3">
                    <p><strong>Inicio:</strong> {session.startActivity}</p>
                    <p><strong>Desarrollo:</strong> {session.developmentActivity}</p>
                    <p><strong>Cierre:</strong> {session.closingActivity}</p>
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}

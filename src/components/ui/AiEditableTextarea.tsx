"use client";

import { useState } from "react";
import { Sparkles, WandSparkles } from "lucide-react";
import { acceptAiSuggestion, assistPlannerText } from "../../lib/actions/text-ai-actions";

type AiContext = {
  grade?: string;
  area?: string;
  subject?: string;
  unitTitle?: string;
  sessionNumber?: number;
  period?: string;
  sessionCount?: number;
  sessionDuration?: number;
  objectives?: string;
  expectedResults?: string;
  knowledge?: string;
  skills?: string;
  availableResources?: string;
  groupNeeds?: string;
  differentiation?: string;
  institutionalApproach?: string;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  field: string;
  context: AiContext;
  className?: string;
};

export default function AiEditableTextarea({ value, onChange, field, context, className = "" }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [suggestionRequestId, setSuggestionRequestId] = useState("");

  const runAssistant = async (mode: "improve" | "generate" | "custom", instruction?: string) => {
    setIsLoading(true);
    setError("");
    const result = await assistPlannerText({ mode, field, text: value, instruction, context });
    if (result.success && result.text) {
      setSuggestion(result.text);
      setSuggestionRequestId(result.requestId || "");
    }
    else setError(result.error || "No se pudo generar el contenido.");
    setIsLoading(false);
  };

  return (
    <div className="space-y-1">
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={className}
      />
      <div className="flex flex-wrap items-center gap-1 print:hidden">
        <button type="button" disabled={isLoading} onClick={() => runAssistant("improve")} className="inline-flex items-center gap-1 rounded bg-violet-50 px-2 py-1 text-[9px] font-bold text-violet-700 hover:bg-violet-100 disabled:opacity-50">
          <Sparkles className="h-3 w-3" /> Mejorar
        </button>
        <button type="button" disabled={isLoading} onClick={() => runAssistant("generate")} className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-[9px] font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-50">
          <WandSparkles className="h-3 w-3" /> Generar
        </button>
        <button type="button" disabled={isLoading} onClick={() => runAssistant("custom", "Crea una alternativa claramente diferente que conserve el propósito pedagógico.")} className="rounded bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-50">
          Otra alternativa
        </button>
        <button type="button" disabled={isLoading} onClick={() => runAssistant("custom", "Adapta el contenido al grado indicado sin alterar el objetivo central.")} className="rounded bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-50">
          Adaptar al grado
        </button>
        <button type="button" disabled={isLoading} onClick={() => runAssistant("custom", "Agrega estrategias concretas de diferenciación y educación personalizada.")} className="rounded bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-50">
          Diferenciación
        </button>
        <button type="button" disabled={isLoading} onClick={() => runAssistant("custom", "Integra de manera explícita y coherente el Paradigma Pedagógico Ignaciano.")} className="rounded bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-50">
          Integrar PPI
        </button>
        {isLoading && <span className="text-[9px] font-medium text-violet-700">Pensando…</span>}
      </div>
      {error && <p className="text-[9px] text-red-600 print:hidden">{error}</p>}
      {suggestion && (
        <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 print:hidden">
          <p className="mb-2 text-[9px] font-black uppercase tracking-wider text-violet-700">Sugerencia de IA — aún no aplicada</p>
          <textarea
            value={suggestion}
            onChange={(event) => setSuggestion(event.target.value)}
            className="min-h-20 w-full rounded border border-violet-200 bg-white p-2 text-xs text-slate-800"
          />
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={async () => {
              onChange(suggestion);
              if (suggestionRequestId) await acceptAiSuggestion(suggestionRequestId);
              setSuggestion("");
              setSuggestionRequestId("");
            }} className="rounded bg-violet-700 px-3 py-1 text-[10px] font-bold text-white">
              Insertar sugerencia
            </button>
            <button type="button" onClick={() => { setSuggestion(""); setSuggestionRequestId(""); }} className="rounded bg-white px-3 py-1 text-[10px] font-bold text-slate-600">
              Descartar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

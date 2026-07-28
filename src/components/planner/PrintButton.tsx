"use client";

import { useState } from "react";

export default function PrintButton({ filename = "planeacion-institucional" }: { filename?: string }) {
  const [isExporting, setIsExporting] = useState(false);

  const downloadPdf = async () => {
    const documentElement = document.getElementById("institutional-plan-document");
    if (!documentElement || isExporting) return;

    setIsExporting(true);
    documentElement.classList.add("pdf-export-content");
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      await html2pdf().set({
        margin: 0.5,
        filename: `${filename}.pdf`,
        image: { type: "jpeg", quality: 1 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
        },
        jsPDF: { unit: "in", format: "letter", orientation: "landscape" },
        pagebreak: { mode: ["css", "legacy"], avoid: ["tr", ".session-print"] },
      } as never).from(documentElement).save();
    } finally {
      documentElement.classList.remove("pdf-export-content");
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-wrap justify-end gap-2">
      <button
        type="button"
        onClick={downloadPdf}
        disabled={isExporting}
        className="rounded-lg bg-slate-950 px-4 py-2 font-bold text-white disabled:cursor-wait disabled:opacity-60"
      >
        {isExporting ? "Generando PDF…" : "Descargar PDF"}
      </button>
      <button type="button" onClick={() => window.print()} className="rounded-lg bg-white px-4 py-2 font-bold text-slate-900 ring-1 ring-slate-300">
        Imprimir
      </button>
    </div>
  );
}

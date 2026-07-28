"use client";

export default function PrintButton() {
  return <button onClick={() => window.print()} className="rounded-lg bg-slate-950 px-4 py-2 font-bold text-white">Imprimir o guardar como PDF</button>;
}

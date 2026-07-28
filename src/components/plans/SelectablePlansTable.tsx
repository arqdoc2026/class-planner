"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { softDeletePlans } from "../../lib/actions/plan-lifecycle-actions";
import { planStatusLabel } from "../../lib/status-labels";

type PlanRow = {
  id: string;
  unitTitle: string | null;
  area: string | null;
  subject: string | null;
  grade: string | null;
  authorId: string | null;
  authorName: string | null;
  status: string;
  courseGroupName: string | null;
  academicYearName: string | null;
  academicPeriodName: string | null;
  campusName: string | null;
  canDelete: boolean;
};

export default function SelectablePlansTable({
  plans,
  canBulkDelete,
}: {
  plans: PlanRow[];
  canBulkDelete: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const selectableIds = useMemo(() => plans.filter((plan) => plan.canDelete).map((plan) => plan.id), [plans]);
  const allPageSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));

  function toggleAllPage() {
    setSelected(allPageSelected ? new Set() : new Set(selectableIds));
    setMessage(null);
  }

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setMessage(null);
  }

  async function removeSelected() {
    if (!selected.size) return;
    if (!window.confirm(`¿Enviar ${selected.size} planeación(es) seleccionada(s) a la papelera? Podrás restaurarlas posteriormente.`)) return;
    await remove({ planIds: Array.from(selected) });
  }

  async function removeAll() {
    if (!window.confirm("¿Enviar TODAS las planeaciones que puedes administrar a la papelera? Esta acción afectará también otras páginas y podrás restaurarlas desde la papelera.")) return;
    if (!window.confirm("Confirma nuevamente: ¿deseas continuar con la eliminación masiva?")) return;
    await remove({ all: true });
  }

  async function remove(input: { planIds?: string[]; all?: boolean }) {
    setPending(true);
    setMessage(null);
    try {
      const result = await softDeletePlans(input);
      if (result.success) {
        setSelected(new Set());
        setMessage({ ok: true, text: `${result.count} planeación(es) enviada(s) a la papelera.` });
        router.refresh();
      } else {
        setMessage({ ok: false, text: result.error || "No fue posible eliminar las planeaciones." });
      }
    } catch {
      setMessage({ ok: false, text: "Ocurrió un error inesperado. Intenta nuevamente." });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      {canBulkDelete && plans.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4">
          <button type="button" onClick={toggleAllPage} disabled={!selectableIds.length || pending} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold disabled:opacity-40">
            {allPageSelected ? "Quitar selección" : "Seleccionar página"}
          </button>
          <button type="button" onClick={removeSelected} disabled={!selected.size || pending} className="rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">
            {pending ? "Procesando…" : `Eliminar seleccionadas${selected.size ? ` (${selected.size})` : ""}`}
          </button>
          <button type="button" onClick={removeAll} disabled={pending} className="ml-auto rounded-lg border border-red-300 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-40">
            Eliminar todas
          </button>
          <Link href="/trash" className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">Ver papelera</Link>
        </div>
      )}
      {message && <p role={message.ok ? "status" : "alert"} className={`rounded-lg px-4 py-3 text-sm font-bold ${message.ok ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>{message.text}</p>}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-[960px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              {canBulkDelete && <th className="w-12 p-4"><input type="checkbox" aria-label="Seleccionar todas las planeaciones de esta página" checked={allPageSelected} disabled={!selectableIds.length || pending} onChange={toggleAllPage} /></th>}
              <th className="p-4">Unidad</th><th className="p-4">Clasificación</th><th className="p-4">Periodo / sede</th><th className="p-4">Responsable</th><th className="p-4">Estado</th><th className="p-4">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => (
              <tr key={plan.id} className={`border-t border-slate-100 ${selected.has(plan.id) ? "bg-red-50/60" : ""}`}>
                {canBulkDelete && <td className="p-4"><input type="checkbox" aria-label={`Seleccionar ${plan.unitTitle || "planeación sin título"}`} checked={selected.has(plan.id)} disabled={!plan.canDelete || pending} onChange={() => toggle(plan.id)} /></td>}
                <td className="p-4 font-bold">{plan.unitTitle || "Sin título"}</td>
                <td className="p-4 text-slate-600">{[plan.area, plan.subject, plan.grade, plan.courseGroupName].filter(Boolean).join(" · ")}</td>
                <td className="p-4 text-slate-600">{[plan.academicYearName, plan.academicPeriodName, plan.campusName].filter(Boolean).join(" · ") || "Sin clasificar"}</td>
                <td className="p-4">{plan.authorName || "Sin asignar"}</td>
                <td className="p-4"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{planStatusLabel(plan.status)}</span></td>
                <td className="p-4"><div className="flex gap-2"><Link href={`/plans/${plan.id}/edit`} className="font-bold text-blue-700">Editar</Link><Link href={`/plans/${plan.id}/review`} className="font-bold text-violet-700">Revisar</Link></div></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!plans.length && <p className="p-8 text-center text-slate-500">No hay planeaciones que coincidan.</p>}
      </div>
    </div>
  );
}

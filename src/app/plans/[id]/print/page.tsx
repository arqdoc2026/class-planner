import InstitutionalPlanDocument from "../../../../components/planner/InstitutionalPlanDocument";
import PrintButton from "../../../../components/planner/PrintButton";
import { getStructuredPlan } from "../../../../lib/actions/structured-plan-actions";

export default async function PrintPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { plan } = await getStructuredPlan(id);
  const filename = `planeacion-${plan.unitTitle || plan.id}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return <main className="bg-slate-200 py-8 print:bg-white print:py-0"><div className="mx-auto mb-4 flex max-w-[11in] justify-end print:hidden"><PrintButton filename={filename} /></div><InstitutionalPlanDocument plan={plan} /></main>;
}

import AppNavigation from "../../components/navigation/AppNavigation";
import AsyncActionForm from "../../components/ui/AsyncActionForm";
import { createStructuredRubric, duplicateRubric, getInstitutionRubrics } from "../../lib/actions/structured-rubric-actions";
import { requireInstitutionContext } from "../../lib/auth";

export default async function RubricsPage() {
  const [rubrics, context] = await Promise.all([getInstitutionRubrics(), requireInstitutionContext()]);
  return (
    <div className="min-h-screen bg-slate-100">
      <AppNavigation role={context.role} institutionName={context.institution.name} userName={context.profile.fullName} isSuperAdmin={context.profile.isSuperAdmin} />
      <main className="mx-auto max-w-5xl space-y-6 p-5 md:p-10">
        <header><p className="text-xs font-black uppercase tracking-widest text-blue-700">Banco institucional</p><h1 className="text-3xl font-black">Rúbricas</h1><p className="mt-2 text-slate-500">Diseña y reutiliza instrumentos de evaluación estructurados.</p></header>
        <AsyncActionForm action={createStructuredRubric} successMessage="Rúbrica creada correctamente." resetOnSuccess className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2">
          <input name="name" required placeholder="Nombre de la rúbrica" className="rounded-lg border border-slate-300 px-3 py-2 md:col-span-2" />
          <textarea name="criteria" required rows={5} placeholder={"Un criterio por línea\nComprensión conceptual\nAplicación"} className="rounded-lg border border-slate-300 p-3" />
          <textarea name="levels" required rows={5} placeholder={"Un nivel por línea\nInicial\nEn proceso\nLogrado"} className="rounded-lg border border-slate-300 p-3" />
          <button className="rounded-lg bg-slate-950 px-4 py-3 font-bold text-white md:col-span-2">Crear rúbrica estructurada</button>
        </AsyncActionForm>
        <div className="grid gap-4 md:grid-cols-2">
          {rubrics.map((rubric) => {
            const structure = rubric.structure as { levels?: Array<{ name: string }>; criteria?: Array<{ name: string }> };
            return <article key={rubric.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-black">{rubric.name}</h2><p className="mt-2 text-sm text-slate-500">{structure.criteria?.length || 0} criterios · {structure.levels?.length || 0} niveles</p><AsyncActionForm className="mt-4" action={duplicateRubric.bind(null, rubric.id)} successMessage="Rúbrica duplicada."><button className="text-sm font-bold text-blue-700">Duplicar para reutilizar</button></AsyncActionForm></article>;
          })}
          {!rubrics.length && <p className="rounded-2xl bg-white p-8 text-center text-slate-500 md:col-span-2">Aún no existen rúbricas institucionales.</p>}
        </div>
      </main>
    </div>
  );
}

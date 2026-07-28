import Link from "next/link";
import { getInstitutionalTemplate, updateTemplateFieldConfiguration } from "../../../../lib/actions/template-actions";
import { requireInstitutionRole } from "../../../../lib/auth";
import { DEFAULT_FORMAT_CONFIGURATION } from "../../../../lib/institutional-format";

export default async function TemplateFieldsPage() {
  await requireInstitutionRole(["INSTITUTION_ADMIN"]);
  const result = await getInstitutionalTemplate();
  const configuration = (result.data?.configuration as { requiredFields?: string[]; activeFields?: string[]; sectionNames?: Record<string, string>; instructions?: Record<string, string> } | null) || {};
  const allFields = DEFAULT_FORMAT_CONFIGURATION.stages.flatMap((stage) => stage.fields.map((field) => ({ stage: stage.key, field })));
  const active = configuration.activeFields || allFields.map((item) => item.field);
  return <main className="min-h-screen bg-slate-100 p-6 md:p-10"><form action={async (formData) => { "use server"; await updateTemplateFieldConfiguration(formData); }} className="mx-auto max-w-5xl space-y-6"><header className="flex justify-between"><div><p className="text-xs font-black uppercase text-slate-400">Formato institucional</p><h1 className="text-3xl font-black">Campos e instrucciones</h1></div><Link href="/config/template" className="rounded-lg bg-white px-4 py-2 font-bold">Volver</Link></header>{DEFAULT_FORMAT_CONFIGURATION.stages.map((stage) => <section key={stage.key} className="space-y-4 rounded-2xl bg-white p-6"><input name={`sectionName:${stage.key}`} defaultValue={configuration.sectionNames?.[stage.key] || stage.name} className="w-full rounded-lg border p-3 text-lg font-black" /><textarea name={`instruction:${stage.key}`} defaultValue={configuration.instructions?.[stage.key] || ""} placeholder="Instrucciones para el profesor" className="w-full rounded-lg border p-3" /><div className="grid gap-2 md:grid-cols-2">{stage.fields.map((field) => <div key={field} className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm"><code>{field}</code><div className="flex gap-3"><label><input type="checkbox" name="activeFields" value={field} defaultChecked={active.includes(field)} /> Activo</label><label><input type="checkbox" name="requiredFields" value={field} defaultChecked={configuration.requiredFields?.includes(field)} /> Obligatorio</label></div></div>)}</div></section>)}<button className="rounded-xl bg-slate-950 px-6 py-3 font-bold text-white">Guardar configuración</button></form></main>;
}

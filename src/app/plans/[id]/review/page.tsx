import Link from "next/link";
import {
  addPlanComment,
  addPlanCollaborator,
  decidePlanReview,
  getPlanReview,
  resolvePlanComment,
  removePlanCollaborator,
  restorePlanVersion,
  startPlanReview,
  submitPlanForReview,
} from "../../../../lib/actions/workflow-actions";
import { analyzePlanCoherence } from "../../../../lib/coherence-review";
import { duplicatePlan, softDeletePlan } from "../../../../lib/actions/plan-lifecycle-actions";
import { uploadPlanAttachment } from "../../../../lib/actions/attachment-actions";

const labels: Record<string, string> = {
  DRAFT: "Borrador",
  IN_PROGRESS: "En elaboración",
  READY_FOR_REVIEW: "Lista para revisión",
  IN_REVIEW: "En revisión",
  CHANGES_REQUESTED: "Cambios solicitados",
  CORRECTED: "Corregida",
  APPROVED: "Aprobada",
  ARCHIVED: "Archivada",
};

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { context, plan, members } = await getPlanReview(id);
  const canReview = context.role === "INSTITUTION_ADMIN" || context.role === "COORDINATOR";
  const canSubmit = context.role !== "VIEWER" && ["DRAFT", "IN_PROGRESS", "CHANGES_REQUESTED", "CORRECTED"].includes(plan.status);
  const coherence = analyzePlanCoherence(plan);

  return (
    <main className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Flujo de revisión</p>
            <h1 className="text-3xl font-black text-slate-950">{plan.unitTitle || "Planeación sin título"}</h1>
            <span className="mt-2 inline-block rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">{labels[plan.status] || plan.status}</span>
          </div>
          <Link href="/dashboard" className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-800 shadow">Volver al panel</Link>
        </header>

        <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 md:grid-cols-3">
          <Data label="Área" value={plan.area} />
          <Data label="Asignatura" value={plan.subject} />
          <Data label="Grado" value={plan.grade} />
          <Data label="Objetivo" value={plan.learningObjective} wide />
          <Data label="Sesiones" value={String(plan.sessions.length)} />
          <Data label="Versión" value={String(plan.versionNumber)} />
        </section>

        <section className="flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-5">
          <Link href={`/plans/${id}/print`} className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white">Vista de impresión / PDF</Link>
          <a href={`/api/plans/${id}/word`} className="rounded-xl bg-blue-100 px-5 py-3 text-sm font-bold text-blue-800">Descargar Word</a>
          <form action={async (formData) => { "use server"; await duplicatePlan(id, formData); }} className="flex gap-2"><input name="grade" defaultValue={plan.grade || ""} aria-label="Grado de la copia" className="w-20 rounded-lg border border-slate-300 px-2" /><button className="rounded-xl bg-emerald-100 px-5 py-3 text-sm font-bold text-emerald-800">Duplicar</button></form>
          <form action={async () => { "use server"; await softDeletePlan(id); }}><button className="rounded-xl bg-red-50 px-5 py-3 text-sm font-bold text-red-700">Enviar a papelera</button></form>
          {canSubmit && (
            <form action={async () => { "use server"; await submitPlanForReview(id); }}>
              <button className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white">Enviar a revisión</button>
            </form>
          )}
          {canReview && plan.status === "READY_FOR_REVIEW" && (
            <form action={async () => { "use server"; await startPlanReview(id); }}>
              <button className="rounded-xl bg-violet-700 px-5 py-3 text-sm font-bold text-white">Iniciar revisión</button>
            </form>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-xl font-black">Revisión automática de coherencia</h2>
          <div className="space-y-2">
            {coherence.map((finding, index) => (
              <div key={`${finding.code}-${index}`} className="flex gap-3 rounded-lg bg-slate-50 p-3 text-sm">
                <strong className="min-w-28 text-slate-700">{finding.level}</strong>
                <span>{finding.message}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">Estas recomendaciones no bloquean el guardado. Los campos obligatorios solo se validan al enviar a revisión.</p>
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-black">Colaboradores</h2>
          <form action={async (formData) => { "use server"; await addPlanCollaborator(id, formData); }} className="flex flex-wrap gap-2">
            <select name="profileId" required className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">Selecciona un miembro</option>
              {members.filter((member) => member.id !== plan.authorId).map((member) => <option key={member.id} value={member.id}>{member.name} — {member.role}</option>)}
            </select>
            <select name="role" className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="EDITOR">Editor</option><option value="REVIEWER">Revisor</option><option value="VIEWER">Lector</option>
            </select>
            <button className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white">Asignar</button>
          </form>
          <div className="space-y-2">
            {plan.collaborators.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 text-sm">
                <span><strong>{item.profile.fullName}</strong> — {item.role}</span>
                <form action={async () => { "use server"; await removePlanCollaborator(id, item.profileId); }}><button className="font-bold text-red-600">Quitar</button></form>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-black">Archivos adjuntos</h2>
          <form action={async (formData) => { "use server"; await uploadPlanAttachment(id, formData); }} className="flex flex-wrap gap-2">
            <input type="file" name="file" required accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg" className="rounded-lg border border-slate-300 p-2 text-sm" />
            <select name="category" className="rounded-lg border border-slate-300 px-3 py-2"><option value="GENERAL">General</option><option value="EVIDENCE">Evidencia</option><option value="RESOURCE">Recurso</option><option value="RUBRIC">Rúbrica</option></select>
            <button className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white">Adjuntar</button>
          </form>
          <div className="space-y-2">{plan.attachments.map((attachment) => <a key={attachment.id} href={`/api/attachments/${attachment.id}`} target="_blank" rel="noreferrer" className="flex justify-between rounded-lg bg-slate-50 px-4 py-3 text-sm"><span className="font-bold">{attachment.fileName}</span><span className="text-slate-500">{attachment.category} · {(attachment.sizeBytes / 1024).toFixed(0)} KB</span></a>)}</div>
        </section>

        {plan.versions.length > 0 && (
          <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-black">Historial de versiones</h2>
            {plan.versions.map((version) => (
              <div key={version.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 text-sm">
                <span>Versión {version.versionNumber} · {version.reason || "Snapshot"} · {version.createdAt.toLocaleString("es-CO")}</span>
                {!["APPROVED", "ARCHIVED"].includes(plan.status) && (
                  <form action={async () => { "use server"; await restorePlanVersion(id, version.versionNumber); }}><button className="font-bold text-blue-700">Restaurar</button></form>
                )}
              </div>
            ))}
          </section>
        )}

        {canReview && plan.status === "IN_REVIEW" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-xl font-black">Decisión del coordinador</h2>
            <form action={async (formData) => {
              "use server";
              const decision = String(formData.get("decision")) as "CHANGES_REQUESTED" | "APPROVED";
              await decidePlanReview(id, decision, String(formData.get("observations") || ""));
            }} className="space-y-4">
              <textarea name="observations" rows={4} className="w-full rounded-xl border border-slate-300 p-3" placeholder="Observaciones o cambios solicitados" />
              <div className="flex gap-3">
                <button name="decision" value="CHANGES_REQUESTED" className="rounded-xl bg-amber-600 px-5 py-3 text-sm font-bold text-white">Solicitar cambios</button>
                <button name="decision" value="APPROVED" className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white">Aprobar versión</button>
              </div>
            </form>
          </section>
        )}

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-black">Comentarios</h2>
          <form action={async (formData) => { "use server"; await addPlanComment(id, formData); }} className="space-y-3">
            <select name="sectionKey" className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">Comentario general</option>
              <option value="stage-1">Resultados esperados</option>
              <option value="stage-2">Evidencias de evaluación</option>
              <option value="stage-3">Plan de aprendizaje</option>
              <option value="stage-4">Evaluación y reflexión</option>
            </select>
            <textarea name="body" required rows={3} className="w-full rounded-xl border border-slate-300 p-3" placeholder="Escribe un comentario o una solicitud concreta…" />
            <button className="rounded-xl bg-slate-950 px-5 py-2 text-sm font-bold text-white">Comentar</button>
          </form>
          <div className="space-y-3">
            {plan.comments.map((comment) => (
              <article key={comment.id} className={`rounded-xl border p-4 ${comment.resolvedAt ? "border-emerald-200 bg-emerald-50" : "border-slate-200"}`}>
                <div className="flex items-center justify-between gap-3">
                  <strong>{comment.author.fullName}</strong>
                  <span className="text-xs text-slate-500">{comment.sectionKey || "General"}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{comment.body}</p>
                {!comment.resolvedAt && (
                  <form className="mt-3" action={async () => { "use server"; await resolvePlanComment(comment.id); }}>
                    <button className="text-xs font-bold text-emerald-700">Marcar como resuelto</button>
                  </form>
                )}
              </article>
            ))}
            {!plan.comments.length && <p className="text-sm text-slate-500">No hay comentarios todavía.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}

function Data({ label, value, wide = false }: { label: string; value: string | null; wide?: boolean }) {
  return <div className={wide ? "md:col-span-3" : ""}><dt className="text-xs font-bold uppercase text-slate-400">{label}</dt><dd className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{value || "Sin definir"}</dd></div>;
}

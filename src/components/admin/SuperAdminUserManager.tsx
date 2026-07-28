"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createInstitutionUser, deleteInstitutionUser, restoreInstitutionUser, updateInstitutionUser } from "../../lib/actions/platform-actions";

type InstitutionOption = {
  id: string;
  name: string;
  active: boolean;
  members: Array<{
    id: string;
    profileId: string;
    fullName: string;
    username: string;
    role: "INSTITUTION_ADMIN" | "COORDINATOR" | "TEACHER" | "VIEWER";
    active: boolean;
    isSuperAdmin: boolean;
  }>;
  removedMembers?: Array<{ id: string; profileId: string; fullName: string; username: string; role: string }>;
};

export default function SuperAdminUserManager({ institutions, currentUserId }: { institutions: InstitutionOption[]; currentUserId?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function create(formData: FormData) {
    setPending(true);
    setMessage(null);
    const result = await createInstitutionUser({
      institutionId: String(formData.get("institutionId") || ""),
      fullName: String(formData.get("fullName") || ""),
      username: String(formData.get("username") || ""),
      temporaryPassword: String(formData.get("temporaryPassword") || ""),
      role: String(formData.get("role") || "TEACHER") as "INSTITUTION_ADMIN" | "COORDINATOR" | "TEACHER" | "VIEWER",
    });
    setMessage({ ok: result.success, text: result.success ? "Usuario creado y asignado correctamente." : result.error || "No se pudo crear." });
    setPending(false);
    if (result.success) {
      const form = document.getElementById("superadmin-user-form") as HTMLFormElement | null;
      form?.reset();
      router.refresh();
    }
  }

  async function update(formData: FormData) {
    const profileId = String(formData.get("profileId") || "");
    setPending(true);
    setEditingId(profileId);
    setMessage(null);
    const result = await updateInstitutionUser({
      institutionId: String(formData.get("institutionId") || ""),
      profileId,
      fullName: String(formData.get("fullName") || ""),
      username: String(formData.get("username") || ""),
      role: String(formData.get("role") || "TEACHER") as "INSTITUTION_ADMIN" | "COORDINATOR" | "TEACHER" | "VIEWER",
      active: formData.get("active") === "true",
      newPassword: String(formData.get("newPassword") || ""),
    });
    setMessage({ ok: result.success, text: result.success ? "Perfil actualizado correctamente." : result.error || "No se pudo actualizar." });
    setPending(false);
    if (result.success) {
      setEditingId(null);
      router.refresh();
    }
  }

  async function remove(institutionId: string, member: InstitutionOption["members"][number]) {
    if (!window.confirm(`¿Eliminar a ${member.fullName} de esta institución? Sus planeaciones e historial se conservarán.`)) return;
    setPending(true);
    setEditingId(member.profileId);
    setMessage(null);
    const result = await deleteInstitutionUser(institutionId, member.profileId);
    setMessage({ ok: result.success, text: result.success ? "Perfil retirado de la institución." : result.error || "No se pudo eliminar." });
    setPending(false);
    setEditingId(null);
    if (result.success) router.refresh();
  }

  async function restore(institutionId: string, profileId: string) {
    setPending(true);
    setEditingId(profileId);
    setMessage(null);
    const result = await restoreInstitutionUser(institutionId, profileId);
    setMessage({ ok: result.success, text: result.success ? "Perfil restaurado correctamente." : result.error || "No se pudo restaurar." });
    setPending(false);
    setEditingId(null);
    if (result.success) router.refresh();
  }

  return (
    <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <form id="superadmin-user-form" action={create} className="space-y-4">
        <div>
          <h2 className="text-lg font-black">Crear usuario institucional</h2>
          <p className="mt-1 text-sm text-slate-400">Crea el acceso en Supabase y asígnalo inmediatamente a una institución.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          {institutions.length === 1 ? (
            <div className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">
              <input type="hidden" name="institutionId" value={institutions[0].id} />
              {institutions[0].name}
            </div>
          ) : (
            <select name="institutionId" required className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">
              <option value="">Selecciona institución</option>
              {institutions.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          )}
          <input name="fullName" required minLength={2} maxLength={200} placeholder="Nombre completo" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
          <input name="username" required minLength={3} maxLength={30} pattern="[a-zA-Z0-9._-]+" placeholder="usuario" autoCapitalize="none" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
          <input name="temporaryPassword" required type="password" minLength={6} maxLength={6} pattern="[0-9]{6}" inputMode="numeric" autoComplete="new-password" placeholder="PIN temporal (6 dígitos)" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
          <select name="role" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">
            <option value="TEACHER">Profesor</option>
            <option value="COORDINATOR">Coordinador</option>
            <option value="INSTITUTION_ADMIN">Administrador institucional</option>
            <option value="VIEWER">Lector</option>
          </select>
        </div>
        <button disabled={pending} className="rounded-lg bg-blue-600 px-4 py-2 font-bold text-white disabled:opacity-50">
          {pending ? "Creando…" : "Crear y asignar usuario"}
        </button>
      </form>
      {message && <p role="status" className={`rounded-lg p-3 text-sm font-bold ${message.ok ? "bg-emerald-950 text-emerald-300" : "bg-red-950 text-red-300"}`}>{message.text}</p>}
      <div className="space-y-4 pt-4">
        <h2 className="text-lg font-black">Editar perfiles existentes</h2>
        {institutions.map((institution) => (
          <section key={institution.id} className="overflow-hidden rounded-xl border border-slate-800">
            <h3 className="bg-slate-950 px-4 py-3 font-bold">{institution.name}</h3>
            <div className="divide-y divide-slate-800">
              {institution.members.map((member) => (
                <form key={member.id} action={update} className="grid gap-2 p-4 md:grid-cols-8">
                  <input type="hidden" name="institutionId" value={institution.id} />
                  <input type="hidden" name="profileId" value={member.profileId} />
                  <input name="fullName" required defaultValue={member.fullName} disabled={member.isSuperAdmin && member.profileId !== currentUserId} aria-label={`Nombre de ${member.username}`} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 disabled:opacity-50" />
                  <input name="username" required defaultValue={member.username} disabled={member.isSuperAdmin && member.profileId !== currentUserId} pattern="[a-zA-Z0-9._-]+" aria-label={`Usuario ${member.username}`} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 disabled:opacity-50" />
                  <select name="role" defaultValue={member.role} disabled={member.isSuperAdmin} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 disabled:opacity-50">
                    <option value="TEACHER">Profesor</option>
                    <option value="COORDINATOR">Coordinador</option>
                    <option value="INSTITUTION_ADMIN">Administrador</option>
                    <option value="VIEWER">Lector</option>
                  </select>
                  {member.isSuperAdmin && <input type="hidden" name="role" value={member.role} />}
                  <select name="active" defaultValue={String(member.active)} disabled={member.isSuperAdmin} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 disabled:opacity-50">
                    <option value="true">Activo</option>
                    <option value="false">Suspendido</option>
                  </select>
                  {member.isSuperAdmin && <input type="hidden" name="active" value="true" />}
                  <input name="newPassword" type="password" disabled={member.isSuperAdmin && member.profileId !== currentUserId} minLength={6} maxLength={6} pattern="[0-9]{6}" inputMode="numeric" placeholder="Nuevo PIN (opcional)" aria-label={`Nuevo PIN para ${member.username}`} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 disabled:opacity-50" />
                  <button disabled={pending || (member.isSuperAdmin && member.profileId !== currentUserId)} className="rounded-lg bg-slate-700 px-3 py-2 font-bold text-white disabled:opacity-40">
                    {editingId === member.profileId ? "Guardando…" : member.isSuperAdmin ? "Actualizar mi perfil" : "Guardar"}
                  </button>
                  <button type="button" disabled={pending || member.isSuperAdmin} onClick={() => remove(institution.id, member)} className="rounded-lg border border-red-800 px-3 py-2 font-bold text-red-300 hover:bg-red-950 disabled:opacity-40">
                    Eliminar
                  </button>
                </form>
              ))}
              {!institution.members.length && <p className="p-4 text-sm text-slate-500">Esta institución aún no tiene miembros.</p>}
            </div>
          </section>
        ))}
        {institutions.some((institution) => institution.removedMembers?.length) && (
          <section className="overflow-hidden rounded-xl border border-amber-800">
            <h3 className="bg-amber-950 px-4 py-3 font-bold text-amber-200">Perfiles retirados</h3>
            <div className="divide-y divide-slate-800">
              {institutions.flatMap((institution) => (institution.removedMembers || []).map((member) => (
                <div key={member.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div><p className="font-bold">{member.fullName}</p><p className="text-xs text-slate-400">@{member.username} · {member.role}</p></div>
                  <button type="button" disabled={pending} onClick={() => restore(institution.id, member.profileId)} className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                    {editingId === member.profileId ? "Restaurando…" : "Restaurar acceso"}
                  </button>
                </div>
              )))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

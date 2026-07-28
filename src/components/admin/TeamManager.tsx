"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { claimLegacyData, createTeamInvitation, updateTeamMember } from "../../lib/actions/team-actions";

type Member = {
  id: string;
  email: string;
  username: string;
  fullName: string;
  role: "INSTITUTION_ADMIN" | "COORDINATOR" | "TEACHER" | "VIEWER";
  active: boolean;
};

export default function TeamManager({ members, currentUserId }: { members: Member[]; currentUserId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [invitePath, setInvitePath] = useState("");

  const update = async (member: Member, data: { role?: Member["role"]; active?: boolean }) => {
    setPendingId(member.id);
    const result = await updateTeamMember(member.id, data);
    setMessage(result.success ? "Perfil actualizado." : result.error || "No se pudo actualizar.");
    setPendingId(null);
    router.refresh();
  };

  const claim = async () => {
    setPendingId("legacy");
    const result = await claimLegacyData();
    setMessage(result.success ? `Asignadas ${result.counts.plans} planeaciones anteriores.` : "No se pudieron asignar los datos.");
    setPendingId(null);
  };

  const invite = async (formData: FormData) => {
    setPendingId("invite");
    const result = await createTeamInvitation({
      username: String(formData.get("username") || ""),
      fullName: String(formData.get("fullName") || ""),
      role: String(formData.get("role") || "TEACHER") as Member["role"],
    });
    setMessage(result.success ? "Invitación creada. Comparte el enlace de forma segura." : result.error || "No se pudo crear.");
    setInvitePath(result.invitePath || "");
    setPendingId(null);
  };

  return (
    <div className="space-y-6">
      <form action={invite} className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
        <h2 className="font-black text-blue-950">Invitar miembro</h2>
        <div className="flex flex-wrap gap-2">
          <input name="fullName" required placeholder="Nombre completo" className="rounded-lg border border-blue-200 px-3 py-2" />
          <input name="username" required placeholder="usuario" className="rounded-lg border border-blue-200 px-3 py-2" />
          <select name="role" className="rounded-lg border border-blue-200 px-3 py-2">
            <option value="TEACHER">Profesor</option><option value="COORDINATOR">Coordinador</option><option value="VIEWER">Lector</option><option value="INSTITUTION_ADMIN">Administrador</option>
          </select>
          <button disabled={pendingId === "invite"} className="rounded-lg bg-blue-800 px-4 py-2 font-bold text-white">Crear invitación</button>
        </div>
        {invitePath && <div className="rounded-lg bg-white p-3 text-sm"><span className="font-bold">Enlace:</span> <code className="break-all">{invitePath}</code></div>}
      </form>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm text-amber-900">Asigna al administrador las planeaciones creadas antes de activar perfiles.</p>
        <button disabled={pendingId === "legacy"} onClick={claim} className="rounded-lg bg-amber-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Asignar datos anteriores</button>
      </div>
      {message && <p className="rounded-xl bg-slate-100 p-3 text-sm font-medium text-slate-700">{message}</p>}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-wider text-slate-500">
            <tr><th className="p-4">Docente</th><th className="p-4">Rol</th><th className="p-4">Estado</th></tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const isSelf = member.id === currentUserId;
              return (
                <tr key={member.id} className="border-t border-slate-100">
                  <td className="p-4"><div className="font-bold text-slate-900">{member.fullName}</div><div className="text-xs text-slate-500">@{member.username}</div></td>
                  <td className="p-4">
                    <select disabled={isSelf || pendingId === member.id} value={member.role} onChange={event => update(member, { role: event.target.value as Member["role"] })} className="rounded-lg border border-slate-300 bg-white px-3 py-2 disabled:opacity-50">
                      <option value="VIEWER">Lector</option>
                      <option value="TEACHER">Profesor</option>
                      <option value="COORDINATOR">Coordinador</option>
                      <option value="INSTITUTION_ADMIN">Administrador institucional</option>
                    </select>
                  </td>
                  <td className="p-4">
                    <button disabled={isSelf || pendingId === member.id} onClick={() => update(member, { active: !member.active })} className={`rounded-full px-3 py-1 text-xs font-bold disabled:opacity-50 ${member.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {member.active ? "Activo" : "Inactivo"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

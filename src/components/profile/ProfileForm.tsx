"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateOwnProfile } from "../../lib/actions/profile-actions";

export default function ProfileForm({ fullName, username }: { fullName: string; username: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  async function submit(formData: FormData) {
    setPending(true);
    setMessage(null);
    const result = await updateOwnProfile({
      fullName: String(formData.get("fullName") || ""),
      username: String(formData.get("username") || ""),
      currentPin: String(formData.get("currentPin") || ""),
      newPin: String(formData.get("newPin") || ""),
    });
    setMessage({ ok: result.success, text: result.success ? "Perfil actualizado. Usa el nuevo PIN en tu próximo ingreso." : result.error || "No se pudo actualizar." });
    setPending(false);
    if (result.success) router.refresh();
  }
  const field = "w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600";
  return (
    <form action={submit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <label className="block"><span className="mb-1 block text-sm font-bold">Nombre completo</span><input name="fullName" defaultValue={fullName} required minLength={2} maxLength={200} className={field} /></label>
      <label className="block"><span className="mb-1 block text-sm font-bold">Nombre de usuario</span><input name="username" defaultValue={username} required minLength={3} maxLength={30} pattern="[a-zA-Z0-9._-]+" autoCapitalize="none" className={field} /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block"><span className="mb-1 block text-sm font-bold">PIN actual</span><input name="currentPin" type="password" required minLength={6} maxLength={6} pattern="[0-9]{6}" inputMode="numeric" autoComplete="current-password" className={field} /></label>
        <label className="block"><span className="mb-1 block text-sm font-bold">Nuevo PIN (opcional)</span><input name="newPin" type="password" minLength={6} maxLength={6} pattern="[0-9]{6}" inputMode="numeric" autoComplete="new-password" className={field} /></label>
      </div>
      <p className="text-xs text-slate-500">Por seguridad debes confirmar tu PIN actual. El nuevo PIN debe contener exactamente seis dígitos.</p>
      {message && <p role="status" className={`rounded-xl p-3 text-sm font-bold ${message.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{message.text}</p>}
      <button disabled={pending} className="rounded-xl bg-slate-950 px-5 py-3 font-bold text-white disabled:opacity-50">{pending ? "Guardando…" : "Guardar perfil"}</button>
    </form>
  );
}

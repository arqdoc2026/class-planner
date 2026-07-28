"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createInstitutionUser } from "../../lib/actions/platform-actions";

type InstitutionOption = {
  id: string;
  name: string;
  active: boolean;
};

export default function SuperAdminUserManager({ institutions }: { institutions: InstitutionOption[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

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

  return (
    <form id="superadmin-user-form" action={create} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div>
        <h2 className="text-lg font-black">Crear usuario institucional</h2>
        <p className="mt-1 text-sm text-slate-400">Crea el acceso en Supabase y asígnalo inmediatamente a una institución.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        <select name="institutionId" required className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">
          <option value="">Selecciona institución</option>
          {institutions.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <input name="fullName" required minLength={2} maxLength={200} placeholder="Nombre completo" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
        <input name="username" required minLength={3} maxLength={30} pattern="[a-zA-Z0-9._-]+" placeholder="usuario" autoCapitalize="none" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
        <input name="temporaryPassword" required type="password" minLength={12} autoComplete="new-password" placeholder="Contraseña temporal" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
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
      {message && <p role="status" className={`rounded-lg p-3 text-sm font-bold ${message.ok ? "bg-emerald-950 text-emerald-300" : "bg-red-950 text-red-300"}`}>{message.text}</p>}
    </form>
  );
}

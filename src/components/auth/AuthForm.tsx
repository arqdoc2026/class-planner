"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, signupAction } from "../../lib/actions/auth-actions";

export default function AuthForm({ mode, inviteToken = "" }: { mode: "login" | "signup"; inviteToken?: string }) {
  const action = mode === "login" ? loginAction : signupAction;
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-5">
      {mode === "signup" && <input type="hidden" name="inviteToken" value={inviteToken} />}
      {mode === "signup" && (
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-slate-700">Nombre completo</span>
          <input name="fullName" required autoComplete="name" className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900" />
        </label>
      )}
      <label className="block">
        <span className="mb-2 block text-sm font-bold text-slate-700">Nombre de usuario</span>
        <input name="username" required minLength={3} maxLength={30} pattern="[a-zA-Z0-9._-]+" autoCapitalize="none" autoComplete="username" className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900" />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-bold text-slate-700">Contraseña</span>
        <input name="password" type="password" minLength={mode === "signup" ? 8 : 6} required autoComplete={mode === "login" ? "current-password" : "new-password"} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900" />
      </label>
      {state?.error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">{state.error}</p>}
      {state?.message && <p className="rounded-lg bg-green-50 p-3 text-sm font-medium text-green-700">{state.message}</p>}
      <button disabled={pending} className="w-full rounded-xl bg-slate-950 px-5 py-3 font-bold text-white hover:bg-slate-800 disabled:opacity-50">
        {pending ? "Procesando…" : mode === "login" ? "Ingresar" : "Crear cuenta"}
      </button>
      <p className="text-center text-sm text-slate-500">
        {mode === "login" ? "¿Aún no tienes cuenta?" : "¿Ya tienes una cuenta?"}{" "}
        <Link className="font-bold text-slate-900 hover:underline" href={mode === "login" ? "/auth/signup" : "/auth/login"}>
          {mode === "login" ? "Regístrate" : "Ingresa"}
        </Link>
      </p>
    </form>
  );
}

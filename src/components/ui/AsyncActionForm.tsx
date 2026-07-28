"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useState } from "react";

type ActionResult = { success: boolean; error?: string };

export default function AsyncActionForm({
  action,
  children,
  className,
  successMessage = "Cambios guardados correctamente.",
  resetOnSuccess = false,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  children: ReactNode;
  className?: string;
  successMessage?: string;
  resetOnSuccess?: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    const form = event.currentTarget;
    try {
      const result = await action(new FormData(form));
      setMessage({ ok: result.success, text: result.success ? successMessage : result.error || "No fue posible completar la acción." });
      if (result.success) {
        if (resetOnSuccess) form.reset();
        router.refresh();
      }
    } catch {
      setMessage({ ok: false, text: "Ocurrió un error inesperado. Intenta nuevamente." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className={className} aria-busy={pending}>
      {children}
      {pending && <p className="text-sm font-semibold text-blue-700" role="status">Guardando…</p>}
      {message && (
        <p className={`text-sm font-semibold ${message.ok ? "text-emerald-700" : "text-red-700"}`} role={message.ok ? "status" : "alert"}>
          {message.text}
        </p>
      )}
    </form>
  );
}

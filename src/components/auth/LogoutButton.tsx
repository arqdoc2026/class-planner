import { logoutAction } from "../../lib/actions/auth-actions";

export default function LogoutButton({ dark = false }: { dark?: boolean }) {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
          dark
            ? "border border-slate-700 text-slate-200 hover:border-red-700 hover:bg-red-950 hover:text-red-200"
            : "border border-slate-300 bg-white text-slate-700 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
        }`}
      >
        Cerrar sesión
      </button>
    </form>
  );
}

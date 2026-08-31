import { redirect } from "next/navigation";
import { iniciarSesionConGoogle } from "./actions";
import { obtenerSesionConPerfil, rutaParaRol } from "@/utils/auth";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sesion = await obtenerSesionConPerfil();
  if (sesion) redirect(rutaParaRol(sesion.profile.rol));
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl sm:p-10">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.22em] text-sky-700">IEST-MAPS</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">Bienvenido</h1>
        <p className="mb-8 mt-3 leading-7 text-slate-600">Inicia sesión con tu cuenta institucional para consultar las rutas del campus.</p>
        {error ? <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
        <form action={iniciarSesionConGoogle}>
          <button type="submit" className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-5 py-3.5 font-semibold text-slate-800 transition hover:bg-slate-50">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.87h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.74 2.98-4.31 2.98-7.35Z"/><path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.63-2.42l-3.24-2.51c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.59A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.39 13.9A6.02 6.02 0 0 1 6.07 12c0-.66.11-1.3.32-1.9V7.51H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.49l3.35-2.59Z"/><path fill="#EA4335" d="M12 5.97c1.47 0 2.79.51 3.83 1.5l2.87-2.88A9.65 9.65 0 0 0 12 2a10 10 0 0 0-8.96 5.51l3.35 2.59C7.18 7.73 9.39 5.97 12 5.97Z"/></svg>
            Continuar con Google
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-slate-500">Solo se aceptan cuentas con dominio @iest.edu.mx</p>
      </section>
    </main>
  );
}

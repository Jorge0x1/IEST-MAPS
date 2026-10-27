"use client";

// Círculo con la inicial del alumno dentro de la barra de búsqueda. Al tocarlo
// abre un menú con su nombre y "Cerrar sesión" (reemplaza al antiguo header).

import { useEffect, useRef, useState } from "react";
import { cerrarSesion } from "@/app/login/actions";

export function MenuCuenta({ nombre }: { nombre: string }) {
  const [abierto, setAbierto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const alPresionar = (e: PointerEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAbierto(false);
    };
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    document.addEventListener("pointerdown", alPresionar);
    document.addEventListener("keydown", alTeclear);
    return () => {
      document.removeEventListener("pointerdown", alPresionar);
      document.removeEventListener("keydown", alTeclear);
    };
  }, [abierto]);

  const inicial = nombre.trim().charAt(0).toUpperCase() || "?";

  return (
    <div ref={raiz} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-label="Cuenta"
        aria-haspopup="menu"
        aria-expanded={abierto}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-primary)] text-base font-bold text-white transition hover:bg-[var(--brand-primary-hover)]"
      >
        {inicial}
      </button>
      {abierto ? (
        <div role="menu" className="absolute right-0 top-12 w-64 rounded-2xl bg-white p-3 shadow-xl ring-1 ring-black/5">
          <p className="truncate font-semibold text-slate-950">{nombre}</p>
          <p className="text-sm text-slate-500">Alumno</p>
          <form action={cerrarSesion} className="mt-3">
            <button
              type="submit"
              role="menuitem"
              className="w-full rounded-xl border border-[var(--border-strong)] px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

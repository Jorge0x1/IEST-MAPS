"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const enlaces = [
  { href: "/admin/dashboard", etiqueta: "Usuarios y accesos" },
  { href: "/admin/edificios", etiqueta: "Edificios" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="mt-6 space-y-2" aria-label="Navegación administrativa">
      {enlaces.map((enlace) => {
        const activo = pathname === enlace.href;
        return <Link key={enlace.href} href={enlace.href} aria-current={activo ? "page" : undefined} className={`block rounded-xl px-4 py-3 text-sm font-semibold transition ${activo ? "bg-sky-600 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}>{enlace.etiqueta}</Link>;
      })}
      <span className="block cursor-not-allowed rounded-xl px-4 py-3 text-sm text-slate-500">Nodos del mapa <small className="float-right">Próximamente</small></span>
      <span className="block cursor-not-allowed rounded-xl px-4 py-3 text-sm text-slate-500">Conexiones <small className="float-right">Próximamente</small></span>
    </nav>
  );
}

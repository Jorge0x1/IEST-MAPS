"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const enlaces = [
  { href: "/admin/dashboard", etiqueta: "Usuarios y accesos" },
  { href: "/admin/edificios", etiqueta: "Edificios" },
  { href: "/admin/destinos", etiqueta: "Destinos y nodos" },
  { href: "/admin/conexiones", etiqueta: "Conexiones" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="mt-6 space-y-2" aria-label="Navegación administrativa">
      {enlaces.map((enlace) => {
        const activo = pathname === enlace.href;
        return <Link key={enlace.href} href={enlace.href} aria-current={activo ? "page" : undefined} className={`block rounded-xl px-4 py-3 text-sm font-semibold transition ${activo ? "bg-sky-600 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}>{enlace.etiqueta}</Link>;
      })}
    </nav>
  );
}

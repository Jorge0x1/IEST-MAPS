"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./admin-shell.module.css";

const enlaces = [
  { href: "/admin/dashboard", etiqueta: "Usuarios y accesos", icono: "users" },
  { href: "/admin/edificios", etiqueta: "Edificios", icono: "building" },
  { href: "/admin/destinos", etiqueta: "Destinos y nodos", icono: "destination" },
  { href: "/admin/conexiones", etiqueta: "Conexiones", icono: "connections" },
] as const;

function NavIcon({ tipo }: { tipo: (typeof enlaces)[number]["icono"] }) {
  if (tipo === "users") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
        <path d="M2.5 20a6 6 0 0 1 12 0" />
        <path d="M16 4.4a3.5 3.5 0 0 1 0 6.2M16.5 14.2A5.8 5.8 0 0 1 21.5 20" />
      </svg>
    );
  }

  if (tipo === "building") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 21V5.5L13 3v18M13 8h7v13M7.5 8h2M7.5 12h2M7.5 16h2M16 12h1.5M16 16h1.5M2.5 21h19" />
      </svg>
    );
  }

  if (tipo === "destination") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" />
        <circle cx="12" cy="10" r="2.25" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="5" cy="12" r="2.5" />
      <circle cx="19" cy="6" r="2.5" />
      <circle cx="19" cy="18" r="2.5" />
      <path d="m7.4 11 9.2-4M7.4 13l9.2 4" />
    </svg>
  );
}

export function AdminNav({
  onNavigate,
  ariaLabel = "Navegación administrativa",
}: {
  onNavigate?: () => void;
  ariaLabel?: string;
}) {
  const pathname = usePathname();

  return (
    <nav className={styles.adminNav} aria-label={ariaLabel}>
      <p className={styles.navLabel}>Módulos</p>
      <div className={styles.navList}>
        {enlaces.map((enlace) => {
          const activo = pathname === enlace.href;

          return (
            <Link
              key={enlace.href}
              href={enlace.href}
              aria-current={activo ? "page" : undefined}
              onClick={onNavigate}
              className={`${styles.navLink} ${activo ? styles.navLinkActive : ""}`}
            >
              <span className={styles.navIcon}>
                <NavIcon tipo={enlace.icono} />
              </span>
              <span>{enlace.etiqueta}</span>
              {activo ? <span className={styles.activeNode} aria-hidden="true" /> : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

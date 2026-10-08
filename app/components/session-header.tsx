import type { ReactNode } from "react";
import { cerrarSesion } from "@/app/login/actions";
import styles from "@/app/admin/admin-shell.module.css";

type SessionHeaderProps = {
  nombre: string;
  rol: string;
  variant?: "default" | "admin";
  mobileNavigation?: ReactNode;
};

export function SessionHeader({
  nombre,
  rol,
  variant = "default",
  mobileNavigation,
}: SessionHeaderProps) {
  if (variant === "default") {
    return (
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <div>
          <p className="font-semibold text-slate-950">{nombre}</p>
          <p className="text-sm capitalize text-slate-500">{rol}</p>
        </div>
        <form action={cerrarSesion}>
          <button
            type="submit"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cerrar sesión
          </button>
        </form>
      </header>
    );
  }

  return (
    <header className={styles.topbar}>
      <div className={styles.topbarStart}>
        <div className={styles.mobileNavSlot}>{mobileNavigation}</div>
        <div className={styles.headerContext}>
          <span className={styles.contextNode} aria-hidden="true" />
          <div>
            <p>Administración</p>
            <span>Gestión del campus</span>
          </div>
        </div>
      </div>

      <div className={styles.accountArea}>
        <span className={styles.userGlyph} aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="8" r="3.25" />
            <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
          </svg>
        </span>
        <div className={styles.userDetails}>
          <p>{nombre}</p>
          <span>{rol}</span>
        </div>
        <form action={cerrarSesion} className={styles.logoutForm}>
          <button type="submit" className={styles.logoutButton} aria-label="Cerrar sesión">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M14 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-3M10 12h11M18 9l3 3-3 3" />
            </svg>
            <span className={styles.logoutText}>Cerrar sesión</span>
          </button>
        </form>
      </div>
    </header>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AdminBrand } from "./admin-brand";
import { AdminNav } from "./admin-nav";
import styles from "./admin-shell.module.css";

const drawerId = "admin-mobile-navigation";

export function AdminMobileNav() {
  const [abierto, setAbierto] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  const cerrarMenu = useCallback(() => {
    setAbierto(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!abierto) return;

    const overflowAnterior = document.body.style.overflow;
    const overflowHtmlAnterior = document.documentElement.style.overflow;
    const desktopQuery = window.matchMedia("(min-width: 64.01rem)");
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    closeRef.current?.focus();

    function cerrarAlCambiarADesktop(evento: MediaQueryListEvent) {
      if (evento.matches) setAbierto(false);
    }

    function manejarTeclado(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        evento.preventDefault();
        cerrarMenu();
        return;
      }

      if (evento.key !== "Tab" || !drawerRef.current) return;

      const elementos = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      const primero = elementos[0];
      const ultimo = elementos[elementos.length - 1];

      if (!primero || !ultimo) return;

      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    }

    desktopQuery.addEventListener("change", cerrarAlCambiarADesktop);
    document.addEventListener("keydown", manejarTeclado);
    return () => {
      document.body.style.overflow = overflowAnterior;
      document.documentElement.style.overflow = overflowHtmlAnterior;
      desktopQuery.removeEventListener("change", cerrarAlCambiarADesktop);
      document.removeEventListener("keydown", manejarTeclado);
    };
  }, [abierto, cerrarMenu]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={styles.menuTrigger}
        aria-label="Abrir navegación administrativa"
        aria-expanded={abierto}
        aria-controls={drawerId}
        onClick={() => setAbierto(true)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      {abierto
        ? createPortal(
            <div className={styles.mobileNavLayer}>
              <div className={styles.mobileOverlay} aria-hidden="true" onClick={cerrarMenu} />
              <aside
                ref={drawerRef}
                id={drawerId}
                className={styles.mobileDrawer}
                role="dialog"
                aria-modal="true"
                aria-label="Navegación administrativa"
              >
                <div className={styles.mobileDrawerHeader}>
                  <AdminBrand compact />
                  <button
                    ref={closeRef}
                    type="button"
                    className={styles.drawerClose}
                    aria-label="Cerrar navegación administrativa"
                    onClick={cerrarMenu}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="m6 6 12 12M18 6 6 18" />
                    </svg>
                  </button>
                </div>

                <AdminNav
                  ariaLabel="Módulos administrativos"
                  onNavigate={cerrarMenu}
                />

                <p className={styles.mobileDrawerFooter}>
                  IEST Anáhuac · Plataforma institucional
                </p>
              </aside>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

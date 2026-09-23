"use client";

import { useState, useTransition } from "react";
import { cambiarEstadoAcceso } from "./actions";
import styles from "./dashboard.module.css";

export function AccessButton({ profileId, activo }: { profileId: string; activo: boolean }) {
  const [pendiente, iniciarTransicion] = useTransition();
  const [mensaje, setMensaje] = useState("");

  function cambiarAcceso() {
    setMensaje("");
    iniciarTransicion(async () => {
      try {
        const resultado = await cambiarEstadoAcceso(profileId, !activo);
        if (!resultado.ok) setMensaje(resultado.mensaje);
      } catch {
        setMensaje("No fue posible actualizar el acceso. Inténtalo nuevamente.");
      }
    });
  }

  return (
    <div className={styles.accessControl}>
      <button
        type="button"
        disabled={pendiente}
        onClick={cambiarAcceso}
        className={activo ? styles.dangerButton : styles.positiveButton}
      >
        {pendiente ? "Procesando…" : activo ? "Desactivar" : "Reactivar"}
      </button>

      {mensaje ? (
        <p className={`${styles.inlineMessage} ${styles.inlineError}`} role="alert">
          {mensaje}
        </p>
      ) : null}
    </div>
  );
}

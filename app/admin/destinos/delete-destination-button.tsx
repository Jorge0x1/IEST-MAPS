"use client";

import { useState, useTransition } from "react";
import { eliminarDestino } from "./actions";
import styles from "./destinos.module.css";

export function DeleteDestinationButton({ destinoId, nombre }: { destinoId: string; nombre: string }) {
  const [pendiente, iniciarTransicion] = useTransition();
  const [mensaje, setMensaje] = useState("");

  function eliminar() {
    if (!window.confirm(`¿Eliminar “${nombre}”? Esta acción no se puede deshacer.`)) return;
    setMensaje("");
    iniciarTransicion(async () => {
      const resultado = await eliminarDestino(destinoId);
      if (!resultado.ok) setMensaje(resultado.mensaje);
    });
  }

  return (
    <div className={styles.deleteControl}>
      <button
        type="button"
        onClick={eliminar}
        disabled={pendiente}
        className={styles.dangerButton}
      >
        {pendiente ? "Eliminando…" : "Eliminar"}
      </button>
      {mensaje ? <p role="alert" className={styles.deleteMessage}>{mensaje}</p> : null}
    </div>
  );
}

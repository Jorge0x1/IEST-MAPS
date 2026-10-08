"use client";

import { useState, useTransition } from "react";
import { eliminarConexion } from "./actions";
import styles from "./conexiones.module.css";

export function DeleteConnectionButton({ conexionId }: { conexionId: string }) {
  const [pendiente, iniciarTransicion] = useTransition();
  const [mensaje, setMensaje] = useState("");

  function eliminar() {
    if (!window.confirm("¿Eliminar esta conexión? Esta acción no se puede deshacer.")) return;
    setMensaje("");
    iniciarTransicion(async () => {
      const resultado = await eliminarConexion(conexionId);
      if (!resultado.ok) setMensaje(resultado.mensaje);
    });
  }

  return (
    <div className={styles.deleteControl}>
      <button type="button" onClick={eliminar} disabled={pendiente} className={styles.dangerButton}>
        {pendiente ? "Eliminando…" : "Eliminar"}
      </button>
      {mensaje ? <p role="alert" className={styles.deleteMessage}>{mensaje}</p> : null}
    </div>
  );
}

"use client";

import { useActionState } from "react";
import { cambiarRol, type EstadoCambioRol } from "./actions";
import styles from "./dashboard.module.css";
import type { RolUsuario } from "@/utils/auth";

const estadoInicial: EstadoCambioRol = { ok: false, mensaje: "" };

export function RoleSelector({
  profileId,
  rolActual,
  deshabilitado,
}: {
  profileId: string;
  rolActual: RolUsuario;
  deshabilitado: boolean;
}) {
  const action = cambiarRol.bind(null, profileId);
  const [estado, formAction, pendiente] = useActionState(action, estadoInicial);

  return (
    <form action={formAction} className={styles.roleForm}>
      <div className={styles.roleControls}>
        <select
          name="rol"
          defaultValue={rolActual}
          disabled={deshabilitado || pendiente}
          aria-label="Rol del usuario"
          className={`${styles.control} ${styles.roleSelect}`}
        >
          <option value="administrador">Administrador</option>
          <option value="guardia">Guardia</option>
          <option value="alumno">Alumno</option>
        </select>
        <button
          type="submit"
          disabled={deshabilitado || pendiente}
          className={styles.secondaryButton}
        >
          {pendiente ? "Guardando…" : "Guardar"}
        </button>
      </div>
      {deshabilitado ? (
        <span className={styles.inlineMessage}></span>
      ) : estado.mensaje ? (
        <span className={`${styles.inlineMessage} ${estado.ok ? styles.inlineSuccess : styles.inlineError}`} role="status">
          {estado.mensaje}
        </span>
      ) : null}
    </form>
  );
}

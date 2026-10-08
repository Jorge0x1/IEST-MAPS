"use client";

import { useActionState, useEffect, useRef } from "react";
import { guardarAlta, type EstadoCambioRol } from "./actions";
import styles from "./dashboard.module.css";

const estadoInicial: EstadoCambioRol = { ok: false, mensaje: "" };

export function CreateUserForm() {
  const [estado, action, pendiente] = useActionState(guardarAlta, estadoInicial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.ok) formRef.current?.reset();
  }, [estado.ok]);

  return (
    <form ref={formRef} action={action} className={styles.createForm}>
      <label className={styles.field}>
        Nombre
        <input name="nombre" maxLength={100} placeholder="Nombre de la persona" className={styles.control} />
      </label>
      <label className={styles.field}>
        Correo institucional
        <input
          name="correo"
          type="email"
          required
          pattern="[^@\s]+@iest\.edu\.mx"
          placeholder="nombre@iest.edu.mx"
          className={styles.control}
        />
      </label>
      <label className={styles.field}>
        Rol inicial
        <select name="rol" defaultValue="alumno" className={styles.control}>
          <option value="alumno">Alumno</option>
          <option value="guardia">Guardia</option>
          <option value="administrador">Administrador</option>
        </select>
      </label>
      <button disabled={pendiente} className={styles.primaryButton}>
        {pendiente ? "Guardando…" : "Dar de alta"}
      </button>
      {estado.mensaje ? (
        <p role="status" className={`${styles.formMessage} ${estado.ok ? styles.messageSuccess : styles.messageError}`}>
          {estado.mensaje}
        </p>
      ) : null}
    </form>
  );
}

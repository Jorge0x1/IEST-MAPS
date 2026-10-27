"use client";

import { useActionState, useEffect, useRef } from "react";
import { guardarAccesoConContrasena, type EstadoCambioRol } from "./actions";
import styles from "./dashboard.module.css";

const estadoInicial: EstadoCambioRol = { ok: false, mensaje: "" };

export function PasswordUserForm() {
  const [estado, action, pendiente] = useActionState(guardarAccesoConContrasena, estadoInicial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.ok) formRef.current?.reset();
  }, [estado]);

  return (
    <form ref={formRef} action={action} className={`${styles.createForm} ${styles.createFormCinco}`}>
      <label className={styles.field}>
        Nombre
        <input name="nombre" maxLength={100} placeholder="Ej. Prueba guardia" className={styles.control} />
      </label>
      <label className={styles.field}>
        Correo institucional
        <input
          name="correo"
          type="email"
          required
          pattern="[^@\s]+@iest\.edu\.mx"
          placeholder="prueba.guardia@iest.edu.mx"
          autoComplete="off"
          className={styles.control}
        />
      </label>
      <label className={styles.field}>
        Rol
        <select name="rol" defaultValue="alumno" className={styles.control}>
          <option value="alumno">Alumno</option>
          <option value="guardia">Guardia</option>
          <option value="administrador">Administrador</option>
        </select>
      </label>
      <label className={styles.field}>
        Contraseña
        {/* Visible a propósito: el administrador la anota para compartirla. */}
        <input
          name="contrasena"
          type="text"
          required
          minLength={8}
          maxLength={72}
          autoComplete="off"
          spellCheck={false}
          placeholder="Mínimo 8 caracteres"
          className={styles.control}
        />
      </label>
      <button disabled={pendiente} className={styles.primaryButton}>
        {pendiente ? "Guardando…" : "Guardar acceso"}
      </button>
      {estado.mensaje ? (
        <p role="status" className={`${styles.formMessage} ${estado.ok ? styles.messageSuccess : styles.messageError}`}>
          {estado.mensaje}
        </p>
      ) : null}
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { iniciarSesionConContrasena, type EstadoLogin } from "./actions";
import styles from "./page.module.css";

const estadoInicial: EstadoLogin = { error: "", correo: "" };

export function FormContrasena() {
  const [estado, action, pendiente] = useActionState(iniciarSesionConContrasena, estadoInicial);

  return (
    <form action={action} className={styles.passwordForm}>
      <label className={styles.passwordField}>
        Correo
        <input
          name="correo"
          type="email"
          required
          autoComplete="username"
          defaultValue={estado.correo}
          placeholder="nombre@iest.edu.mx"
          className={styles.passwordInput}
        />
      </label>
      <label className={styles.passwordField}>
        Contraseña
        <input
          name="contrasena"
          type="password"
          required
          autoComplete="current-password"
          className={styles.passwordInput}
        />
      </label>

      {estado.error ? (
        <p role="alert" className={styles.errorMessage}>
          <span aria-hidden="true" className={styles.errorMark}>!</span>
          <span>{estado.error}</span>
        </p>
      ) : null}

      <button type="submit" disabled={pendiente} className={styles.passwordButton}>
        {pendiente ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}

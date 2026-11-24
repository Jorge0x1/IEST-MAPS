"use client";

import { useActionState, useEffect, useRef } from "react";
import { registrarVisita, type EstadoRegistroVisita } from "./actions";
import { BuscadorDestino, type DestinoGuardia } from "./buscador-destino";
import { VisitorPass } from "./visitor-pass";
import styles from "../guardia.module.css";

const estadoInicial: EstadoRegistroVisita = { ok: false, mensaje: "" };

export type NodoOrigen = {
  id: string;
  nombre: string;
  edificios: { nombre: string } | null;
};

export function VisitorForm({ destinos, entradas }: { destinos: DestinoGuardia[]; entradas: NodoOrigen[] }) {
  const [estado, action, pendiente] = useActionState(registrarVisita, estadoInicial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.ok) formRef.current?.reset();
  }, [estado]);

  const sinOpciones = destinos.length === 0 || entradas.length === 0;
  // Con una sola entrada registrada se preselecciona.
  const entradaUnica = entradas.length === 1 ? entradas[0].id : "";

  return (
    <div>
      <form ref={formRef} action={action} className={styles.form}>
        <label className={styles.field}>
          Nombre del visitante
          <input name="nombre" required minLength={2} maxLength={120} autoComplete="off" autoCapitalize="words" className={styles.control} />
        </label>

        <label className={styles.field}>
          Teléfono
          <input name="telefono" type="tel" inputMode="tel" maxLength={20} placeholder="Opcional" className={styles.control} />
        </label>

        <label className={styles.field}>
          Entrada de acceso
          <select name="origen_nodo_id" required defaultValue={entradaUnica} className={styles.control}>
            <option value="" disabled>
              Selecciona la entrada
            </option>
            {entradas.map((nodo) => (
              <option key={nodo.id} value={nodo.id}>
                {nodo.edificios?.nombre && nodo.edificios.nombre !== nodo.nombre ? `${nodo.nombre} · ${nodo.edificios.nombre}` : nodo.nombre}
              </option>
            ))}
          </select>
        </label>

        <BuscadorDestino destinos={destinos} />

        <label className={styles.field}>
          Motivo
          <textarea name="motivo" required minLength={3} maxLength={300} rows={3} className={`${styles.control} ${styles.textarea}`} />
        </label>

        <button disabled={pendiente || sinOpciones} className={styles.primaryButton}>
          {pendiente ? "Registrando…" : "Registrar visita"}
        </button>

        {sinOpciones ? <p className={styles.warning}>Un administrador debe registrar al menos un destino buscable y una entrada.</p> : null}
        {estado.mensaje ? (
          <p role="status" className={`${styles.message} ${estado.ok ? styles.messageOk : styles.messageError}`}>
            {estado.mensaje}
          </p>
        ) : null}
      </form>

      {estado.pase ? <VisitorPass key={estado.pase.acceso} pase={estado.pase} /> : null}
    </div>
  );
}

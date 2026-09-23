"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { actualizarDestino, crearDestino, type EstadoDestino } from "./actions";
import styles from "./destinos.module.css";

const LocationPicker = dynamic(
  () => import("../components/location-picker").then((modulo) => modulo.LocationPicker),
  {
    ssr: false,
    loading: () => (
      <div className={styles.mapSkeleton} role="status">
        <span className={styles.srOnly}>Cargando mapa interactivo</span>
      </div>
    ),
  },
);

const estadoInicial: EstadoDestino = { ok: false, mensaje: "" };

export type EdificioOpcion = { id: string; nombre: string };
export type DestinoInicial = {
  id: string;
  nombre: string;
  tipo: string;
  nombres_alternativos: string[];
  edificio_id: string;
  piso: number;
  lat: number | null;
  lng: number | null;
  buscable: boolean;
};

const tipos = [
  ["entrada", "Entrada"], ["pasillo", "Pasillo"], ["salon", "Salón"],
  ["oficina", "Oficina"], ["bano", "Baño"], ["escalera", "Escalera"],
  ["elevador", "Elevador"], ["servicio", "Servicio"], ["edificio", "Edificio"],
] as const;

export function DestinationForm({ edificios, destino }: { edificios: EdificioOpcion[]; destino?: DestinoInicial }) {
  const action = destino ? actualizarDestino.bind(null, destino.id) : crearDestino;
  const [estado, formAction, pendiente] = useActionState(action, estadoInicial);
  const formRef = useRef<HTMLFormElement>(null);
  const [mapResetVersion, setMapResetVersion] = useState(0);

  useEffect(() => {
    if (estado.ok && !destino) {
      formRef.current?.reset();
      const resetId = window.setTimeout(() => {
        setMapResetVersion((version) => version + 1);
      }, 0);

      return () => window.clearTimeout(resetId);
    }
  }, [estado, destino]);

  return (
    <form ref={formRef} action={formAction} className={styles.destinationForm}>
      <label className={styles.field}>
        Nombre
        <input
          name="nombre"
          required
          minLength={2}
          maxLength={120}
          defaultValue={destino?.nombre}
          placeholder="Ej. Salón 204"
          className={styles.control}
        />
      </label>

      <div className={styles.formPair}>
        <label className={styles.field}>
          Tipo
          <select
            name="tipo"
            required
            defaultValue={destino?.tipo ?? "salon"}
            className={styles.control}
          >
            {tipos.map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}
          </select>
        </label>

        <label className={styles.field}>
          Piso
          <input
            name="piso"
            type="number"
            required
            step={1}
            min={-10}
            max={100}
            defaultValue={destino?.piso ?? 0}
            className={styles.control}
          />
        </label>
      </div>

      <label className={styles.field}>
        Edificio
        <select
          name="edificio_id"
          required
          defaultValue={destino?.edificio_id ?? ""}
          className={styles.control}
        >
          <option value="" disabled>Selecciona un edificio</option>
          {edificios.map((edificio) => <option key={edificio.id} value={edificio.id}>{edificio.nombre}</option>)}
        </select>
      </label>

      <label className={styles.field}>
        Alias
        <input
          name="nombres_alternativos"
          maxLength={2000}
          defaultValue={destino?.nombres_alternativos.join(", ")}
          placeholder="Ej. aula 204, salón de segundo"
          className={styles.control}
        />
        <span className={styles.fieldHelp}>Separa cada nombre alternativo con una coma.</span>
      </label>

      <div className={styles.locationSection}>
        <div className={styles.locationPickerShell}>
          <LocationPicker
            key={mapResetVersion}
            latName="lat"
            lngName="lng"
            lat={destino?.lat ?? null}
            lng={destino?.lng ?? null}
          />
        </div>
      </div>

      <p className={styles.mapHint}>
        Toca el mapa para ubicar el nodo, o déjalo así y complétalo después.
      </p>

      <label className={styles.searchableOption}>
        <input
          name="buscable"
          type="checkbox"
          defaultChecked={destino?.buscable ?? true}
          className={styles.searchableCheckbox}
        />
        <span className={styles.searchableCopy}>
          <strong>Visible como destino</strong>
          Los alumnos y guardias podrán encontrarlo en búsquedas.
        </span>
      </label>

      <div className={styles.formFooter}>
        {estado.mensaje ? (
          <p
            role="status"
            className={`${styles.formMessage} ${estado.ok ? styles.formMessageSuccess : ""}`}
          >
            {estado.mensaje}
          </p>
        ) : (
          <span className={styles.formSpacer} />
        )}
        <button disabled={pendiente || edificios.length === 0} className={styles.primaryButton}>
          {pendiente ? "Guardando…" : destino ? "Guardar cambios" : "Crear destino"}
        </button>
      </div>
    </form>
  );
}

"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  actualizarEdificio,
  crearEdificio,
  type EstadoEdificio,
} from "./actions";
import styles from "./edificios.module.css";

const LocationPicker = dynamic(
  () => import("../components/location-picker").then((modulo) => modulo.LocationPicker),
  {
    ssr: false,
    loading: () => <div className={styles.mapSkeleton} aria-label="Cargando mapa" />,
  },
);

const estadoInicial: EstadoEdificio = { ok: false, mensaje: "" };

type EdificioInicial = {
  id: string;
  nombre: string;
  descripcion: string | null;
  lat: number | null;
  lng: number | null;
};

export function BuildingForm({ edificio }: { edificio?: EdificioInicial }) {
  const action = edificio
    ? actualizarEdificio.bind(null, edificio.id)
    : crearEdificio;
  const [estado, formAction, pendiente] = useActionState(action, estadoInicial);
  const formRef = useRef<HTMLFormElement>(null);
  const [mapResetVersion, setMapResetVersion] = useState(0);

  useEffect(() => {
    if (estado.ok && !edificio) {
      formRef.current?.reset();
      const resetId = window.setTimeout(() => {
        setMapResetVersion((version) => version + 1);
      }, 0);

      return () => window.clearTimeout(resetId);
    }
  }, [estado, edificio]);

  return (
    <form ref={formRef} action={formAction} className={styles.buildingForm}>
      <div className={styles.formFields}>
        <label className={styles.field}>
          Nombre
          <input
            name="nombre"
            required
            minLength={2}
            maxLength={100}
            defaultValue={edificio?.nombre}
            placeholder="Ej. Edificio de Ingeniería"
            className={styles.control}
          />
        </label>

        <label className={styles.field}>
          Descripción
          <textarea
            name="descripcion"
            maxLength={500}
            rows={3}
            defaultValue={edificio?.descripcion ?? ""}
            placeholder="Referencia o servicios principales"
            className={`${styles.control} ${styles.textarea}`}
          />
        </label>
      </div>

      <div className={styles.locationSection}>
        <div className={styles.locationPickerShell}>
          <LocationPicker
            key={mapResetVersion}
            latName="lat"
            lngName="lng"
            lat={edificio?.lat ?? null}
            lng={edificio?.lng ?? null}
          />
        </div>
      </div>

      <p className={styles.mapHint}>
        Toca el mapa para ubicar el edificio, o déjalo así y complétalo después.
      </p>

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
        <button disabled={pendiente} className={styles.primaryButton}>
          {pendiente ? "Guardando…" : edificio ? "Guardar cambios" : "Crear edificio"}
        </button>
      </div>
    </form>
  );
}

"use client";

// Ubicación del alumno con la Geolocation API (`watchPosition`). Se usa como
// almacén externo (mismo patrón que use-escritorio.ts): el seguimiento empieza
// con el primer componente que lo usa y se detiene cuando ya no hay ninguno.
// La ubicación nunca sale del navegador salvo al pedir una ruta desde ella.
import { useSyncExternalStore } from "react";
import { estadoDesdeError, estadoInicial, suavizar, type EstadoUbicacion } from "@/lib/ubicacion";

const PIDIENDO: EstadoUbicacion = { estado: "pidiendo" };

const OPCIONES: PositionOptions = { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 };

let actual: EstadoUbicacion = PIDIENDO;
let idSeguimiento: number | null = null;
const oyentes = new Set<() => void>();

function publicar(estado: EstadoUbicacion) {
  actual = estado;
  for (const avisar of oyentes) avisar();
}

function iniciar() {
  const inicial = estadoInicial({
    tieneGeolocalizacion: "geolocation" in navigator,
    contextoSeguro: window.isSecureContext,
  });
  if (inicial.estado !== "pidiendo") {
    actual = inicial;
    return;
  }
  idSeguimiento = navigator.geolocation.watchPosition(
    // Cada lectura se mezcla con la anterior para que el punto no brinque
    // estando quieto (lib/ubicacion.ts, `suavizar`).
    (posicion) =>
      publicar({
        estado: "ok",
        lectura: suavizar(actual.estado === "ok" ? actual.lectura : null, {
          lat: posicion.coords.latitude,
          lng: posicion.coords.longitude,
          precision: posicion.coords.accuracy,
          fecha: posicion.timestamp,
        }),
      }),
    // Un tiempo agotado no borra una lectura buena que ya se tenía: el
    // seguimiento continúa y la siguiente lectura la actualiza.
    (error) => {
      if (error.code === 3 && actual.estado === "ok") return;
      publicar(estadoDesdeError(error.code));
    },
    OPCIONES,
  );
}

function suscribir(avisar: () => void) {
  oyentes.add(avisar);
  if (oyentes.size === 1) {
    iniciar();
    // iniciar() puede fijar un estado final de inmediato (sin API o sin https).
    if (actual !== PIDIENDO) queueMicrotask(avisar);
  }
  return () => {
    oyentes.delete(avisar);
    if (oyentes.size === 0) {
      if (idSeguimiento !== null) navigator.geolocation.clearWatch(idSeguimiento);
      idSeguimiento = null;
      actual = PIDIENDO;
    }
  };
}

export function useUbicacion(): EstadoUbicacion {
  return useSyncExternalStore(suscribir, () => actual, () => PIDIENDO);
}

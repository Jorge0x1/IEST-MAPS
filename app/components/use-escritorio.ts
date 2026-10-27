"use client";

// true cuando la pantalla es de escritorio (breakpoint `md` de Tailwind, 768 px).
// Las vistas del alumno y del visitante lo usan para saber cuánto del mapa tapan
// los paneles flotantes y para mostrar los botones de zoom.
import { useSyncExternalStore } from "react";

const CONSULTA = "(min-width: 768px)";

function suscribir(avisar: () => void) {
  const lista = window.matchMedia(CONSULTA);
  lista.addEventListener("change", avisar);
  return () => lista.removeEventListener("change", avisar);
}

export function useEscritorio() {
  return useSyncExternalStore(
    suscribir,
    () => window.matchMedia(CONSULTA).matches,
    () => false,
  );
}

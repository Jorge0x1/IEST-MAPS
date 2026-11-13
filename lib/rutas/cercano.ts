// Elección del nodo de salida a partir de la ubicación GPS del alumno.
// Funciones puras (sin red): las usa `calcularRutaDesdeUbicacion` en
// lib/rutas/actions.ts y se prueban con `npm test`.
//
// El GPS no detecta el piso, así que solo se consideran nodos del piso 1
// (planta baja). Los umbrales se ajustan con pruebas en el campus.
import { distanciaMetros } from "../geo.ts";
import { PRECISION_MAXIMA_M } from "../ubicacion.ts";
import type { ConexionGrafo, NodoGrafo, OpcionesRuta } from "./dijkstra.ts";

export { PRECISION_MAXIMA_M };
// Si el nodo más cercano está más lejos, la persona no está en el campus.
export const DISTANCIA_MAXIMA_M = 150;
export const PISO_GPS = 1;

export type PosicionUsuario = { lat: number; lng: number; precision: number };

function numeroFinito(valor: unknown): valor is number {
  return typeof valor === "number" && Number.isFinite(valor);
}

// La posición llega del navegador a una Server Action: se valida tal cual.
export function validarPosicion(entrada: unknown): PosicionUsuario | null {
  if (typeof entrada !== "object" || entrada === null) return null;
  const { lat, lng, precision } = entrada as Record<string, unknown>;
  if (!numeroFinito(lat) || !numeroFinito(lng) || !numeroFinito(precision)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180 || precision < 0) return null;
  return { lat, lng, precision };
}

export type ResultadoCercano<N extends NodoGrafo> =
  | { ok: true; nodo: N; distanciaMetros: number }
  | { ok: false; motivo: "ubicacion_imprecisa" | "sin_candidatos" | "fuera_del_campus" };

export function nodoMasCercano<N extends NodoGrafo>(
  posicion: PosicionUsuario,
  nodos: N[],
  conexiones: ConexionGrafo[],
  opciones: OpcionesRuta,
): ResultadoCercano<N> {
  if (posicion.precision > PRECISION_MAXIMA_M) return { ok: false, motivo: "ubicacion_imprecisa" };

  const conectados = new Set<string>();
  for (const c of conexiones) {
    conectados.add(c.nodo_origen_id);
    conectados.add(c.nodo_destino_id);
  }

  let mejor: { nodo: N; distanciaMetros: number } | null = null;
  for (const nodo of nodos) {
    if (nodo.lat === null || nodo.lng === null) continue;
    if (nodo.piso !== PISO_GPS || !conectados.has(nodo.id)) continue;
    // Dijkstra excluye las escaleras con esta opción: no se puede salir de una.
    if (opciones.evitarEscaleras && nodo.tipo === "escalera") continue;
    const distancia = distanciaMetros(posicion.lat, posicion.lng, nodo.lat, nodo.lng);
    if (!mejor || distancia < mejor.distanciaMetros) mejor = { nodo, distanciaMetros: distancia };
  }

  if (!mejor) return { ok: false, motivo: "sin_candidatos" };
  if (mejor.distanciaMetros > DISTANCIA_MAXIMA_M) return { ok: false, motivo: "fuera_del_campus" };
  return { ok: true, ...mejor };
}

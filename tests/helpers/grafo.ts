// Ayudas compartidas por las pruebas de integración, regresión y estrés.
import type { ConexionGrafo, NodoGrafo } from "../../lib/rutas/dijkstra.ts";

// Generador pseudoaleatorio con semilla: las pruebas deben ser deterministas.
export function mulberry32(semilla: number): () => number {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const idCuadricula = (fila: number, columna: number) => `n-${fila}-${columna}`;

// Cuadrícula de pasillos con nodos cada ~11 m y conexiones sin costo explícito
// (el motor calcula el peso con las coordenadas, como con datos reales).
export function cuadricula(filas: number, columnas: number, piso = 1) {
  const nodos: NodoGrafo[] = [];
  const conexiones: ConexionGrafo[] = [];
  const paso = 0.0001;
  for (let f = 0; f < filas; f++) {
    for (let c = 0; c < columnas; c++) {
      nodos.push({
        id: idCuadricula(f, c),
        tipo: "pasillo",
        piso,
        edificio_id: null,
        lat: 22.25 + f * paso,
        lng: -97.87 + c * paso,
      });
      if (c + 1 < columnas) {
        conexiones.push({ nodo_origen_id: idCuadricula(f, c), nodo_destino_id: idCuadricula(f, c + 1), costo: null, bidireccional: true });
      }
      if (f + 1 < filas) {
        conexiones.push({ nodo_origen_id: idCuadricula(f, c), nodo_destino_id: idCuadricula(f + 1, c), costo: null, bidireccional: true });
      }
    }
  }
  return { nodos, conexiones };
}

// Mide cuánto tarda `fn` en milisegundos.
export function medir<T>(fn: () => T): { resultado: T; ms: number } {
  const inicio = performance.now();
  const resultado = fn();
  return { resultado, ms: performance.now() - inicio };
}

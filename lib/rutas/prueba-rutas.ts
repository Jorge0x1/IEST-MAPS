// Ayudas para las pruebas del seguimiento y la navegación: arman rutas sintéticas
// en metros alrededor de un punto del campus. Solo las importan los *.test.ts.
import type { PasoSeguible } from "./seguimiento.ts";

export const M = 1 / 111320; // 1 m de latitud en grados
export const LAT = 22.324;
export const LNG = -97.88;
export const MLNG = M / Math.cos((LAT * Math.PI) / 180); // 1 m de longitud en grados

let contador = 0;

// Coordenadas a `este` m al este y `norte` m al norte del origen.
export function pos(este: number, norte: number) {
  return { lat: LAT + norte * M, lng: LNG + este * MLNG };
}

export function paso(este: number | null, norte: number | null, extra: Partial<PasoSeguible> = {}): PasoSeguible {
  contador++;
  return {
    id: `n${contador}`,
    nombre: `Pasillo prueba ${contador}`,
    tipo: "pasillo",
    piso: 1,
    edificioId: "e1",
    lat: norte === null ? null : LAT + norte * M,
    lng: este === null ? null : LNG + este * MLNG,
    cambioPiso: null,
    ...extra,
  };
}

// Pasos cada `cada` m a lo largo de una línea quebrada (incluye cada vértice).
export function camino(vertices: [number, number][], cada = 3, extra: Partial<PasoSeguible> = {}): PasoSeguible[] {
  const pasos: PasoSeguible[] = [paso(vertices[0][0], vertices[0][1], extra)];
  for (let i = 1; i < vertices.length; i++) {
    const [x0, y0] = vertices[i - 1];
    const [x1, y1] = vertices[i];
    const largo = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(1, Math.round(largo / cada));
    for (let k = 1; k <= n; k++) pasos.push(paso(x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n, extra));
  }
  return pasos;
}

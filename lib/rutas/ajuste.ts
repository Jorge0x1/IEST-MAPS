// Punto azul pegado a la ruta: si la ubicación (ya suavizada) cae cerca de un
// tramo de la ruta mostrada, se dibuja sobre ese tramo y no sobre el pasto de
// al lado. Función pura (sin red): la usa la vista del alumno y se prueba con
// `npm test`. Solo afecta el dibujo; el cálculo de rutas usa la lectura real.
import { distanciaMetros } from "../geo.ts";
import type { PuntoMapa } from "./mapa.ts";

// Nunca se pega a un tramo más lejano que esto, aunque la precisión sea mala.
export const DISTANCIA_AJUSTE_MAX_M = 10;
// Con precisión muy buena se permite pegar hasta esta distancia.
export const DISTANCIA_AJUSTE_MIN_M = 5;
// El GPS no sabe el piso: solo se usan tramos de la planta baja.
const PISO_TRAMOS = 1;
const METROS_POR_GRADO = 111320;

export type PosicionAjustada = { lat: number; lng: number; ajustada: boolean };

export function ajustarARuta(
  posicion: { lat: number; lng: number; precision: number },
  puntos: Pick<PuntoMapa, "lat" | "lng" | "piso">[],
): PosicionAjustada {
  const sinCambio: PosicionAjustada = { lat: posicion.lat, lng: posicion.lng, ajustada: false };
  // Plano local en metros alrededor de la posición (equirectangular: alcanza
  // para distancias de decenas de metros).
  const escalaLng = Math.cos((posicion.lat * Math.PI) / 180) * METROS_POR_GRADO;
  const aLocal = (lat: number, lng: number) => ({
    x: (lng - posicion.lng) * escalaLng,
    y: (lat - posicion.lat) * METROS_POR_GRADO,
  });

  let mejor: { lat: number; lng: number; distancia: number } | null = null;
  for (let i = 1; i < puntos.length; i++) {
    const a = puntos[i - 1];
    const b = puntos[i];
    if (a.piso !== PISO_TRAMOS || b.piso !== PISO_TRAMOS) continue;
    const pa = aLocal(a.lat, a.lng);
    const pb = aLocal(b.lat, b.lng);
    const dx = pb.x - pa.x;
    const dy = pb.y - pa.y;
    const largo2 = dx * dx + dy * dy;
    if (largo2 === 0) continue;
    // La posición es el origen del plano local; t se acota al tramo.
    const t = Math.min(1, Math.max(0, -(pa.x * dx + pa.y * dy) / largo2));
    const lat = a.lat + t * (b.lat - a.lat);
    const lng = a.lng + t * (b.lng - a.lng);
    const distancia = distanciaMetros(posicion.lat, posicion.lng, lat, lng);
    if (!mejor || distancia < mejor.distancia) mejor = { lat, lng, distancia };
  }

  const limite = Math.min(DISTANCIA_AJUSTE_MAX_M, Math.max(posicion.precision, DISTANCIA_AJUSTE_MIN_M));
  if (!mejor || mejor.distancia > limite) return sinCambio;
  return { lat: mejor.lat, lng: mejor.lng, ajustada: true };
}

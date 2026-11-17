// Estados de la geolocalización del navegador para la vista del alumno.
// Funciones puras (sin React ni `window`) para poder probarlas con `npm test`;
// el hook `app/components/use-ubicacion.ts` las usa con la API real.

import { distanciaMetros } from "./geo.ts";

export type Lectura = { lat: number; lng: number; precision: number; fecha: number };

// Suavizado: una lectura anterior más vieja que esto ya no se mezcla.
export const VIGENCIA_LECTURA_MS = 30000;
// Lo mínimo que se mueve el punto hacia cada lectura nueva (nunca se congela).
export const PESO_MINIMO = 0.2;
// Un salto mayor a FACTOR_SALTO × (suma de precisiones) es movimiento real.
const FACTOR_SALTO = 2;

// Mezcla la lectura nueva con la anterior según su precisión (la más confiable
// pesa más) para que el punto no brinque estando quieto. La precisión y la fecha
// son las de la lectura nueva: no se presume más exactitud de la que da el GPS.
export function suavizar(anterior: Lectura | null, nueva: Lectura): Lectura {
  if (!anterior) return nueva;
  const edad = nueva.fecha - anterior.fecha;
  // Una lectura repetida o de caché (misma fecha o anterior) no aporta nada y
  // haría brincar el punto de vuelta a una posición cruda o más vieja.
  if (edad <= 0) return anterior;
  if (edad > VIGENCIA_LECTURA_MS) return nueva;
  if (anterior.precision <= 0 || nueva.precision <= 0) return nueva;
  const salto = distanciaMetros(anterior.lat, anterior.lng, nueva.lat, nueva.lng);
  if (salto > FACTOR_SALTO * (anterior.precision + nueva.precision)) return nueva;

  const confianzaNueva = 1 / nueva.precision ** 2;
  const confianzaAnterior = 1 / anterior.precision ** 2;
  const peso = Math.max(PESO_MINIMO, confianzaNueva / (confianzaNueva + confianzaAnterior));
  return {
    lat: anterior.lat + peso * (nueva.lat - anterior.lat),
    lng: anterior.lng + peso * (nueva.lng - anterior.lng),
    precision: nueva.precision,
    fecha: nueva.fecha,
  };
}

// Lecturas con un margen de error mayor no sirven para elegir un pasillo. Lo
// usan el servidor (lib/rutas/cercano.ts) y la vista del alumno, para no
// proponer "Mi ubicación" con una lectura que el servidor rechazaría (p. ej. una
// laptop ubicada por wifi con ±2 km).
export const PRECISION_MAXIMA_M = 50;

export function lecturaUtil(lectura: Lectura | null): boolean {
  return lectura !== null && lectura.precision <= PRECISION_MAXIMA_M;
}

export type EstadoUbicacion =
  | { estado: "no_soportado" }
  | { estado: "no_seguro" }
  | { estado: "pidiendo" }
  | { estado: "denegado" }
  | { estado: "sin_senal" }
  | { estado: "ok"; lectura: Lectura };

// La Geolocation API solo funciona en contextos seguros (https o localhost).
export function estadoInicial(entorno: { tieneGeolocalizacion: boolean; contextoSeguro: boolean }): EstadoUbicacion {
  if (!entorno.tieneGeolocalizacion) return { estado: "no_soportado" };
  if (!entorno.contextoSeguro) return { estado: "no_seguro" };
  return { estado: "pidiendo" };
}

// Códigos de GeolocationPositionError: 1 = permiso negado, 2 = posición no
// disponible, 3 = tiempo agotado.
export function estadoDesdeError(codigo: number): EstadoUbicacion {
  return codigo === 1 ? { estado: "denegado" } : { estado: "sin_senal" };
}

const MENSAJES: Record<Exclude<EstadoUbicacion["estado"], "ok">, string> = {
  no_soportado: "Tu navegador no permite usar la ubicación.",
  no_seguro: "La ubicación solo funciona cuando la app se abre con https.",
  pidiendo: "Buscando tu ubicación…",
  denegado: "No diste permiso de ubicación. Puedes activarlo en tu navegador.",
  sin_senal: "No pudimos obtener tu ubicación. Intenta al aire libre.",
};

export function mensajeUbicacion(e: EstadoUbicacion): string | null {
  return e.estado === "ok" ? null : MENSAJES[e.estado];
}

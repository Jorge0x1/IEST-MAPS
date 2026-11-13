// Estados de la geolocalización del navegador para la vista del alumno.
// Funciones puras (sin React ni `window`) para poder probarlas con `npm test`;
// el hook `app/components/use-ubicacion.ts` las usa con la API real.

export type Lectura = { lat: number; lng: number; precision: number; fecha: number };

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

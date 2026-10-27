// Convierte los pasos de una ruta en los puntos que se dibujan en el mapa.
// Función pura (sin Leaflet ni React) para poder probarla con `npm test`.
//
// lat/lng son opcionales en los nodos (migración 0007): los nodos sin
// coordenadas válidas no se dibujan. La línea pasa por todos los nodos con
// ubicación, pero solo lleva número el nodo ancla de cada instrucción
// (ver instrucciones.ts), así el número del marcador coincide con el de la
// lista aunque un tramo de pasillo tenga varios nodos.

import { agruparPasos, tieneUbicacion, type PasoAgrupable, type TipoInstruccion } from "./instrucciones.ts";

export type PasoConUbicacion = PasoAgrupable & { nombre: string };

export type RolPunto = "inicio" | "destino" | "cambio_piso" | "paso";

export type PuntoMapa = {
  id: string;
  // null: el nodo solo es un vértice de la línea (no lleva marcador).
  numero: number | null;
  nombre: string;
  piso: number;
  lat: number;
  lng: number;
  rol: RolPunto;
};

const ROL_DE: Record<TipoInstruccion, RolPunto> = {
  inicio: "inicio",
  llegada: "destino",
  cambio_piso: "cambio_piso",
  pasillo: "paso",
  paso: "paso",
};

// `omitidos` cuenta las instrucciones cuyo marcador no se puede dibujar.
export function puntosDeRuta(pasos: PasoConUbicacion[]): { puntos: PuntoMapa[]; omitidos: number } {
  const marcas = new Map<string, { numero: number; rol: RolPunto }>();
  let omitidos = 0;
  agruparPasos(pasos).forEach((instruccion, indice) => {
    if (!tieneUbicacion(instruccion.ancla)) {
      omitidos++;
      return;
    }
    marcas.set(instruccion.ancla.id, { numero: indice + 1, rol: ROL_DE[instruccion.tipo] });
  });

  const puntos: PuntoMapa[] = [];
  for (const paso of pasos) {
    if (!tieneUbicacion(paso)) continue;
    const marca = marcas.get(paso.id);
    puntos.push({
      id: paso.id,
      numero: marca?.numero ?? null,
      nombre: paso.nombre,
      piso: paso.piso,
      lat: paso.lat,
      lng: paso.lng,
      rol: marca?.rol ?? "paso",
    });
  }

  return { puntos, omitidos };
}

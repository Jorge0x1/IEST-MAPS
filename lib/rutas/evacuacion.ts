// Rutas de evacuación: del punto donde está la persona al punto de reunión más
// cercano. Funciones puras (sin red), probadas con `npm test`; las usa
// `calcularRutaEvacuacion` en lib/rutas/actions.ts.
import { distanciaMetros } from "../geo.ts";
import { buscarRuta, type ConexionGrafo, type NodoGrafo, type OpcionesRuta, type PasoRuta } from "./dijkstra.ts";

// Un punto de reunión sin conexiones (los registrados al aire libre, sin pasillo
// trazado) se enlaza en memoria con los nodos conectados más cercanos de su piso.
export const ENLACES_POR_PUNTO = 3;
export const DISTANCIA_MAXIMA_ENLACE_M = 120;
// Las escaleras y elevadores no son un buen lugar para llegar caminando en línea recta.
const TIPOS_SIN_ENLACE = new Set(["escalera", "elevador"]);

// Nodo final virtual: cada punto de reunión lleva a él con costo 0, así un solo
// Dijkstra encuentra el punto más cercano.
export const ID_DESTINO_VIRTUAL = "__punto_de_reunion__";

type NodoEvacuacion = NodoGrafo & { evacuacion?: string | null };

export function puntosDeReunion<N extends NodoEvacuacion>(nodos: N[]): N[] {
  return nodos.filter((n) => n.evacuacion === "punto_reunion");
}

// Conexiones virtuales (bidireccionales, costo = distancia) para los puntos de
// reunión que no tienen ninguna conexión real. Las conexiones reales siempre ganan:
// un punto que ya está conectado no recibe enlaces.
export function enlacesVirtuales(nodos: NodoEvacuacion[], conexiones: ConexionGrafo[]): ConexionGrafo[] {
  const conectados = new Set<string>();
  for (const c of conexiones) {
    conectados.add(c.nodo_origen_id);
    conectados.add(c.nodo_destino_id);
  }
  const enlaces: ConexionGrafo[] = [];
  for (const punto of puntosDeReunion(nodos)) {
    if (conectados.has(punto.id) || punto.lat === null || punto.lng === null) continue;
    const candidatos = nodos
      .filter(
        (n) =>
          n.id !== punto.id &&
          n.piso === punto.piso &&
          n.lat !== null &&
          n.lng !== null &&
          conectados.has(n.id) &&
          n.evacuacion !== "punto_reunion" &&
          !TIPOS_SIN_ENLACE.has(n.tipo),
      )
      .map((n) => ({ id: n.id, distancia: distanciaMetros(punto.lat!, punto.lng!, n.lat!, n.lng!) }))
      .filter((c) => c.distancia <= DISTANCIA_MAXIMA_ENLACE_M)
      .sort((a, b) => a.distancia - b.distancia)
      .slice(0, ENLACES_POR_PUNTO);
    for (const c of candidatos) {
      enlaces.push({ nodo_origen_id: c.id, nodo_destino_id: punto.id, costo: null, bidireccional: true });
    }
  }
  return enlaces;
}

// Ruta más corta desde `origenId` hasta cualquier punto de reunión. `conexiones`
// ya debe incluir los enlaces virtuales. null si no hay puntos o ninguno es alcanzable.
export function rutaAlPuntoMasCercano<N extends NodoEvacuacion>(
  nodos: N[],
  conexiones: ConexionGrafo[],
  origenId: string,
  opciones: OpcionesRuta,
): PasoRuta[] | null {
  const puntos = puntosDeReunion(nodos);
  if (puntos.length === 0) return null;
  const destino: NodoGrafo = { id: ID_DESTINO_VIRTUAL, tipo: "virtual", piso: 0, edificio_id: null, lat: null, lng: null };
  const llegadas: ConexionGrafo[] = puntos.map((p) => ({
    nodo_origen_id: p.id,
    nodo_destino_id: ID_DESTINO_VIRTUAL,
    costo: 0,
    bidireccional: false,
  }));
  const ruta = buscarRuta([...nodos, destino], [...conexiones, ...llegadas], origenId, ID_DESTINO_VIRTUAL, opciones);
  if (!ruta) return null;
  return ruta.slice(0, -1);
}

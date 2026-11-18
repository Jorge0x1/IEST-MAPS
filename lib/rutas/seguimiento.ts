// Geometría del seguimiento en vivo de una ruta (GPS fase 2). Funciones puras,
// sin React ni Leaflet, para probarlas con `npm test`.
//
// La ruta se parte en tramos consecutivos del mismo piso. Solo los tramos del
// piso 1 con al menos dos puntos con coordenadas se siguen por GPS: cada uno
// tiene su propia línea con los metros acumulados, sobre la que se proyecta la
// ubicación. Los demás tramos se avanzan a mano (el GPS no sabe el piso).
import { distanciaMetros } from "../geo.ts";
import { PISO_GPS } from "./cercano.ts";
import { tieneUbicacion } from "./instrucciones.ts";

export const ANGULO_GIRO_GRADOS = 35;
// Distancia a cada lado de un vértice con la que se mide el rumbo de entrada y
// de salida: así los nodos muy juntos no producen giros falsos.
export const DISTANCIA_RUMBO_M = 5;
// Giros más cercanos que esto se juntan en uno (una esquina con varios nodos).
export const FUSION_GIROS_M = 8;
// Un giro a menos de esto del final del tramo lo cubre la maniobra del final.
export const GIRO_AHORA_M = 5;
// La ubicación solo se busca cerca del avance anterior, para no brincar a otra
// parte de la ruta que pase por el mismo lugar.
export const VENTANA_ATRAS_M = 10;
export const VENTANA_ADELANTE_M = 60;
// Si varias partes de la línea están casi igual de cerca (dentro de esta
// tolerancia), se elige la primera en el recorrido: preferir seguir donde se iba
// evita brincar a otro pasillo paralelo de la misma ruta (una U) por el error del GPS.
export const TOLERANCIA_CONTINUIDAD_M = 3;
// Un tramo de piso 1 más corto que esto no se sigue por GPS (se avanza a mano).
export const LARGO_MINIMO_GPS_M = 2;

const METROS_POR_GRADO = 111320;

// Tipo estructural: `PasoRutaDetallado` (lib/rutas/actions.ts) lo cumple.
export type PasoSeguible = {
  id: string;
  nombre: string;
  tipo: string;
  piso: number;
  edificioId: string | null;
  lat: number | null;
  lng: number | null;
  cambioPiso: {
    desde: number;
    hasta: number;
    sentido: "sube" | "baja";
    via: { nombre: string; tipo: "escalera" | "elevador" } | null;
  } | null;
};

// `paso` es el índice del nodo en la ruta completa.
export type PuntoLinea = { lat: number; lng: number; metros: number; paso: number };

export type Tramo = {
  piso: number;
  // Índices de pasos (inclusive) en la ruta completa.
  desde: number;
  hasta: number;
  // null = tramo manual.
  linea: PuntoLinea[] | null;
  // Metros de la línea (0 si es manual).
  largo: number;
};

export type TipoManiobra = "izquierda" | "derecha" | "escalera" | "elevador" | "llegada";

export type Maniobra = {
  id: string;
  tipo: TipoManiobra;
  // Posición en la línea del tramo.
  metros: number;
  hacia: string | null;
  piso: { hasta: number; sentido: "sube" | "baja"; via: string | null } | null;
};

export function nombreLegible(paso: PasoSeguible): string {
  return paso.tipo === "pasillo" ? paso.nombre.replace(/\s+\d+$/, "") : paso.nombre;
}

export function armarTramos(pasos: PasoSeguible[]): Tramo[] {
  const tramos: Tramo[] = [];
  let desde = 0;
  for (let i = 1; i <= pasos.length; i++) {
    if (i < pasos.length && pasos[i].piso === pasos[desde].piso) continue;
    tramos.push(armarTramo(pasos, desde, i - 1));
    desde = i;
  }
  return tramos;
}

function armarTramo(pasos: PasoSeguible[], desde: number, hasta: number): Tramo {
  const piso = pasos[desde].piso;
  const linea: PuntoLinea[] = [];
  for (let i = desde; i <= hasta; i++) {
    const p = pasos[i];
    if (!tieneUbicacion(p)) continue;
    const anterior = linea[linea.length - 1];
    const metros = anterior ? anterior.metros + distanciaMetros(anterior.lat, anterior.lng, p.lat, p.lng) : 0;
    linea.push({ lat: p.lat, lng: p.lng, metros, paso: i });
  }
  if (piso !== PISO_GPS || linea.length < 2 || linea[linea.length - 1].metros < LARGO_MINIMO_GPS_M) {
    return { piso, desde, hasta, linea: null, largo: 0 };
  }
  return { piso, desde, hasta, linea, largo: linea[linea.length - 1].metros };
}

// Plano local en metros (equirectangular) con origen en un punto de referencia.
function planoLocal(origen: { lat: number; lng: number }) {
  const escalaLng = Math.cos((origen.lat * Math.PI) / 180) * METROS_POR_GRADO;
  return (p: { lat: number; lng: number }) => ({
    x: (p.lng - origen.lng) * escalaLng,
    y: (p.lat - origen.lat) * METROS_POR_GRADO,
  });
}

// Punto de la línea a `metros` del inicio (acotado a la línea).
function puntoEn(linea: PuntoLinea[], metros: number): { lat: number; lng: number } {
  if (metros <= 0) return linea[0];
  for (let i = 1; i < linea.length; i++) {
    const a = linea[i - 1];
    const b = linea[i];
    if (metros <= b.metros) {
      const largo = b.metros - a.metros;
      const t = largo > 0 ? (metros - a.metros) / largo : 0;
      return { lat: a.lat + t * (b.lat - a.lat), lng: a.lng + t * (b.lng - a.lng) };
    }
  }
  return linea[linea.length - 1];
}

// Rumbo en grados desde el norte, en sentido horario.
function rumbo(a: { x: number; y: number }, b: { x: number; y: number }): number | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.hypot(dx, dy) < 0.5) return null;
  return (Math.atan2(dx, dy) * 180) / Math.PI;
}

function normalizar(grados: number): number {
  let d = grados % 360;
  if (d > 180) d -= 360;
  if (d <= -180) d += 360;
  return d;
}

export function maniobrasDeTramo(pasos: PasoSeguible[], tramos: Tramo[], indiceTramo: number): Maniobra[] {
  const tramo = tramos[indiceTramo];
  const maniobras: Maniobra[] = [];

  const linea = tramo.linea;
  if (linea) {
    const aLocal = planoLocal(linea[0]);
    const candidatos: { metros: number; delta: number; paso: number }[] = [];
    for (let i = 1; i < linea.length - 1; i++) {
      const m = linea[i].metros;
      if (m > tramo.largo - GIRO_AHORA_M) break;
      const vertice = aLocal(linea[i]);
      const entrada = rumbo(aLocal(puntoEn(linea, m - DISTANCIA_RUMBO_M)), vertice);
      const salida = rumbo(vertice, aLocal(puntoEn(linea, m + DISTANCIA_RUMBO_M)));
      if (entrada === null || salida === null) continue;
      const delta = normalizar(salida - entrada);
      if (Math.abs(delta) < ANGULO_GIRO_GRADOS) continue;
      const ultimo = candidatos[candidatos.length - 1];
      if (ultimo && m - ultimo.metros < FUSION_GIROS_M) {
        if (Math.abs(delta) > Math.abs(ultimo.delta)) candidatos[candidatos.length - 1] = { metros: m, delta, paso: linea[i].paso };
      } else {
        candidatos.push({ metros: m, delta, paso: linea[i].paso });
      }
    }
    for (const c of candidatos) {
      const tipo: TipoManiobra = c.delta > 0 ? "derecha" : "izquierda";
      const siguiente = pasos[Math.min(c.paso + 1, tramo.hasta)];
      maniobras.push({ id: `${indiceTramo}:${Math.round(c.metros)}:${tipo}`, tipo, metros: c.metros, hacia: nombreLegible(siguiente), piso: null });
    }
  }

  const proximo = tramos[indiceTramo + 1];
  if (proximo) {
    const primero = pasos[proximo.desde];
    const via = primero.cambioPiso?.via ?? null;
    const tipo: TipoManiobra = via?.tipo === "elevador" ? "elevador" : "escalera";
    maniobras.push({
      id: `${indiceTramo}:fin:${tipo}`,
      tipo,
      metros: tramo.largo,
      hacia: via?.nombre ?? nombreLegible(primero),
      piso: {
        hasta: primero.cambioPiso?.hasta ?? primero.piso,
        sentido: primero.cambioPiso?.sentido ?? (primero.piso > tramo.piso ? "sube" : "baja"),
        via: via?.nombre ?? null,
      },
    });
  } else {
    maniobras.push({ id: `${indiceTramo}:fin:llegada`, tipo: "llegada", metros: tramo.largo, hacia: nombreLegible(pasos[tramo.hasta]), piso: null });
  }
  return maniobras;
}

// Avance (metros sobre la línea) y distancia a la línea de una posición. Solo se
// buscan tramos de la línea dentro de la ventana alrededor del avance anterior
// (`adelante` la amplía), entre los puntos casi igual de cercanos se prefiere el
// de menor avance (`tolerancia`, normalmente la precisión del GPS), y el avance
// nunca retrocede (el GPS brinca unos metros).
export function proyectarAvance(
  linea: PuntoLinea[],
  posicion: { lat: number; lng: number },
  avanceAnterior: number,
  { adelante = VENTANA_ADELANTE_M, tolerancia = TOLERANCIA_CONTINUIDAD_M }: { adelante?: number; tolerancia?: number } = {},
): { metros: number; distancia: number } {
  const bajo = avanceAnterior - VENTANA_ATRAS_M;
  const alto = avanceAnterior + adelante;
  const aLocal = planoLocal(posicion);
  const candidatos: { metros: number; distancia: number }[] = [];
  for (let i = 1; i < linea.length; i++) {
    const a = linea[i - 1];
    const b = linea[i];
    if (b.metros < bajo || a.metros > alto) continue;
    const largoM = b.metros - a.metros;
    const pa = aLocal(a);
    const pb = aLocal(b);
    const dx = pb.x - pa.x;
    const dy = pb.y - pa.y;
    const largo2 = dx * dx + dy * dy;
    // La posición es el origen del plano local.
    let t = largo2 > 0 ? -(pa.x * dx + pa.y * dy) / largo2 : 0;
    t = Math.min(1, Math.max(0, t));
    // Se acota a la ventana.
    if (largoM > 0) {
      t = Math.max(t, (bajo - a.metros) / largoM);
      t = Math.min(t, (alto - a.metros) / largoM);
      t = Math.min(1, Math.max(0, t));
    }
    candidatos.push({ metros: a.metros + t * largoM, distancia: Math.hypot(pa.x + t * dx, pa.y + t * dy) });
  }
  if (candidatos.length === 0) return { metros: avanceAnterior, distancia: Number.POSITIVE_INFINITY };
  const minima = Math.min(...candidatos.map((c) => c.distancia));
  const limite = minima + Math.max(TOLERANCIA_CONTINUIDAD_M, tolerancia);
  // Primer punto cercano en el recorrido y, desde ahí, el mínimo local de distancia
  // (los candidatos van en orden de avance; los segmentos vecinos de un mismo
  // pasillo siempre están cerca, así que no basta con tomar el primero).
  let i = candidatos.findIndex((c) => c.distancia <= limite);
  while (i + 1 < candidatos.length && candidatos[i + 1].distancia <= candidatos[i].distancia) i++;
  const elegido = candidatos[i];
  return { metros: Math.max(avanceAnterior, elegido.metros), distancia: elegido.distancia };
}

// Motor de rutas: camino más corto sobre el grafo del campus (nodos + conexiones).
//
// Funciones puras, sin acceso a red ni a Supabase: reciben el grafo ya cargado
// en memoria. Así se pueden probar con `npm test` contra grafos armados a mano
// (ver dijkstra.test.ts) y la Server Action solo se encarga de traer los datos.
//
// El import lleva extensión .ts para que `node --test` pueda ejecutar este
// archivo directamente (Node 24 quita los tipos pero no resuelve extensiones).
import { distanciaMetros } from "../geo.ts";

export type NodoGrafo = {
  id: string;
  tipo: string;
  piso: number;
  edificio_id: string | null;
  lat: number | null;
  lng: number | null;
};

export type ConexionGrafo = {
  nodo_origen_id: string;
  nodo_destino_id: string;
  // PostgREST puede devolver `numeric` como número o como texto.
  costo: number | string | null;
  bidireccional: boolean;
};

export type OpcionesRuta = {
  evitarEscaleras?: boolean;
};

export type PasoRuta = {
  nodo: NodoGrafo;
  costoAcumulado: number;
};

export type MotivoSinRuta =
  | "origen_inexistente"
  | "destino_inexistente"
  | "origen_sin_conexiones"
  | "destino_sin_conexiones"
  | "bloqueado_por_escaleras"
  | "grafo_desconectado";

// Peso cuando un nodo no tiene coordenadas y la conexión no trae costo.
export const PESO_POR_DEFECTO = 1;

function leerCosto(costo: ConexionGrafo["costo"]): number | null {
  if (costo === null || costo === undefined || costo === "") return null;
  const valor = typeof costo === "number" ? costo : Number(costo);
  // La base ya impide costos negativos (0006), pero si llega algo inválido se
  // trata como si no hubiera costo en vez de romper el cálculo.
  return Number.isFinite(valor) && valor >= 0 ? valor : null;
}

// Peso de una arista: costo explícito → distancia real → peso fijo.
export function pesoConexion(conexion: ConexionGrafo, a: NodoGrafo, b: NodoGrafo): number {
  const costo = leerCosto(conexion.costo);
  if (costo !== null) return costo;

  if (
    Number.isFinite(a.lat) && Number.isFinite(a.lng) &&
    Number.isFinite(b.lat) && Number.isFinite(b.lng)
  ) {
    return distanciaMetros(a.lat as number, a.lng as number, b.lat as number, b.lng as number);
  }

  return PESO_POR_DEFECTO;
}

type Arista = { hacia: string; peso: number };

function construirAdyacencia(
  nodosPorId: Map<string, NodoGrafo>,
  conexiones: ConexionGrafo[],
): Map<string, Arista[]> {
  const adyacencia = new Map<string, Arista[]>();
  const agregar = (desde: string, hacia: string, peso: number) => {
    const lista = adyacencia.get(desde);
    if (lista) lista.push({ hacia, peso });
    else adyacencia.set(desde, [{ hacia, peso }]);
  };

  for (const conexion of conexiones) {
    const a = nodosPorId.get(conexion.nodo_origen_id);
    const b = nodosPorId.get(conexion.nodo_destino_id);
    // Conexiones hacia nodos excluidos (escaleras) o inexistentes se ignoran.
    if (!a || !b || a.id === b.id) continue;

    const peso = pesoConexion(conexion, a, b);
    agregar(a.id, b.id, peso);
    if (conexion.bidireccional) agregar(b.id, a.id, peso);
  }

  return adyacencia;
}

// Cola de prioridad mínima (montículo binario) con borrado perezoso: se permite
// meter el mismo nodo varias veces y al sacarlo se descartan las entradas viejas.
class ColaPrioridad {
  private datos: { id: string; costo: number }[] = [];

  get tamano() {
    return this.datos.length;
  }

  meter(id: string, costo: number) {
    const datos = this.datos;
    datos.push({ id, costo });
    let i = datos.length - 1;
    while (i > 0) {
      const padre = (i - 1) >> 1;
      if (datos[padre].costo <= datos[i].costo) break;
      [datos[padre], datos[i]] = [datos[i], datos[padre]];
      i = padre;
    }
  }

  sacar(): { id: string; costo: number } | undefined {
    const datos = this.datos;
    if (datos.length === 0) return undefined;
    const minimo = datos[0];
    const ultimo = datos.pop()!;
    if (datos.length > 0) {
      datos[0] = ultimo;
      let i = 0;
      for (;;) {
        const izq = 2 * i + 1;
        const der = izq + 1;
        let menor = i;
        if (izq < datos.length && datos[izq].costo < datos[menor].costo) menor = izq;
        if (der < datos.length && datos[der].costo < datos[menor].costo) menor = der;
        if (menor === i) break;
        [datos[menor], datos[i]] = [datos[i], datos[menor]];
        i = menor;
      }
    }
    return minimo;
  }
}

function filtrarNodos(nodos: NodoGrafo[], opciones: OpcionesRuta): Map<string, NodoGrafo> {
  const nodosPorId = new Map<string, NodoGrafo>();
  for (const nodo of nodos) {
    // Evitar escaleras excluye solo 'escalera'; 'elevador' sigue disponible.
    if (opciones.evitarEscaleras && nodo.tipo === "escalera") continue;
    nodosPorId.set(nodo.id, nodo);
  }
  return nodosPorId;
}

// Dijkstra desde origenId hasta destinoId. Devuelve los nodos en orden, con el
// costo acumulado al llegar a cada uno, o null si no hay camino.
export function buscarRuta(
  nodos: NodoGrafo[],
  conexiones: ConexionGrafo[],
  origenId: string,
  destinoId: string,
  opciones: OpcionesRuta = {},
): PasoRuta[] | null {
  const nodosPorId = filtrarNodos(nodos, opciones);
  const origen = nodosPorId.get(origenId);
  const destino = nodosPorId.get(destinoId);
  if (!origen || !destino) return null;
  if (origen.id === destino.id) return [{ nodo: origen, costoAcumulado: 0 }];

  const adyacencia = construirAdyacencia(nodosPorId, conexiones);
  const distancias = new Map<string, number>([[origen.id, 0]]);
  const anterior = new Map<string, string>();
  const visitados = new Set<string>();
  const cola = new ColaPrioridad();
  cola.meter(origen.id, 0);

  while (cola.tamano > 0) {
    const actual = cola.sacar()!;
    if (visitados.has(actual.id)) continue;
    visitados.add(actual.id);
    if (actual.id === destino.id) break;

    for (const arista of adyacencia.get(actual.id) ?? []) {
      if (visitados.has(arista.hacia)) continue;
      const candidato = actual.costo + arista.peso;
      const conocido = distancias.get(arista.hacia);
      if (conocido === undefined || candidato < conocido) {
        distancias.set(arista.hacia, candidato);
        anterior.set(arista.hacia, actual.id);
        cola.meter(arista.hacia, candidato);
      }
    }
  }

  if (!visitados.has(destino.id)) return null;

  const ids: string[] = [];
  for (let id: string | undefined = destino.id; id !== undefined; id = anterior.get(id)) {
    ids.push(id);
  }
  ids.reverse();

  return ids.map((id) => ({
    nodo: nodosPorId.get(id)!,
    costoAcumulado: distancias.get(id)!,
  }));
}

// Cuando buscarRuta devuelve null, explica por qué para poder mostrar un
// mensaje útil en la interfaz. Se evalúa sobre el grafo completo (sin filtrar
// escaleras) salvo para decidir si las escaleras son las que bloquean.
export function explicarSinRuta(
  nodos: NodoGrafo[],
  conexiones: ConexionGrafo[],
  origenId: string,
  destinoId: string,
  opciones: OpcionesRuta = {},
): MotivoSinRuta {
  const ids = new Set(nodos.map((nodo) => nodo.id));
  if (!ids.has(origenId)) return "origen_inexistente";
  if (!ids.has(destinoId)) return "destino_inexistente";

  const tieneConexiones = (id: string) =>
    conexiones.some(
      (c) =>
        (c.nodo_origen_id === id && ids.has(c.nodo_destino_id)) ||
        (c.nodo_destino_id === id && ids.has(c.nodo_origen_id)),
    );
  if (!tieneConexiones(origenId)) return "origen_sin_conexiones";
  if (!tieneConexiones(destinoId)) return "destino_sin_conexiones";

  if (opciones.evitarEscaleras && buscarRuta(nodos, conexiones, origenId, destinoId) !== null) {
    return "bloqueado_por_escaleras";
  }

  return "grafo_desconectado";
}

// Diagnóstico del grafo del campus para el mapa del administrador
// (/admin/grafo). Funciones puras, probadas con `npm test`.
//
// La conectividad se calcula SIN dirección: dos nodos están en la misma "red"
// si hay un camino de conexiones entre ellos, aunque alguna sea de un solo
// sentido. Sirve para detectar pasillos que quedaron sueltos al capturar; si
// una ruta concreta funciona o no se comprueba con "Probar ruta", que usa el
// motor real (con dirección).

export type NodoDiagnostico = {
  id: string;
  tipo: string;
  piso: number;
  lat: number | null;
  lng: number | null;
  buscable: boolean;
};

export type ConexionDiagnostico = {
  nodo_origen_id: string;
  nodo_destino_id: string;
  bidireccional: boolean;
};

export type DiagnosticoGrafo = {
  // Índice de componente de cada nodo (para colorear el mapa).
  componenteDe: Map<string, number>;
  totalComponentes: number;
  // Red principal: la que tiene más entradas (o la más grande si no hay).
  principal: Set<string>;
  // Fuera de la red principal y con al menos una conexión.
  desconectados: string[];
  // Sin ninguna conexión válida.
  aislados: string[];
  // Destinos buscables que no están en la red principal.
  destinosInalcanzables: string[];
  // Nodos tipo pasillo marcados como destino buscable.
  pasillosBuscables: string[];
  // Escaleras/elevadores sin ninguna conexión hacia un nodo de otro piso.
  transicionesSinOtroPiso: string[];
  sinCoordenadas: string[];
};

export function diagnosticarGrafo(
  nodos: NodoDiagnostico[],
  conexiones: ConexionDiagnostico[],
): DiagnosticoGrafo {
  const porId = new Map(nodos.map((n) => [n.id, n]));
  const vecinos = new Map<string, Set<string>>(nodos.map((n) => [n.id, new Set<string>()]));

  for (const c of conexiones) {
    const a = vecinos.get(c.nodo_origen_id);
    const b = vecinos.get(c.nodo_destino_id);
    if (!a || !b || c.nodo_origen_id === c.nodo_destino_id) continue;
    a.add(c.nodo_destino_id);
    b.add(c.nodo_origen_id);
  }

  // Componentes por recorrido en anchura.
  const componenteDe = new Map<string, number>();
  const componentes: string[][] = [];
  for (const n of nodos) {
    if (componenteDe.has(n.id)) continue;
    const indice = componentes.length;
    const miembros: string[] = [];
    const cola = [n.id];
    componenteDe.set(n.id, indice);
    while (cola.length > 0) {
      const actual = cola.pop()!;
      miembros.push(actual);
      for (const v of vecinos.get(actual) ?? []) {
        if (!componenteDe.has(v)) {
          componenteDe.set(v, indice);
          cola.push(v);
        }
      }
    }
    componentes.push(miembros);
  }

  const entradasEn = (miembros: string[]) => miembros.filter((id) => porId.get(id)?.tipo === "entrada").length;
  let mejor = -1;
  for (let i = 0; i < componentes.length; i++) {
    if (
      mejor === -1 ||
      entradasEn(componentes[i]) > entradasEn(componentes[mejor]) ||
      (entradasEn(componentes[i]) === entradasEn(componentes[mejor]) && componentes[i].length > componentes[mejor].length)
    ) {
      mejor = i;
    }
  }
  const principal = new Set(mejor === -1 ? [] : componentes[mejor]);

  const aislados: string[] = [];
  const desconectados: string[] = [];
  const destinosInalcanzables: string[] = [];
  const pasillosBuscables: string[] = [];
  const transicionesSinOtroPiso: string[] = [];
  const sinCoordenadas: string[] = [];

  for (const n of nodos) {
    const susVecinos = vecinos.get(n.id)!;
    const enPrincipal = principal.has(n.id);
    if (susVecinos.size === 0) aislados.push(n.id);
    else if (!enPrincipal) desconectados.push(n.id);
    if (n.buscable && !enPrincipal) destinosInalcanzables.push(n.id);
    if (n.buscable && n.tipo === "pasillo") pasillosBuscables.push(n.id);
    if (
      (n.tipo === "escalera" || n.tipo === "elevador") &&
      ![...susVecinos].some((v) => porId.get(v)!.piso !== n.piso)
    ) {
      transicionesSinOtroPiso.push(n.id);
    }
    if (n.lat === null || n.lng === null || !Number.isFinite(n.lat) || !Number.isFinite(n.lng)) {
      sinCoordenadas.push(n.id);
    }
  }

  return {
    componenteDe,
    totalComponentes: componentes.length,
    principal,
    desconectados,
    aislados,
    destinosInalcanzables,
    pasillosBuscables,
    transicionesSinOtroPiso,
    sinCoordenadas,
  };
}

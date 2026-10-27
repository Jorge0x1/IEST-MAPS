// Agrupa los pasos de una ruta en instrucciones para quien la camina.
//
// El grafo tiene un nodo cada pocos metros de pasillo para que la línea del
// mapa siga su forma, pero mostrar cada nodo como un paso ("Continúa hacia
// Pasillo 6", "… 5", "… 4") es ruido. Aquí los nodos de pasillo consecutivos
// (mismo edificio y piso, sin cambio de piso) se juntan en una sola
// instrucción. Inicio, llegada, cambios de piso y nodos que no son pasillo
// (una entrada o un salón por el que se pasa) siguen siendo instrucciones
// propias.
//
// Función pura (sin React ni Leaflet) para poder probarla con `npm test`.

import { distanciaMetros } from "../geo.ts";

export type PasoAgrupable = {
  id: string;
  tipo: string;
  piso: number;
  edificioId: string | null;
  lat: number | null;
  lng: number | null;
  cambioPiso: unknown | null;
};

export type TipoInstruccion = "inicio" | "pasillo" | "cambio_piso" | "paso" | "llegada";

export type Instruccion<T extends PasoAgrupable> = {
  tipo: TipoInstruccion;
  // Nodos que cubre, en orden. Solo un tramo de pasillo tiene más de uno.
  pasos: T[];
  // Nodo donde va el número en el mapa. En un tramo es el de en medio (entre
  // los que tienen ubicación) para que no se encime con los de los extremos.
  ancla: T;
  // Metros que se caminan en el tramo de pasillo, desde el nodo anterior hasta
  // el último del tramo. null si no es pasillo o si falta alguna ubicación.
  metros: number | null;
};

type ConUbicacion = { lat: number; lng: number };

function coordenadaValida(valor: number | null, limite: number): valor is number {
  return typeof valor === "number" && Number.isFinite(valor) && Math.abs(valor) <= limite;
}

export function tieneUbicacion<T extends { lat: number | null; lng: number | null }>(paso: T): paso is T & ConUbicacion {
  return coordenadaValida(paso.lat, 90) && coordenadaValida(paso.lng, 180);
}

function extiendeTramo(actual: PasoAgrupable, siguiente: PasoAgrupable) {
  return (
    siguiente.tipo === "pasillo" &&
    !siguiente.cambioPiso &&
    siguiente.piso === actual.piso &&
    siguiente.edificioId === actual.edificioId
  );
}

function elegirAncla<T extends PasoAgrupable>(tramo: T[]): T {
  const conUbicacion = tramo.filter(tieneUbicacion);
  const lista = conUbicacion.length > 0 ? conUbicacion : tramo;
  return lista[Math.floor((lista.length - 1) / 2)];
}

function metrosRecorridos(pasos: PasoAgrupable[]): number | null {
  let total = 0;
  for (let i = 1; i < pasos.length; i++) {
    const a = pasos[i - 1];
    const b = pasos[i];
    if (!tieneUbicacion(a) || !tieneUbicacion(b)) return null;
    total += distanciaMetros(a.lat, a.lng, b.lat, b.lng);
  }
  return Math.max(1, Math.round(total));
}

// `agruparPasillos: false` deja un nodo por instrucción (útil en el panel de
// administración, donde se quiere ver el recorrido exacto por el grafo).
export function agruparPasos<T extends PasoAgrupable>(
  pasos: T[],
  { agruparPasillos = true }: { agruparPasillos?: boolean } = {},
): Instruccion<T>[] {
  const instrucciones: Instruccion<T>[] = [];
  const ultimo = pasos.length - 1;
  const sola = (tipo: TipoInstruccion, paso: T): Instruccion<T> => ({ tipo, pasos: [paso], ancla: paso, metros: null });

  let i = 0;
  while (i < pasos.length) {
    const paso = pasos[i];
    if (i === 0) {
      instrucciones.push(sola("inicio", paso));
      i++;
    } else if (i === ultimo) {
      instrucciones.push(sola("llegada", paso));
      i++;
    } else if (paso.cambioPiso) {
      instrucciones.push(sola("cambio_piso", paso));
      i++;
    } else if (paso.tipo !== "pasillo" || !agruparPasillos) {
      instrucciones.push(sola("paso", paso));
      i++;
    } else {
      // El tramo nunca absorbe el último nodo: ese siempre es la llegada.
      let fin = i;
      while (fin + 1 < ultimo && extiendeTramo(pasos[fin], pasos[fin + 1])) fin++;
      const tramo = pasos.slice(i, fin + 1);
      instrucciones.push({
        tipo: "pasillo",
        pasos: tramo,
        ancla: elegirAncla(tramo),
        metros: metrosRecorridos(pasos.slice(i - 1, fin + 1)),
      });
      i = fin + 1;
    }
  }

  return instrucciones;
}

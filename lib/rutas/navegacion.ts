// Máquina de estados de la navegación en vivo (GPS fase 2). Función pura: cada
// acción (una lectura del GPS, un toque del alumno) devuelve el estado nuevo y
// los efectos que la interfaz debe ejecutar (sonar un aviso o pedir una ruta
// nueva). Sin React ni Leaflet, para probarla con `npm test`.
//
// En tramos del piso 1 el avance sigue al GPS (lib/rutas/seguimiento.ts). En los
// demás pisos se avanza con "Siguiente". Al terminar un tramo que sigue en otro
// piso se pregunta si ya se cambió de piso.
import { PRECISION_MAXIMA_M } from "../ubicacion.ts";
import { agruparPasos } from "./instrucciones.ts";
import {
  armarTramos,
  GIRO_AHORA_M,
  maniobrasDeTramo,
  nombreLegible,
  proyectarAvance,
  type Maniobra,
  type PasoSeguible,
  type TipoManiobra,
  type Tramo,
} from "./seguimiento.ts";

// Fuera de ruta si la distancia a la línea pasa de max(DESVIO_MIN_M, 2 × precisión).
export const DESVIO_MIN_M = 20;
export const LECTURAS_DESVIO = 3;
// Lecturas seguidas sobre la ruta pero más adelante de la ventana (la señal volvió
// después de un tramo sin GPS) para aceptar el salto en vez de contar desvío.
export const LECTURAS_SALTO = 2;
export const PAUSA_RECALCULO_MS = 15000;
export const PREAVISO_GIRO_M = 15;
export const PREGUNTA_PISO_M = 8;
export const LLEGADA_M = 10;
// Si la siguiente maniobra está más lejos, la indicación es "Sigue recto".
export const SIGUE_RECTO_M = 50;
// Una maniobra recién pasada sigue siendo la actual unos metros (el GPS se atrasa).
const MARGEN_PASADA_M = 2;

export type FaseNavegacion = "caminando" | "preguntando_piso" | "esperando_piso" | "llegada";

export type EstadoNavegacion = {
  pasos: PasoSeguible[];
  tramos: Tramo[];
  tramo: number;
  // Avance en la línea del tramo actual (GPS).
  metros: number;
  // Instrucción actual dentro de un tramo manual.
  manual: number;
  lecturasFuera: number;
  lecturasAdelante: number;
  // Ya se avisó y se pidió recálculo por este desvío: no se repite (ni suena)
  // hasta que una lectura vuelva a la ruta o llegue una ruta nueva.
  desvioActivo: boolean;
  ultimoRecalculo: number | null;
  avisados: string[];
  fase: FaseNavegacion;
  gpsImpreciso: boolean;
};

export type AccionNavegacion =
  | { tipo: "lectura"; lat: number; lng: number; precision: number; ahora: number }
  | { tipo: "siguiente" }
  | { tipo: "confirmar_piso" }
  | { tipo: "todavia_no" }
  | { tipo: "ruta_nueva"; pasos: PasoSeguible[]; ahora: number }
  | { tipo: "llegar" };

export type ClaseAviso = "giro" | "desvio" | "piso" | "llegada";
export type Efecto = { tipo: "aviso"; clase: ClaseAviso } | { tipo: "recalcular" };

export type Indicacion = {
  maniobra: "recto" | TipoManiobra;
  // null en tramos manuales.
  metros: number | null;
  ahora: boolean;
  hacia: string | null;
  piso: Maniobra["piso"];
};

type Resultado = { estado: EstadoNavegacion; efectos: Efecto[] };

export function iniciarNavegacion(pasos: PasoSeguible[], ultimoRecalculo: number | null = null): EstadoNavegacion {
  return {
    pasos,
    tramos: armarTramos(pasos),
    tramo: 0,
    metros: 0,
    manual: 0,
    lecturasFuera: 0,
    lecturasAdelante: 0,
    desvioActivo: false,
    ultimoRecalculo,
    avisados: [],
    fase: "caminando",
    gpsImpreciso: false,
  };
}

const aviso = (clase: ClaseAviso): Efecto => ({ tipo: "aviso", clase });

function tramoActual(e: EstadoNavegacion): Tramo {
  return e.tramos[e.tramo];
}

export function esManual(e: EstadoNavegacion): boolean {
  return tramoActual(e).linea === null;
}

export function pisoActual(e: EstadoNavegacion): number {
  return tramoActual(e).piso;
}

function hayTramoSiguiente(e: EstadoNavegacion): boolean {
  return e.tramo + 1 < e.tramos.length;
}

function instruccionesManuales(e: EstadoNavegacion) {
  const t = tramoActual(e);
  return agruparPasos(e.pasos.slice(t.desde, t.hasta + 1));
}

// Termina el tramo actual: pregunta por el piso o llega.
function finDeTramo(e: EstadoNavegacion): Resultado {
  if (hayTramoSiguiente(e)) return { estado: { ...e, fase: "preguntando_piso" }, efectos: [aviso("piso")] };
  return { estado: { ...e, fase: "llegada" }, efectos: [aviso("llegada")] };
}

function siguienteManiobra(e: EstadoNavegacion): Maniobra {
  const maniobras = maniobrasDeTramo(e.pasos, e.tramos, e.tramo);
  return maniobras.find((m) => m.metros > e.metros - MARGEN_PASADA_M) ?? maniobras[maniobras.length - 1];
}

function leer(e: EstadoNavegacion, a: Extract<AccionNavegacion, { tipo: "lectura" }>): Resultado {
  if (e.fase !== "caminando") return { estado: e, efectos: [] };
  const t = tramoActual(e);
  // En tramos manuales el GPS no se usa (ni se avisa que es impreciso).
  if (!t.linea) return { estado: e.gpsImpreciso ? { ...e, gpsImpreciso: false } : e, efectos: [] };
  if (a.precision > PRECISION_MAXIMA_M) {
    return { estado: e.gpsImpreciso ? e : { ...e, gpsImpreciso: true }, efectos: [] };
  }

  const tolerancia = a.precision;
  let proyeccion = proyectarAvance(t.linea, a, e.metros, { tolerancia });
  const limite = Math.max(DESVIO_MIN_M, 2 * a.precision);
  if (proyeccion.distancia > limite) {
    // ¿Está sobre la ruta pero más adelante (la señal volvió tras un tramo sin GPS)?
    const lejos = proyectarAvance(t.linea, a, e.metros, { tolerancia, adelante: Number.POSITIVE_INFINITY });
    if (lejos.distancia <= limite && lejos.metros > e.metros) {
      const lecturasAdelante = e.lecturasAdelante + 1;
      if (lecturasAdelante < LECTURAS_SALTO) {
        return { estado: { ...e, gpsImpreciso: false, lecturasAdelante }, efectos: [] };
      }
      proyeccion = lejos;
    } else {
      const lecturasFuera = Math.min(e.lecturasFuera + 1, LECTURAS_DESVIO);
      const puede = !e.desvioActivo && (e.ultimoRecalculo === null || a.ahora - e.ultimoRecalculo >= PAUSA_RECALCULO_MS);
      if (lecturasFuera >= LECTURAS_DESVIO && puede) {
        return {
          estado: { ...e, gpsImpreciso: false, lecturasFuera: 0, lecturasAdelante: 0, desvioActivo: true, ultimoRecalculo: a.ahora },
          efectos: [aviso("desvio"), { tipo: "recalcular" }],
        };
      }
      return { estado: { ...e, gpsImpreciso: false, lecturasFuera, lecturasAdelante: 0 }, efectos: [] };
    }
  }

  let estado: EstadoNavegacion = {
    ...e,
    gpsImpreciso: false,
    lecturasFuera: 0,
    lecturasAdelante: 0,
    desvioActivo: false,
    metros: proyeccion.metros,
  };
  const efectos: Efecto[] = [];

  const faltan = t.largo - estado.metros;
  if (faltan <= (hayTramoSiguiente(estado) ? PREGUNTA_PISO_M : LLEGADA_M)) {
    const fin = finDeTramo(estado);
    return fin;
  }

  const proxima = siguienteManiobra(estado);
  const esGiro = proxima.tipo === "izquierda" || proxima.tipo === "derecha";
  if (esGiro && proxima.metros - estado.metros <= PREAVISO_GIRO_M && !estado.avisados.includes(proxima.id)) {
    estado = { ...estado, avisados: [...estado.avisados, proxima.id] };
    efectos.push(aviso("giro"));
  }
  return { estado, efectos };
}

export function avanzar(e: EstadoNavegacion, accion: AccionNavegacion): Resultado {
  switch (accion.tipo) {
    case "lectura":
      return leer(e, accion);
    case "siguiente": {
      if (e.fase !== "caminando") return { estado: e, efectos: [] };
      if (esManual(e)) {
        if (e.manual < instruccionesManuales(e).length - 1) return { estado: { ...e, manual: e.manual + 1 }, efectos: [] };
        return finDeTramo(e);
      }
      // Tramo con GPS avanzado a mano (sin señal o señal imprecisa): salta a
      // después de la siguiente maniobra, o termina el tramo si era la última.
      const proxima = siguienteManiobra(e);
      if (proxima.metros >= tramoActual(e).largo) return finDeTramo(e);
      return {
        estado: { ...e, metros: proxima.metros + MARGEN_PASADA_M, lecturasFuera: 0, lecturasAdelante: 0, avisados: [...e.avisados, proxima.id] },
        efectos: [],
      };
    }
    case "confirmar_piso": {
      if ((e.fase !== "preguntando_piso" && e.fase !== "esperando_piso") || !hayTramoSiguiente(e)) return { estado: e, efectos: [] };
      return { estado: { ...e, tramo: e.tramo + 1, metros: 0, manual: 0, lecturasFuera: 0, fase: "caminando" }, efectos: [] };
    }
    case "todavia_no":
      return e.fase === "preguntando_piso" ? { estado: { ...e, fase: "esperando_piso" }, efectos: [] } : { estado: e, efectos: [] };
    case "ruta_nueva":
      return { estado: iniciarNavegacion(accion.pasos, accion.ahora), efectos: [] };
    case "llegar":
      return e.fase === "llegada" ? { estado: e, efectos: [] } : { estado: { ...e, fase: "llegada" }, efectos: [aviso("llegada")] };
  }
}

function maniobraDeFin(e: EstadoNavegacion): Maniobra {
  const maniobras = maniobrasDeTramo(e.pasos, e.tramos, e.tramo);
  return maniobras[maniobras.length - 1];
}

export function indicacionActual(e: EstadoNavegacion): Indicacion {
  if (e.fase === "llegada") {
    return { maniobra: "llegada", metros: 0, ahora: true, hacia: nombreLegible(e.pasos[e.pasos.length - 1]), piso: null };
  }
  if (e.fase !== "caminando") {
    const fin = maniobraDeFin(e);
    return { maniobra: fin.tipo, metros: esManual(e) ? null : 0, ahora: true, hacia: fin.hacia, piso: fin.piso };
  }
  if (esManual(e)) {
    const instrucciones = instruccionesManuales(e);
    const siguiente = instrucciones[e.manual + 1];
    if (!siguiente) {
      const fin = maniobraDeFin(e);
      return { maniobra: fin.tipo, metros: null, ahora: false, hacia: fin.hacia, piso: fin.piso };
    }
    return { maniobra: "recto", metros: null, ahora: false, hacia: nombreLegible(siguiente.pasos[0]), piso: null };
  }
  const proxima = siguienteManiobra(e);
  const metros = Math.max(0, proxima.metros - e.metros);
  if (metros > SIGUE_RECTO_M) return { maniobra: "recto", metros, ahora: false, hacia: null, piso: null };
  return { maniobra: proxima.tipo, metros, ahora: metros <= GIRO_AHORA_M, hacia: proxima.hacia, piso: proxima.piso };
}

function redondear(metros: number): number {
  return Math.max(5, Math.round(metros / 5) * 5);
}

export function textoIndicacion(i: Indicacion): { titulo: string; detalle: string | null } {
  const hacia = i.hacia ? `hacia ${i.hacia}` : null;
  switch (i.maniobra) {
    case "izquierda":
    case "derecha": {
      const lado = i.maniobra === "izquierda" ? "la izquierda" : "la derecha";
      if (i.ahora || i.metros === null) return { titulo: `Gira a ${lado} ahora`, detalle: hacia };
      return { titulo: `En ${redondear(i.metros)} m gira a ${lado}`, detalle: hacia };
    }
    case "recto":
      if (i.metros === null) return { titulo: `Sigue hasta ${i.hacia ?? "el siguiente punto"}`, detalle: null };
      return { titulo: `Sigue recto ${redondear(i.metros)} m`, detalle: hacia };
    case "escalera":
    case "elevador": {
      const objeto = i.maniobra === "escalera" ? "la escalera" : "el elevador";
      const verbo = i.piso?.sentido === "baja" ? "baja" : "sube";
      const pisoTexto = i.piso ? `al piso ${i.piso.hasta}` : "de piso";
      if (i.metros === null) {
        const via = i.piso?.via ? ` ${i.piso.via}` : "";
        return { titulo: `Toma ${objeto}${via} y ${verbo} ${pisoTexto}`, detalle: null };
      }
      const detalle = `${verbo === "sube" ? "Sube" : "Baja"} ${pisoTexto}`;
      if (i.ahora) return { titulo: `Toma ${objeto} ahora`, detalle };
      return { titulo: `En ${redondear(i.metros)} m toma ${objeto}`, detalle };
    }
    case "llegada": {
      const lugar = i.hacia ?? "tu destino";
      if (i.metros === null) return { titulo: `Llega a ${lugar}`, detalle: null };
      if (i.ahora) return { titulo: `Llegaste a ${lugar}`, detalle: null };
      return { titulo: `En ${redondear(i.metros)} m llegas a ${lugar}`, detalle: null };
    }
  }
}

export function preguntaPiso(e: EstadoNavegacion): string | null {
  if (e.fase !== "preguntando_piso" && e.fase !== "esperando_piso") return null;
  const fin = maniobraDeFin(e);
  if (!fin.piso) return null;
  if (fin.tipo === "elevador") return `¿Ya llegaste al piso ${fin.piso.hasta}?`;
  return fin.piso.sentido === "sube" ? `¿Ya subiste al piso ${fin.piso.hasta}?` : `¿Ya bajaste al piso ${fin.piso.hasta}?`;
}

// Metros que faltan para el destino; null si queda algún tramo manual.
export function metrosRestantes(e: EstadoNavegacion): number | null {
  let total = 0;
  for (let i = e.tramo; i < e.tramos.length; i++) {
    const t = e.tramos[i];
    if (!t.linea) return null;
    total += i === e.tramo ? Math.max(0, t.largo - e.metros) : t.largo;
  }
  return total;
}

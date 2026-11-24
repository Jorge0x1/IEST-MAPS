"use server";

// Punto de entrada único del motor de rutas. El cálculo en sí vive en
// dijkstra.ts (funciones puras); aquí solo se autoriza, se carga el grafo y se
// arma el resultado para la interfaz.
//
// Usa el cliente service-role porque el visitante no tiene sesión de Supabase
// y las políticas RLS de nodos/conexiones solo permiten leer a `authenticated`.
// Por eso cada acción exportada valida a quien llama antes de tocar el grafo:
//   - calcularRuta: requiere una sesión activa (cualquier rol).
//   - calcularRutaDeVisita: requiere un token de visitante válido y vigente, y
//     solo calcula la ruta fija de esa visita (no acepta IDs arbitrarios).
//   - calcularRutaDesdeUbicacion: requiere sesión; parte del nodo más cercano a
//     la posición GPS del alumno (lib/rutas/cercano.ts). La posición no se
//     guarda ni se escribe en los logs.
//   - calcularRutaEvacuacion: requiere sesión; ruta al punto de reunión más
//     cercano (lib/rutas/evacuacion.ts), sin elevadores.

import { createHash } from "node:crypto";
import { obtenerSesionConPerfil } from "@/utils/auth";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";
import { leerTodo } from "@/lib/leer-todo";
import {
  buscarRuta,
  explicarSinRuta,
  type ConexionGrafo,
  type MotivoSinRuta,
  type NodoGrafo,
  type OpcionesRuta,
  type PasoRuta,
} from "./dijkstra";
import { nodoMasCercano, PISO_GPS, validarPosicion, type PosicionUsuario } from "./cercano";
import { enlacesVirtuales, rutaAlPuntoMasCercano } from "./evacuacion";
import { pisoRegistrado } from "../pisos";

export type CambioPiso = {
  desde: number;
  hasta: number;
  sentido: "sube" | "baja";
  // Escalera o elevador por el que se hace la transición, si alguno de los dos
  // nodos del tramo lo es.
  via: { nombre: string; tipo: "escalera" | "elevador" } | null;
};

export type PasoRutaDetallado = {
  id: string;
  nombre: string;
  tipo: string;
  piso: number;
  edificioId: string | null;
  edificioNombre: string | null;
  // Coordenadas del nodo para dibujar la ruta; null si el nodo no tiene (0007).
  lat: number | null;
  lng: number | null;
  // Descripción y foto del nodo (0010); la vista del visitante las muestra para
  // el último paso, que es su destino.
  descripcion: string | null;
  fotoPath: string | null;
  costoAcumulado: number;
  cambioPiso: CambioPiso | null;
};

// Nodo desde el que arrancó una ruta pedida con la ubicación GPS.
export type OrigenUbicacion = { id: string; nombre: string; distanciaMetros: number };

export type MotivoUbicacion =
  | "ubicacion_invalida"
  | "ubicacion_imprecisa"
  | "fuera_del_campus"
  | "sin_candidatos"
  | "ya_en_destino";

export type ResultadoRuta =
  | { ok: true; pasos: PasoRutaDetallado[]; costoTotal: number; origen?: OrigenUbicacion }
  | {
      ok: false;
      motivo:
        | MotivoSinRuta
        | MotivoUbicacion
        | "no_autorizado"
        | "visita_sin_nodos"
        | "error_servidor"
        | "sin_puntos_reunion"
        | "sin_ruta_evacuacion";
      mensaje: string;
    };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type FilaNodo = NodoGrafo & {
  nombre: string;
  descripcion: string | null;
  foto_path: string | null;
  evacuacion: string | null;
};
type FilaEdificio = { id: string; nombre: string };

const MENSAJES_SIN_RUTA: Record<MotivoSinRuta, string> = {
  origen_inexistente: "El punto de partida ya no existe en el mapa del campus.",
  destino_inexistente: "El destino ya no existe en el mapa del campus.",
  origen_sin_conexiones:
    "El punto de partida todavía no está conectado a ningún pasillo del mapa.",
  destino_sin_conexiones: "El destino todavía no está conectado a ningún pasillo del mapa.",
  bloqueado_por_escaleras:
    "No hay una ruta sin escaleras hasta este destino. Puedes ver la ruta con escaleras o pedir apoyo en recepción.",
  grafo_desconectado:
    "Aún no hay un camino trazado entre el punto de partida y el destino.",
};

function detectarCambioPiso(anterior: FilaNodo, actual: FilaNodo): CambioPiso | null {
  if (anterior.piso === actual.piso) return null;
  const transicion = [anterior, actual].find(
    (nodo) => nodo.tipo === "escalera" || nodo.tipo === "elevador",
  );
  return {
    desde: anterior.piso,
    hasta: actual.piso,
    sentido: actual.piso > anterior.piso ? "sube" : "baja",
    via: transicion
      ? { nombre: transicion.nombre, tipo: transicion.tipo as "escalera" | "elevador" }
      : null,
  };
}

type Grafo = { nodos: FilaNodo[]; conexiones: ConexionGrafo[]; edificios: FilaEdificio[] };

const ERROR_GRAFO: ResultadoRuta = {
  ok: false,
  motivo: "error_servidor",
  mensaje: "No pudimos cargar el mapa del campus. Intenta de nuevo en un momento.",
};

// Carga el grafo completo; null si falla (el error ya queda en el log).
async function cargarGrafo(): Promise<Grafo | null> {
  try {
    const supabase = createServiceClient();
    const [nodos, conexiones, edificios] = await Promise.all([
      leerTodo<FilaNodo>((desde, hasta) =>
        supabase
          .from("nodos")
          .select("id, nombre, tipo, piso, edificio_id, lat, lng, descripcion, foto_path, evacuacion")
          .order("id")
          .range(desde, hasta),
      ),
      leerTodo<ConexionGrafo>((desde, hasta) =>
        supabase
          .from("conexiones")
          .select("nodo_origen_id, nodo_destino_id, costo, bidireccional")
          .order("id")
          .range(desde, hasta),
      ),
      leerTodo<FilaEdificio>((desde, hasta) =>
        supabase.from("edificios").select("id, nombre").order("id").range(desde, hasta),
      ),
    ]);
    // Los puntos de reunión sin pasillo trazado se enlazan en memoria con los nodos
    // cercanos (lib/rutas/evacuacion.ts); nada de esto se guarda en la base.
    return { nodos, conexiones: [...conexiones, ...enlacesVirtuales(nodos, conexiones)], edificios };
  } catch (error) {
    console.error("[rutas] No se pudo cargar el grafo:", error);
    return null;
  }
}

// Calcula la ruta sobre un grafo ya cargado y la arma para la interfaz.
function armarRuta(
  grafo: Grafo,
  origenId: string,
  destinoId: string,
  opciones: OpcionesRuta,
): ResultadoRuta {
  const { nodos, conexiones } = grafo;
  const ruta = buscarRuta(nodos, conexiones, origenId, destinoId, opciones);

  if (!ruta) {
    const motivo = explicarSinRuta(nodos, conexiones, origenId, destinoId, opciones);
    return { ok: false, motivo, mensaje: MENSAJES_SIN_RUTA[motivo] };
  }
  return armarPasos(grafo, ruta);
}

// Convierte la ruta de Dijkstra en los pasos que muestra la interfaz.
function armarPasos({ edificios }: Grafo, ruta: PasoRuta[]): ResultadoRuta {
  const nombreEdificio = new Map(edificios.map((e) => [e.id, e.nombre]));
  const pasos = ruta.map((paso, indice): PasoRutaDetallado => {
    const nodo = paso.nodo as FilaNodo;
    const anterior = indice > 0 ? (ruta[indice - 1].nodo as FilaNodo) : null;
    return {
      id: nodo.id,
      nombre: nodo.nombre,
      tipo: nodo.tipo,
      piso: nodo.piso,
      edificioId: nodo.edificio_id,
      edificioNombre: nodo.edificio_id ? (nombreEdificio.get(nodo.edificio_id) ?? null) : null,
      lat: nodo.lat,
      lng: nodo.lng,
      descripcion: nodo.descripcion,
      fotoPath: nodo.foto_path,
      costoAcumulado: paso.costoAcumulado,
      cambioPiso: anterior ? detectarCambioPiso(anterior, nodo) : null,
    };
  });

  return { ok: true, pasos, costoTotal: ruta[ruta.length - 1].costoAcumulado };
}

// No se exporta: solo se llega aquí después de validar sesión o token.
async function calcularRutaSinValidar(
  origenId: string,
  destinoId: string,
  opciones: OpcionesRuta,
): Promise<ResultadoRuta> {
  const grafo = await cargarGrafo();
  return grafo ? armarRuta(grafo, origenId, destinoId, opciones) : ERROR_GRAFO;
}

function leerOpciones(opciones?: OpcionesRuta): OpcionesRuta {
  return {
    evitarEscaleras: opciones?.evitarEscaleras === true,
    evitarElevadores: opciones?.evitarElevadores === true,
  };
}

// Ruta entre dos nodos cualesquiera, para usuarios con sesión (alumno, guardia,
// administrador). La usa la vista del alumno (/usuario/dashboard).
export async function calcularRuta(
  origenId: string,
  destinoId: string,
  opciones?: OpcionesRuta,
): Promise<ResultadoRuta> {
  const sesion = await obtenerSesionConPerfil();
  if (!sesion) {
    return { ok: false, motivo: "no_autorizado", mensaje: "Inicia sesión para calcular rutas." };
  }
  if (!UUID_RE.test(origenId) || !UUID_RE.test(destinoId)) {
    return { ok: false, motivo: "origen_inexistente", mensaje: "Origen o destino inválido." };
  }
  return calcularRutaSinValidar(origenId, destinoId, leerOpciones(opciones));
}

type VisitaConNodos = {
  estado: string;
  origen_nodo_id: string | null;
  destino_nodo_id: string | null;
};

// Ruta fija de una visita, identificada solo por el token del QR.
export async function calcularRutaDeVisita(
  token: string,
  opciones?: OpcionesRuta,
): Promise<ResultadoRuta> {
  const noAutorizado: ResultadoRuta = {
    ok: false,
    motivo: "no_autorizado",
    mensaje: "El acceso no es válido o ya expiró.",
  };
  if (typeof token !== "string" || !token || token.length > 200) return noAutorizado;

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("obtener_visita_por_token", {
    p_token_hash: tokenHash,
  });
  if (error) {
    console.error("[rutas] No se pudo validar la visita:", error.message);
    return {
      ok: false,
      motivo: "error_servidor",
      mensaje: "No pudimos validar tu visita. Intenta de nuevo en un momento.",
    };
  }

  const visita = (data as VisitaConNodos[] | null)?.[0];
  if (!visita || visita.estado !== "activo") return noAutorizado;

  if (!visita.origen_nodo_id || !visita.destino_nodo_id) {
    return {
      ok: false,
      motivo: "visita_sin_nodos",
      mensaje:
        "Tu visita no tiene una entrada y un destino específicos asignados. Pide indicaciones en recepción.",
    };
  }

  return calcularRutaSinValidar(
    visita.origen_nodo_id,
    visita.destino_nodo_id,
    leerOpciones(opciones),
  );
}

const MENSAJES_UBICACION: Record<MotivoUbicacion, string> = {
  ubicacion_invalida: "No pudimos leer tu ubicación.",
  ubicacion_imprecisa:
    "Tu ubicación es imprecisa (más de 50 m). Elige tu punto de partida de la lista.",
  fuera_del_campus: "Parece que no estás en el campus. Elige tu punto de partida de la lista.",
  sin_candidatos:
    "Todavía no hay puntos del mapa cerca de tu ubicación. Elige tu punto de partida de la lista.",
  ya_en_destino: "Ya estás junto a tu destino.",
};

function sinRutaPorUbicacion(motivo: MotivoUbicacion): ResultadoRuta {
  return { ok: false, motivo, mensaje: MENSAJES_UBICACION[motivo] };
}

// Ruta desde la ubicación GPS del alumno hasta un destino. Parte del nodo
// conectado más cercano del piso en que el alumno dice estar (el GPS no detecta
// pisos; sin `piso` se usa el 1).
export async function calcularRutaDesdeUbicacion(
  posicion: unknown,
  destinoId: string,
  opciones?: OpcionesRuta,
  piso?: number,
): Promise<ResultadoRuta> {
  const sesion = await obtenerSesionConPerfil();
  if (!sesion) {
    return { ok: false, motivo: "no_autorizado", mensaje: "Inicia sesión para calcular rutas." };
  }
  const valida = validarPosicion(posicion);
  if (!valida) return sinRutaPorUbicacion("ubicacion_invalida");
  if (typeof destinoId !== "string" || !UUID_RE.test(destinoId)) {
    return { ok: false, motivo: "destino_inexistente", mensaje: "Destino inválido." };
  }

  // El piso llega del navegador: solo se aceptan pisos con plano.
  const pisoLeido = piso === undefined ? PISO_GPS : piso;
  if (typeof pisoLeido !== "number" || !pisoRegistrado(pisoLeido)) {
    return { ok: false, motivo: "origen_inexistente", mensaje: "Piso inválido." };
  }

  const grafo = await cargarGrafo();
  if (!grafo) return ERROR_GRAFO;

  const opcionesLeidas = leerOpciones(opciones);
  const cercano = nodoMasCercano(valida, grafo.nodos, grafo.conexiones, opcionesLeidas, pisoLeido);
  if (!cercano.ok) return sinRutaPorUbicacion(cercano.motivo);
  if (cercano.nodo.id === destinoId) return sinRutaPorUbicacion("ya_en_destino");

  const resultado = armarRuta(grafo, cercano.nodo.id, destinoId, opcionesLeidas);
  if (!resultado.ok) return resultado;
  return {
    ...resultado,
    origen: {
      id: cercano.nodo.id,
      nombre: cercano.nodo.nombre,
      distanciaMetros: cercano.distanciaMetros,
    },
  };
}

// Desde dónde se pide la ruta de evacuación: un nodo de la lista o la ubicación GPS
// en el piso que indicó el alumno.
export type OrigenEvacuacion =
  | { tipo: "nodo"; id: string }
  | { tipo: "ubicacion"; posicion: PosicionUsuario; piso: number };

// Ruta al punto de reunión más cercano. Nunca usa elevadores; las escaleras sí
// (en una evacuación son la vía). Requiere sesión, como calcularRuta.
export async function calcularRutaEvacuacion(origen: unknown): Promise<ResultadoRuta> {
  const sesion = await obtenerSesionConPerfil();
  if (!sesion) {
    return { ok: false, motivo: "no_autorizado", mensaje: "Inicia sesión para calcular rutas." };
  }
  if (typeof origen !== "object" || origen === null) {
    return { ok: false, motivo: "origen_inexistente", mensaje: "Punto de partida inválido." };
  }
  const entrada = origen as Record<string, unknown>;
  const opciones: OpcionesRuta = { evitarElevadores: true };

  const grafo = await cargarGrafo();
  if (!grafo) return ERROR_GRAFO;
  if (!grafo.nodos.some((n) => n.evacuacion === "punto_reunion")) {
    return {
      ok: false,
      motivo: "sin_puntos_reunion",
      mensaje: "Aún no hay puntos de reunión registrados. Sigue la señalización y las indicaciones del personal.",
    };
  }

  let origenId: string;
  let desdeUbicacion: OrigenUbicacion | undefined;
  if (entrada.tipo === "nodo") {
    if (typeof entrada.id !== "string" || !UUID_RE.test(entrada.id)) {
      return { ok: false, motivo: "origen_inexistente", mensaje: "Punto de partida inválido." };
    }
    origenId = entrada.id;
  } else if (entrada.tipo === "ubicacion") {
    const posicion = validarPosicion(entrada.posicion);
    if (!posicion) return sinRutaPorUbicacion("ubicacion_invalida");
    const piso = entrada.piso;
    if (typeof piso !== "number" || !pisoRegistrado(piso)) {
      return { ok: false, motivo: "origen_inexistente", mensaje: "Piso inválido." };
    }
    const cercano = nodoMasCercano(posicion, grafo.nodos, grafo.conexiones, opciones, piso);
    if (!cercano.ok) return sinRutaPorUbicacion(cercano.motivo);
    origenId = cercano.nodo.id;
    desdeUbicacion = { id: cercano.nodo.id, nombre: cercano.nodo.nombre, distanciaMetros: cercano.distanciaMetros };
  } else {
    return { ok: false, motivo: "origen_inexistente", mensaje: "Punto de partida inválido." };
  }

  const ruta = rutaAlPuntoMasCercano(grafo.nodos, grafo.conexiones, origenId, opciones);
  if (!ruta) {
    return {
      ok: false,
      motivo: "sin_ruta_evacuacion",
      mensaje:
        "No encontramos un camino trazado hasta un punto de reunión desde aquí. Sigue la señalización de salida y las indicaciones del personal.",
    };
  }
  const resultado = armarPasos(grafo, ruta);
  return resultado.ok && desdeUbicacion ? { ...resultado, origen: desdeUbicacion } : resultado;
}

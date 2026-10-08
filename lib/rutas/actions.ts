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

import { createHash } from "node:crypto";
import { obtenerSesionConPerfil } from "@/utils/auth";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";
import {
  buscarRuta,
  explicarSinRuta,
  type ConexionGrafo,
  type MotivoSinRuta,
  type NodoGrafo,
  type OpcionesRuta,
} from "./dijkstra";

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
  costoAcumulado: number;
  cambioPiso: CambioPiso | null;
};

export type ResultadoRuta =
  | { ok: true; pasos: PasoRutaDetallado[]; costoTotal: number }
  | {
      ok: false;
      motivo: MotivoSinRuta | "no_autorizado" | "visita_sin_nodos" | "error_servidor";
      mensaje: string;
    };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// PostgREST corta cada respuesta en 1000 filas por defecto; se pide por páginas
// para no truncar el grafo en silencio si llega a crecer.
const TAMANO_PAGINA = 1000;

type FilaNodo = NodoGrafo & { nombre: string };
type FilaEdificio = { id: string; nombre: string };

async function leerTodo<T>(
  consulta: (
    desde: number,
    hasta: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const filas: T[] = [];
  for (let desde = 0; ; desde += TAMANO_PAGINA) {
    const { data, error } = await consulta(desde, desde + TAMANO_PAGINA - 1);
    if (error) throw new Error(error.message);
    filas.push(...(data ?? []));
    if (!data || data.length < TAMANO_PAGINA) return filas;
  }
}

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

// No se exporta: solo se llega aquí después de validar sesión o token.
async function calcularRutaSinValidar(
  origenId: string,
  destinoId: string,
  opciones: OpcionesRuta,
): Promise<ResultadoRuta> {
  let nodos: FilaNodo[];
  let conexiones: ConexionGrafo[];
  let edificios: FilaEdificio[];

  try {
    const supabase = createServiceClient();
    [nodos, conexiones, edificios] = await Promise.all([
      leerTodo<FilaNodo>((desde, hasta) =>
        supabase
          .from("nodos")
          .select("id, nombre, tipo, piso, edificio_id, lat, lng")
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
  } catch (error) {
    console.error("[rutas] No se pudo cargar el grafo:", error);
    return {
      ok: false,
      motivo: "error_servidor",
      mensaje: "No pudimos cargar el mapa del campus. Intenta de nuevo en un momento.",
    };
  }

  const ruta = buscarRuta(nodos, conexiones, origenId, destinoId, opciones);

  if (!ruta) {
    const motivo = explicarSinRuta(nodos, conexiones, origenId, destinoId, opciones);
    return { ok: false, motivo, mensaje: MENSAJES_SIN_RUTA[motivo] };
  }

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
      costoAcumulado: paso.costoAcumulado,
      cambioPiso: anterior ? detectarCambioPiso(anterior, nodo) : null,
    };
  });

  return { ok: true, pasos, costoTotal: ruta[ruta.length - 1].costoAcumulado };
}

function leerOpciones(opciones?: OpcionesRuta): OpcionesRuta {
  return { evitarEscaleras: opciones?.evitarEscaleras === true };
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

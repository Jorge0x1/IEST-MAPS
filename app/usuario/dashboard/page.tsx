import { urlFotoDestino } from "@/lib/fotos";
import { marcadoresDeFilas, type FilaMarcador } from "@/lib/marcadores";
import { leerTodo } from "@/lib/leer-todo";
import { createClient } from "@/utils/supabase/server";
import { requerirRol } from "@/utils/auth";
import { Navegador, type DestinoAlumno, type EntradaAlumno } from "./navegador";

// El layout ya exige rol "alumno". Aquí solo se carga, una vez, el catálogo
// de destinos buscables y las entradas; la búsqueda se hace en el navegador
// (ver lib/busqueda.ts) y la ruta con la Server Action calcularRuta().
// RLS: los usuarios activos pueden leer nodos y edificios.

type FilaNodo = {
  id: string;
  nombre: string;
  tipo: string;
  piso: number;
  nombres_alternativos: string[] | null;
  edificio_id: string | null;
  descripcion: string | null;
  foto_path: string | null;
};

// Supabase corta cada consulta en 1000 filas aunque se pida un rango mayor,
// así que se lee por páginas con leerTodo. Un campus tiene cientos de destinos;
// si algún día fueran miles, la búsqueda debería pasar al servidor (RPC con el
// índice trigram de nodos.nombre) en vez de mandarlos todos al navegador.

export default async function UsuarioDashboardPage() {
  // Misma sesión que valida el layout (obtenerSesionConPerfil usa cache por petición).
  const { profile } = await requerirRol("alumno");
  const supabase = await createClient();
  const columnas = "id, nombre, tipo, piso, nombres_alternativos, edificio_id, descripcion, foto_path";

  // Si falla, leerTodo lanza; se convierte en el Error para mostrar el aviso.
  const alFallar = (causa: unknown) => (causa instanceof Error ? causa : new Error(String(causa)));
  const [destinosLeidos, entradasLeidas, edificiosRes, marcadoresRes] = await Promise.all([
    leerTodo<FilaNodo>((desde, hasta) =>
      supabase.from("nodos").select(columnas).eq("buscable", true).order("nombre").order("id").range(desde, hasta),
    ).catch(alFallar),
    leerTodo<FilaNodo>((desde, hasta) =>
      supabase.from("nodos").select(columnas).eq("tipo", "entrada").order("nombre").order("id").range(desde, hasta),
    ).catch(alFallar),
    supabase.from("edificios").select("id, nombre"),
    supabase.rpc("marcadores_mapa"),
  ]);
  // Los iconos son un extra: si fallan (p. ej. falta la migración 0011), el mapa sigue sin ellos.
  if (marcadoresRes.error) console.error("[alumno] No se pudieron cargar los iconos del mapa:", marcadoresRes.error.message);
  const marcadores = marcadoresRes.error ? [] : marcadoresDeFilas(marcadoresRes.data as FilaMarcador[] | null);

  const error =
    (destinosLeidos instanceof Error ? destinosLeidos : null) ??
    (entradasLeidas instanceof Error ? entradasLeidas : null) ??
    edificiosRes.error;
  if (error || destinosLeidos instanceof Error || entradasLeidas instanceof Error) {
    console.error("[alumno] No se pudo cargar el catálogo:", error);
    return (
      <main className="mx-auto max-w-2xl px-5 py-10">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <p className="font-medium text-amber-900">No pudimos cargar los destinos del campus</p>
          <p className="mt-1 text-sm text-amber-800">Recarga la página en un momento.</p>
        </div>
      </main>
    );
  }

  const nombreEdificio = new Map((edificiosRes.data ?? []).map((e) => [e.id as string, e.nombre as string]));
  const edificioDe = (fila: FilaNodo) => (fila.edificio_id ? (nombreEdificio.get(fila.edificio_id) ?? null) : null);

  const destinos: DestinoAlumno[] = destinosLeidos.map((fila) => ({
    id: fila.id,
    nombre: fila.nombre,
    alias: fila.nombres_alternativos ?? [],
    tipo: fila.tipo,
    piso: fila.piso,
    edificioNombre: edificioDe(fila),
    descripcion: fila.descripcion,
    fotoUrl: urlFotoDestino(fila.foto_path),
  }));

  const entradas: EntradaAlumno[] = entradasLeidas.map((fila) => ({
    id: fila.id,
    nombre: fila.nombre,
    edificioNombre: edificioDe(fila),
  }));

  return <Navegador destinos={destinos} entradas={entradas} marcadores={marcadores} nombreUsuario={profile.nombre ?? profile.correo ?? "Usuario"} />;
}

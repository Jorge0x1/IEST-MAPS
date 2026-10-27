import { urlFotoDestino } from "@/lib/fotos";
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

// Cota explícita para no depender del límite por defecto de PostgREST. Un
// campus tiene cientos de destinos; si algún día se acerca a esto, la búsqueda
// debe pasar al servidor (RPC con el índice trigram de nodos.nombre).
const MAX_NODOS = 2000;

export default async function UsuarioDashboardPage() {
  // Misma sesión que valida el layout (obtenerSesionConPerfil usa cache por petición).
  const { profile } = await requerirRol("alumno");
  const supabase = await createClient();
  const columnas = "id, nombre, tipo, piso, nombres_alternativos, edificio_id, descripcion, foto_path";

  const [destinosRes, entradasRes, edificiosRes] = await Promise.all([
    supabase.from("nodos").select(columnas).eq("buscable", true).order("nombre").range(0, MAX_NODOS - 1),
    supabase.from("nodos").select(columnas).eq("tipo", "entrada").order("nombre").range(0, MAX_NODOS - 1),
    supabase.from("edificios").select("id, nombre"),
  ]);

  const error = destinosRes.error ?? entradasRes.error ?? edificiosRes.error;
  if (error) {
    console.error("[alumno] No se pudo cargar el catálogo:", error.message);
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

  const destinos: DestinoAlumno[] = ((destinosRes.data ?? []) as FilaNodo[]).map((fila) => ({
    id: fila.id,
    nombre: fila.nombre,
    alias: fila.nombres_alternativos ?? [],
    tipo: fila.tipo,
    piso: fila.piso,
    edificioNombre: edificioDe(fila),
    descripcion: fila.descripcion,
    fotoUrl: urlFotoDestino(fila.foto_path),
  }));

  const entradas: EntradaAlumno[] = ((entradasRes.data ?? []) as FilaNodo[]).map((fila) => ({
    id: fila.id,
    nombre: fila.nombre,
    edificioNombre: edificioDe(fila),
  }));

  return <Navegador destinos={destinos} entradas={entradas} nombreUsuario={profile.nombre ?? profile.correo ?? "Usuario"} />;
}

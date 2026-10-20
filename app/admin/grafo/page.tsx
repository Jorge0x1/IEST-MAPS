import { requerirRol } from "@/utils/auth";
import { createClient } from "@/utils/supabase/server";
import { GrafoExplorador, type ConexionGrafoAdmin, type NodoGrafoAdmin } from "./grafo-explorador";
import styles from "./grafo.module.css";

// Vista de solo lectura del grafo completo: diagnóstico de problemas, mapa y
// prueba de rutas. Para editar se usan Destinos, Conexiones y el trazador.

// Cota explícita para no depender del límite por defecto de PostgREST.
const MAX_FILAS = 5000;

export default async function GrafoPage() {
  await requerirRol("administrador");
  const supabase = await createClient();

  const [nodosRes, conexionesRes, edificiosRes] = await Promise.all([
    supabase
      .from("nodos")
      .select("id, nombre, tipo, piso, lat, lng, buscable, edificio_id")
      .order("nombre")
      .range(0, MAX_FILAS - 1),
    supabase
      .from("conexiones")
      .select("id, nodo_origen_id, nodo_destino_id, bidireccional")
      .range(0, MAX_FILAS - 1),
    supabase.from("edificios").select("id, nombre"),
  ]);

  const error = nodosRes.error ?? conexionesRes.error ?? edificiosRes.error;
  if (error) console.error("[grafo] No se pudo cargar el grafo:", error.message);

  const nombreEdificio = new Map((edificiosRes.data ?? []).map((e) => [e.id as string, e.nombre as string]));
  const nodos: NodoGrafoAdmin[] = (nodosRes.data ?? []).map((n) => ({
    id: n.id,
    nombre: n.nombre,
    tipo: n.tipo,
    piso: n.piso,
    lat: n.lat,
    lng: n.lng,
    buscable: n.buscable,
    edificioNombre: n.edificio_id ? (nombreEdificio.get(n.edificio_id) ?? null) : null,
  }));
  const conexiones = (conexionesRes.data ?? []) as ConexionGrafoAdmin[];
  const truncado = nodos.length >= MAX_FILAS || conexiones.length >= MAX_FILAS;

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerCopy}>
          <p className={styles.eyebrow}>
            <span className={styles.eyebrowNode} aria-hidden="true" />
            Grafo del campus
          </p>
          <h1 className={styles.pageTitle}>Mapa del grafo</h1>
          <p className={styles.pageDescription}>
            Revisa todos los nodos y conexiones sobre el mapa, encuentra lo que quedó suelto y prueba rutas entre
            cualquier par de puntos.
          </p>
        </div>
        <span className={styles.headerIcon} aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5L9 4Z" />
            <path d="M9 4v13.5M15 6.5V20" />
          </svg>
        </span>
      </header>

      {error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900" role="alert">
          No se pudo cargar el grafo. Verifica la conexión con Supabase y recarga la página.
        </div>
      ) : (
        <>
          {truncado ? (
            <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              Se muestran solo los primeros {MAX_FILAS} registros; el grafo puede verse incompleto.
            </p>
          ) : null}
          <GrafoExplorador nodos={nodos} conexiones={conexiones} />
        </>
      )}
    </main>
  );
}

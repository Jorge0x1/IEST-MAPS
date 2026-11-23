import { requerirRol } from "@/utils/auth";
import { createClient } from "@/utils/supabase/server";
import { leerTodo } from "@/lib/leer-todo";
import { GrafoExplorador, type ConexionGrafoAdmin, type NodoGrafoAdmin } from "./grafo-explorador";
import styles from "./grafo.module.css";

// Vista del grafo completo: diagnóstico de problemas, mapa y
// prueba de rutas. El modo "Conectar" crea y borra conexiones aquí mismo;
// nodos nuevos se siguen creando en Destinos y con el trazador.

type FilaNodo = Omit<NodoGrafoAdmin, "edificioNombre"> & { edificio_id: string | null };
type FilaEdificio = { id: string; nombre: string };

export default async function GrafoPage() {
  await requerirRol("administrador");
  const supabase = await createClient();

  // Se lee todo por páginas: Supabase corta cada consulta en 1000 filas aunque
  // se pida un rango mayor, y el grafo se vería incompleto sin avisar.
  let filasNodos: FilaNodo[] = [];
  let conexiones: ConexionGrafoAdmin[] = [];
  let filasEdificios: FilaEdificio[] = [];
  let error: unknown = null;
  try {
    [filasNodos, conexiones, filasEdificios] = await Promise.all([
      leerTodo<FilaNodo>((desde, hasta) =>
        supabase
          .from("nodos")
          .select("id, nombre, tipo, piso, lat, lng, buscable, edificio_id")
          .order("nombre")
          .order("id")
          .range(desde, hasta),
      ),
      leerTodo<ConexionGrafoAdmin>((desde, hasta) =>
        supabase
          .from("conexiones")
          .select("id, nodo_origen_id, nodo_destino_id, bidireccional")
          .order("id")
          .range(desde, hasta),
      ),
      leerTodo<FilaEdificio>((desde, hasta) =>
        supabase.from("edificios").select("id, nombre").order("id").range(desde, hasta),
      ),
    ]);
  } catch (causa) {
    error = causa;
    console.error("[grafo] No se pudo cargar el grafo:", causa);
  }

  const nombreEdificio = new Map(filasEdificios.map((e) => [e.id, e.nombre]));
  const nodos: NodoGrafoAdmin[] = filasNodos.map((n) => ({
    id: n.id,
    nombre: n.nombre,
    tipo: n.tipo,
    piso: n.piso,
    lat: n.lat,
    lng: n.lng,
    buscable: n.buscable,
    edificioNombre: n.edificio_id ? (nombreEdificio.get(n.edificio_id) ?? null) : null,
  }));

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
        <GrafoExplorador nodos={nodos} conexiones={conexiones} />
      )}
    </main>
  );
}

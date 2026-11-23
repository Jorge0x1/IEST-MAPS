import { ConnectionForm, type NodoOpcion } from "./connection-form";
import { ListaConexiones, type ConexionListada } from "./lista-conexiones";
import styles from "./conexiones.module.css";
import { StatCard } from "../components/admin-ui";
import { leerTodo } from "@/lib/leer-todo";
import { requerirRol } from "@/utils/auth";
import { createClient } from "@/utils/supabase/server";

export default async function ConexionesPage() {
  await requerirRol("administrador");
  const supabase = await createClient();

  // Se lee todo por páginas: con más de 1000 filas Supabase cortaría la lista
  // en silencio.
  let nodos: NodoOpcion[] = [];
  let conexiones: ConexionListada[] = [];
  let error = false;
  try {
    [nodos, conexiones] = await Promise.all([
      leerTodo<NodoOpcion>((desde, hasta) =>
        supabase
          .from("nodos")
          .select("id, nombre, tipo, piso, lat, lng, edificio_id, edificios(nombre)")
          .order("piso")
          .order("nombre")
          .order("id")
          .range(desde, hasta),
      ),
      leerTodo<ConexionListada>((desde, hasta) =>
        supabase
          .from("conexiones")
          .select(
            "id, costo, bidireccional, origen:nodos!nodo_origen_id(nombre, piso, edificios(nombre)), destino:nodos!nodo_destino_id(nombre, piso, edificios(nombre))",
          )
          .order("created_at", { ascending: false })
          .order("id")
          .range(desde, hasta),
      ),
    ]);
  } catch (causa) {
    console.error("[conexiones] No se pudo cargar el catálogo:", causa);
    error = true;
  }

  const entrePisos = conexiones.filter((c) => c.origen && c.destino && c.origen.piso !== c.destino.piso).length;

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerCopy}>
          <p className={styles.eyebrow}>
            <span className={styles.eyebrowNode} aria-hidden="true" />
            Grafo del campus
          </p>
          <h1 className={styles.pageTitle}>Conexiones entre nodos</h1>
          <p className={styles.pageDescription}>
            Define las aristas del grafo. Une escaleras o elevadores con un nodo de otro piso para representar los
            cambios de nivel.
          </p>
        </div>

        <span className={styles.headerIcon} aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <circle cx="5" cy="12" r="2.5" />
            <circle cx="19" cy="6" r="2.5" />
            <circle cx="19" cy="18" r="2.5" />
            <path d="m7.4 11 9.2-4M7.4 13l9.2 4" />
          </svg>
        </span>

        <div className={styles.headerNetwork} aria-hidden="true">
          <span className={styles.headerNetworkLine} />
          <span className={styles.headerNetworkNodeStart} />
          <span className={styles.headerNetworkNodeMiddle} />
          <span className={styles.headerNetworkNodeEnd} />
        </div>
      </header>

      <section aria-label="Resumen de conexiones" className={styles.statsGrid}>
        <StatCard label="Conexiones" value={conexiones.length} tone="brand" />
        <StatCard label="Entre pisos distintos" value={entrePisos} tone="warning" />
        <StatCard label="Nodos disponibles" value={nodos.length} tone="info" />
      </section>

      <div className={styles.managementLayout}>
        <section className={`${styles.panel} ${styles.createPanel}`} aria-labelledby="nueva-conexion-title">
          <div className={styles.panelHeader}>
            <div className={styles.panelHeading}>
              <p className={styles.panelKicker}>Nueva arista</p>
              <h2 id="nueva-conexion-title" className={styles.panelTitle}>Nueva conexión</h2>
              <p className={styles.panelDescription}>
                {nodos.length < 2
                  ? "Registra al menos dos nodos desde Destinos y nodos."
                  : "Selecciona los dos nodos que se conectan."}
              </p>
            </div>
          </div>
          <div className={styles.panelBody}>
            <ConnectionForm nodos={nodos} />
          </div>
        </section>

        <section className={`${styles.panel} ${styles.directoryPanel}`} aria-labelledby="directorio-conexiones-title">
          <ListaConexiones conexiones={conexiones} error={error} />
        </section>
      </div>
    </main>
  );
}

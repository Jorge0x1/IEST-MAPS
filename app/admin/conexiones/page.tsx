import { ConnectionForm, type NodoOpcion } from "./connection-form";
import { DeleteConnectionButton } from "./delete-connection-button";
import styles from "./conexiones.module.css";
import { StatCard, StatusBadge } from "../components/admin-ui";
import { requerirRol } from "@/utils/auth";
import { createClient } from "@/utils/supabase/server";

type NodoResumen = { nombre: string; piso: number; edificios: { nombre: string } | null };
type Conexion = {
  id: string;
  costo: number | null;
  bidireccional: boolean;
  origen: NodoResumen | null;
  destino: NodoResumen | null;
};

function etiquetaNodo(nodo: NodoResumen | null) {
  if (!nodo) return "Nodo no disponible";
  return `${nodo.nombre} · ${nodo.edificios?.nombre ?? "Sin edificio"} · Piso ${nodo.piso}`;
}

export default async function ConexionesPage() {
  await requerirRol("administrador");
  const supabase = await createClient();
  const [nodosResult, conexionesResult] = await Promise.all([
    supabase
      .from("nodos")
      .select("id, nombre, tipo, piso, edificio_id, edificios(nombre)")
      .order("piso")
      .order("nombre"),
    supabase
      .from("conexiones")
      .select(
        "id, costo, bidireccional, origen:nodos!nodo_origen_id(nombre, piso, edificios(nombre)), destino:nodos!nodo_destino_id(nombre, piso, edificios(nombre))",
      )
      .order("created_at", { ascending: false }),
  ]);

  const nodos = (nodosResult.data ?? []) as unknown as NodoOpcion[];
  const conexiones = (conexionesResult.data ?? []) as unknown as Conexion[];
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
          <div className={styles.panelHeader}>
            <div className={styles.panelHeading}>
              <p className={styles.panelKicker}>Red de navegación</p>
              <h2 id="directorio-conexiones-title" className={styles.panelTitle}>Conexiones registradas</h2>
              <p className={styles.panelDescription}>{conexiones.length} en total</p>
            </div>
          </div>

          {conexionesResult.error || nodosResult.error ? (
            <div className={styles.feedback} role="alert">
              No se pudo cargar el catálogo. Aplica la migración 0006 y verifica la conexión con Supabase.
            </div>
          ) : conexiones.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyConnection} aria-hidden="true">
                <span />
                <span />
              </div>
              <p className={styles.emptyTitle}>No hay conexiones todavía</p>
              <p className={styles.emptyDescription}>Crea la primera para empezar a armar el grafo.</p>
            </div>
          ) : (
            <div className={styles.connectionList}>
              {conexiones.map((conexion) => (
                <article key={conexion.id} className={styles.connectionCard}>
                  <div className={styles.connectionCardHeader}>
                    <div className={styles.connectionBadges}>
                      <StatusBadge tone={conexion.bidireccional ? "success" : "warning"}>
                        {conexion.bidireccional ? "Bidireccional" : "Un solo sentido"}
                      </StatusBadge>
                      {conexion.costo !== null ? (
                        <span className={styles.costBadge}>Costo {conexion.costo}</span>
                      ) : null}
                    </div>
                    <DeleteConnectionButton conexionId={conexion.id} />
                  </div>

                  <div className={styles.connectionRoute}>
                    <div className={styles.nodeSummary}>
                      <span className={styles.nodeRole}>Origen</span>
                      <p>{etiquetaNodo(conexion.origen)}</p>
                    </div>

                    <div className={styles.directionIndicator}>
                      <svg viewBox="0 0 48 18" aria-hidden="true">
                        <circle cx="5" cy="9" r="3" />
                        <path d="M9 9h29" />
                        {conexion.bidireccional ? <path d="m14 4-5 5 5 5M34 4l5 5-5 5" /> : <path d="m34 4 5 5-5 5" />}
                        <circle cx="43" cy="9" r="3" />
                      </svg>
                      <span>{conexion.bidireccional ? "Ambos sentidos" : "Origen a destino"}</span>
                    </div>

                    <div className={styles.nodeSummary}>
                      <span className={styles.nodeRole}>Destino</span>
                      <p>{etiquetaNodo(conexion.destino)}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

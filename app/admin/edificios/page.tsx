import { BuildingForm } from "./building-form";
import { DeleteBuildingButton } from "./delete-building-button";
import styles from "./edificios.module.css";
import { StatCard, StatusBadge } from "../components/admin-ui";
import { requerirRol } from "@/utils/auth";
import { createClient } from "@/utils/supabase/server";

type Edificio = {
  id: string;
  nombre: string;
  descripcion: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
};

type NodoEdificio = { edificio_id: string | null };

function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export default async function EdificiosPage({ searchParams }: { searchParams: Promise<{ buscar?: string }> }) {
  await requerirRol("administrador");
  const { buscar = "" } = await searchParams;
  const supabase = await createClient();
  const [edificiosResult, nodosResult] = await Promise.all([
    supabase.from("edificios").select("id, nombre, descripcion, lat, lng, created_at").order("nombre"),
    supabase.from("nodos").select("edificio_id"),
  ]);

  const edificios = (edificiosResult.data ?? []) as Edificio[];
  const nodos = (nodosResult.data ?? []) as NodoEdificio[];
  const conteoNodos = nodos.reduce<Record<string, number>>((conteo, nodo) => {
    if (nodo.edificio_id) conteo[nodo.edificio_id] = (conteo[nodo.edificio_id] ?? 0) + 1;
    return conteo;
  }, {});
  const termino = normalizar(buscar.trim());
  const filtrados = termino
    ? edificios.filter((edificio) => normalizar(`${edificio.nombre} ${edificio.descripcion ?? ""}`).includes(termino))
    : edificios;
  const conCoordenadas = edificios.filter((edificio) => edificio.lat !== null && edificio.lng !== null).length;

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerCopy}>
          <p className={styles.eyebrow}>
            <span className={styles.eyebrowNode} aria-hidden="true" />
            Catálogo del campus
          </p>
          <h1 className={styles.pageTitle}>Edificios</h1>
          <p className={styles.pageDescription}>
            Registra las ubicaciones principales del campus. Después conectaremos cada edificio con sus nodos, pisos y rutas.
          </p>
        </div>

        <span className={styles.headerMarker} aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M4 21V6l9-3v18M13 8h7v13M7.5 8.5h2M7.5 12.5h2M7.5 16.5h2M16 12h1.5M16 16h1.5M2.5 21h19" />
          </svg>
        </span>

        <div className={styles.headerRoute} aria-hidden="true">
          <span />
          <span />
        </div>
      </header>

      <section aria-label="Resumen de edificios" className={styles.statsGrid}>
        <StatCard label="Edificios registrados" value={edificios.length} tone="brand" />
        <StatCard label="Con coordenadas GPS" value={conCoordenadas} tone="success" />
        <StatCard label="Nodos asociados" value={nodos.length} tone="info" />
      </section>

      <div className={styles.managementLayout}>
        <section className={`${styles.panel} ${styles.createPanel}`} aria-labelledby="nuevo-edificio-title">
          <div className={styles.panelHeader}>
            <div className={styles.panelHeading}>
              <p className={styles.panelKicker}>Alta geográfica</p>
              <h2 id="nuevo-edificio-title" className={styles.panelTitle}>Nuevo edificio</h2>
              <p className={styles.panelDescription}>
                Puedes agregar las coordenadas ahora o completarlas después.
              </p>
            </div>
          </div>
          <div className={styles.panelBody}>
            <BuildingForm />
          </div>
        </section>

        <section className={`${styles.panel} ${styles.directoryPanel}`} aria-labelledby="directorio-edificios-title">
          <div className={`${styles.panelHeader} ${styles.directoryHeader}`}>
            <div className={styles.panelHeading}>
              <p className={styles.panelKicker}>Inventario del campus</p>
              <h2 id="directorio-edificios-title" className={styles.panelTitle}>Directorio de edificios</h2>
              <p className={styles.panelDescription}>{filtrados.length} de {edificios.length} resultados</p>
            </div>

            <form action="/admin/edificios" className={styles.searchForm}>
              <label htmlFor="buscar-edificio" className={styles.srOnly}>Buscar edificio</label>
              <div className={styles.searchControl}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="10.8" cy="10.8" r="6.8" />
                  <path d="m16 16 4 4" />
                </svg>
                <input
                  id="buscar-edificio"
                  type="search"
                  name="buscar"
                  defaultValue={buscar}
                  placeholder="Nombre o descripción"
                  className={`${styles.control} ${styles.searchInput}`}
                />
              </div>
              <button className={styles.primaryButton}>Buscar</button>
            </form>
          </div>

          {edificiosResult.error || nodosResult.error ? (
            <div className={styles.feedback} role="alert">
              No se pudo cargar el catálogo. Verifica la conexión con Supabase.
            </div>
          ) : filtrados.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyNode} aria-hidden="true" />
              <p className={styles.emptyTitle}>No hay edificios para mostrar</p>
              <p className={styles.emptyDescription}>Crea el primero o prueba otra búsqueda.</p>
            </div>
          ) : (
            <div className={styles.buildingList}>
              {filtrados.map((edificio) => {
                const tieneGps = edificio.lat !== null && edificio.lng !== null;
                const numeroNodos = conteoNodos[edificio.id] ?? 0;

                return (
                  <article key={edificio.id} className={styles.buildingCard}>
                    <div className={styles.buildingSummary}>
                      <div className={styles.buildingIdentity}>
                        <div className={styles.buildingTitleRow}>
                          <h3 className={styles.buildingTitle}>{edificio.nombre}</h3>
                          <StatusBadge tone={tieneGps ? "success" : "warning"}>
                            {tieneGps ? "GPS listo" : "Sin coordenadas"}
                          </StatusBadge>
                        </div>
                        <p className={styles.buildingDescription}>{edificio.descripcion || "Sin descripción."}</p>

                        <div className={styles.metadata}>
                          <span className={styles.metaItem}>
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <circle cx="5" cy="12" r="2.5" />
                              <circle cx="19" cy="6" r="2.5" />
                              <circle cx="19" cy="18" r="2.5" />
                              <path d="m7.4 11 9.2-4M7.4 13l9.2 4" />
                            </svg>
                            {numeroNodos} {numeroNodos === 1 ? "nodo" : "nodos"}
                          </span>

                          {tieneGps ? (
                            <a
                              className={styles.coordinateLink}
                              href={`https://www.openstreetmap.org/?mlat=${edificio.lat}&mlon=${edificio.lng}#map=19/${edificio.lat}/${edificio.lng}`}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`Ver coordenadas de ${edificio.nombre} en OpenStreetMap`}
                            >
                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" />
                                <circle cx="12" cy="10" r="2.2" />
                              </svg>
                              <span>{edificio.lat?.toFixed(6)}, {edificio.lng?.toFixed(6)}</span>
                            </a>
                          ) : null}
                        </div>
                      </div>

                      <DeleteBuildingButton edificioId={edificio.id} nombre={edificio.nombre} />
                    </div>

                    <details className={styles.editDetails}>
                      <summary className={styles.editSummary}>
                        <span className={styles.editSummaryLabel}>
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="m14.5 5.5 4 4M4 20l3.8-.8L19 8a2.8 2.8 0 0 0-4-4L3.8 15.2 3 19Z" />
                          </svg>
                          Editar información
                        </span>
                        <svg className={styles.editChevron} viewBox="0 0 24 24" aria-hidden="true">
                          <path d="m7 10 5 5 5-5" />
                        </svg>
                      </summary>
                      <div className={styles.editContent}>
                        <BuildingForm edificio={edificio} />
                      </div>
                    </details>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

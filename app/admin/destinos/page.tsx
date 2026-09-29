import Link from "next/link";
import { DestinationForm, type DestinoInicial, type EdificioOpcion } from "./destination-form";
import { DeleteDestinationButton } from "./delete-destination-button";
import styles from "./destinos.module.css";
import { StatCard, StatusBadge } from "../components/admin-ui";
import { requerirRol } from "@/utils/auth";
import { createClient } from "@/utils/supabase/server";

type Destino = DestinoInicial & { edificios: { nombre: string } | null };

const etiquetasTipo: Record<string, string> = {
  entrada: "Entrada", pasillo: "Pasillo", salon: "Salón", oficina: "Oficina",
  bano: "Baño", escalera: "Escalera", elevador: "Elevador", servicio: "Servicio", edificio: "Edificio",
};

function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export default async function DestinosPage({ searchParams }: { searchParams: Promise<{ buscar?: string; edificio?: string; piso?: string }> }) {
  await requerirRol("administrador");
  const { buscar = "", edificio = "", piso = "" } = await searchParams;
  const supabase = await createClient();
  const [destinosResult, edificiosResult] = await Promise.all([
    supabase.from("nodos").select("id, nombre, tipo, nombres_alternativos, edificio_id, piso, lat, lng, buscable, edificios(nombre)").order("nombre"),
    supabase.from("edificios").select("id, nombre").order("nombre"),
  ]);

  const destinos = (destinosResult.data ?? []) as unknown as Destino[];
  const edificios = (edificiosResult.data ?? []) as EdificioOpcion[];
  const termino = normalizar(buscar.trim());
  const filtrados = destinos.filter((destino) => {
    const coincideTexto = !termino || normalizar(`${destino.nombre} ${destino.nombres_alternativos.join(" ")}`).includes(termino);
    const coincideEdificio = !edificio || destino.edificio_id === edificio;
    const coincidePiso = piso === "" || String(destino.piso) === piso;
    return coincideTexto && coincideEdificio && coincidePiso;
  });
  const pisos = [...new Set(destinos.map((destino) => destino.piso))].sort((a, b) => a - b);

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerCopy}>
          <p className={styles.eyebrow}>
            <span className={styles.eyebrowNode} aria-hidden="true" />
            Grafo del campus
          </p>
          <h1 className={styles.pageTitle}>Destinos y nodos</h1>
          <p className={styles.pageDescription}>
            Administra lugares buscables y puntos auxiliares del recorrido. Las conexiones entre ellos se configurarán en el siguiente módulo.
          </p>
        </div>

        <span className={styles.headerIcon} aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" />
            <circle cx="12" cy="10" r="2.25" />
          </svg>
        </span>

        <div className={styles.headerNetwork} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </header>

      <section aria-label="Resumen de destinos" className={styles.statsGrid}>
        <StatCard label="Nodos registrados" value={destinos.length} tone="brand" />
        <StatCard label="Destinos buscables" value={destinos.filter((destino) => destino.buscable).length} tone="success" />
        <StatCard label="Edificios con nodos" value={new Set(destinos.map((destino) => destino.edificio_id)).size} tone="info" />
      </section>

      <div className={styles.managementLayout}>
        <section className={`${styles.panel} ${styles.createPanel}`} aria-labelledby="nuevo-destino-title">
          <div className={styles.panelHeader}>
            <div className={styles.panelHeading}>
              <p className={styles.panelKicker}>Nuevo punto de navegación</p>
              <h2 id="nuevo-destino-title" className={styles.panelTitle}>Nuevo destino o nodo</h2>
              <p className={styles.panelDescription}>
                {edificios.length ? "Ubícalo dentro de un edificio y piso." : "Primero registra al menos un edificio."}
              </p>
            </div>
          </div>
          <div className={styles.panelBody}>
            <DestinationForm edificios={edificios} />
          </div>
        </section>

        <section className={`${styles.panel} ${styles.catalogPanel}`} aria-labelledby="catalogo-nodos-title">
          <div className={styles.panelHeader}>
            <div className={styles.panelHeading}>
              <p className={styles.panelKicker}>Red del campus</p>
              <h2 id="catalogo-nodos-title" className={styles.panelTitle}>Catálogo de nodos</h2>
              <p className={styles.panelDescription}>{filtrados.length} de {destinos.length} resultados</p>
            </div>
          </div>

          <div className={styles.filterArea}>
            <form action="/admin/destinos" className={styles.filterForm} aria-label="Filtrar catálogo de nodos">
              <label className={styles.field} htmlFor="buscar-destino">
                Buscar
                <input
                  id="buscar-destino"
                  type="search"
                  name="buscar"
                  defaultValue={buscar}
                  placeholder="Nombre o alias"
                  className={styles.control}
                />
              </label>

              <label className={styles.field} htmlFor="filtrar-edificio">
                Edificio
                <select
                  id="filtrar-edificio"
                  name="edificio"
                  defaultValue={edificio}
                  className={styles.control}
                >
                  <option value="">Todos los edificios</option>
                  {edificios.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
                </select>
              </label>

              <label className={styles.field} htmlFor="filtrar-piso">
                Piso
                <select id="filtrar-piso" name="piso" defaultValue={piso} className={styles.control}>
                  <option value="">Pisos</option>
                  {pisos.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>

              <div className={styles.filterAction}>
                <button className={styles.primaryButton}>Filtrar</button>
              </div>
            </form>
          </div>

          {destinosResult.error || edificiosResult.error ? (
            <div className={styles.feedback} role="alert">
              No se pudo cargar el catálogo. Aplica la migración 0004 y verifica la conexión con Supabase.
            </div>
          ) : filtrados.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyNode} aria-hidden="true" />
              <p className={styles.emptyTitle}>No hay nodos para mostrar</p>
              <p className={styles.emptyDescription}>Crea el primero o cambia los filtros.</p>
            </div>
          ) : (
            <div className={styles.catalogList}>
              {filtrados.map((destino) => {
                return (
                  <article key={destino.id} className={styles.nodeCard}>
                    <div className={styles.nodeSummary}>
                      <div className={styles.nodeIdentity}>
                        <div className={styles.nodeTitleRow}>
                          <h3 className={styles.nodeTitle}>{destino.nombre}</h3>
                          <StatusBadge tone="brand">{etiquetasTipo[destino.tipo] ?? destino.tipo}</StatusBadge>
                          <StatusBadge tone={destino.buscable ? "success" : "neutral"}>
                            {destino.buscable ? "Buscable" : "Solo recorrido"}
                          </StatusBadge>
                        </div>

                        <p className={styles.nodeLocation}>
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M4 21V6l9-3v18M13 8h7v13M7.5 9h2M7.5 13h2M16 13h1.5M2.5 21h19" />
                          </svg>
                          <span>{destino.edificios?.nombre ?? "Edificio no disponible"}</span>
                          <span className={styles.floorDivider} aria-hidden="true">·</span>
                          <span>Piso {destino.piso}</span>
                        </p>

                        {destino.nombres_alternativos.length ? (
                          <p className={styles.aliasText}>
                            <span className={styles.aliasLabel}>Alias:</span> {destino.nombres_alternativos.join(", ")}
                          </p>
                        ) : null}

                        <div className={styles.nodeMetadata}>
                          {destino.lat !== null && destino.lng !== null ? (
                            <a
                              className={styles.coordinateLink}
                              href={`https://www.openstreetmap.org/?mlat=${destino.lat}&mlon=${destino.lng}#map=19/${destino.lat}/${destino.lng}`}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`Ver coordenadas de ${destino.nombre} en OpenStreetMap`}
                            >
                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" />
                                <circle cx="12" cy="10" r="2.2" />
                              </svg>
                              <span>{destino.lat.toFixed(6)}, {destino.lng.toFixed(6)}</span>
                            </a>
                          ) : (
                            <span className={styles.noCoordinates}>
                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" />
                                <path d="m8.5 6.5 7 7" />
                              </svg>
                              Sin coordenadas todavía
                            </span>
                          )}
                        </div>
                      </div>

                      <DeleteDestinationButton destinoId={destino.id} nombre={destino.nombre} />
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
                        <DestinationForm edificios={edificios} destino={destino} />
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

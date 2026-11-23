"use client";

// Catálogo de nodos con búsqueda y filtros en el navegador: escribir o cambiar
// un filtro ya no recarga la página ni la regresa hasta arriba. La URL se
// actualiza con replaceState para que un refresh conserve los filtros.
//
// Rendimiento: solo se dibujan las primeras tarjetas ("Mostrar más" para el
// resto) y el formulario de edición, que trae su propio mapa de Leaflet, se
// monta hasta que se abre "Editar información". Antes había un formulario con
// mapa por cada nodo, aunque estuviera cerrado.

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { DestinationForm, type DestinoInicial, type EdificioOpcion } from "./destination-form";
import { DeleteDestinationButton } from "./delete-destination-button";
import { StatusBadge } from "../components/admin-ui";
import styles from "./destinos.module.css";

export type DestinoCatalogo = DestinoInicial & { edificios: { nombre: string } | null };
export type FiltrosCatalogo = { buscar: string; edificio: string; piso: string };

const POR_PAGINA = 40;

const etiquetasTipo: Record<string, string> = {
  entrada: "Entrada", pasillo: "Pasillo", salon: "Salón", oficina: "Oficina",
  bano: "Baño", escalera: "Escalera", elevador: "Elevador", servicio: "Servicio", edificio: "Edificio",
};

/** Evita mostrar solo un número como nombre de edificio o repetir "Edificio". */
function obtenerNombreEdificio(edificioObj: { nombre: string } | null): string {
  if (!edificioObj?.nombre) return "Sin edificio";
  const nombre = edificioObj.nombre.trim();
  if (nombre.toLowerCase().startsWith("edificio")) return nombre;
  return `Edificio ${nombre}`;
}

function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function CatalogoNodos({
  destinos,
  edificios,
  filtrosIniciales,
  error,
}: {
  destinos: DestinoCatalogo[];
  edificios: EdificioOpcion[];
  filtrosIniciales: FiltrosCatalogo;
  error: boolean;
}) {
  const [buscar, setBuscar] = useState(filtrosIniciales.buscar);
  const [edificio, setEdificio] = useState(filtrosIniciales.edificio);
  const [piso, setPiso] = useState(filtrosIniciales.piso);
  const [limite, setLimite] = useState(POR_PAGINA);
  const buscarDiferido = useDeferredValue(buscar);

  const indice = useMemo(
    () =>
      destinos.map((destino) => ({
        destino,
        texto: normalizar(
          [
            destino.nombre,
            destino.tipo,
            etiquetasTipo[destino.tipo] ?? "",
            obtenerNombreEdificio(destino.edificios),
            destino.piso,
            ...destino.nombres_alternativos,
          ].join(" "),
        ),
      })),
    [destinos],
  );
  const pisos = useMemo(() => [...new Set(destinos.map((d) => d.piso))].sort((a, b) => a - b), [destinos]);

  const filtrados = useMemo(() => {
    const termino = normalizar(buscarDiferido.trim());
    return indice
      .filter(
        ({ destino, texto }) =>
          (!termino || texto.includes(termino)) &&
          (!edificio || destino.edificio_id === edificio) &&
          (piso === "" || String(destino.piso) === piso),
      )
      .map(({ destino }) => destino);
  }, [indice, buscarDiferido, edificio, piso]);

  // Refleja los filtros en la URL sin navegar (no hay recarga ni salto de scroll).
  useEffect(() => {
    const params = new URLSearchParams();
    if (buscarDiferido.trim()) params.set("buscar", buscarDiferido.trim());
    if (edificio) params.set("edificio", edificio);
    if (piso) params.set("piso", piso);
    const consulta = params.toString();
    window.history.replaceState(null, "", consulta ? `?${consulta}` : window.location.pathname);
  }, [buscarDiferido, edificio, piso]);

  const visibles = filtrados.slice(0, limite);
  const hayFiltros = buscar !== "" || edificio !== "" || piso !== "";

  function limpiar() {
    setBuscar("");
    setEdificio("");
    setPiso("");
    setLimite(POR_PAGINA);
  }

  return (
    <>
      <div className={styles.panelHeader}>
        <div className={styles.panelHeading}>
          <p className={styles.panelKicker}>Red del campus</p>
          <h2 id="catalogo-nodos-title" className={styles.panelTitle}>Catálogo de nodos</h2>
          <p className={styles.panelDescription}>{filtrados.length} de {destinos.length} resultados</p>
        </div>
      </div>

      <div className={styles.filterArea}>
        <form
          className={styles.filterForm}
          role="search"
          aria-label="Filtrar catálogo de nodos"
          onSubmit={(evento) => evento.preventDefault()}
        >
          <label className={styles.field} htmlFor="buscar-destino">
            Buscar
            <input
              id="buscar-destino"
              type="search"
              value={buscar}
              onChange={(evento) => {
                setBuscar(evento.target.value);
                setLimite(POR_PAGINA);
              }}
              placeholder="Nombre, alias o tipo"
              className={styles.control}
            />
          </label>

          <label className={styles.field} htmlFor="filtrar-edificio">
            Edificio
            <select
              id="filtrar-edificio"
              value={edificio}
              onChange={(evento) => {
                setEdificio(evento.target.value);
                setLimite(POR_PAGINA);
              }}
              className={styles.control}
            >
              <option value="">Todos los edificios</option>
              {edificios.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
            </select>
          </label>

          <label className={styles.field} htmlFor="filtrar-piso">
            Piso
            <select
              id="filtrar-piso"
              value={piso}
              onChange={(evento) => {
                setPiso(evento.target.value);
                setLimite(POR_PAGINA);
              }}
              className={styles.control}
            >
              <option value="">Pisos</option>
              {pisos.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>

          <div className={styles.filterAction}>
            <button type="button" onClick={limpiar} disabled={!hayFiltros} className={styles.secondaryButton}>
              Limpiar
            </button>
          </div>
        </form>
      </div>

      {error ? (
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
          {visibles.map((destino) => (
            <TarjetaNodo key={destino.id} destino={destino} edificios={edificios} />
          ))}
          {filtrados.length > visibles.length ? (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => setLimite((actual) => actual + POR_PAGINA)}
            >
              Mostrar más ({filtrados.length - visibles.length} restantes)
            </button>
          ) : null}
        </div>
      )}
    </>
  );
}

function TarjetaNodo({ destino, edificios }: { destino: DestinoCatalogo; edificios: EdificioOpcion[] }) {
  // El formulario se monta la primera vez que se abre y se queda montado, para
  // no perder lo escrito si se cierra y se vuelve a abrir.
  const [editando, setEditando] = useState(false);

  return (
    <article className={styles.nodeCard}>
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
            <span>{obtenerNombreEdificio(destino.edificios)}</span>
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

      <details
        className={styles.editDetails}
        onToggle={(evento) => {
          if (evento.currentTarget.open) setEditando(true);
        }}
      >
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
          {editando ? <DestinationForm edificios={edificios} destino={destino} /> : null}
        </div>
      </details>
    </article>
  );
}

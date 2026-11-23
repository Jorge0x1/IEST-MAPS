"use client";

// Directorio de conexiones con búsqueda y filtros en el navegador: no recarga
// la página ni regresa el scroll hasta arriba. Solo se dibujan las primeras
// tarjetas y el resto con "Mostrar más", para no montar cientos a la vez.

import { useDeferredValue, useMemo, useState } from "react";
import { DeleteConnectionButton } from "./delete-connection-button";
import { StatusBadge } from "../components/admin-ui";
import styles from "./conexiones.module.css";

type NodoResumen = { nombre: string; piso: number; edificios: { nombre: string } | null };
export type ConexionListada = {
  id: string;
  costo: number | null;
  bidireccional: boolean;
  origen: NodoResumen | null;
  destino: NodoResumen | null;
};

type Tipo = "" | "entre-pisos" | "mismo-piso" | "un-sentido";

const POR_PAGINA = 40;

function etiquetaNodo(nodo: NodoResumen | null) {
  if (!nodo) return "Nodo no disponible";
  return `${nodo.nombre} · ${nodo.edificios?.nombre ?? "Sin edificio"} · Piso ${nodo.piso}`;
}

function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function ListaConexiones({ conexiones, error }: { conexiones: ConexionListada[]; error: boolean }) {
  const [buscar, setBuscar] = useState("");
  const [tipo, setTipo] = useState<Tipo>("");
  const [piso, setPiso] = useState("");
  const [limite, setLimite] = useState(POR_PAGINA);
  const buscarDiferido = useDeferredValue(buscar);

  const indice = useMemo(
    () =>
      conexiones.map((conexion) => ({
        conexion,
        texto: normalizar(`${etiquetaNodo(conexion.origen)} ${etiquetaNodo(conexion.destino)}`),
      })),
    [conexiones],
  );
  const pisos = useMemo(
    () =>
      [...new Set(conexiones.flatMap((c) => [c.origen?.piso, c.destino?.piso]).filter((p) => p !== undefined))].sort(
        (a, b) => a - b,
      ),
    [conexiones],
  );

  const filtradas = useMemo(() => {
    const terminos = normalizar(buscarDiferido.trim()).split(/\s+/).filter(Boolean);
    return indice
      .filter(({ conexion, texto }) => {
        if (terminos.some((t) => !texto.includes(t))) return false;
        const { origen, destino } = conexion;
        if (piso !== "" && String(origen?.piso) !== piso && String(destino?.piso) !== piso) return false;
        if (tipo === "un-sentido") return !conexion.bidireccional;
        if (tipo === "entre-pisos") return Boolean(origen && destino && origen.piso !== destino.piso);
        if (tipo === "mismo-piso") return Boolean(origen && destino && origen.piso === destino.piso);
        return true;
      })
      .map(({ conexion }) => conexion);
  }, [indice, buscarDiferido, tipo, piso]);

  const visibles = filtradas.slice(0, limite);
  const hayFiltros = buscar !== "" || tipo !== "" || piso !== "";

  function limpiar() {
    setBuscar("");
    setTipo("");
    setPiso("");
    setLimite(POR_PAGINA);
  }

  return (
    <>
      <div className={styles.panelHeader}>
        <div className={styles.panelHeading}>
          <p className={styles.panelKicker}>Red de navegación</p>
          <h2 id="directorio-conexiones-title" className={styles.panelTitle}>Conexiones registradas</h2>
          <p className={styles.panelDescription}>
            {hayFiltros ? `${filtradas.length} de ${conexiones.length} conexiones` : `${conexiones.length} en total`}
          </p>
        </div>
      </div>

      {error ? (
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
        <>
          <form
            className={styles.filterBar}
            role="search"
            aria-label="Filtrar conexiones"
            onSubmit={(evento) => evento.preventDefault()}
          >
            <label className={styles.field} htmlFor="buscar-conexion">
              Buscar
              <input
                id="buscar-conexion"
                type="search"
                value={buscar}
                onChange={(evento) => {
                  setBuscar(evento.target.value);
                  setLimite(POR_PAGINA);
                }}
                placeholder="Nodo o edificio de cualquiera de los extremos"
                className={styles.control}
              />
            </label>
            <label className={styles.field} htmlFor="filtrar-tipo-conexion">
              Tipo
              <select
                id="filtrar-tipo-conexion"
                value={tipo}
                onChange={(evento) => {
                  setTipo(evento.target.value as Tipo);
                  setLimite(POR_PAGINA);
                }}
                className={styles.control}
              >
                <option value="">Todas</option>
                <option value="entre-pisos">Entre pisos distintos</option>
                <option value="mismo-piso">Mismo piso</option>
                <option value="un-sentido">Un solo sentido</option>
              </select>
            </label>
            <label className={styles.field} htmlFor="filtrar-piso-conexion">
              Piso
              <select
                id="filtrar-piso-conexion"
                value={piso}
                onChange={(evento) => {
                  setPiso(evento.target.value);
                  setLimite(POR_PAGINA);
                }}
                className={styles.control}
              >
                <option value="">Todos</option>
                {pisos.map((p) => (
                  <option key={p} value={p}>Piso {p}</option>
                ))}
              </select>
            </label>
            <div className={styles.filterBarAction}>
              <button type="button" onClick={limpiar} disabled={!hayFiltros} className={styles.secondaryButton}>
                Limpiar
              </button>
            </div>
          </form>

          {filtradas.length === 0 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyTitle}>Ninguna conexión coincide</p>
              <p className={styles.emptyDescription}>Prueba con otro nombre o quita los filtros.</p>
            </div>
          ) : (
            <div className={styles.connectionList}>
              {visibles.map((conexion) => (
                <article key={conexion.id} className={styles.connectionCard}>
                  <div className={styles.connectionCardHeader}>
                    <div className={styles.connectionBadges}>
                      <StatusBadge tone={conexion.bidireccional ? "success" : "warning"}>
                        {conexion.bidireccional ? "Bidireccional" : "Un solo sentido"}
                      </StatusBadge>
                      {conexion.costo !== null ? <span className={styles.costBadge}>Costo {conexion.costo}</span> : null}
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
              {filtradas.length > visibles.length ? (
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => setLimite((actual) => actual + POR_PAGINA)}
                >
                  Mostrar más ({filtradas.length - visibles.length} restantes)
                </button>
              ) : null}
            </div>
          )}
        </>
      )}
    </>
  );
}

import Link from "next/link";
import { DestinationForm, type EdificioOpcion } from "./destination-form";
import { CatalogoNodos, type DestinoCatalogo } from "./catalogo-nodos";
import styles from "./destinos.module.css";
import { StatCard } from "../components/admin-ui";
import { leerTodo } from "@/lib/leer-todo";
import { requerirRol } from "@/utils/auth";
import { createClient } from "@/utils/supabase/server";

export default async function DestinosPage({ searchParams }: { searchParams: Promise<{ buscar?: string; edificio?: string; piso?: string }> }) {
  await requerirRol("administrador");
  const { buscar = "", edificio = "", piso = "" } = await searchParams;
  const supabase = await createClient();

  // Se lee todo por páginas (Supabase corta en 1000 filas). El filtrado se hace
  // en el navegador, en CatalogoNodos, para no recargar la página al buscar.
  let destinos: DestinoCatalogo[] = [];
  let edificios: EdificioOpcion[] = [];
  let error = false;
  try {
    [destinos, edificios] = await Promise.all([
      leerTodo<DestinoCatalogo>((desde, hasta) =>
        supabase
          .from("nodos")
          .select("id, nombre, tipo, nombres_alternativos, edificio_id, piso, lat, lng, buscable, descripcion, foto_path, icono, logo_path, evacuacion, edificios(nombre)")
          .order("piso")
          .order("nombre")
          .order("id")
          .range(desde, hasta),
      ),
      leerTodo<EdificioOpcion>((desde, hasta) =>
        supabase.from("edificios").select("id, nombre").order("nombre").order("id").range(desde, hasta),
      ),
    ]);
  } catch (causa) {
    console.error("[destinos] No se pudo cargar el catálogo:", causa);
    error = true;
  }

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
            Administra lugares buscables y puntos auxiliares del recorrido. Las conexiones entre ellos se configuran en{" "}
            <Link href="/admin/conexiones" className={styles.inlineLink}>Conexiones</Link>.
          </p>
          <Link href="/admin/destinos/trazar" className={`${styles.primaryButton} ${styles.headerAction}`}>
            Trazar un pasillo →
          </Link>
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
          <CatalogoNodos destinos={destinos} edificios={edificios} filtrosIniciales={{ buscar, edificio, piso }} error={error} />
        </section>
      </div>
    </main>
  );
}

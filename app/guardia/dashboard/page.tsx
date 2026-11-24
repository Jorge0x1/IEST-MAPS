import { finalizarVisita } from "./actions";
import { VisitorForm, type NodoOrigen } from "./visitor-form";
import type { DestinoGuardia } from "./buscador-destino";
import { StatCard, StatusBadge } from "@/app/admin/components/admin-ui";
import { requerirRol } from "@/utils/auth";
import { createClient } from "@/utils/supabase/server";
import { leerTodo } from "@/lib/leer-todo";
import styles from "../guardia.module.css";

type Nodo = {
  id: string;
  nombre: string;
  tipo: string;
  piso: number;
  buscable: boolean;
  nombres_alternativos: string[] | null;
  edificio_id: string | null;
  edificios: { nombre: string } | null;
};

type Edificio = { id: string; nombre: string };

type Visita = {
  id: string;
  nombre: string;
  telefono: string | null;
  motivo: string | null;
  destino_edificio_id: string | null;
  destino_nodo_id: string | null;
  origen_nodo_id: string | null;
  estado: "activo" | "finalizado";
  hora_entrada: string;
  hora_salida: string | null;
};

// Finalizadas que se muestran debajo de las activas: el guardia solo necesita las últimas.
const MAX_FINALIZADAS = 10;

function fechaHora(valor: string) {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(valor));
}

function hora(valor: string) {
  return new Intl.DateTimeFormat("es-MX", { timeStyle: "short" }).format(new Date(valor));
}

export default async function GuardiaDashboardPage() {
  await requerirRol("guardia");
  const supabase = await createClient();
  // Solo hacen falta destinos buscables y entradas (los pasillos no se eligen
  // aquí). Se leen por páginas: Supabase corta cada consulta en 1000 filas y,
  // ordenados por nombre, los últimos del alfabeto desaparecerían del buscador.
  const [nodosLeidos, edificiosResult, visitasResult] = await Promise.all([
    leerTodo<Nodo>((desde, hasta) =>
      supabase
        .from("nodos")
        .select("id, nombre, tipo, piso, buscable, nombres_alternativos, edificio_id, edificios(nombre)")
        .or("buscable.eq.true,tipo.eq.entrada")
        .order("nombre")
        .order("id")
        .range(desde, hasta),
    ).catch((causa) => {
      console.error("[guardia] No se pudieron cargar los nodos:", causa);
      return null;
    }),
    supabase.from("edificios").select("id, nombre").order("nombre"),
    supabase
      .from("registro_visitante")
      .select(
        "id, nombre, telefono, motivo, destino_edificio_id, destino_nodo_id, origen_nodo_id, estado, hora_entrada, hora_salida",
      )
      .order("hora_entrada", { ascending: false })
      .limit(100),
  ]);

  const nodosError = nodosLeidos === null;
  const nodos = nodosLeidos ?? [];
  const edificios = (edificiosResult.data ?? []) as Edificio[];
  const visitas = (visitasResult.data ?? []) as Visita[];
  const hayError = Boolean(visitasResult.error || nodosError || edificiosResult.error);

  const destinosBuscables: DestinoGuardia[] = nodos
    .filter((nodo) => nodo.buscable)
    .map((nodo) => ({
      id: nodo.id,
      nombre: nodo.nombre,
      alias: nodo.nombres_alternativos ?? [],
      piso: nodo.piso,
      edificio: nodo.edificios?.nombre ?? null,
    }));
  const entradas: NodoOrigen[] = nodos
    .filter((nodo) => nodo.tipo === "entrada")
    .map((nodo) => ({ id: nodo.id, nombre: nodo.nombre, edificios: nodo.edificios }));

  const nodoPorId = new Map(nodos.map((nodo) => [nodo.id, nodo]));
  const nombreEdificio = new Map(edificios.map((edificio) => [edificio.id, edificio.nombre]));

  function destinoTexto(visita: Visita) {
    if (visita.destino_nodo_id) {
      const nodo = nodoPorId.get(visita.destino_nodo_id);
      if (nodo) return `${nodo.nombre} · ${nodo.edificios?.nombre ?? "Edificio no disponible"} · Piso ${nodo.piso}`;
    }
    if (visita.destino_edificio_id) return nombreEdificio.get(visita.destino_edificio_id) ?? "Destino no disponible";
    return "Destino no disponible";
  }

  function origenTexto(visita: Visita) {
    if (!visita.origen_nodo_id) return null;
    return nodoPorId.get(visita.origen_nodo_id)?.nombre ?? null;
  }

  const activas = visitas.filter((visita) => visita.estado === "activo");
  const finalizadas = visitas.filter((visita) => visita.estado !== "activo").slice(0, MAX_FINALIZADAS);
  const hoy = new Date().toDateString();
  const finalizadasHoy = visitas.filter((visita) => visita.hora_salida && new Date(visita.hora_salida).toDateString() === hoy).length;

  // Función que devuelve JSX (no un componente anidado: el linter de React lo prohíbe).
  function tarjeta(visita: Visita) {
    const origen = origenTexto(visita);
    const activa = visita.estado === "activo";
    return (
      <article key={visita.id} className={styles.visit}>
        <div className={styles.visitMain}>
          <h3 className={styles.visitName}>
            {visita.nombre}
            <StatusBadge tone={activa ? "success" : "neutral"}>{activa ? "Activa" : "Finalizada"}</StatusBadge>
          </h3>
          <p className={styles.visitDetail}>
            {destinoTexto(visita)}
            {visita.motivo ? ` · ${visita.motivo}` : ""}
          </p>
          <p className={styles.visitMeta}>
            Entrada: {fechaHora(visita.hora_entrada)}
            {origen ? ` · por ${origen}` : ""}
            {visita.telefono ? ` · ${visita.telefono}` : ""}
            {visita.hora_salida ? ` · Salida: ${hora(visita.hora_salida)}` : ""}
          </p>
        </div>
        {activa ? (
          <form action={finalizarVisita.bind(null, visita.id)} className={styles.finishForm}>
            <button className={styles.finishButton}>Finalizar visita</button>
          </form>
        ) : null}
      </article>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>
          <span className={styles.eyebrowNode} aria-hidden="true" />
          Control de acceso
        </p>
        <h1 className={styles.title}>Registro de visitantes</h1>
        <p className={styles.intro}>Registra la entrada, entrega el QR con la ruta y finaliza la visita cuando salga.</p>
      </header>

      <section className={styles.stats} aria-label="Resumen">
        <StatCard label="Visitas activas" value={activas.length} tone="success" />
        <StatCard label="Finalizadas hoy" value={finalizadasHoy} tone="brand" />
      </section>

      <div className={styles.layout}>
        <section className={`${styles.panel} ${styles.formPanel}`} aria-labelledby="nueva-visita">
          <div className={styles.panelHeader}>
            <div>
              <h2 id="nueva-visita" className={styles.panelTitle}>Nueva visita</h2>
              <p className={styles.panelDescription}>El QR vale 12 horas.</p>
            </div>
          </div>
          <div className={styles.panelBody}>
            <VisitorForm destinos={destinosBuscables} entradas={entradas} />
          </div>
        </section>

        <div className={styles.columna}>
          <section className={styles.panel} aria-labelledby="visitas-activas">
            <div className={styles.panelHeader}>
              <h2 id="visitas-activas" className={styles.panelTitle}>Visitas activas</h2>
              <StatusBadge tone="success">{activas.length}</StatusBadge>
            </div>
            {hayError ? (
              <p className={styles.error}>No se pudieron cargar las visitas. Recarga la página en un momento.</p>
            ) : activas.length === 0 ? (
              <p className={styles.empty}>No hay visitas en el campus ahora.</p>
            ) : (
              <div>
                {activas.map(tarjeta)}
              </div>
            )}
          </section>

          {!hayError && finalizadas.length > 0 ? (
            <section className={styles.panel} aria-labelledby="visitas-finalizadas">
              <div className={styles.panelHeader}>
                <h2 id="visitas-finalizadas" className={styles.panelTitle}>Finalizadas recientemente</h2>
              </div>
              <div>
                {finalizadas.map(tarjeta)}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}

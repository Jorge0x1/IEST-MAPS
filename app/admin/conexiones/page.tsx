import { ConnectionForm, type NodoOpcion } from "./connection-form";
import { DeleteConnectionButton } from "./delete-connection-button";
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
    <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
      <div className="mb-8">
        <p className="text-sm font-semibold text-sky-700">Grafo del campus</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Conexiones entre nodos</h1>
        <p className="mt-2 max-w-3xl text-slate-600">
          Define las aristas del grafo. Une escaleras o elevadores con un nodo de otro piso para representar los
          cambios de nivel.
        </p>
      </div>

      <section aria-label="Resumen de conexiones" className="mb-8 grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">Conexiones</p><p className="mt-2 text-3xl font-bold text-slate-950">{conexiones.length}</p></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">Entre pisos distintos</p><p className="mt-2 text-3xl font-bold text-slate-950">{entrePisos}</p></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">Nodos disponibles</p><p className="mt-2 text-3xl font-bold text-slate-950">{nodos.length}</p></article>
      </section>

      <div className="grid items-start gap-8 xl:grid-cols-[380px_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-6">
          <div className="mb-5">
            <h2 className="font-semibold text-slate-950">Nueva conexión</h2>
            <p className="mt-1 text-sm text-slate-500">
              {nodos.length < 2 ? "Registra al menos dos nodos desde Destinos y nodos." : "Selecciona los dos nodos que se conectan."}
            </p>
          </div>
          <ConnectionForm nodos={nodos} />
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5"><h2 className="font-semibold text-slate-950">Conexiones registradas</h2><p className="mt-1 text-sm text-slate-500">{conexiones.length} en total</p></div>
          {conexionesResult.error || nodosResult.error ? (
            <div className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">No se pudo cargar el catálogo. Aplica la migración 0006 y verifica la conexión con Supabase.</div>
          ) : conexiones.length === 0 ? (
            <div className="px-6 py-16 text-center"><p className="font-medium text-slate-800">No hay conexiones todavía</p><p className="mt-1 text-sm text-slate-500">Crea la primera para empezar a armar el grafo.</p></div>
          ) : (
            <div className="divide-y divide-slate-100">
              {conexiones.map((conexion) => (
                <article key={conexion.id} className="p-5 sm:p-6">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-950">
                        <span>{etiquetaNodo(conexion.origen)}</span>
                        <span className="text-slate-400">{conexion.bidireccional ? "⇄" : "→"}</span>
                        <span>{etiquetaNodo(conexion.destino)}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${conexion.bidireccional ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-amber-50 text-amber-700 ring-amber-200"}`}>
                          {conexion.bidireccional ? "Bidireccional" : "Un solo sentido"}
                        </span>
                        {conexion.costo !== null ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Costo {conexion.costo}</span> : null}
                      </div>
                    </div>
                    <DeleteConnectionButton conexionId={conexion.id} />
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

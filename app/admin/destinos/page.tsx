import { DestinationForm, type DestinoInicial, type EdificioOpcion } from "./destination-form";
import { DeleteDestinationButton } from "./delete-destination-button";
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
    <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
      <div className="mb-8">
        <p className="text-sm font-semibold text-sky-700">Grafo del campus</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Destinos y nodos</h1>
        <p className="mt-2 max-w-3xl text-slate-600">Administra lugares buscables y puntos auxiliares del recorrido. Las conexiones entre ellos se configurarán en el siguiente módulo.</p>
      </div>

      <section aria-label="Resumen de destinos" className="mb-8 grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">Nodos registrados</p><p className="mt-2 text-3xl font-bold text-slate-950">{destinos.length}</p></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">Destinos buscables</p><p className="mt-2 text-3xl font-bold text-slate-950">{destinos.filter((destino) => destino.buscable).length}</p></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">Edificios con nodos</p><p className="mt-2 text-3xl font-bold text-slate-950">{new Set(destinos.map((destino) => destino.edificio_id)).size}</p></article>
      </section>

      <div className="grid items-start gap-8 xl:grid-cols-[380px_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-6">
          <div className="mb-5"><h2 className="font-semibold text-slate-950">Nuevo destino o nodo</h2><p className="mt-1 text-sm text-slate-500">{edificios.length ? "Ubícalo dentro de un edificio y piso." : "Primero registra al menos un edificio."}</p></div>
          <DestinationForm edificios={edificios} />
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <div className="mb-4"><h2 className="font-semibold text-slate-950">Catálogo de nodos</h2><p className="mt-1 text-sm text-slate-500">{filtrados.length} de {destinos.length} resultados</p></div>
            <form action="/admin/destinos" className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_110px_auto]">
              <label htmlFor="buscar-destino" className="sr-only">Buscar destino</label><input id="buscar-destino" type="search" name="buscar" defaultValue={buscar} placeholder="Nombre o alias" className="min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-950" />
              <label htmlFor="filtrar-edificio" className="sr-only">Filtrar por edificio</label><select id="filtrar-edificio" name="edificio" defaultValue={edificio} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"><option value="">Todos los edificios</option>{edificios.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select>
              <label htmlFor="filtrar-piso" className="sr-only">Filtrar por piso</label><select id="filtrar-piso" name="piso" defaultValue={piso} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"><option value="">Pisos</option>{pisos.map((item) => <option key={item} value={item}>{item}</option>)}</select>
              <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">Filtrar</button>
            </form>
          </div>

          {destinosResult.error || edificiosResult.error ? (
            <div className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">No se pudo cargar el catálogo. Aplica la migración 0004 y verifica la conexión con Supabase.</div>
          ) : filtrados.length === 0 ? (
            <div className="px-6 py-16 text-center"><p className="font-medium text-slate-800">No hay nodos para mostrar</p><p className="mt-1 text-sm text-slate-500">Crea el primero o cambia los filtros.</p></div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtrados.map((destino) => (
                <article key={destino.id} className="p-5 sm:p-6">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-semibold text-slate-950">{destino.nombre}</h3><span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 ring-1 ring-inset ring-sky-200">{etiquetasTipo[destino.tipo] ?? destino.tipo}</span><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${destino.buscable ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-slate-100 text-slate-600 ring-slate-200"}`}>{destino.buscable ? "Buscable" : "Solo recorrido"}</span></div><p className="mt-2 text-sm text-slate-600">{destino.edificios?.nombre ?? "Edificio no disponible"} · Piso {destino.piso}</p>{destino.nombres_alternativos.length ? <p className="mt-2 text-xs text-slate-500">Alias: {destino.nombres_alternativos.join(", ")}</p> : null}{destino.lat !== null && destino.lng !== null ? <a className="mt-2 block text-xs font-medium text-sky-700 hover:underline" href={`https://www.openstreetmap.org/?mlat=${destino.lat}&mlon=${destino.lng}#map=19/${destino.lat}/${destino.lng}`} target="_blank" rel="noreferrer">{destino.lat.toFixed(6)}, {destino.lng.toFixed(6)}</a> : <p className="mt-2 text-xs text-amber-700">Sin coordenadas todavía.</p>}</div>
                    <DeleteDestinationButton destinoId={destino.id} nombre={destino.nombre} />
                  </div>
                  <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50"><summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-700">Editar información</summary><div className="border-t border-slate-200 bg-white p-4"><DestinationForm edificios={edificios} destino={destino} /></div></details>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}


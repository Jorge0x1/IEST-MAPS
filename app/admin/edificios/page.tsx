import { BuildingForm } from "./building-form";
import { DeleteBuildingButton } from "./delete-building-button";
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
    <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
      <div className="mb-8">
        <p className="text-sm font-semibold text-sky-700">Catálogo del campus</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Edificios</h1>
        <p className="mt-2 max-w-2xl text-slate-600">Registra las ubicaciones principales del campus. Después conectaremos cada edificio con sus nodos, pisos y rutas.</p>
      </div>

      <section aria-label="Resumen de edificios" className="mb-8 grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">Edificios registrados</p><p className="mt-2 text-3xl font-bold text-slate-950">{edificios.length}</p></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">Con coordenadas GPS</p><p className="mt-2 text-3xl font-bold text-slate-950">{conCoordenadas}</p></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">Nodos asociados</p><p className="mt-2 text-3xl font-bold text-slate-950">{nodos.length}</p></article>
      </section>

      <div className="grid items-start gap-8 xl:grid-cols-[360px_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-6">
          <div className="mb-5"><h2 className="font-semibold text-slate-950">Nuevo edificio</h2><p className="mt-1 text-sm text-slate-500">Puedes agregar las coordenadas ahora o completarlas después.</p></div>
          <BuildingForm />
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center">
            <div><h2 className="font-semibold text-slate-950">Directorio de edificios</h2><p className="mt-1 text-sm text-slate-500">{filtrados.length} de {edificios.length} resultados</p></div>
            <form action="/admin/edificios" className="flex w-full max-w-sm gap-2"><label htmlFor="buscar-edificio" className="sr-only">Buscar edificio</label><input id="buscar-edificio" type="search" name="buscar" defaultValue={buscar} placeholder="Nombre o descripción" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-950" /><button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">Buscar</button></form>
          </div>

          {edificiosResult.error || nodosResult.error ? (
            <div className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">No se pudo cargar el catálogo. Verifica la conexión con Supabase.</div>
          ) : filtrados.length === 0 ? (
            <div className="px-6 py-16 text-center"><p className="font-medium text-slate-800">No hay edificios para mostrar</p><p className="mt-1 text-sm text-slate-500">Crea el primero o prueba otra búsqueda.</p></div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtrados.map((edificio) => {
                const tieneGps = edificio.lat !== null && edificio.lng !== null;
                return (
                  <article key={edificio.id} className="p-5 sm:p-6">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-semibold text-slate-950">{edificio.nombre}</h3><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${tieneGps ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-amber-50 text-amber-800 ring-amber-200"}`}>{tieneGps ? "GPS listo" : "Sin coordenadas"}</span></div><p className="mt-2 text-sm leading-6 text-slate-600">{edificio.descripcion || "Sin descripción."}</p><div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500"><span>{conteoNodos[edificio.id] ?? 0} nodo(s)</span>{tieneGps ? <a className="font-medium text-sky-700 hover:underline" href={`https://www.openstreetmap.org/?mlat=${edificio.lat}&mlon=${edificio.lng}#map=19/${edificio.lat}/${edificio.lng}`} target="_blank" rel="noreferrer">{edificio.lat?.toFixed(6)}, {edificio.lng?.toFixed(6)}</a> : null}</div></div>
                      <DeleteBuildingButton edificioId={edificio.id} nombre={edificio.nombre} />
                    </div>
                    <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50"><summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-700">Editar información</summary><div className="border-t border-slate-200 bg-white p-4"><BuildingForm edificio={edificio} /></div></details>
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

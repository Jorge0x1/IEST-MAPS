import Link from "next/link";
import { DestinationForm, type DestinoInicial, type EdificioOpcion } from "./destination-form";
import { DeleteDestinationButton } from "./delete-destination-button";
import styles from "./destinos.module.css";
import { StatCard, StatusBadge } from "../components/admin-ui";
import { requerirRol } from "@/utils/auth";
import { createClient } from "@/utils/supabase/server";

type Destino = {
  id: string;
  nombre: string;
  tipo: string;
  piso: number;
  nombres_alternativos: string[];
  edificio_id: string;
  lat: number | null;
  lng: number | null;
  buscable: boolean;
  edificios: { nombre: string } | null;
};

const etiquetasTipo: Record<string, string> = {
  salon: "Salón",
  oficina: "Oficina",
  entrada: "Entrada",
  pasillo: "Pasillo",
  bano: "Baño",
  escalera: "Escalera",
  elevador: "Elevador",
  servicio: "Servicio",
  edificio: "Edificio",
};

/**
 * Normaliza y formatea el nombre del edificio para evitar mostrar
 * solo un número o generar redundancia visual.
 */
function obtenerNombreEdificio(edificioObj: { nombre: string } | null): string {
  if (!edificioObj?.nombre) return "Sin edificio";
  const nombre = edificioObj.nombre.trim();
  if (/^\d+$/.test(nombre)) {
    return `Edificio ${nombre}`;
  }
  if (nombre.toLowerCase().startsWith("edificio")) {
    return nombre;
  }
  return `Edificio ${nombre}`;
}

function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export default async function DestinosPage({ searchParams }: { searchParams: Promise<{ buscar?: string }> }) {
  await requerirRol("administrador");
  const { buscar = "" } = await searchParams;
  const supabase = await createClient();

  const [edificiosResult, destinosResult] = await Promise.all([
    supabase.from("edificios").select("id, nombre").order("nombre"),
    supabase
      .from("nodos")
      .select("id, nombre, tipo, piso, nombres_alternativos, edificio_id, lat, lng, buscable, edificios(nombre)")
      .order("piso")
      .order("nombre"),
  ]);

  const edificios = (edificiosResult.data ?? []) as EdificioOpcion[];
  const destinos = (destinosResult.data ?? []) as Destino[];

  const termino = normalizar(buscar.trim());
  const destinosFiltrados = termino
    ? destinos.filter((d) => {
        const edificioNom = obtenerNombreEdificio(d.edificios);
        const textoBusqueda = `${d.nombre} ${d.tipo} ${etiquetasTipo[d.tipo] ?? ""} ${edificioNom} ${d.piso} ${(d.nombres_alternativos || []).join(" ")}`;
        return normalizar(textoBusqueda).includes(termino);
      })
    : destinos;

  const totalSalones = destinos.filter((d) => d.tipo === "salon").length;
  const totalOficinas = destinos.filter((d) => d.tipo === "oficina").length;

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-sky-700">Catálogo del campus</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Destinos y nodos</h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Registra salones, oficinas y puntos clave para generar la navegación del campus.
          </p>
        </div>
      </div>

      <section aria-label="Resumen de destinos" className="mb-8 grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Espacios Registrados</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{destinos.length}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Salones de Clase</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{totalSalones}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Oficinas y Áreas</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{totalOficinas}</p>
        </article>
      </section>

      <div className="grid items-start gap-8 xl:grid-cols-[380px_1fr]">
        {/* Formulario lateral de creación */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-6">
          <div className="mb-5">
            <h2 className="font-semibold text-slate-950">Nuevo destino</h2>
            <p className="mt-1 text-sm text-slate-500">
              {edificios.length === 0 ? "Primero registra al menos un edificio." : "Completa la información básica del nodo."}
            </p>
          </div>
          <DestinationForm edificios={edificios} />
        </section>

        {/* Tabla unificada de Salones y Oficinas */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-semibold text-slate-950">Espacios registrados</h2>
              <p className="mt-1 text-sm text-slate-500">
                {destinosFiltrados.length} de {destinos.length} nodos en total
              </p>
            </div>
            <form className="flex w-full max-w-sm gap-2" action="/admin/destinos">
              <label htmlFor="buscar" className="sr-only">
                Buscar por número de salón o área
              </label>
              <input
                id="buscar"
                name="buscar"
                type="search"
                defaultValue={buscar}
                placeholder="Buscar por número de salón o área..."
                className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />
              <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                Buscar
              </button>
            </form>
          </div>

          {destinosResult.error || edificiosResult.error ? (
            <div className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              No fue posible cargar los destinos. Revisa las migraciones de Supabase.
            </div>
          ) : destinosFiltrados.length === 0 ? (
            <div className="px-6 py-16 text-center text-slate-600">
              No se encontraron espacios con ese criterio de búsqueda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Identificador / Área</th>
                    <th className="px-6 py-3 font-semibold">Uso / Tipo</th>
                    <th className="px-6 py-3 font-semibold">Edificio</th>
                    <th className="px-6 py-3 font-semibold">Piso</th>
                    <th className="px-6 py-3 text-right font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {destinosFiltrados.map((destino) => {
                    const nombreEdificio = obtenerNombreEdificio(destino.edificios);
                    return (
                      <tr key={destino.id} className="hover:bg-slate-50/70">
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-950">{destino.nombre}</div>
                          {destino.nombres_alternativos?.length > 0 ? (
                            <div className="mt-0.5 text-xs text-slate-500">
                              Alias: {destino.nombres_alternativos.join(", ")}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                              destino.tipo === "oficina"
                                ? "bg-amber-50 text-amber-800 ring-amber-200"
                                : destino.tipo === "salon"
                                ? "bg-sky-50 text-sky-700 ring-sky-200"
                                : "bg-slate-100 text-slate-700 ring-slate-200"
                            }`}
                          >
                            {etiquetasTipo[destino.tipo] ?? destino.tipo}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-800">
                          {nombreEdificio}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          Piso {destino.piso}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <DeleteDestinationButton destinoId={destino.id} nombre={destino.nombre} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

import { finalizarVisita } from "./actions";
import { VisitorForm } from "./visitor-form";
import { requerirRol } from "@/utils/auth";
import { createClient } from "@/utils/supabase/server";

type Edificio = { id: string; nombre: string };
type Visita = {
  id: string;
  nombre: string;
  telefono: string | null;
  motivo: string | null;
  destino_edificio_id: string | null;
  estado: "activo" | "finalizado";
  hora_entrada: string;
  hora_salida: string | null;
};

function fechaHora(valor: string) {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(valor));
}

export default async function GuardiaDashboardPage() {
  await requerirRol("guardia");
  const supabase = await createClient();
  const [edificiosResult, visitasResult] = await Promise.all([
    supabase.from("edificios").select("id, nombre").order("nombre"),
    supabase.from("registro_visitante").select("id, nombre, telefono, motivo, destino_edificio_id, estado, hora_entrada, hora_salida").order("hora_entrada", { ascending: false }).limit(100),
  ]);
  const edificios = (edificiosResult.data ?? []) as Edificio[];
  const visitas = (visitasResult.data ?? []) as Visita[];
  const nombreEdificio = new Map(edificios.map((edificio) => [edificio.id, edificio.nombre]));
  const activas = visitas.filter((visita) => visita.estado === "activo");
  const finalizadasHoy = visitas.filter((visita) => visita.hora_salida && new Date(visita.hora_salida).toDateString() === new Date().toDateString()).length;

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
      <div className="mb-8"><p className="text-sm font-semibold text-sky-700">Control de acceso</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Registro de visitantes</h1><p className="mt-2 max-w-2xl text-slate-600">Registra entradas, comparte el acceso temporal y controla las visitas activas del campus.</p></div>

      <section className="mb-8 grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">Visitas activas</p><p className="mt-2 text-3xl font-bold text-slate-950">{activas.length}</p></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">Finalizadas hoy</p><p className="mt-2 text-3xl font-bold text-slate-950">{finalizadasHoy}</p></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">Edificios disponibles</p><p className="mt-2 text-3xl font-bold text-slate-950">{edificios.length}</p></article>
      </section>

      <div className="grid items-start gap-8 xl:grid-cols-[360px_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-6"><div className="mb-5"><h2 className="font-semibold text-slate-950">Nueva visita</h2><p className="mt-1 text-sm text-slate-500">El enlace generado tendrá una vigencia de 12 horas.</p></div><VisitorForm edificios={edificios} /></section>
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5"><h2 className="font-semibold text-slate-950">Actividad reciente</h2><p className="mt-1 text-sm text-slate-500">Últimos {visitas.length} registros</p></div>
          {visitasResult.error || edificiosResult.error ? <div className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">No se pudieron cargar las visitas. Ejecuta primero la migración 0003.</div> : visitas.length === 0 ? <div className="px-6 py-16 text-center text-slate-500">Aún no hay visitas registradas.</div> : <div className="divide-y divide-slate-100">{visitas.map((visita) => <article key={visita.id} className="p-5"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-950">{visita.nombre}</h3><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${visita.estado === "activo" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{visita.estado === "activo" ? "Activa" : "Finalizada"}</span></div><p className="mt-1 text-sm text-slate-600">{nombreEdificio.get(visita.destino_edificio_id ?? "") ?? "Destino no disponible"} · {visita.motivo}</p><p className="mt-2 text-xs text-slate-500">Entrada: {fechaHora(visita.hora_entrada)}{visita.telefono ? ` · ${visita.telefono}` : ""}</p>{visita.hora_salida ? <p className="mt-1 text-xs text-slate-500">Salida: {fechaHora(visita.hora_salida)}</p> : null}</div>{visita.estado === "activo" ? <form action={finalizarVisita.bind(null, visita.id)}><button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Finalizar visita</button></form> : null}</div></article>)}</div>}
        </section>
      </div>
    </main>
  );
}

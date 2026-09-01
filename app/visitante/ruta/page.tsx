import { createHash } from "node:crypto";
import { finalizarMiVisita } from "./actions";
import { createClient } from "@/utils/supabase/server";

type VisitaPublica = {
  id: string;
  nombre: string;
  motivo: string | null;
  estado: string;
  hora_entrada: string;
  hora_salida: string | null;
  destino_nombre: string | null;
};

export default async function VisitanteRutaPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  let visita: VisitaPublica | null = null;

  if (token && token.length <= 200) {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const supabase = await createClient();
    const { data } = await supabase.rpc("obtener_visita_por_token", { p_token_hash: tokenHash });
    visita = ((data as VisitaPublica[] | null)?.[0] ?? null);
  }

  if (!visita) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6"><section className="max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl"><p className="text-sm font-semibold uppercase tracking-widest text-sky-700">IEST-MAPS</p><h1 className="mt-3 text-2xl font-bold text-slate-950">Acceso no válido</h1><p className="mt-3 text-slate-600">El enlace está incompleto, expiró o no corresponde a una visita registrada.</p></section></main>;
  }

  const activa = visita.estado === "activo";
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10">
      <section className="mx-auto max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <header className="bg-sky-700 px-7 py-6 text-white"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-100">IEST-MAPS · Visitante</p><h1 className="mt-2 text-2xl font-bold">Hola, {visita.nombre}</h1></header>
        <div className="p-7">
          <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${activa ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{activa ? "Visita activa" : "Visita finalizada"}</span>
          <dl className="mt-6 grid gap-5">
            <div><dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Destino</dt><dd className="mt-1 text-lg font-semibold text-slate-950">{visita.destino_nombre ?? "Destino por confirmar"}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Motivo</dt><dd className="mt-1 text-slate-700">{visita.motivo ?? "No especificado"}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Hora de entrada</dt><dd className="mt-1 text-slate-700">{new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(visita.hora_entrada))}</dd></div>
          </dl>
          <div className="mt-7 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center"><p className="font-medium text-slate-800">Ruta al edificio</p><p className="mt-1 text-sm text-slate-500">El mapa y las instrucciones GPS se mostrarán aquí cuando integremos el módulo de navegación.</p></div>
          {activa ? <form action={finalizarMiVisita.bind(null, token)} className="mt-6"><button className="w-full rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white hover:bg-slate-800">Finalizar mi visita</button></form> : <p className="mt-6 text-center text-sm text-slate-500">Esta visita ya fue finalizada.</p>}
        </div>
      </section>
    </main>
  );
}

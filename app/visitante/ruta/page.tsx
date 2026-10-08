import { createHash } from "node:crypto";
import Link from "next/link";
import { finalizarMiVisita } from "./actions";
import { calcularRutaDeVisita, type PasoRutaDetallado, type ResultadoRuta } from "@/lib/rutas/actions";
import { createClient } from "@/utils/supabase/server";

type VisitaPublica = {
  id: string;
  nombre: string;
  motivo: string | null;
  estado: string;
  hora_entrada: string;
  hora_salida: string | null;
  destino_nombre: string | null;
  destino_piso: number | null;
  origen_nombre: string | null;
};

const ETIQUETA_TIPO: Record<string, string> = {
  entrada: "Entrada",
  pasillo: "Pasillo",
  salon: "Salón",
  oficina: "Oficina",
  bano: "Baño",
  escalera: "Escalera",
  elevador: "Elevador",
  servicio: "Servicio",
  edificio: "Edificio",
};

function ubicacion(paso: PasoRutaDetallado) {
  return [paso.edificioNombre, `Piso ${paso.piso}`].filter(Boolean).join(" · ");
}

function instruccion(paso: PasoRutaDetallado, indice: number, total: number) {
  if (indice === 0) return `Inicia en ${paso.nombre}`;
  if (paso.cambioPiso) {
    const { sentido, hasta, via } = paso.cambioPiso;
    const por = via ? ` por ${via.tipo === "elevador" ? "el elevador" : "la escalera"} ${via.nombre}` : "";
    return `${sentido === "sube" ? "Sube" : "Baja"} al piso ${hasta}${por}`;
  }
  if (indice === total - 1) return `Llegaste a ${paso.nombre}`;
  return `Continúa hacia ${paso.nombre}`;
}

function SeccionRuta({ ruta, token, sinEscaleras }: { ruta: ResultadoRuta; token: string; sinEscaleras: boolean }) {
  const enlaceAlterno = `/visitante/ruta?token=${encodeURIComponent(token)}${sinEscaleras ? "" : "&sinEscaleras=1"}`;
  const alternar = (
    <Link href={enlaceAlterno} className="text-sm font-semibold text-sky-700 underline-offset-2 hover:underline">
      {sinEscaleras ? "Ver ruta con escaleras" : "Evitar escaleras"}
    </Link>
  );

  if (!ruta.ok) {
    return (
      <div className="mt-7 rounded-xl border border-amber-200 bg-amber-50 p-5">
        <p className="font-medium text-amber-900">No pudimos calcular tu ruta</p>
        <p className="mt-1 text-sm text-amber-800">{ruta.mensaje}</p>
        {ruta.motivo === "bloqueado_por_escaleras" ? <div className="mt-3">{alternar}</div> : null}
      </div>
    );
  }

  return (
    <div className="mt-7 rounded-xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-medium text-slate-800">Tu ruta{sinEscaleras ? " sin escaleras" : ""}</p>
        {alternar}
      </div>
      <ol className="mt-4 grid gap-3">
        {ruta.pasos.map((paso, indice) => (
          <li key={paso.id} className={`flex gap-3 rounded-lg p-3 ${paso.cambioPiso ? "border border-sky-200 bg-sky-50" : "bg-white"}`}>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-700 text-xs font-bold text-white">{indice + 1}</span>
            <div className="min-w-0">
              <p className="font-medium text-slate-900">{instruccion(paso, indice, ruta.pasos.length)}</p>
              <p className="text-sm text-slate-500">{ETIQUETA_TIPO[paso.tipo] ?? paso.tipo} · {ubicacion(paso)}</p>
              {paso.cambioPiso ? <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-sky-700">Cambio de piso: {paso.cambioPiso.desde} → {paso.cambioPiso.hasta}</p> : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default async function VisitanteRutaPage({ searchParams }: { searchParams: Promise<{ token?: string; sinEscaleras?: string }> }) {
  const { token = "", sinEscaleras: sinEscalerasParam } = await searchParams;
  const sinEscaleras = sinEscalerasParam === "1";
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
  // La ruta solo se calcula mientras la visita sigue activa.
  const ruta = activa ? await calcularRutaDeVisita(token, { evitarEscaleras: sinEscaleras }) : null;
  const destinoConPiso = visita.destino_nombre
    ? visita.destino_piso !== null
      ? `${visita.destino_nombre} · Piso ${visita.destino_piso}`
      : visita.destino_nombre
    : "Destino por confirmar";

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10">
      <section className="mx-auto max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <header className="bg-sky-700 px-7 py-6 text-white"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-100">IEST-MAPS · Visitante</p><h1 className="mt-2 text-2xl font-bold">Hola, {visita.nombre}</h1></header>
        <div className="p-7">
          <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${activa ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{activa ? "Visita activa" : "Visita finalizada"}</span>
          <dl className="mt-6 grid gap-5">
            <div><dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Destino</dt><dd className="mt-1 text-lg font-semibold text-slate-950">{destinoConPiso}</dd></div>
            {visita.origen_nombre ? <div><dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Entra por</dt><dd className="mt-1 text-slate-700">{visita.origen_nombre}</dd></div> : null}
            <div><dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Motivo</dt><dd className="mt-1 text-slate-700">{visita.motivo ?? "No especificado"}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Hora de entrada</dt><dd className="mt-1 text-slate-700">{new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(visita.hora_entrada))}</dd></div>
          </dl>
          {ruta ? <SeccionRuta ruta={ruta} token={token} sinEscaleras={sinEscaleras} /> : null}
          {activa ? <form action={finalizarMiVisita.bind(null, token)} className="mt-6"><button className="w-full rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white hover:bg-slate-800">Finalizar mi visita</button></form> : <p className="mt-6 text-center text-sm text-slate-500">Esta visita ya fue finalizada.</p>}
        </div>
      </section>
    </main>
  );
}

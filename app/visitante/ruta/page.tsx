import { createHash } from "node:crypto";
import { finalizarMiVisita } from "./actions";
import { VistaVisitante } from "./vista-visitante";
import { urlFotoDestino } from "@/lib/fotos";
import { calcularRutaDeVisita } from "@/lib/rutas/actions";
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

function TarjetaCentrada({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-950 px-6">
      <section className="max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-sky-700">IEST-MAPS</p>
        <h1 className="mt-3 text-2xl font-bold text-slate-950">{titulo}</h1>
        <p className="mt-3 text-slate-600">{texto}</p>
      </section>
    </main>
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
    return <TarjetaCentrada titulo="Acceso no válido" texto="El enlace está incompleto, expiró o no corresponde a una visita registrada." />;
  }

  // Una visita finalizada ya no tiene ruta ni mapa.
  if (visita.estado !== "activo") {
    return <TarjetaCentrada titulo="Visita finalizada" texto={`Gracias por tu visita, ${visita.nombre}. Esta visita ya fue finalizada.`} />;
  }

  const ruta = await calcularRutaDeVisita(token, { evitarEscaleras: sinEscaleras });
  // El último paso de la ruta es el destino: de ahí salen su foto y descripción.
  const nodoDestino = ruta.ok ? ruta.pasos[ruta.pasos.length - 1] : null;

  return (
    <VistaVisitante
      nombre={visita.nombre}
      destinoNombre={visita.destino_nombre}
      destinoPiso={visita.destino_piso}
      destinoDescripcion={nodoDestino?.descripcion ?? null}
      destinoFotoUrl={urlFotoDestino(nodoDestino?.fotoPath)}
      origenNombre={visita.origen_nombre}
      motivo={visita.motivo}
      horaEntrada={new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Mexico_City" }).format(new Date(visita.hora_entrada))}
      ruta={ruta}
      token={token}
      sinEscaleras={sinEscaleras}
      finalizar={finalizarMiVisita.bind(null, token)}
    />
  );
}

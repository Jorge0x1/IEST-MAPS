// Lista de pasos de una ruta, compartida por la vista del visitante, la del
// alumno y el explorador del grafo. Sin estado ni hooks: funciona en server y
// client components. Los nodos de pasillo consecutivos se muestran como una
// sola instrucción (ver lib/rutas/instrucciones.ts).
import type { PasoRutaDetallado } from "@/lib/rutas/actions";
import { agruparPasos, type Instruccion } from "@/lib/rutas/instrucciones";

export const ETIQUETA_TIPO: Record<string, string> = {
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

type InstruccionRuta = Instruccion<PasoRutaDetallado>;

function ubicacion(paso: PasoRutaDetallado) {
  return [paso.edificioNombre, `Piso ${paso.piso}`].filter(Boolean).join(" · ");
}

function textoCambioPiso(paso: PasoRutaDetallado) {
  if (!paso.cambioPiso) return null;
  const { sentido, hasta, via } = paso.cambioPiso;
  const por = via ? ` por ${via.tipo === "elevador" ? "el elevador" : "la escalera"} ${via.nombre}` : "";
  return `${sentido === "sube" ? "Sube" : "Baja"} al piso ${hasta}${por}`;
}

function titulo(instruccion: InstruccionRuta, siguiente: InstruccionRuta | undefined) {
  const paso = instruccion.ancla;
  switch (instruccion.tipo) {
    case "inicio":
      return `Inicia en ${paso.nombre}`;
    case "pasillo":
      return siguiente ? `Sigue el pasillo hasta ${siguiente.pasos[0].nombre}` : "Sigue el pasillo";
    case "cambio_piso":
      return textoCambioPiso(paso) ?? `Continúa hacia ${paso.nombre}`;
    case "llegada":
      // Si se llega cambiando de piso, se indica cómo (igual que antes de agrupar).
      return textoCambioPiso(paso) ?? `Llegaste a ${paso.nombre}`;
    default:
      return `Continúa hacia ${paso.nombre}`;
  }
}

function subtitulo(instruccion: InstruccionRuta) {
  const paso = instruccion.ancla;
  if (instruccion.tipo === "pasillo") {
    return [instruccion.metros !== null ? `~${instruccion.metros} m` : "Pasillo", ubicacion(paso)].join(" · ");
  }
  return `${ETIQUETA_TIPO[paso.tipo] ?? paso.tipo} · ${ubicacion(paso)}`;
}

// Número de instrucciones que verá el usuario (para "N pasos" en las cabeceras).
export function contarPasos(pasos: PasoRutaDetallado[]) {
  return agruparPasos(pasos).length;
}

export function ListaPasos({ pasos, agrupar = true }: { pasos: PasoRutaDetallado[]; agrupar?: boolean }) {
  const instrucciones = agruparPasos(pasos, { agruparPasillos: agrupar });
  return (
    <ol className="mt-4 grid gap-3">
      {instrucciones.map((instruccion, indice) => {
        const cambio = instruccion.ancla.cambioPiso;
        return (
          <li key={instruccion.pasos[0].id} className={`flex gap-3 rounded-lg p-3 ${cambio ? "border border-sky-200 bg-sky-50" : "bg-white"}`}>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-700 text-xs font-bold text-white">{indice + 1}</span>
            <div className="min-w-0">
              <p className="font-medium text-slate-900">{titulo(instruccion, instrucciones[indice + 1])}</p>
              <p className="text-sm text-slate-500">{subtitulo(instruccion)}</p>
              {cambio ? <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-sky-700">Cambio de piso: {cambio.desde} → {cambio.hasta}</p> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

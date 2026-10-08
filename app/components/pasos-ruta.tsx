// Lista de pasos de una ruta, compartida por la vista del visitante y la del
// alumno. Sin estado ni hooks: funciona en server y client components.
import type { PasoRutaDetallado } from "@/lib/rutas/actions";

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

export function ListaPasos({ pasos }: { pasos: PasoRutaDetallado[] }) {
  return (
    <ol className="mt-4 grid gap-3">
      {pasos.map((paso, indice) => (
        <li key={paso.id} className={`flex gap-3 rounded-lg p-3 ${paso.cambioPiso ? "border border-sky-200 bg-sky-50" : "bg-white"}`}>
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-700 text-xs font-bold text-white">{indice + 1}</span>
          <div className="min-w-0">
            <p className="font-medium text-slate-900">{instruccion(paso, indice, pasos.length)}</p>
            <p className="text-sm text-slate-500">{ETIQUETA_TIPO[paso.tipo] ?? paso.tipo} · {ubicacion(paso)}</p>
            {paso.cambioPiso ? <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-sky-700">Cambio de piso: {paso.cambioPiso.desde} → {paso.cambioPiso.hasta}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

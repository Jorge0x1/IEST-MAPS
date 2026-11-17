"use client";

import { etiquetaPiso, PISOS_REGISTRADOS } from "@/lib/pisos";

// Botones para cambiar el plano que se ve en un mapa del admin. Solo ofrece los
// pisos dados de alta (los que tienen plano).
export function SelectorPiso({
  piso,
  onPisoChange,
}: {
  piso: number | null;
  onPisoChange: (piso: number) => void;
}) {
  return (
    <div role="group" aria-label="Piso que se ve en el mapa" className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs font-medium text-slate-500">Plano:</span>
      {PISOS_REGISTRADOS.map((opcion) => {
        const activo = opcion === piso;
        return (
          <button
            key={opcion}
            type="button"
            aria-pressed={activo}
            onClick={() => onPisoChange(opcion)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              activo
                ? "border-sky-700 bg-sky-700 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {etiquetaPiso(opcion)}
          </button>
        );
      })}
    </div>
  );
}

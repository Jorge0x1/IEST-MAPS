"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import type { EstadoRegistroVisita } from "./actions";

type Pase = NonNullable<EstadoRegistroVisita["pase"]>;

export function VisitorPass({ pase }: { pase: Pase }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [abierto, setAbierto] = useState(true);
  const [errorQr, setErrorQr] = useState(false);

  useEffect(() => {
    const accesoCompleto = new URL(pase.acceso, window.location.origin).toString();

    if (!canvasRef.current) return;

    QRCode.toCanvas(canvasRef.current, accesoCompleto, {
      width: 264,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#0f172a", light: "#ffffff" },
    }).catch(() => setErrorQr(true));

    function cerrarConEscape(evento: KeyboardEvent) {
      if (evento.key === "Escape") setAbierto(false);
    }

    window.addEventListener("keydown", cerrarConEscape);
    return () => window.removeEventListener("keydown", cerrarConEscape);
  }, [pase]);

  const vencimiento = new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(pase.expiraEn));

  if (!abierto) return null;

  return (
    <div
      id="visitor-pass"
      role="dialog"
      aria-modal="true"
      aria-labelledby="visitor-pass-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
    >
      <section className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-emerald-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 bg-emerald-700 px-5 py-4 text-white">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-100">
              Pase temporal
            </p>
            <h2 id="visitor-pass-title" className="mt-1 text-xl font-bold">
              Escanea para iniciar la visita
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setAbierto(false)}
            autoFocus
            aria-label="Cerrar pase"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-white/15 text-xl leading-none hover:bg-white/25"
          >
            ×
          </button>
        </div>

        <div className="grid gap-6 p-5 sm:grid-cols-[minmax(0,1fr)_264px] sm:items-center">
          <div className="min-w-0 space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Visitante</p>
            <p className="text-lg font-bold text-slate-950">{pase.nombre}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Destino</p>
            <p className="font-medium text-slate-900">{pase.destino}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Motivo</p>
            <p className="text-sm text-slate-700">{pase.motivo}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Válido hasta</p>
            <p className="text-sm font-semibold text-amber-700">{vencimiento}</p>
          </div>
          </div>

          <div className="flex flex-col items-center">
            <div className="rounded-xl border border-slate-200 bg-white p-2">
              <canvas ref={canvasRef} role="img" aria-label="Código QR del acceso temporal" />
            </div>
            {errorQr ? (
              <p className="mt-2 text-center text-xs text-red-700">No se pudo generar el código QR.</p>
            ) : (
              <p className="mt-2 text-center text-sm font-medium text-slate-600">
              </p>
            )}
          </div>
        </div>

      </section>
    </div>
  );
}

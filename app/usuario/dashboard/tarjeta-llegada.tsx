"use client";

// Tarjeta que se queda en pantalla al llegar al destino hasta que la persona
// toque un botón (no se cierra sola: quien camina distraído no debe perdérsela).
export function TarjetaLlegada({
  destino,
  lugar,
  onListo,
  onBuscarOtro,
}: {
  destino: string;
  lugar: string;
  onListo: () => void;
  onBuscarOtro: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 sm:items-center">
      <div role="dialog" aria-modal="true" aria-labelledby="llegada-titulo" aria-live="polite" className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-xl">
        <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
          <span className="llegada-pulso absolute inset-0 rounded-full bg-[var(--brand-primary-soft)]" aria-hidden="true" />
          <svg viewBox="0 0 24 24" className="llegada-pin relative h-16 w-16 text-[var(--brand-primary)]" fill="currentColor" aria-hidden="true">
            <path d="M12 22s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12Z" />
            <circle cx="12" cy="10" r="2.6" fill="white" />
          </svg>
        </div>
        <h2 id="llegada-titulo" className="mt-3 text-2xl font-bold text-slate-950">¡Llegaste!</h2>
        <p className="mt-1 font-semibold text-slate-900">{destino}</p>
        <p className="text-sm text-slate-600">{lugar}</p>
        <div className="mt-5 grid gap-2">
          <button type="button" autoFocus onClick={onListo} className="rounded-xl bg-[var(--brand-primary)] px-4 py-3 font-semibold text-white hover:bg-[var(--brand-primary-hover)]">
            Listo
          </button>
          <button type="button" onClick={onBuscarOtro} className="rounded-xl border border-[var(--border-strong)] px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50">
            Buscar otro destino
          </button>
        </div>
      </div>
    </div>
  );
}

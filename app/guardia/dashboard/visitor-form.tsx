"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { registrarVisita, type EstadoRegistroVisita } from "./actions";

const estadoInicial: EstadoRegistroVisita = { ok: false, mensaje: "" };

export function VisitorForm({ edificios }: { edificios: Array<{ id: string; nombre: string }> }) {
  const [estado, action, pendiente] = useActionState(registrarVisita, estadoInicial);
  const [copiado, setCopiado] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.ok) formRef.current?.reset();
  }, [estado.ok]);

  async function copiarAcceso() {
    if (!estado.acceso) return;
    await navigator.clipboard.writeText(`${window.location.origin}${estado.acceso}`);
    setCopiado(true);
  }

  return (
    <div>
      <form ref={formRef} action={action} className="grid gap-4">
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">Nombre del visitante<input name="nombre" required minLength={2} maxLength={120} className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal text-slate-950" /></label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">Teléfono<input name="telefono" type="tel" maxLength={20} placeholder="Opcional" className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal text-slate-950" /></label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">Destino<select name="destino_edificio_id" required defaultValue="" className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal text-slate-950"><option value="" disabled>Selecciona un edificio</option>{edificios.map((edificio) => <option key={edificio.id} value={edificio.id}>{edificio.nombre}</option>)}</select></label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">Motivo<textarea name="motivo" required minLength={3} maxLength={300} rows={3} className="resize-none rounded-lg border border-slate-300 px-3 py-2.5 font-normal text-slate-950" /></label>
        <button disabled={pendiente || edificios.length === 0} className="rounded-lg bg-sky-700 px-5 py-2.5 font-semibold text-white hover:bg-sky-800 disabled:bg-slate-300">{pendiente ? "Registrando…" : "Registrar visita"}</button>
        {edificios.length === 0 ? <p className="text-sm text-amber-700">Un administrador debe registrar al menos un edificio.</p> : null}
        {estado.mensaje ? <p role="status" className={`text-sm ${estado.ok ? "text-emerald-700" : "text-red-700"}`}>{estado.mensaje}</p> : null}
      </form>
      {estado.acceso ? <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-sm font-semibold text-emerald-900">Acceso temporal generado</p><p className="mt-1 break-all text-xs text-emerald-800">{estado.acceso}</p><button type="button" onClick={copiarAcceso} className="mt-3 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white">{copiado ? "Copiado" : "Copiar enlace"}</button></div> : null}
    </div>
  );
}

"use client";

import { useActionState, useEffect, useRef } from "react";
import { registrarVisita, type EstadoRegistroVisita } from "./actions";
import { VisitorPass } from "./visitor-pass";

const estadoInicial: EstadoRegistroVisita = { ok: false, mensaje: "" };

export function VisitorForm({
  edificios,
}: {
  edificios: Array<{ id: string; nombre: string }>;
}) {
  const [estado, action, pendiente] = useActionState(registrarVisita, estadoInicial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.ok) formRef.current?.reset();
  }, [estado.ok]);

  const campo =
    "rounded-lg border border-slate-300 px-3 py-2.5 font-normal text-slate-950 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100";

  return (
    <div>
      <form ref={formRef} action={action} className="grid gap-4">
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Nombre del visitante
          <input name="nombre" required minLength={2} maxLength={120} className={campo} />
        </label>

        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Teléfono
          <input
            name="telefono"
            type="tel"
            maxLength={20}
            placeholder="Opcional"
            className={campo}
          />
        </label>

        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Destino
          <select
            name="destino_edificio_id"
            required
            defaultValue=""
            className={`${campo} bg-white`}
          >
            <option value="" disabled>
              Selecciona un edificio
            </option>
            {edificios.map((edificio) => (
              <option key={edificio.id} value={edificio.id}>
                {edificio.nombre}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Motivo
          <textarea
            name="motivo"
            required
            minLength={3}
            maxLength={300}
            rows={3}
            className={`${campo} resize-none`}
          />
        </label>

        <button
          disabled={pendiente || edificios.length === 0}
          className="rounded-lg bg-sky-700 px-5 py-2.5 font-semibold text-white hover:bg-sky-800 disabled:bg-slate-300"
        >
          {pendiente ? "Registrando…" : "Registrar visita"}
        </button>

        {edificios.length === 0 ? (
          <p className="text-sm text-amber-700">
            Un administrador debe registrar al menos un edificio.
          </p>
        ) : null}
        {estado.mensaje ? (
          <p
            role="status"
            className={`text-sm ${estado.ok ? "text-emerald-700" : "text-red-700"}`}
          >
            {estado.mensaje}
          </p>
        ) : null}
      </form>

      {estado.pase ? <VisitorPass key={estado.pase.acceso} pase={estado.pase} /> : null}
    </div>
  );
}

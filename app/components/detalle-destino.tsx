"use client";

// Foto y descripción de un destino, para que el alumno o el visitante lo
// reconozca al llegar. Toca la foto para verla en grande. Si el destino no tiene
// ni foto ni descripción, o la foto no carga, no muestra nada de eso.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  nombre: string;
  descripcion: string | null;
  fotoUrl: string | null;
  titulo?: string;
};

export function DetalleDestino({ nombre, descripcion, fotoUrl, titulo }: Props) {
  const [fallo, setFallo] = useState(false);
  const [ampliada, setAmpliada] = useState(false);

  useEffect(() => {
    if (!ampliada) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAmpliada(false);
    };
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [ampliada]);

  const verFoto = fotoUrl !== null && !fallo;
  if (!verFoto && !descripcion) return null;

  return (
    <div className="grid gap-3">
      {titulo ? <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{titulo}</p> : null}

      {verFoto ? (
        <button
          type="button"
          onClick={() => setAmpliada(true)}
          aria-label={`Ampliar la foto de ${nombre}`}
          className="block overflow-hidden rounded-2xl bg-slate-100"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- foto pública de Supabase Storage, ya reducida al subirla */}
          <img
            src={fotoUrl}
            alt={`Foto de ${nombre}`}
            loading="lazy"
            decoding="async"
            onError={() => setFallo(true)}
            className="aspect-[16/9] max-h-56 w-full object-cover"
          />
        </button>
      ) : null}

      {descripcion ? <p className="text-sm leading-relaxed text-slate-700">{descripcion}</p> : null}

      {/* En un portal: el panel crea su propio contexto de apilamiento y taparía la foto ampliada. */}
      {ampliada && verFoto
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`Foto de ${nombre}`}
              onClick={() => setAmpliada(false)}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- ver arriba */}
              <img src={fotoUrl} alt={`Foto de ${nombre}`} className="max-h-full max-w-full rounded-lg object-contain" />
              <button
                type="button"
                onClick={() => setAmpliada(false)}
                aria-label="Cerrar foto"
                className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-xl text-slate-900 hover:bg-white"
              >
                ×
              </button>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

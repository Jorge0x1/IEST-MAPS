"use client";

// Logo opcional del destino (migración 0011). Mismo patrón que la foto: se reduce
// en el navegador (256 px, con transparencia), se sube directo a Storage con la
// sesión del administrador y al formulario solo viaja la ruta (`logo_path`).
// Solo PNG o WebP: un SVG en el bucket público podría llevar scripts.

import { useRef, useState } from "react";
import { BUCKET_DESTINOS } from "@/lib/fotos";
import { urlLogoDestino } from "@/lib/marcadores";
import { createClient } from "@/utils/supabase/client";
import { reducirLogo } from "./reducir-imagen";
import styles from "./destinos.module.css";

const TAMANO_MAXIMO_ORIGINAL = 5 * 1024 * 1024;
const TIPOS_ACEPTADOS = ["image/png", "image/webp"];

type Props = {
  valorInicial: string | null;
  onSubiendoChange: (subiendo: boolean) => void;
};

export function LogoDestinoInput({ valorInicial, onSubiendoChange }: Props) {
  const [ruta, setRuta] = useState(valorInicial ?? "");
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");
  const entrada = useRef<HTMLInputElement>(null);

  // Borra del bucket un logo subido en esta sesión que ya no se va a usar. El logo
  // original lo borra la Server Action al guardar.
  function descartarSubida(rutaSubida: string) {
    if (!rutaSubida || rutaSubida === valorInicial) return;
    void createClient().storage.from(BUCKET_DESTINOS).remove([rutaSubida]);
  }

  async function alElegir(archivo: File | undefined) {
    if (!archivo) return;
    setError("");
    if (!TIPOS_ACEPTADOS.includes(archivo.type)) {
      setError("El logo debe ser PNG o WebP (de preferencia con fondo transparente).");
      return;
    }
    if (archivo.size > TAMANO_MAXIMO_ORIGINAL) {
      setError("El logo pesa más de 5 MB. Elige uno más ligero.");
      return;
    }

    setSubiendo(true);
    onSubiendoChange(true);
    try {
      let logo: { blob: Blob; extension: "png" | "webp" };
      try {
        logo = await reducirLogo(archivo);
      } catch {
        setError("No se pudo leer el logo. Usa un archivo PNG o WebP.");
        return;
      }
      const nuevaRuta = `${crypto.randomUUID()}.${logo.extension}`;
      const { error: errorSubida } = await createClient()
        .storage.from(BUCKET_DESTINOS)
        .upload(nuevaRuta, logo.blob, { contentType: `image/${logo.extension}`, cacheControl: "31536000", upsert: false });
      if (errorSubida) {
        setError("No se pudo subir el logo. Revisa tu conexión y que hayas aplicado la migración 0011.");
        return;
      }
      descartarSubida(ruta);
      setRuta(nuevaRuta);
    } finally {
      setSubiendo(false);
      onSubiendoChange(false);
      if (entrada.current) entrada.current.value = "";
    }
  }

  function quitar() {
    descartarSubida(ruta);
    setRuta("");
    setError("");
  }

  const vistaPrevia = urlLogoDestino(ruta);

  return (
    <div className={styles.field}>
      <span>Logo (opcional)</span>
      <input type="hidden" name="logo_path" value={ruta} />

      {vistaPrevia ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- vista previa de un logo público de Storage */}
          <img src={vistaPrevia} alt="Vista previa del logo" className="size-14 rounded-full border border-slate-200 bg-white object-contain p-1" />
          <button type="button" onClick={quitar} disabled={subiendo} className="w-fit text-sm font-semibold text-red-700 underline-offset-2 hover:underline disabled:opacity-60">
            Quitar logo
          </button>
        </div>
      ) : null}

      <input
        ref={entrada}
        type="file"
        accept="image/png,image/webp"
        disabled={subiendo}
        onChange={(e) => void alElegir(e.target.files?.[0])}
        aria-label={ruta ? "Reemplazar el logo del destino" : "Elegir un logo del destino"}
        className={styles.control}
      />
      <span className={styles.fieldHelp}>
        {subiendo ? "Subiendo logo…" : "Se ve dentro del icono del mapa en lugar del dibujo genérico (elige también un icono). PNG o WebP."}
      </span>
      {error ? <span role="alert" className="text-sm font-semibold text-red-700">{error}</span> : null}
    </div>
  );
}

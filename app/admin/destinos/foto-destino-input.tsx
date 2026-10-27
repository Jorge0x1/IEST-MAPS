"use client";

// Campo de foto del formulario de destinos. Al elegir un archivo lo reduce y lo
// sube directo a Supabase Storage con la sesión del administrador (la política
// de la migración 0010 solo lo permite a administradores). Al formulario solo
// viaja la ruta, en el campo oculto `foto_path`; el archivo en sí nunca pasa por
// la Server Action, así que no choca con su límite de tamaño.

import { useRef, useState } from "react";
import { BUCKET_DESTINOS, urlFotoDestino } from "@/lib/fotos";
import { createClient } from "@/utils/supabase/client";
import { reducirImagen } from "./reducir-imagen";
import styles from "./destinos.module.css";

const TAMANO_MAXIMO_ORIGINAL = 20 * 1024 * 1024;

type Props = {
  // Foto que ya tiene el destino (al editar).
  valorInicial: string | null;
  // Avisa al formulario para bloquear "Guardar" mientras se sube.
  onSubiendoChange: (subiendo: boolean) => void;
};

export function FotoDestinoInput({ valorInicial, onSubiendoChange }: Props) {
  const [ruta, setRuta] = useState(valorInicial ?? "");
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");
  const entrada = useRef<HTMLInputElement>(null);

  // Borra del bucket una foto subida en esta sesión que ya no se va a usar.
  // La foto original del destino NO se toca aquí: la borra la Server Action al guardar.
  function descartarSubida(rutaSubida: string) {
    if (!rutaSubida || rutaSubida === valorInicial) return;
    void createClient().storage.from(BUCKET_DESTINOS).remove([rutaSubida]);
  }

  async function alElegir(archivo: File | undefined) {
    if (!archivo) return;
    setError("");
    if (!archivo.type.startsWith("image/")) {
      setError("El archivo debe ser una imagen (JPG, PNG o WebP).");
      return;
    }
    if (archivo.size > TAMANO_MAXIMO_ORIGINAL) {
      setError("La imagen pesa más de 20 MB. Elige una más ligera.");
      return;
    }

    setSubiendo(true);
    onSubiendoChange(true);
    try {
      let imagen: Blob;
      try {
        imagen = await reducirImagen(archivo);
      } catch {
        setError("No se pudo leer la imagen. Usa un archivo JPG, PNG o WebP.");
        return;
      }
      const nuevaRuta = `${crypto.randomUUID()}.jpg`;
      const { error: errorSubida } = await createClient()
        .storage.from(BUCKET_DESTINOS)
        .upload(nuevaRuta, imagen, { contentType: "image/jpeg", cacheControl: "31536000", upsert: false });
      if (errorSubida) {
        setError("No se pudo subir la foto. Revisa tu conexión y que hayas aplicado la migración 0010.");
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

  const vistaPrevia = urlFotoDestino(ruta);

  return (
    <div className={styles.field}>
      <span>Foto</span>
      <input type="hidden" name="foto_path" value={ruta} />

      {vistaPrevia ? (
        <div className="grid gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- vista previa de una foto pública de Storage */}
          <img src={vistaPrevia} alt="Vista previa de la foto del destino" className="aspect-[16/9] w-full max-w-xs rounded-xl bg-slate-100 object-cover" />
          <button type="button" onClick={quitar} disabled={subiendo} className="w-fit text-sm font-semibold text-red-700 underline-offset-2 hover:underline disabled:opacity-60">
            Quitar foto
          </button>
        </div>
      ) : null}

      <input
        ref={entrada}
        type="file"
        accept="image/*"
        disabled={subiendo}
        onChange={(e) => void alElegir(e.target.files?.[0])}
        aria-label={ruta ? "Reemplazar la foto del destino" : "Elegir una foto del destino"}
        className={styles.control}
      />
      <span className={styles.fieldHelp}>
        {subiendo
          ? "Subiendo foto…"
          : "Ayuda al alumno a reconocer el lugar al llegar. Se reduce automáticamente antes de subirla."}
      </span>
      {error ? <span role="alert" className="text-sm font-semibold text-red-700">{error}</span> : null}
    </div>
  );
}

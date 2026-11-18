"use client";

// Avisos de la navegación en vivo: un sonido corto generado con Web Audio (sin
// archivos) y vibración donde exista (no en iPhone). Los navegadores solo dejan
// sonar audio después de un toque: `desbloquear()` se llama dentro del toque
// de "Empezar a caminar".
import { useCallback, useEffect, useRef, useState } from "react";
import type { ClaseAviso } from "@/lib/rutas/navegacion";

// Notas (Hz) de cada aviso, en orden; cada una dura `DURACION_NOTA_S`.
const NOTAS: Record<ClaseAviso, number[]> = {
  giro: [880],
  desvio: [440, 0, 440],
  piso: [660, 880],
  llegada: [523, 659, 784],
};
const VIBRACION: Record<ClaseAviso, number[]> = {
  giro: [150],
  desvio: [200, 100, 200],
  piso: [150, 80, 150],
  llegada: [100, 50, 100, 50, 300],
};
const DURACION_NOTA_S = 0.15;
const VOLUMEN = 0.25;

type ConstructorAudio = typeof AudioContext;

export function useAvisos() {
  const audioRef = useRef<AudioContext | null>(null);
  const [silencio, setSilencio] = useState(false);
  const silencioRef = useRef(silencio);
  useEffect(() => {
    silencioRef.current = silencio;
  }, [silencio]);

  const desbloquear = useCallback(() => {
    try {
      if (!audioRef.current) {
        const Constructor: ConstructorAudio | undefined =
          window.AudioContext ?? (window as unknown as { webkitAudioContext?: ConstructorAudio }).webkitAudioContext;
        if (!Constructor) return;
        audioRef.current = new Constructor();
      }
      void audioRef.current.resume();
    } catch {
      // Sin audio: los avisos quedan solo como vibración (o nada).
    }
  }, []);

  const avisar = useCallback((clase: ClaseAviso) => {
    if (silencioRef.current) return;
    try {
      navigator.vibrate?.(VIBRACION[clase]);
    } catch {
      // Algunos navegadores lanzan si no hubo interacción reciente.
    }
    const audio = audioRef.current;
    if (!audio || audio.state !== "running") return;
    const inicio = audio.currentTime + 0.01;
    NOTAS[clase].forEach((frecuencia, i) => {
      if (frecuencia === 0) return; // silencio entre notas
      const t = inicio + i * DURACION_NOTA_S;
      const oscilador = audio.createOscillator();
      const volumen = audio.createGain();
      oscilador.type = "sine";
      oscilador.frequency.value = frecuencia;
      volumen.gain.setValueAtTime(0.0001, t);
      volumen.gain.exponentialRampToValueAtTime(VOLUMEN, t + 0.01);
      volumen.gain.exponentialRampToValueAtTime(0.0001, t + DURACION_NOTA_S - 0.01);
      oscilador.connect(volumen).connect(audio.destination);
      oscilador.start(t);
      oscilador.stop(t + DURACION_NOTA_S);
    });
  }, []);

  useEffect(
    () => () => {
      void audioRef.current?.close().catch(() => {});
      audioRef.current = null;
    },
    [],
  );

  return { desbloquear, avisar, silencio, setSilencio };
}

// Mantiene la pantalla encendida mientras `activo` (Screen Wake Lock API). El
// navegador suelta el bloqueo al cambiar de pestaña, así que se vuelve a pedir
// al regresar. Si la API no existe o falla, no hace nada.
export function usePantallaEncendida(activo: boolean) {
  useEffect(() => {
    if (!activo || !("wakeLock" in navigator)) return;
    let bloqueo: WakeLockSentinel | null = null;
    let vigente = true;
    const pedir = async () => {
      try {
        const nuevo = await navigator.wakeLock.request("screen");
        if (vigente) bloqueo = nuevo;
        else void nuevo.release();
      } catch {
        // Ahorro de batería u otro motivo: se sigue sin pantalla encendida.
      }
    };
    const alVolver = () => {
      if (document.visibilityState === "visible") void pedir();
    };
    void pedir();
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      vigente = false;
      document.removeEventListener("visibilitychange", alVolver);
      void bloqueo?.release().catch(() => {});
    };
  }, [activo]);
}

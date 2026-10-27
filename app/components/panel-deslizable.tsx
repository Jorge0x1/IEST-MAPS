"use client";

// Panel inferior deslizable (bottom sheet) para la vista móvil de los mapas,
// como el de Google Maps: tres alturas (mínimo, medio y completo) que se
// cambian arrastrando la cabecera, tocándola o con el teclado. Sin dependencias.

import { useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";

export type EstadoPanel = "minimo" | "medio" | "completo";

// El mapa necesita saber cuánto tapa el panel en su altura mínima para dejar
// libre esa franja al encuadrar la ruta.
export const ALTURA_PANEL_MINIMO = 148;

const ORDEN: EstadoPanel[] = ["minimo", "medio", "completo"];
// Movimiento (px) por debajo del cual un toque cuenta como toque y no como arrastre.
const UMBRAL_ARRASTRE = 6;

function alturaVentana() {
  return window.innerHeight;
}
function suscribirResize(avisar: () => void) {
  window.addEventListener("resize", avisar);
  return () => window.removeEventListener("resize", avisar);
}

function alturasPorEstado(ventana: number): Record<EstadoPanel, number> {
  return {
    minimo: ALTURA_PANEL_MINIMO,
    medio: Math.round(ventana * 0.5),
    completo: Math.round(ventana * 0.88),
  };
}

type Props = {
  estado: EstadoPanel;
  onCambiarEstado: (estado: EstadoPanel) => void;
  // Parte siempre visible, incluso en el estado mínimo (título, resumen, acción principal).
  cabecera: ReactNode;
  // Contenido que aparece al subir el panel.
  children?: ReactNode;
  etiqueta: string;
};

export function PanelDeslizable({ estado, onCambiarEstado, cabecera, children, etiqueta }: Props) {
  const ventana = useSyncExternalStore(suscribirResize, alturaVentana, () => 700);
  const alturas = alturasPorEstado(ventana);
  // Altura en vivo mientras el dedo arrastra; null cuando el panel está en reposo.
  const [arrastre, setArrastre] = useState<number | null>(null);
  const inicio = useRef({ y: 0, altura: 0, movido: false });

  function alSiguiente() {
    onCambiarEstado(ORDEN[(ORDEN.indexOf(estado) + 1) % ORDEN.length]);
  }

  function alPresionar(e: PointerEvent<HTMLDivElement>) {
    // Los botones y campos de la cabecera siguen funcionando con normalidad.
    if ((e.target as HTMLElement).closest("button, a, input, select, label")) return;
    // En escritorio el panel es una tarjeta fija: no hay nada que arrastrar.
    if (window.matchMedia("(min-width: 768px)").matches) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    inicio.current = { y: e.clientY, altura: alturas[estado], movido: false };
    setArrastre(alturas[estado]);
  }

  function alMover(e: PointerEvent<HTMLDivElement>) {
    if (arrastre === null) return;
    const delta = inicio.current.y - e.clientY;
    if (Math.abs(delta) > UMBRAL_ARRASTRE) inicio.current.movido = true;
    const altura = Math.min(alturas.completo, Math.max(alturas.minimo, inicio.current.altura + delta));
    setArrastre(altura);
  }

  function alSoltar() {
    if (arrastre === null) return;
    if (!inicio.current.movido) {
      setArrastre(null);
      alSiguiente();
      return;
    }
    // Se queda en la altura más cercana a donde se soltó.
    const cercano = ORDEN.reduce((mejor, e) => (Math.abs(alturas[e] - arrastre) < Math.abs(alturas[mejor] - arrastre) ? e : mejor), estado);
    setArrastre(null);
    onCambiarEstado(cercano);
  }

  function alTeclear(e: KeyboardEvent<HTMLDivElement>) {
    const i = ORDEN.indexOf(estado);
    if (e.key === "ArrowUp" && i < ORDEN.length - 1) onCambiarEstado(ORDEN[i + 1]);
    else if (e.key === "ArrowDown" && i > 0) onCambiarEstado(ORDEN[i - 1]);
    else if (e.key === "Enter" || e.key === " ") alSiguiente();
    else return;
    e.preventDefault();
  }

  return (
    // Móvil: panel inferior con altura variable (--altura-panel).
    // Escritorio (md+): tarjeta flotante a la izquierda, debajo de la barra de
    // búsqueda, con la altura de su contenido; no se arrastra ni cambia de altura.
    <section
      aria-label={etiqueta}
      className="absolute inset-x-0 bottom-0 z-20 flex h-[var(--altura-panel)] flex-col rounded-t-3xl bg-white shadow-[0_-8px_30px_rgb(30_32_36_/_0.18)] md:inset-x-auto md:bottom-auto md:left-4 md:top-[88px] md:h-auto md:max-h-[calc(100dvh-104px)] md:w-[368px] md:rounded-2xl md:shadow-xl md:ring-1 md:ring-black/5"
      style={
        {
          "--altura-panel": `${arrastre ?? alturas[estado]}px`,
          transition: arrastre === null ? "height 220ms ease-out" : "none",
          paddingBottom: "env(safe-area-inset-bottom)",
        } as CSSProperties
      }
    >
      <div
        onPointerDown={alPresionar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerCancel={alSoltar}
        className="shrink-0 cursor-grab touch-none select-none px-4 pb-3 active:cursor-grabbing md:cursor-default md:touch-auto md:select-text md:pt-4"
      >
        <div
          role="button"
          tabIndex={0}
          aria-label="Cambiar altura del panel"
          aria-expanded={estado !== "minimo"}
          onKeyDown={alTeclear}
          className="mx-auto flex h-6 w-16 items-center justify-center rounded-full md:hidden"
        >
          <span className="h-1.5 w-10 rounded-full bg-slate-300" />
        </div>
        {cabecera}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 md:pb-5">{children}</div>
    </section>
  );
}

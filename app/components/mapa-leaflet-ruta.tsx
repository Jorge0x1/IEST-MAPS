"use client";

// Mapa Leaflet con la ruta dibujada. Usa `window`, así que solo se importa
// mediante next/dynamic con ssr: false (ver mapa-ruta.tsx).

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import type { PuntoMapa, RolPunto } from "@/lib/rutas/mapa";
import { CENTRO_CAMPUS, LIMITES_CAMPUS, agregarCapaBase, escaparHtml, etiquetaPiso, type CapaBase } from "./mapa-base";

const COLOR_RUTA = "#ff5900";

const ESTILO_PUNTO: Record<RolPunto, { tamano: number; fondo: string; texto: string }> = {
  inicio: { tamano: 26, fondo: "#177245", texto: "#ffffff" },
  destino: { tamano: 28, fondo: "#ff5900", texto: "#ffffff" },
  cambio_piso: { tamano: 22, fondo: "#0369a1", texto: "#ffffff" },
  paso: { tamano: 18, fondo: "#ffffff", texto: "#2f3033" },
};

function icono(punto: PuntoMapa) {
  const { tamano, fondo, texto } = ESTILO_PUNTO[punto.rol];
  const borde = punto.rol === "paso" ? COLOR_RUTA : "#ffffff";
  return L.divIcon({
    className: "",
    html:
      `<div style="width:${tamano}px;height:${tamano}px;border-radius:9999px;background:${fondo};` +
      `color:${texto};border:2px solid ${borde};box-shadow:0 1px 4px rgb(0 0 0 / .35);` +
      `display:flex;align-items:center;justify-content:center;font:700 11px/1 sans-serif;">${punto.numero}</div>`,
    iconSize: [tamano, tamano],
    iconAnchor: [tamano / 2, tamano / 2],
  });
}

const ETIQUETA_ROL: Record<RolPunto, string> = {
  inicio: "Inicio",
  destino: "Destino",
  cambio_piso: "Cambio de piso",
  paso: "Paso",
};

type Props = {
  puntos: PuntoMapa[];
  // Clases del contenedor. Por defecto es la tarjeta de altura fija del visitante;
  // la vista de pantalla completa del alumno pasa "h-full w-full".
  className?: string;
  // Píxeles de la parte inferior tapados por un panel encima del mapa: el
  // encuadre de la ruta los deja libres.
  margenInferior?: number;
  // Píxeles de la parte superior tapados por la barra de búsqueda.
  margenSuperior?: number;
  // Píxeles de la parte izquierda tapados por el panel lateral (escritorio).
  margenIzquierdo?: number;
  // Botones +/- (abajo a la derecha). En móvil se ocultan: se usa pellizcar.
  controlesZoom?: boolean;
};

export default function MapaLeafletRuta({
  puntos,
  className = "h-[320px] w-full sm:h-[380px]",
  margenInferior = 0,
  margenSuperior = 0,
  margenIzquierdo = 0,
  controlesZoom = true,
}: Props) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<L.Map | null>(null);
  const capaRef = useRef<L.LayerGroup | null>(null);
  const capaBaseRef = useRef<CapaBase | null>(null);

  // Pisos por los que pasa la ruta (en orden de recorrido). El mapa muestra un
  // piso a la vez: su plano y solo los puntos de la ruta que caen en él. La
  // elección se guarda junto a los puntos a los que pertenece: al cambiar de ruta
  // vuelve sola al primer piso, sin efectos que reinicien el estado.
  const pisos = useMemo(() => [...new Set(puntos.map((p) => p.piso))], [puntos]);
  const [elegido, setElegido] = useState<{ puntos: PuntoMapa[]; piso: number } | null>(null);
  const pisoActivo =
    elegido && elegido.puntos === puntos && pisos.includes(elegido.piso) ? elegido.piso : (pisos[0] ?? 0);
  // Los márgenes se leen al encuadrar, pero cambiarlos no debe re-encuadrar.
  const margenesRef = useRef({ margenInferior, margenSuperior, margenIzquierdo });
  // Se declara antes que el efecto de la ruta para que ya esté actualizado.
  useEffect(() => {
    margenesRef.current = { margenInferior, margenSuperior, margenIzquierdo };
  }, [margenInferior, margenSuperior, margenIzquierdo]);

  useEffect(() => {
    const contenedor = contenedorRef.current;
    if (!contenedor) return;
    const limites = L.latLngBounds(LIMITES_CAMPUS);
    const mapa = L.map(contenedor, {
      center: CENTRO_CAMPUS,
      zoom: 18,
      // Los botones de zoom se agregan aparte (efecto de abajo) para poder
      // mostrarlos u ocultarlos sin recrear el mapa.
      zoomControl: false,
      // Borde duro: el usuario no puede arrastrar el mapa fuera del campus.
      maxBounds: limites,
      maxBoundsViscosity: 1,
    });
    mapaRef.current = mapa;
    capaBaseRef.current = agregarCapaBase(mapa, null);
    capaRef.current = L.layerGroup().addTo(mapa);
    // El zoom mínimo es el que hace caber justo los límites en la pantalla:
    // depende del tamaño del contenedor, así que se recalcula al redimensionar.
    const ajustarZoomMinimo = () => {
      mapa.invalidateSize();
      const { x, y } = mapa.getSize();
      if (x > 0 && y > 0) mapa.setMinZoom(mapa.getBoundsZoom(limites));
    };
    const idTimeout = setTimeout(ajustarZoomMinimo, 0);
    // Si el contenedor cambia de tamaño (girar el celular, barra del navegador
    // móvil, panel lateral), Leaflet necesita recalcular o se ve cortado.
    const observador = new ResizeObserver(ajustarZoomMinimo);
    observador.observe(contenedor);
    return () => {
      clearTimeout(idTimeout);
      observador.disconnect();
      mapa.remove();
      mapaRef.current = null;
      capaRef.current = null;
      capaBaseRef.current = null;
    };
  }, []);

  // El plano visible es el del piso activo. Va antes del efecto de la ruta para
  // que el mapa ya tenga el plano correcto cuando se encuadra.
  useEffect(() => {
    capaBaseRef.current?.cambiarPiso(pisoActivo);
  }, [pisoActivo]);

  // Selector de piso (solo si la ruta pasa por más de uno). Es un control de
  // Leaflet arriba a la derecha, bajo la barra de búsqueda si la hay.
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa || pisos.length < 2) return;
    const control = new L.Control({ position: "topright" });
    control.onAdd = () => {
      const caja = L.DomUtil.create("div", "");
      caja.setAttribute("role", "group");
      caja.setAttribute("aria-label", "Piso del mapa");
      caja.style.cssText =
        `display:flex;flex-direction:column;gap:4px;margin-top:${margenesRef.current.margenSuperior + 10}px;margin-right:10px;`;
      for (const piso of pisos) {
        const boton = L.DomUtil.create("button", "", caja);
        boton.type = "button";
        boton.textContent = etiquetaPiso(piso);
        const activo = piso === pisoActivo;
        boton.setAttribute("aria-pressed", String(activo));
        boton.style.cssText =
          "cursor:pointer;padding:6px 10px;border-radius:8px;font:700 12px/1 sans-serif;" +
          "box-shadow:0 1px 4px rgb(0 0 0 / .3);" +
          (activo
            ? "background:#0369a1;color:#fff;border:2px solid #0369a1;"
            : "background:#fff;color:#2f3033;border:2px solid #ffffff;");
        L.DomEvent.on(boton, "click", () => setElegido({ puntos, piso }));
      }
      L.DomEvent.disableClickPropagation(caja);
      return caja;
    };
    control.addTo(mapa);
    return () => {
      control.remove();
    };
  }, [pisos, pisoActivo, puntos]);

  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa || !controlesZoom) return;
    const control = L.control.zoom({ position: "bottomright" }).addTo(mapa);
    return () => {
      control.remove();
    };
  }, [controlesZoom]);

  // Redibuja la ruta y encuadra el mapa cada vez que cambia.
  useEffect(() => {
    const mapa = mapaRef.current;
    const capa = capaRef.current;
    if (!mapa || !capa) return;
    capa.clearLayers();
    // Solo se dibuja el tramo de la ruta que está en el piso activo.
    const visibles = puntos.filter((p) => p.piso === pisoActivo);
    if (visibles.length === 0) {
      mapa.setView(CENTRO_CAMPUS, 18);
      return;
    }

    const coordenadas = visibles.map((p) => L.latLng(p.lat, p.lng));
    if (coordenadas.length > 1) {
      L.polyline(coordenadas, { color: COLOR_RUTA, weight: 5, opacity: 0.85 }).addTo(capa);
    }
    // Solo llevan marcador los puntos numerados; los demás son vértices de la
    // línea (nodos intermedios de un tramo de pasillo). Inicio y destino van al
    // final para que queden encima de los pasos.
    const orden = visibles.filter((p) => p.numero !== null).sort((a, b) => Number(a.rol === "inicio" || a.rol === "destino") - Number(b.rol === "inicio" || b.rol === "destino"));
    for (const punto of orden) {
      L.marker([punto.lat, punto.lng], { icon: icono(punto), keyboard: false })
        .bindTooltip(`${punto.numero}. ${escaparHtml(punto.nombre)} · ${ETIQUETA_ROL[punto.rol]} · Piso ${punto.piso}`, { direction: "top", offset: [0, -12] })
        .addTo(capa);
    }

    const { margenInferior: abajo, margenSuperior: arriba, margenIzquierdo: izquierda } = margenesRef.current;
    if (coordenadas.length === 1) {
      mapa.setView(coordenadas[0], 19);
    } else {
      mapa.fitBounds(L.latLngBounds(coordenadas), {
        paddingTopLeft: [32 + izquierda, 32 + arriba],
        paddingBottomRight: [32, 32 + abajo],
        maxZoom: 20,
      });
    }
  }, [puntos, pisoActivo]);

  return <div ref={contenedorRef} className={className} aria-label="Mapa de la ruta" role="img" />;
}

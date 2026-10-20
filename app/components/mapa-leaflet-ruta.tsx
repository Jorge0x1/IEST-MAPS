"use client";

// Mapa Leaflet con la ruta dibujada. Usa `window`, así que solo se importa
// mediante next/dynamic con ssr: false (ver mapa-ruta.tsx).

import { useEffect, useRef } from "react";
import L from "leaflet";
import type { PuntoMapa, RolPunto } from "@/lib/rutas/mapa";
import { CENTRO_CAMPUS, crearCapaBase, escaparHtml } from "./mapa-base";

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

export default function MapaLeafletRuta({ puntos }: { puntos: PuntoMapa[] }) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<L.Map | null>(null);
  const capaRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!contenedorRef.current) return;
    const mapa = L.map(contenedorRef.current, { center: CENTRO_CAMPUS, zoom: 18 });
    mapaRef.current = mapa;
    crearCapaBase().addTo(mapa);
    capaRef.current = L.layerGroup().addTo(mapa);
    const idTimeout = setTimeout(() => mapa.invalidateSize(), 0);
    return () => {
      clearTimeout(idTimeout);
      mapa.remove();
      mapaRef.current = null;
      capaRef.current = null;
    };
  }, []);

  // Redibuja la ruta y encuadra el mapa cada vez que cambia.
  useEffect(() => {
    const mapa = mapaRef.current;
    const capa = capaRef.current;
    if (!mapa || !capa) return;
    capa.clearLayers();
    if (puntos.length === 0) return;

    const coordenadas = puntos.map((p) => L.latLng(p.lat, p.lng));
    if (coordenadas.length > 1) {
      L.polyline(coordenadas, { color: COLOR_RUTA, weight: 5, opacity: 0.85 }).addTo(capa);
    }
    // Inicio y destino al final para que queden encima de los pasos.
    const orden = [...puntos].sort((a, b) => Number(a.rol === "inicio" || a.rol === "destino") - Number(b.rol === "inicio" || b.rol === "destino"));
    for (const punto of orden) {
      L.marker([punto.lat, punto.lng], { icon: icono(punto), keyboard: false })
        .bindTooltip(`${punto.numero}. ${escaparHtml(punto.nombre)} · ${ETIQUETA_ROL[punto.rol]} · Piso ${punto.piso}`, { direction: "top", offset: [0, -12] })
        .addTo(capa);
    }

    if (coordenadas.length === 1) {
      mapa.setView(coordenadas[0], 19);
    } else {
      mapa.fitBounds(L.latLngBounds(coordenadas), { padding: [32, 32], maxZoom: 20 });
    }
  }, [puntos]);

  return <div ref={contenedorRef} className="h-[320px] w-full sm:h-[380px]" aria-label="Mapa de la ruta" role="img" />;
}

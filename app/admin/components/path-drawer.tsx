"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";

const CENTRO_CAMPUS: [number, number] = [22.323777, -97.880432];

const iconoPunto = L.divIcon({
  className: "",
  html:
    '<div style="width:16px;height:16px;border-radius:9999px;background:#0369a1;' +
    'border:2px solid white;box-shadow:0 0 0 1px #0369a1;"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export type PuntoTrazo = { lat: number; lng: number };

export function PathDrawer({
  puntos,
  onPuntosChange,
}: {
  puntos: PuntoTrazo[];
  onPuntosChange: (puntos: PuntoTrazo[]) => void;
}) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<L.Map | null>(null);
  const capaRef = useRef<L.LayerGroup | null>(null);
  const puntosRef = useRef(puntos);
  puntosRef.current = puntos;
  const onCambioRef = useRef(onPuntosChange);
  onCambioRef.current = onPuntosChange;

  // El mapa se crea una sola vez. El punto se agrega leyendo de una ref para
  // no tener que reiniciar el mapa (y perder el zoom/centro) en cada clic.
  useEffect(() => {
    if (!contenedorRef.current) return;

    const mapa = L.map(contenedorRef.current, {
      center: puntosRef.current[0] ?? CENTRO_CAMPUS,
      zoom: 18,
    });
    mapaRef.current = mapa;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 20,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapa);

    capaRef.current = L.layerGroup().addTo(mapa);

    mapa.on("click", (evento: L.LeafletMouseEvent) => {
      const nuevoPunto: PuntoTrazo = {
        lat: Number(evento.latlng.lat.toFixed(6)),
        lng: Number(evento.latlng.lng.toFixed(6)),
      };
      onCambioRef.current([...puntosRef.current, nuevoPunto]);
    });

    const idTimeout = setTimeout(() => mapa.invalidateSize(), 0);

    return () => {
      clearTimeout(idTimeout);
      mapa.remove();
      mapaRef.current = null;
      capaRef.current = null;
    };
  }, []);

  // Redibuja los marcadores numerados y la línea del recorrido cada vez que
  // cambia la lista de puntos (agregar, deshacer, limpiar).
  useEffect(() => {
    const capa = capaRef.current;
    if (!capa) return;
    capa.clearLayers();

    puntos.forEach((punto, indice) => {
      L.marker(punto, { icon: iconoPunto })
        .bindTooltip(String(indice + 1), { permanent: true, direction: "top", offset: [0, -10] })
        .addTo(capa);
    });

    if (puntos.length > 1) {
      L.polyline(puntos, { color: "#0369a1", weight: 3 }).addTo(capa);
    }
  }, [puntos]);

  return <div ref={contenedorRef} className="h-[420px] w-full rounded-xl border border-slate-300" />;
}

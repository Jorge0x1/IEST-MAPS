"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { agregarCapaBase, type CapaBase } from "@/app/components/mapa-base";
import { SelectorPiso } from "./selector-piso";

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

// Grafo ya registrado, dibujado de referencia (no editable) debajo del trazo.
export type NodoExistente = { id: string; nombre: string; tipo: string; piso: number; lat: number; lng: number };
export type ConexionExistente = { nodo_origen_id: string; nodo_destino_id: string };

const COLOR_EXISTENTE = "#64748b";

export function PathDrawer({
  puntos,
  onPuntosChange,
  piso,
  onPisoChange,
  nodosExistentes = [],
  conexionesExistentes = [],
}: {
  puntos: PuntoTrazo[];
  onPuntosChange: (puntos: PuntoTrazo[]) => void;
  // Piso cuyo plano se ve; lo controla el formulario para que coincida con el piso
  // donde se van a crear los nodos.
  piso: number | null;
  onPisoChange: (piso: number) => void;
  nodosExistentes?: NodoExistente[];
  conexionesExistentes?: ConexionExistente[];
}) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<L.Map | null>(null);
  const capaRef = useRef<L.LayerGroup | null>(null);
  const capaBaseRef = useRef<CapaBase | null>(null);
  const capaExistentesRef = useRef<L.LayerGroup | null>(null);
  const pisoRef = useRef(piso);
  const puntosRef = useRef(puntos);
  const onCambioRef = useRef(onPuntosChange);

  // Las refs se actualizan después de cada render (no durante), para que el
  // manejador de clic del mapa siempre lea los puntos y el callback vigentes.
  useEffect(() => {
    puntosRef.current = puntos;
    onCambioRef.current = onPuntosChange;
    pisoRef.current = piso;
  });

  // El mapa se crea una sola vez. El punto se agrega leyendo de una ref para
  // no tener que reiniciar el mapa (y perder el zoom/centro) en cada clic.
  useEffect(() => {
    if (!contenedorRef.current) return;

    const mapa = L.map(contenedorRef.current, {
      center: puntosRef.current[0] ?? CENTRO_CAMPUS,
      zoom: 18,
    });
    mapaRef.current = mapa;

    capaBaseRef.current = agregarCapaBase(mapa, pisoRef.current);

    // Primero lo existente para que el trazo nuevo quede encima.
    capaExistentesRef.current = L.layerGroup().addTo(mapa);
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
      capaExistentesRef.current = null;
      capaBaseRef.current = null;
    };
  }, []);

  // Cambia el plano cuando cambia el piso elegido en el formulario o en el selector.
  useEffect(() => {
    capaBaseRef.current?.cambiarPiso(piso);
  }, [piso]);

  // Nodos y conexiones ya registrados en el piso visible. No capturan el clic
  // (bubbling): tocar encima de uno agrega un punto del trazo como siempre.
  useEffect(() => {
    const capa = capaExistentesRef.current;
    if (!capa) return;
    capa.clearLayers();
    if (nodosExistentes.length === 0) return;

    const porId = new Map(nodosExistentes.map((nodo) => [nodo.id, nodo]));
    for (const conexion of conexionesExistentes) {
      const a = porId.get(conexion.nodo_origen_id);
      const b = porId.get(conexion.nodo_destino_id);
      if (!a || !b || a.piso !== piso || b.piso !== piso) continue;
      L.polyline([[a.lat, a.lng], [b.lat, b.lng]], {
        color: COLOR_EXISTENTE, weight: 3, opacity: 0.55, interactive: false,
      }).addTo(capa);
    }
    for (const nodo of nodosExistentes) {
      if (nodo.piso !== piso) continue;
      L.circleMarker([nodo.lat, nodo.lng], {
        radius: nodo.tipo === "pasillo" ? 3.5 : 5,
        color: "#ffffff",
        weight: 1,
        fillColor: COLOR_EXISTENTE,
        fillOpacity: 0.8,
        bubblingMouseEvents: true,
      })
        .bindTooltip(nodo.nombre, { direction: "top", offset: [0, -4] })
        .addTo(capa);
    }
  }, [nodosExistentes, conexionesExistentes, piso]);

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

  return (
    <div className="grid gap-2">
      <SelectorPiso piso={piso} onPisoChange={onPisoChange} />
      <div ref={contenedorRef} className="h-[420px] w-full rounded-xl border border-slate-300" />
    </div>
  );
}

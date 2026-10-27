"use client";

// Mapa Leaflet del grafo completo. Usa `window`: se carga con next/dynamic y
// ssr: false desde grafo-explorador.tsx.

import { useEffect, useRef } from "react";
import L from "leaflet";
import { CENTRO_CAMPUS, agregarCapaBase, escaparHtml } from "@/app/components/mapa-base";
import { ETIQUETA_TIPO } from "@/app/components/pasos-ruta";
import type { ConexionGrafoAdmin, FocoMapa, NodoGrafoAdmin } from "./grafo-explorador";
import { COLOR_CONEXION, COLOR_ENTRE_PISOS, COLOR_PROBLEMA, COLOR_RUTA, COLOR_TIPO } from "./colores";
import styles from "./grafo.module.css";

type Props = {
  nodos: NodoGrafoAdmin[];
  conexiones: ConexionGrafoAdmin[];
  principal: Set<string>;
  problemas: Set<string>;
  piso: number | null;
  rutaIds: string[];
  origenId: string;
  destinoId: string;
  foco: FocoMapa;
  onElegirNodo: (id: string) => void;
};

const tieneCoords = (n: NodoGrafoAdmin): n is NodoGrafoAdmin & { lat: number; lng: number } =>
  n.lat !== null && n.lng !== null && Number.isFinite(n.lat) && Number.isFinite(n.lng);

export default function MapaGrafo({ nodos, conexiones, principal, problemas, piso, rutaIds, origenId, destinoId, foco, onElegirNodo }: Props) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<L.Map | null>(null);
  const capaGrafoRef = useRef<L.LayerGroup | null>(null);
  const capaRutaRef = useRef<L.LayerGroup | null>(null);
  const marcadoresRef = useRef(new Map<string, L.CircleMarker>());
  const onElegirRef = useRef(onElegirNodo);
  const encuadreRef = useRef<string | null>(null);

  useEffect(() => {
    onElegirRef.current = onElegirNodo;
  });

  useEffect(() => {
    if (!contenedorRef.current) return;
    const mapa = L.map(contenedorRef.current, { center: CENTRO_CAMPUS, zoom: 18 });
    mapaRef.current = mapa;
    agregarCapaBase(mapa);
    capaGrafoRef.current = L.layerGroup().addTo(mapa);
    capaRutaRef.current = L.layerGroup().addTo(mapa);
    const idTimeout = setTimeout(() => mapa.invalidateSize(), 0);
    return () => {
      clearTimeout(idTimeout);
      mapa.remove();
      mapaRef.current = null;
      capaGrafoRef.current = null;
      capaRutaRef.current = null;
    };
  }, []);

  // Nodos y conexiones.
  useEffect(() => {
    const mapa = mapaRef.current;
    const capa = capaGrafoRef.current;
    if (!mapa || !capa) return;
    capa.clearLayers();
    marcadoresRef.current.clear();

    const porId = new Map(nodos.map((n) => [n.id, n]));
    const visible = (n: NodoGrafoAdmin) => piso === null || n.piso === piso;

    for (const c of conexiones) {
      const a = porId.get(c.nodo_origen_id);
      const b = porId.get(c.nodo_destino_id);
      if (!a || !b || !tieneCoords(a) || !tieneCoords(b)) continue;
      if (!visible(a) && !visible(b)) continue;
      const fuera = !principal.has(a.id) || !principal.has(b.id);
      const entrePisos = a.piso !== b.piso;
      L.polyline(
        [[a.lat, a.lng], [b.lat, b.lng]],
        {
          color: fuera ? COLOR_PROBLEMA : entrePisos ? COLOR_ENTRE_PISOS : COLOR_CONEXION,
          weight: 3,
          opacity: 0.85,
          dashArray: c.bidireccional ? undefined : "6 6",
        },
      )
        .bindTooltip(`${escaparHtml(a.nombre)} ${c.bidireccional ? "↔" : "→"} ${escaparHtml(b.nombre)}${entrePisos ? ` (piso ${a.piso} → ${b.piso})` : ""}`, { sticky: true })
        .addTo(capa);
    }

    const dibujados: L.LatLng[] = [];
    for (const n of nodos) {
      if (!tieneCoords(n) || !visible(n)) continue;
      const elegido = n.id === origenId || n.id === destinoId;
      const problema = problemas.has(n.id);
      const marcador = L.circleMarker([n.lat, n.lng], {
        radius: elegido ? 9 : n.tipo === "pasillo" ? 4.5 : 6.5,
        color: elegido ? "#111827" : problema ? COLOR_PROBLEMA : "#ffffff",
        weight: elegido ? 3 : 1.5,
        fillColor: problema ? COLOR_PROBLEMA : (COLOR_TIPO[n.tipo] ?? COLOR_CONEXION),
        fillOpacity: 0.95,
      })
        .bindTooltip(
          `<strong>${escaparHtml(n.nombre)}</strong><br>${ETIQUETA_TIPO[n.tipo] ?? n.tipo} · Piso ${n.piso}` +
            `${n.edificioNombre ? ` · ${escaparHtml(n.edificioNombre)}` : ""}${n.buscable ? "<br>Destino buscable" : ""}` +
            `${n.id === origenId ? "<br><em>Origen</em>" : n.id === destinoId ? "<br><em>Destino</em>" : ""}`,
          { direction: "top", offset: [0, -6] },
        )
        .on("click", () => onElegirRef.current(n.id))
        .addTo(capa);
      marcadoresRef.current.set(n.id, marcador);
      dibujados.push(L.latLng(n.lat, n.lng));
    }

    // Encuadra al cargar y al cambiar de piso, no en cada selección.
    const clave = String(piso);
    if (encuadreRef.current !== clave && dibujados.length > 0) {
      encuadreRef.current = clave;
      if (dibujados.length === 1) mapa.setView(dibujados[0], 19);
      else mapa.fitBounds(L.latLngBounds(dibujados), { padding: [28, 28], maxZoom: 20 });
    }
  }, [nodos, conexiones, principal, problemas, piso, origenId, destinoId]);

  // Ruta probada, encima del grafo.
  useEffect(() => {
    const capa = capaRutaRef.current;
    if (!capa) return;
    capa.clearLayers();
    const porId = new Map(nodos.map((n) => [n.id, n]));
    const coordenadas = rutaIds
      .map((id) => porId.get(id))
      .filter((n): n is NodoGrafoAdmin & { lat: number; lng: number } => !!n && tieneCoords(n))
      .map((n) => L.latLng(n.lat, n.lng));
    if (coordenadas.length > 1) {
      L.polyline(coordenadas, { color: COLOR_RUTA, weight: 7, opacity: 0.8, interactive: false }).addTo(capa);
      mapaRef.current?.fitBounds(L.latLngBounds(coordenadas), { padding: [40, 40], maxZoom: 20 });
    }
  }, [rutaIds, nodos]);

  // Ubicar un nodo desde la lista de problemas.
  useEffect(() => {
    if (!foco) return;
    const marcador = marcadoresRef.current.get(foco.id);
    if (!marcador || !mapaRef.current) return;
    mapaRef.current.setView(marcador.getLatLng(), Math.max(mapaRef.current.getZoom(), 19));
    marcador.openTooltip();
  }, [foco]);

  return <div ref={contenedorRef} className={styles.mapa} role="application" aria-label="Mapa del grafo del campus" />;
}

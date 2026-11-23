"use client";

// Mapa Leaflet del grafo completo. Usa `window`: se carga con next/dynamic y
// ssr: false desde grafo-explorador.tsx.

import { useEffect, useRef } from "react";
import L from "leaflet";
import { CENTRO_CAMPUS, agregarCapaBase, escaparHtml, PISO_PLANTA_BAJA, type CapaBase } from "@/app/components/mapa-base";
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
  // Modo "Conectar": nodo elegido como origen de la próxima conexión y
  // acciones sobre las líneas existentes.
  modoConectar: boolean;
  seleccionadoId: string | null;
  onEliminarConexion: (id: string) => void;
  onCambiarSentido: (id: string, bidireccional: boolean) => void;
};

function botonPopup(texto: string, peligro: boolean, alHacerClic: () => void) {
  const boton = document.createElement("button");
  boton.type = "button";
  boton.textContent = texto;
  boton.className = peligro ? styles.popupBotonPeligro : styles.popupBoton;
  boton.addEventListener("click", alHacerClic);
  return boton;
}

const tieneCoords = (n: NodoGrafoAdmin): n is NodoGrafoAdmin & { lat: number; lng: number } =>
  n.lat !== null && n.lng !== null && Number.isFinite(n.lat) && Number.isFinite(n.lng);

export default function MapaGrafo({
  nodos, conexiones, principal, problemas, piso, rutaIds, origenId, destinoId, foco, onElegirNodo,
  modoConectar, seleccionadoId, onEliminarConexion, onCambiarSentido,
}: Props) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<L.Map | null>(null);
  const capaBaseRef = useRef<CapaBase | null>(null);
  const pisoRef = useRef(piso);
  const capaGrafoRef = useRef<L.LayerGroup | null>(null);
  const capaRutaRef = useRef<L.LayerGroup | null>(null);
  const marcadoresRef = useRef(new Map<string, L.CircleMarker>());
  const onElegirRef = useRef(onElegirNodo);
  const onEliminarRef = useRef(onEliminarConexion);
  const onSentidoRef = useRef(onCambiarSentido);
  const encuadreRef = useRef<string | null>(null);
  const previaRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    onElegirRef.current = onElegirNodo;
    onEliminarRef.current = onEliminarConexion;
    onSentidoRef.current = onCambiarSentido;
  });

  useEffect(() => {
    if (!contenedorRef.current) return;
    const mapa = L.map(contenedorRef.current, { center: CENTRO_CAMPUS, zoom: 18 });
    mapaRef.current = mapa;
    capaBaseRef.current = agregarCapaBase(mapa, pisoRef.current ?? PISO_PLANTA_BAJA);
    capaGrafoRef.current = L.layerGroup().addTo(mapa);
    capaRutaRef.current = L.layerGroup().addTo(mapa);
    const idTimeout = setTimeout(() => mapa.invalidateSize(), 0);
    return () => {
      clearTimeout(idTimeout);
      mapa.remove();
      mapaRef.current = null;
      capaBaseRef.current = null;
      capaGrafoRef.current = null;
      capaRutaRef.current = null;
    };
  }, []);

  // El plano visible sigue al filtro de piso ("todos" muestra el piso 1, la planta baja).
  useEffect(() => {
    pisoRef.current = piso;
    capaBaseRef.current?.cambiarPiso(piso ?? PISO_PLANTA_BAJA);
  }, [piso]);

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
      const linea = L.polyline(
        [[a.lat, a.lng], [b.lat, b.lng]],
        {
          color: fuera ? COLOR_PROBLEMA : entrePisos ? COLOR_ENTRE_PISOS : COLOR_CONEXION,
          // Más gruesa en modo Conectar para que sea fácil atinarle con el clic.
          weight: modoConectar ? 5 : 3,
          opacity: 0.85,
          dashArray: c.bidireccional ? undefined : "6 6",
        },
      )
        .bindTooltip(`${escaparHtml(a.nombre)} ${c.bidireccional ? "↔" : "→"} ${escaparHtml(b.nombre)}${entrePisos ? ` (piso ${a.piso} → ${b.piso})` : ""}`, { sticky: true })
        .addTo(capa);

      if (modoConectar) {
        // Contenido armado con nodos DOM (textContent), sin HTML interpolado.
        const contenido = document.createElement("div");
        contenido.className = styles.popupConexion;
        const titulo = document.createElement("p");
        titulo.textContent = `${a.nombre} ${c.bidireccional ? "↔" : "→"} ${b.nombre}`;
        const acciones = document.createElement("div");
        acciones.append(
          botonPopup(c.bidireccional ? "Hacer de un solo sentido" : "Hacer bidireccional", false, () => {
            mapaRef.current?.closePopup();
            onSentidoRef.current(c.id, !c.bidireccional);
          }),
          botonPopup("Eliminar", true, () => {
            mapaRef.current?.closePopup();
            onEliminarRef.current(c.id);
          }),
        );
        contenido.append(titulo, acciones);
        linea.bindPopup(contenido, { closeButton: true, minWidth: 180 });
      }
    }

    const dibujados: L.LatLng[] = [];
    for (const n of nodos) {
      if (!tieneCoords(n) || !visible(n)) continue;
      const elegido = modoConectar ? n.id === seleccionadoId : n.id === origenId || n.id === destinoId;
      const problema = problemas.has(n.id);
      const marcador = L.circleMarker([n.lat, n.lng], {
        radius: elegido ? 9 : n.tipo === "pasillo" ? (modoConectar ? 6 : 4.5) : 6.5,
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
  }, [nodos, conexiones, principal, problemas, piso, origenId, destinoId, modoConectar, seleccionadoId]);

  // Línea de vista previa desde el nodo elegido hasta el cursor.
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa) return;
    const nodo = modoConectar && seleccionadoId ? nodos.find((n) => n.id === seleccionadoId) : undefined;
    if (!nodo || !tieneCoords(nodo)) return;
    const inicio = L.latLng(nodo.lat, nodo.lng);
    const previa = L.polyline([inicio, inicio], {
      color: COLOR_RUTA, weight: 2.5, dashArray: "5 6", opacity: 0.9, interactive: false,
    }).addTo(mapa);
    previaRef.current = previa;
    const mover = (e: L.LeafletMouseEvent) => previa.setLatLngs([inicio, e.latlng]);
    mapa.on("mousemove", mover);
    return () => {
      mapa.off("mousemove", mover);
      previa.remove();
      previaRef.current = null;
    };
  }, [modoConectar, seleccionadoId, nodos]);

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

  // La clase del modo va en un envoltorio: si React cambiara el className del
  // div de Leaflet, borraría las clases que Leaflet le agrega (leaflet-container…)
  // y el mapa se rompería.
  return (
    <div className={modoConectar ? styles.mapaConectando : undefined}>
      <div ref={contenedorRef} className={styles.mapa} role="application" aria-label="Mapa del grafo del campus" />
    </div>
  );
}

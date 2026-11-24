"use client";

// Mapa Leaflet con la ruta dibujada. Usa `window`, así que solo se importa
// mediante next/dynamic con ssr: false (ver mapa-ruta.tsx).

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import type { PuntoMapa, RolPunto } from "@/lib/rutas/mapa";
import type { Lectura } from "@/lib/ubicacion";
import { htmlMarcador, marcadoresVisibles, TAMANO_MARCADOR, type MarcadorMapa } from "@/lib/marcadores";
import { PISOS_REGISTRADOS } from "@/lib/pisos";
import { CENTRO_CAMPUS, LIMITES_CAMPUS, agregarCapaBase, escaparHtml, etiquetaPiso, PISO_PLANTA_BAJA, type CapaBase } from "./mapa-base";

const COLOR_RUTA = "#ff5900";
const COLOR_UBICACION = "#2563eb";
// Panel propio para la ubicación: encima de la ruta y sus marcadores (600),
// debajo de los tooltips (650).
const PANEL_UBICACION = "ubicacion";
// Panel de los iconos del campus (comida, escaleras, las A…): encima del plano
// (250) y debajo de la línea de la ruta (overlayPane, 400) y de sus pines (600),
// así nunca tapan la ruta ni reciben el toque que era para un pin.
const PANEL_MARCADORES = "marcadores";
const SIN_MARCADORES: MarcadorMapa[] = [];

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
  // Última lectura GPS del alumno. Se muestra en cualquier piso (el GPS no
  // sabe en cuál está la persona).
  ubicacion?: Lectura | null;
  // Navegación en vivo: centra el mapa en `ubicacion` con cada lectura hasta que
  // el usuario arrastre el mapa; "centrar en mí" lo reactiva.
  seguir?: boolean;
  // Si no es null, es el piso que se ve (el de la navegación) y se oculta el selector.
  pisoForzado?: number | null;
  // Iconos del campus (RPC `marcadores_mapa`). Se ven los del piso activo.
  marcadores?: MarcadorMapa[];
  // Al tocar "Ir aquí" en el nombre de un icono de destino buscable. Sin callback, el
  // toque solo muestra el nombre.
  onMarcador?: (id: string) => void;
  // Piso que ve (y en el que está) el alumno antes de pedir una ruta. Si no es null, el
  // mapa lo obedece, el selector lista todos los pisos con plano y cada toque llama a
  // `onPisoVista`. Con null, el selector sigue siendo el de los pisos de la ruta.
  pisoVista?: number | null;
  onPisoVista?: (piso: number) => void;
};

export default function MapaLeafletRuta({
  puntos,
  className = "h-[320px] w-full sm:h-[380px]",
  margenInferior = 0,
  margenSuperior = 0,
  margenIzquierdo = 0,
  controlesZoom = true,
  ubicacion = null,
  seguir = false,
  pisoForzado = null,
  marcadores = SIN_MARCADORES,
  onMarcador,
  pisoVista = null,
  onPisoVista,
}: Props) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<L.Map | null>(null);
  const capaRef = useRef<L.LayerGroup | null>(null);
  const capaBaseRef = useRef<CapaBase | null>(null);
  const capaUbicacionRef = useRef<L.LayerGroup | null>(null);
  const capaMarcadoresRef = useRef<L.LayerGroup | null>(null);
  const [zoom, setZoom] = useState(18);
  // El callback se lee al tocar: cambiarlo no redibuja los iconos.
  const onMarcadorRef = useRef(onMarcador);
  useEffect(() => {
    onMarcadorRef.current = onMarcador;
  }, [onMarcador]);
  const conAccion = onMarcador !== undefined;
  const onPisoVistaRef = useRef(onPisoVista);
  useEffect(() => {
    onPisoVistaRef.current = onPisoVista;
  }, [onPisoVista]);
  // Para no mover el encuadre al cambiar de piso sin ruta: solo se recentra al
  // quitar una ruta que había.
  const habiaRutaRef = useRef(false);
  // El botón "centrar en mí" lee la lectura más reciente sin recrearse.
  const ubicacionRef = useRef(ubicacion);
  useEffect(() => {
    ubicacionRef.current = ubicacion;
  }, [ubicacion]);
  // Mientras se navega, el mapa sigue al usuario salvo que lo haya arrastrado.
  const seguirRef = useRef(seguir);
  const siguiendoRef = useRef(true);
  useEffect(() => {
    seguirRef.current = seguir;
    if (seguir) siguiendoRef.current = true;
  }, [seguir]);

  // Pisos por los que pasa la ruta (en orden de recorrido). El mapa muestra un
  // piso a la vez: su plano y solo los puntos de la ruta que caen en él. La
  // elección se guarda junto a los puntos a los que pertenece: al cambiar de ruta
  // vuelve sola al primer piso, sin efectos que reinicien el estado.
  const pisos = useMemo(() => [...new Set(puntos.map((p) => p.piso))], [puntos]);
  const [elegido, setElegido] = useState<{ puntos: PuntoMapa[]; piso: number } | null>(null);
  const pisoActivo =
    pisoForzado ??
    pisoVista ??
    (elegido && elegido.puntos === puntos && pisos.includes(elegido.piso) ? elegido.piso : (pisos[0] ?? PISO_PLANTA_BAJA));
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
    // pointer-events: none para que el <svg> del panel (que cubre toda la vista)
    // no tape el hover/toque de los marcadores de la ruta; el punto azul sigue
    // siendo interactivo porque Leaflet activa sus `path.leaflet-interactive`.
    const panelUbicacion = mapa.createPane(PANEL_UBICACION);
    panelUbicacion.style.zIndex = "620";
    panelUbicacion.style.pointerEvents = "none";
    capaUbicacionRef.current = L.layerGroup().addTo(mapa);
    mapa.createPane(PANEL_MARCADORES).style.zIndex = "350";
    capaMarcadoresRef.current = L.layerGroup().addTo(mapa);
    mapa.on("zoomend", () => setZoom(mapa.getZoom()));
    mapa.on("dragstart", () => {
      siguiendoRef.current = false;
    });
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
      capaUbicacionRef.current = null;
      capaMarcadoresRef.current = null;
    };
  }, []);

  // Iconos del campus del piso activo (sin nombre escrito: se encimaban). Al tocar uno
  // se abre un globo con su nombre y, si es un destino buscable, el botón "Ir aquí".
  useEffect(() => {
    const capa = capaMarcadoresRef.current;
    if (!capa) return;
    capa.clearLayers();
    const mitad = TAMANO_MARCADOR / 2;
    for (const m of marcadoresVisibles(marcadores, pisoActivo, zoom)) {
      const marcador = L.marker([m.lat, m.lng], {
        pane: PANEL_MARCADORES,
        keyboard: false,
        icon: L.divIcon({
          html: htmlMarcador(m),
          className: "",
          iconSize: [TAMANO_MARCADOR, TAMANO_MARCADOR],
          iconAnchor: [mitad, mitad],
        }),
      });
      // El contenido se arma con nodos del DOM: el nombre viene de la base y así
      // nunca se interpreta como HTML.
      const contenido = document.createElement("div");
      contenido.style.cssText = "display:grid;gap:6px;justify-items:start;font:600 13px/1.25 sans-serif;color:#2f3033";
      const nombre = document.createElement("span");
      nombre.textContent = m.nombre;
      contenido.appendChild(nombre);
      if (conAccion && m.buscable) {
        const ir = document.createElement("button");
        ir.type = "button";
        ir.textContent = "Ir aquí";
        ir.style.cssText =
          "cursor:pointer;padding:5px 10px;border-radius:8px;border:0;background:#ff5900;color:#fff;font:700 12px/1 sans-serif";
        ir.addEventListener("click", () => {
          marcador.closePopup();
          onMarcadorRef.current?.(m.id);
        });
        contenido.appendChild(ir);
      }
      marcador.bindPopup(contenido, { closeButton: false, offset: [0, -mitad + 4], autoPanPadding: [24, 90] });
      marcador.addTo(capa);
    }
  }, [marcadores, pisoActivo, zoom, conAccion]);

  // El plano visible es el del piso activo. Va antes del efecto de la ruta para
  // que el mapa ya tenga el plano correcto cuando se encuadra.
  useEffect(() => {
    capaBaseRef.current?.cambiarPiso(pisoActivo);
  }, [pisoActivo]);

  // Selector de piso (solo si la ruta pasa por más de uno). Es un control de
  // Leaflet arriba a la derecha, bajo la barra de búsqueda si la hay.
  useEffect(() => {
    const mapa = mapaRef.current;
    const lista = pisoVista !== null ? PISOS_REGISTRADOS : pisos;
    if (!mapa || lista.length < 2 || pisoForzado !== null) return;
    const control = new L.Control({ position: "topright" });
    control.onAdd = () => {
      const caja = L.DomUtil.create("div", "");
      caja.setAttribute("role", "group");
      caja.setAttribute("aria-label", "Piso del mapa");
      caja.style.cssText =
        `display:flex;flex-direction:column;gap:4px;margin-top:${margenesRef.current.margenSuperior + 10}px;margin-right:10px;`;
      for (const piso of lista) {
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
        L.DomEvent.on(boton, "click", () => {
          if (pisoVista !== null) onPisoVistaRef.current?.(piso);
          else setElegido({ puntos, piso });
        });
      }
      L.DomEvent.disableClickPropagation(caja);
      return caja;
    };
    control.addTo(mapa);
    return () => {
      control.remove();
    };
  }, [pisos, pisoActivo, puntos, pisoForzado, pisoVista]);

  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa || !controlesZoom) return;
    const control = L.control.zoom({ position: "bottomright" }).addTo(mapa);
    return () => {
      control.remove();
    };
  }, [controlesZoom]);

  // Punto azul con el círculo de precisión. No se re-encuadra con cada lectura
  // para no mover el mapa mientras la persona lo explora.
  useEffect(() => {
    const capa = capaUbicacionRef.current;
    if (!capa) return;
    capa.clearLayers();
    if (!ubicacion) return;
    const centro = L.latLng(ubicacion.lat, ubicacion.lng);
    L.circle(centro, {
      pane: PANEL_UBICACION,
      radius: ubicacion.precision,
      color: COLOR_UBICACION,
      weight: 1,
      opacity: 0.4,
      fillColor: COLOR_UBICACION,
      fillOpacity: 0.12,
      interactive: false,
    }).addTo(capa);
    L.circleMarker(centro, {
      pane: PANEL_UBICACION,
      radius: 8,
      color: "#ffffff",
      weight: 3,
      fillColor: COLOR_UBICACION,
      fillOpacity: 1,
    })
      .bindTooltip("Tú estás aquí", { direction: "top", offset: [0, -8] })
      .addTo(capa);
    const mapa = mapaRef.current;
    if (mapa && seguirRef.current && siguiendoRef.current) {
      mapa.setView(centro, Math.max(mapa.getZoom(), 19), { animate: true });
    }
  }, [ubicacion]);

  // Botón "centrar en mí" (abajo a la derecha), solo cuando hay ubicación. Se
  // sube lo que tape el panel inferior (móvil con destino elegido).
  const hayUbicacion = ubicacion !== null;
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa || !hayUbicacion) return;
    const control = new L.Control({ position: "bottomright" });
    control.onAdd = () => {
      const boton = L.DomUtil.create("button", "");
      boton.type = "button";
      boton.textContent = "◎";
      boton.title = "Centrar en mi ubicación";
      boton.setAttribute("aria-label", "Centrar en mi ubicación");
      boton.style.cssText =
        `margin-bottom:${margenInferior + 10}px;` +
        "cursor:pointer;width:36px;height:36px;border-radius:8px;border:2px solid #ffffff;" +
        `background:#fff;color:${COLOR_UBICACION};font:700 20px/1 sans-serif;` +
        "box-shadow:0 1px 4px rgb(0 0 0 / .3);";
      L.DomEvent.disableClickPropagation(boton);
      L.DomEvent.on(boton, "click", () => {
        const actual = ubicacionRef.current;
        siguiendoRef.current = true;
        if (actual) mapa.setView([actual.lat, actual.lng], Math.max(mapa.getZoom(), 19));
      });
      return boton;
    };
    control.addTo(mapa);
    return () => {
      control.remove();
    };
  }, [hayUbicacion, margenInferior]);

  // Redibuja la ruta y encuadra el mapa cada vez que cambia.
  useEffect(() => {
    const mapa = mapaRef.current;
    const capa = capaRef.current;
    if (!mapa || !capa) return;
    capa.clearLayers();
    const habiaRuta = habiaRutaRef.current;
    habiaRutaRef.current = puntos.length > 0;
    // Solo se dibuja el tramo de la ruta que está en el piso activo.
    const visibles = puntos.filter((p) => p.piso === pisoActivo);
    // Navegando, el encuadre lo manda la ubicación (no se re-encuadra la ruta).
    const siguiendo = seguirRef.current && siguiendoRef.current && ubicacionRef.current !== null;
    if (visibles.length === 0) {
      // Sin ruta (ni una que se acaba de quitar) no se mueve el mapa: cambiar de piso
      // no debe devolverlo al centro ni cambiar el zoom.
      if (!siguiendo && (puntos.length > 0 || habiaRuta)) mapa.setView(CENTRO_CAMPUS, 18);
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
    if (siguiendo) return;
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

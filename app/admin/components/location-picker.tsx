"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import L from "leaflet";
import styles from "./location-picker.module.css";

// Centro aproximado del campus, mientras no tengamos el mapa/SVG definitivo.
const CENTRO_CAMPUS: [number, number] = [22.323777, -97.880432];

// Íconos servidos desde CDN para no depender de que el bundler copie los
// PNG de Leaflet como assets estáticos (bug clásico de Leaflet + Next.js).
const iconoPredeterminado = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

type Punto = { lat: number; lng: number };

export function LocationPicker({
  latName,
  lngName,
  lat,
  lng,
}: {
  latName: string;
  lngName: string;
  lat?: number | null;
  lng?: number | null;
}) {
  const puntoInicial = lat != null && lng != null ? { lat, lng } : null;
  const [punto, setPunto] = useState<Punto | null>(puntoInicial);
  const [latitudVisible, setLatitudVisible] = useState(
    puntoInicial ? String(puntoInicial.lat) : "",
  );
  const [longitudVisible, setLongitudVisible] = useState(
    puntoInicial ? String(puntoInicial.lng) : "",
  );
  const [errorCoordenadas, setErrorCoordenadas] = useState("");
  const [expandido, setExpandido] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<L.Map | null>(null);
  const marcadorRef = useRef<L.Marker | null>(null);
  const puntoInicialRef = useRef(punto);
  const idBase = useId();

  const actualizarPunto = useCallback(
    (nuevoPunto: Punto, centrarMapa = false) => {
      puntoInicialRef.current = nuevoPunto;
      setPunto(nuevoPunto);
      setLatitudVisible(String(nuevoPunto.lat));
      setLongitudVisible(String(nuevoPunto.lng));
      setErrorCoordenadas("");

      const mapa = mapaRef.current;
      if (!mapa) return;

      if (marcadorRef.current) {
        marcadorRef.current.setLatLng(nuevoPunto);
      } else {
        marcadorRef.current = L.marker(nuevoPunto, {
          icon: iconoPredeterminado,
        }).addTo(mapa);
      }

      if (centrarMapa) mapa.panTo(nuevoPunto);
    },
    [],
  );

  // El mapa se (re)crea al montar y al expandir/reducir, porque Leaflet
  // necesita medir el contenedor final. El punto seleccionado se lee de una
  // ref para no reiniciar el mapa (y perder el zoom/centro) en cada clic.
  useEffect(() => {
    if (!contenedorRef.current) return;

    const puntoActual = puntoInicialRef.current;
    const mapa = L.map(contenedorRef.current, {
      center: puntoActual ?? CENTRO_CAMPUS,
      zoom: puntoActual ? 19 : 17,
    });
    mapaRef.current = mapa;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 20,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapa);

    if (puntoActual) {
      marcadorRef.current = L.marker(puntoActual, { icon: iconoPredeterminado }).addTo(mapa);
    }

    mapa.on("click", (evento: L.LeafletMouseEvent) => {
      const nuevoPunto: Punto = {
        lat: Number(evento.latlng.lat.toFixed(6)),
        lng: Number(evento.latlng.lng.toFixed(6)),
      };
      actualizarPunto(nuevoPunto);
    });

    const idTimeout = setTimeout(() => mapa.invalidateSize(), 0);

    return () => {
      clearTimeout(idTimeout);
      mapa.remove();
      mapaRef.current = null;
      marcadorRef.current = null;
    };
  }, [actualizarPunto, expandido]);

  function aplicarCoordenadas() {
    const latitudNormalizada = latitudVisible.trim();
    const longitudNormalizada = longitudVisible.trim();

    if (!latitudNormalizada || !longitudNormalizada) {
      setErrorCoordenadas("Captura la latitud y la longitud.");
      return;
    }

    const nuevaLatitud = Number(latitudNormalizada);
    const nuevaLongitud = Number(longitudNormalizada);

    if (!Number.isFinite(nuevaLatitud) || !Number.isFinite(nuevaLongitud)) {
      setErrorCoordenadas("Usa coordenadas numéricas válidas.");
      return;
    }

    if (
      nuevaLatitud < -90 ||
      nuevaLatitud > 90 ||
      nuevaLongitud < -180 ||
      nuevaLongitud > 180
    ) {
      setErrorCoordenadas(
        "La latitud debe estar entre -90 y 90, y la longitud entre -180 y 180.",
      );
      return;
    }

    actualizarPunto({ lat: nuevaLatitud, lng: nuevaLongitud }, true);
  }

  function quitarPunto() {
    puntoInicialRef.current = null;
    setPunto(null);
    setLatitudVisible("");
    setLongitudVisible("");
    setErrorCoordenadas("");
    if (marcadorRef.current && mapaRef.current) {
      mapaRef.current.removeLayer(marcadorRef.current);
      marcadorRef.current = null;
    }
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">Ubicación (opcional)</span>
        <button
          type="button"
          onClick={() => setExpandido((valor) => !valor)}
          className="text-xs font-semibold text-sky-700 hover:underline"
        >
          {expandido ? "Reducir mapa" : "Expandir mapa"}
        </button>
      </div>

      <div
        ref={contenedorRef}
        className={`w-full rounded-xl border border-slate-300 ${expandido ? "h-[480px]" : "h-[220px]"}`}
      />

      <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
        <span>
          {punto ? `${punto.lat.toFixed(6)}, ${punto.lng.toFixed(6)}` : "Toca el mapa para marcar la ubicación."}
        </span>
        {punto ? (
          <button type="button" onClick={quitarPunto} className="shrink-0 font-semibold text-red-700 hover:underline">
            Quitar
          </button>
        ) : null}
      </div>

      <div className={styles.coordinatePanel}>
        <p id={`${idBase}-hint`} className={styles.coordinateIntro}>
          También puedes escribir las coordenadas y aplicarlas al mapa.
        </p>

        <div className={styles.coordinateGrid}>
          <label className={styles.field} htmlFor={`${idBase}-lat`}>
            <span>Latitud</span>
            <input
              id={`${idBase}-lat`}
              className={styles.control}
              type="number"
              inputMode="decimal"
              min={-90}
              max={90}
              step="any"
              value={latitudVisible}
              aria-describedby={`${idBase}-hint${errorCoordenadas ? ` ${idBase}-error` : ""}`}
              aria-invalid={Boolean(errorCoordenadas)}
              onChange={(evento) => {
                setLatitudVisible(evento.target.value);
                setErrorCoordenadas("");
              }}
            />
          </label>

          <label className={styles.field} htmlFor={`${idBase}-lng`}>
            <span>Longitud</span>
            <input
              id={`${idBase}-lng`}
              className={styles.control}
              type="number"
              inputMode="decimal"
              min={-180}
              max={180}
              step="any"
              value={longitudVisible}
              aria-describedby={`${idBase}-hint${errorCoordenadas ? ` ${idBase}-error` : ""}`}
              aria-invalid={Boolean(errorCoordenadas)}
              onChange={(evento) => {
                setLongitudVisible(evento.target.value);
                setErrorCoordenadas("");
              }}
            />
          </label>
        </div>

        <div className={styles.coordinateActions}>
          <button
            type="button"
            className={styles.applyButton}
            onClick={aplicarCoordenadas}
          >
            Aplicar coordenadas
          </button>

          {errorCoordenadas ? (
            <p
              id={`${idBase}-error`}
              className={styles.coordinateError}
              role="alert"
            >
              {errorCoordenadas}
            </p>
          ) : null}
        </div>
      </div>

      <input type="hidden" name={latName} value={punto?.lat ?? ""} />
      <input type="hidden" name={lngName} value={punto?.lng ?? ""} />
    </div>
  );
}

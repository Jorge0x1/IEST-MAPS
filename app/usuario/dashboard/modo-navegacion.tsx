"use client";

// Modo navegación del alumno (GPS fase 2): indicación actual arriba, barra con lo
// que falta abajo y ventana de cambio de piso. La lógica vive en
// lib/rutas/navegacion.ts; aquí solo se le pasan las lecturas y los toques, y se
// ejecutan sus efectos (avisos y recálculo de la ruta).
//
// Las lecturas nuevas se procesan durante el render (no en un efecto) y los
// efectos que devuelve la máquina se encolan con un id: un useEffect ejecuta los
// que aún no ha ejecutado (lleva la cuenta en una ref).
import { useEffect, useRef, useState } from "react";
import { calcularRutaDesdeUbicacion, type PasoRutaDetallado } from "@/lib/rutas/actions";
import {
  avanzar,
  esManual,
  indicacionActual,
  iniciarNavegacion,
  metrosRestantes,
  pisoActual,
  preguntaPiso,
  puedeDeclararLlegada,
  textoIndicacion,
  type AccionNavegacion,
  type Efecto,
  type EstadoNavegacion,
  type Indicacion,
} from "@/lib/rutas/navegacion";
import type { Lectura } from "@/lib/ubicacion";
import { useUbicacion } from "@/app/components/use-ubicacion";
import { usePantallaEncendida, type useAvisos } from "@/app/components/use-avisos";
import { TarjetaLlegada } from "./tarjeta-llegada";

type Avisos = ReturnType<typeof useAvisos>;

// Efectos encolados; solo se guardan los últimos para no crecer sin límite.
const MAX_COLA = 20;

type Nav = {
  estado: EstadoNavegacion;
  cola: { id: number; efecto: Efecto }[];
  ultimoId: number;
  lectura: Lectura | null;
};

function aplicar(nav: Nav, accion: AccionNavegacion): Nav {
  const { estado, efectos } = avanzar(nav.estado, accion);
  if (estado === nav.estado && efectos.length === 0) return nav;
  let ultimoId = nav.ultimoId;
  const nuevos = efectos.map((efecto) => ({ id: ++ultimoId, efecto }));
  return { ...nav, estado, ultimoId, cola: [...nav.cola, ...nuevos].slice(-MAX_COLA) };
}

export function ModoNavegacion({
  pasos,
  destinoId,
  destinoNombre,
  destinoLugar,
  evitarEscaleras,
  avisos,
  onRutaNueva,
  onPiso,
  onSalir,
  onListo,
  onBuscarOtro,
}: {
  pasos: PasoRutaDetallado[];
  destinoId: string;
  destinoNombre: string;
  destinoLugar: string;
  evitarEscaleras: boolean;
  avisos: Avisos;
  onRutaNueva: (pasos: PasoRutaDetallado[]) => void;
  onPiso: (piso: number) => void;
  onSalir: () => void;
  onListo: () => void;
  onBuscarOtro: () => void;
}) {
  const ubicacion = useUbicacion();
  const lectura = ubicacion.estado === "ok" ? ubicacion.lectura : null;
  const [nav, setNav] = useState<Nav>(() => ({ estado: iniciarNavegacion(pasos), cola: [], ultimoId: 0, lectura: null }));
  const [errorRecalculo, setErrorRecalculo] = useState<string | null>(null);

  // Lectura nueva → acción "lectura" (ajuste de estado durante el render).
  if (lectura !== nav.lectura) {
    let siguiente: Nav = { ...nav, lectura };
    if (lectura) {
      siguiente = aplicar(siguiente, { tipo: "lectura", lat: lectura.lat, lng: lectura.lng, precision: lectura.precision, ahora: lectura.fecha });
    }
    setNav(siguiente);
    // De vuelta en la ruta, el aviso de un recálculo fallido ya no aplica.
    if (errorRecalculo && siguiente.estado.lecturasFuera === 0 && !siguiente.estado.gpsImpreciso) setErrorRecalculo(null);
  }

  const despachar = (accion: AccionNavegacion) => setNav((actual) => aplicar(actual, accion));

  // Datos que leen los efectos sin volver a suscribirse.
  const lecturaRef = useRef(lectura);
  const propsRef = useRef({ destinoId, evitarEscaleras, onRutaNueva, avisar: avisos.avisar });
  useEffect(() => {
    lecturaRef.current = lectura;
    propsRef.current = { destinoId, evitarEscaleras, onRutaNueva, avisar: avisos.avisar };
  });

  const montadoRef = useRef(true);
  useEffect(() => {
    montadoRef.current = true;
    return () => {
      montadoRef.current = false;
    };
  }, []);

  // Ejecuta los efectos encolados que aún no se ejecutan.
  const ejecutadoRef = useRef(0);
  useEffect(() => {
    for (const { id, efecto } of nav.cola) {
      if (id <= ejecutadoRef.current) continue;
      ejecutadoRef.current = id;
      if (efecto.tipo === "aviso") {
        propsRef.current.avisar(efecto.clase);
        continue;
      }
      const l = lecturaRef.current;
      if (!l) continue;
      const { destinoId: destino, evitarEscaleras: sinEscaleras } = propsRef.current;
      calcularRutaDesdeUbicacion({ lat: l.lat, lng: l.lng, precision: l.precision }, destino, { evitarEscaleras: sinEscaleras })
        .then((resultado) => {
          if (!montadoRef.current) return;
          if (resultado.ok) {
            setNav((actual) => aplicar(actual, { tipo: "ruta_nueva", pasos: resultado.pasos, ahora: Date.now() }));
            setErrorRecalculo(null);
            propsRef.current.onRutaNueva(resultado.pasos);
          } else if (resultado.motivo === "ya_en_destino") {
            setNav((actual) => aplicar(actual, { tipo: "llegar" }));
          } else {
            setErrorRecalculo(resultado.mensaje);
          }
        })
        .catch(() => {
          if (montadoRef.current) setErrorRecalculo("Revisa tu conexión.");
        });
    }
  }, [nav.cola]);

  const { estado } = nav;
  const piso = pisoActual(estado);
  useEffect(() => {
    onPiso(piso);
  }, [piso, onPiso]);

  // Al llegar no se sale sola de la navegación: la tarjeta espera a que la persona toque un botón.
  const llego = estado.fase === "llegada";

  usePantallaEncendida(true);

  const indicacion = indicacionActual(estado);
  const { titulo, detalle } = textoIndicacion(indicacion);
  const manual = esManual(estado);
  const restantes = metrosRestantes(estado);
  const pregunta = preguntaPiso(estado);
  const ultimaManual = manual && indicacion.metros === null && indicacion.maniobra === "llegada";
  // Sin señal o con señal imprecisa en un tramo con GPS, el alumno puede avanzar a
  // mano para no quedarse atorado (por ejemplo, dentro de un edificio).
  const sinSenal = ubicacion.estado !== "ok";
  const avanceAMano = manual || sinSenal || estado.gpsImpreciso;
  const ultimaManiobra = !manual && indicacion.maniobra === "llegada";
  const cercaDelFinal = puedeDeclararLlegada(estado);

  if (llego) {
    return <TarjetaLlegada destino={destinoNombre} lugar={destinoLugar} onListo={onListo} onBuscarOtro={onBuscarOtro} />;
  }

  return (
    <>
      {/* Indicación actual */}
      <div className="absolute inset-x-3 top-3 z-30 mx-auto max-w-xl md:inset-x-auto md:left-4 md:top-4 md:mx-0 md:w-[368px]">
        <div role="status" aria-live="polite" className="flex items-center gap-3 rounded-2xl bg-[var(--brand-primary)] p-4 text-white shadow-lg">
          <IconoManiobra maniobra={indicacion.maniobra} />
          <div className="min-w-0">
            <p className="text-lg font-bold leading-tight">{titulo}</p>
            {detalle ? <p className="mt-0.5 text-sm text-white/85">{detalle}</p> : null}
            {!manual && sinSenal ? <p className="mt-1 text-xs font-semibold text-white/90">Sin señal de GPS: avanza con «Siguiente».</p> : null}
            {!manual && !sinSenal && estado.gpsImpreciso ? <p className="mt-1 text-xs font-semibold text-white/90">GPS impreciso: sigue con cuidado o avanza con «Siguiente».</p> : null}
            {errorRecalculo ? <p className="mt-1 text-xs font-semibold text-white/90">No pudimos recalcular: {errorRecalculo}</p> : null}
          </div>
        </div>
        {estado.fase === "esperando_piso" && pregunta ? (
          <button
            type="button"
            onClick={() => despachar({ tipo: "confirmar_piso" })}
            className="mt-2 w-full rounded-xl bg-white px-4 py-3 font-semibold text-[var(--brand-primary-active)] shadow-lg ring-1 ring-black/5"
          >
            {textoConfirmarPiso(indicacion)}
          </button>
        ) : null}
      </div>

      {/* Barra inferior */}
      <div className="absolute inset-x-3 bottom-3 z-30 mx-auto max-w-xl md:inset-x-auto md:left-4 md:mx-0 md:w-[368px]">
        <div className="flex items-center gap-2 rounded-2xl bg-white p-3 shadow-lg ring-1 ring-black/5">
          <div className="min-w-0 flex-1">
            <p className="font-bold text-slate-900">{restantes !== null ? `Faltan ${Math.max(5, Math.round(restantes / 5) * 5)} m` : `Piso ${piso}`}</p>
            <p className="text-xs text-slate-500">{manual ? "Avanza con el botón al llegar a cada punto" : `Piso ${piso} · siguiendo tu ubicación`}</p>
          </div>
          <button
            type="button"
            onClick={() => avisos.setSilencio(!avisos.silencio)}
            aria-pressed={avisos.silencio}
            aria-label={avisos.silencio ? "Activar sonido" : "Silenciar avisos"}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
          >
            <IconoSonido silencio={avisos.silencio} />
          </button>
          {(avanceAMano || cercaDelFinal) && estado.fase === "caminando" ? (
            <button
              type="button"
              onClick={() => despachar({ tipo: "siguiente" })}
              className="shrink-0 rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 font-semibold text-white hover:bg-[var(--brand-primary-hover)]"
            >
              {ultimaManual || ultimaManiobra || cercaDelFinal ? "Ya llegué" : "Siguiente"}
            </button>
          ) : null}
          <button type="button" onClick={onSalir} className="shrink-0 rounded-xl border border-[var(--border-strong)] px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-50">
            Salir
          </button>
        </div>
      </div>

      {/* Ventana de cambio de piso */}
      {estado.fase === "preguntando_piso" && pregunta ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div role="dialog" aria-modal="true" aria-labelledby="pregunta-piso" className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <p id="pregunta-piso" className="text-lg font-bold text-slate-950">{pregunta}</p>
            <p className="mt-1 text-sm text-slate-600">{titulo}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => despachar({ tipo: "todavia_no" })} className="rounded-xl border border-[var(--border-strong)] px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50">
                Todavía no
              </button>
              <button type="button" autoFocus onClick={() => despachar({ tipo: "confirmar_piso" })} className="rounded-xl bg-[var(--brand-primary)] px-4 py-3 font-semibold text-white hover:bg-[var(--brand-primary-hover)]">
                Sí
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

// Texto del botón para confirmar el cambio de piso después de "Todavía no".
function textoConfirmarPiso(indicacion: Indicacion): string {
  const hasta = indicacion.piso ? ` al piso ${indicacion.piso.hasta}` : "";
  if (indicacion.maniobra === "elevador") return `Ya llegué${hasta}`;
  return indicacion.piso?.sentido === "baja" ? `Ya bajé${hasta}` : `Ya subí${hasta}`;
}

function IconoManiobra({ maniobra }: { maniobra: Indicacion["maniobra"] }) {
  const comun = { viewBox: "0 0 24 24", className: "h-10 w-10 shrink-0", fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  switch (maniobra) {
    case "izquierda":
      return <svg {...comun}><path d="M16 20v-7a3 3 0 0 0-3-3H5M9 6l-4 4 4 4" /></svg>;
    case "derecha":
      return <svg {...comun}><path d="M8 20v-7a3 3 0 0 1 3-3h8M15 6l4 4-4 4" /></svg>;
    case "escalera":
      return <svg {...comun}><path d="M3 20h5v-5h5v-5h5V5h3" /></svg>;
    case "elevador":
      return <svg {...comun}><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 10l3-3 3 3M9 14l3 3 3-3" /></svg>;
    case "llegada":
      return <svg {...comun}><path d="M12 21s-6-5.4-6-11a6 6 0 0 1 12 0c0 5.6-6 11-6 11Z" /><circle cx="12" cy="10" r="2" /></svg>;
    default:
      return <svg {...comun}><path d="M12 20V4M6 10l6-6 6 6" /></svg>;
  }
}

function IconoSonido({ silencio }: { silencio: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      {silencio ? <path d="m22 9-6 6M16 9l6 6" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />}
    </svg>
  );
}

// Marcadores del mapa: iconos de escaleras, elevadores y baños (salen solos de
// `nodos.tipo`) y de los destinos con categoría (`nodos.icono`, migración 0011),
// con logo opcional (`nodos.logo_path`). Aquí vive la lógica sin Leaflet: qué se
// ve en cada piso y zoom, y el HTML de cada marcador. Sin dependencias del
// servidor, así que sirve en server y client components y en las pruebas.
import { BUCKET_DESTINOS } from "./fotos.ts";
import { escaparHtml } from "./html.ts";

export const CATEGORIAS_ICONO = ["comida", "cafe", "monumento", "tienda", "deporte", "servicio"] as const;
export type CategoriaIcono = (typeof CATEGORIAS_ICONO)[number];

export const ETIQUETA_ICONO: Record<CategoriaIcono, string> = {
  comida: "Comida",
  cafe: "Café",
  monumento: "Monumento",
  tienda: "Tienda",
  deporte: "Deporte",
  servicio: "Servicio",
};

const TIPOS_CON_ICONO = ["escalera", "elevador", "bano"] as const;
type TipoConIcono = (typeof TIPOS_CON_ICONO)[number];
export type ClaseMarcador = CategoriaIcono | TipoConIcono;

export type MarcadorMapa = {
  id: string;
  nombre: string;
  clase: ClaseMarcador;
  piso: number;
  lat: number;
  lng: number;
  buscable: boolean;
  logoUrl: string | null;
};

// Fila que devuelve la RPC `marcadores_mapa()` (migración 0011).
export type FilaMarcador = {
  id: string;
  nombre: string;
  tipo: string;
  icono: string | null;
  logo_path: string | null;
  piso: number;
  lat: number | null;
  lng: number | null;
  buscable: boolean;
};

// Formato que exige la migración 0011: <uuid v4 en minúsculas>.png|webp. Nunca SVG:
// en un bucket público un SVG puede llevar scripts.
export const RE_LOGO_DESTINO = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|webp)$/;

export function urlLogoDestino(path: string | null | undefined): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!path || !base || !RE_LOGO_DESTINO.test(path)) return null;
  return `${base}/storage/v1/object/public/${BUCKET_DESTINOS}/${path}`;
}

function esCategoria(valor: string | null): valor is CategoriaIcono {
  return valor !== null && (CATEGORIAS_ICONO as readonly string[]).includes(valor);
}

export function aMarcador(fila: FilaMarcador): MarcadorMapa | null {
  if (fila.lat === null || fila.lng === null) return null;
  let clase: ClaseMarcador | null = null;
  if (fila.icono !== null) {
    if (!esCategoria(fila.icono)) return null;
    clase = fila.icono;
  } else if ((TIPOS_CON_ICONO as readonly string[]).includes(fila.tipo)) {
    clase = fila.tipo as TipoConIcono;
  }
  if (!clase) return null;
  return {
    id: fila.id,
    nombre: fila.nombre,
    clase,
    piso: fila.piso,
    lat: fila.lat,
    lng: fila.lng,
    buscable: fila.buscable,
    logoUrl: urlLogoDestino(fila.logo_path),
  };
}

// Con el mapa alejado, escaleras y baños saturan: solo se ven de este zoom en adelante.
const ZOOM_MINIMO_SERVICIOS = 17;
// Los nombres junto a los iconos, solo de cerca.
const ZOOM_MINIMO_ETIQUETA = 19;

export function marcadoresVisibles(marcadores: MarcadorMapa[], piso: number, zoom: number): MarcadorMapa[] {
  return marcadores.filter(
    (m) => m.piso === piso && (esCategoria(m.clase) || zoom >= ZOOM_MINIMO_SERVICIOS),
  );
}

export function mostrarEtiqueta(zoom: number): boolean {
  return zoom >= ZOOM_MINIMO_ETIQUETA;
}

const COLOR: Record<ClaseMarcador, string> = {
  comida: "#e8590c",
  cafe: "#8a5a3b",
  monumento: "#c2255c",
  tienda: "#7048e8",
  deporte: "#2b8a3e",
  servicio: "#495057",
  escalera: "#0369a1",
  elevador: "#0369a1",
  bano: "#1c7ed6",
};

export function colorMarcador(clase: ClaseMarcador): string {
  return COLOR[clase];
}

// Glifos blancos dibujados en un cuadro de -7 a 7 (trazo, salvo los que dicen fill).
const GLIFO: Record<ClaseMarcador, string> = {
  comida: '<path d="M-2.6,-4 v3 a1.4,1.4 0 0 0 2.8,0 v-3 M-1.2,-4 v8 M2.4,-4 c-1.4,0 -1.4,4 0,4 v4"/>',
  cafe: '<path d="M-3.6,-1.5 h5.4 v2 a2.7,2.7 0 0 1 -5.4,0 z M1.8,-0.8 h0.8 a1.2,1.2 0 0 1 0,2.4 h-1 M-2.4,-4 q0.6,-0.8 0,-1.4 M0,-4 q0.6,-0.8 0,-1.4 M-4,3.6 h6.6"/>',
  monumento: '<path fill="#fff" stroke="none" d="M0,-4.6 l1.35,2.8 3.05,.45 -2.2,2.15 .52,3.05 -2.72,-1.45 -2.72,1.45 .52,-3.05 -2.2,-2.15 3.05,-.45 z"/>',
  tienda: '<path d="M-3.6,-1.6 h7.2 l-.6,5.4 h-6 z M-1.6,-1.6 v-1.2 a1.6,1.6 0 0 1 3.2,0 v1.2"/>',
  deporte: '<circle r="3.9"/><path d="M0,-1.6 l1.5,1.1 -.6,1.8 h-1.8 l-.6,-1.8 z M0,-1.6 v-2.3 M1.5,-.5 l2.2,-.7 M.9,1.3 l1.3,1.9 M-.9,1.3 l-1.3,1.9 M-1.5,-.5 l-2.2,-.7"/>',
  servicio: '<path d="M0,-.6 v4"/><circle cy="-3" r=".5" fill="#fff"/>',
  escalera: '<path d="M-4,3.5 h2.6 v-2.4 h2.6 v-2.4 h2.6 v-2.4 h.9"/>',
  elevador: '<rect x="-3.6" y="-4.2" width="7.2" height="8.4" rx="1"/><path d="M-1.6,-.6 l1.6,-2 1.6,2 M-1.6,.8 l1.6,2 1.6,-2"/>',
  bano: '<circle cx="-2.2" cy="-3.2" r=".9" fill="#fff"/><circle cx="2.2" cy="-3.2" r=".9" fill="#fff"/><path d="M-2.2,-1.6 v5.2 M-3.4,-.6 h2.4 M2.2,-1.6 l-1.4,3.4 h2.8 z M1.6,1.8 v1.8 M2.8,1.8 v1.8 M0,-4.4 v8.4"/>',
};

export const TAMANO_MARCADOR = 28;

// HTML del marcador para un L.divIcon (28×28 px, anclado al centro del círculo).
// El nombre va escapado: viene de la base.
export function htmlMarcador(m: MarcadorMapa, conEtiqueta: boolean): string {
  const color = COLOR[m.clase];
  const t = TAMANO_MARCADOR;
  const circulo = m.logoUrl
    ? `<span style="display:block;width:${t}px;height:${t}px;border-radius:50%;background:#fff;border:2px solid ${color};` +
      `box-shadow:0 1px 4px rgb(0 0 0 / .3);overflow:hidden;box-sizing:border-box">` +
      `<img src="${escaparHtml(m.logoUrl)}" alt="" style="width:100%;height:100%;object-fit:contain;padding:2px;box-sizing:border-box"></span>`
    : `<svg width="${t}" height="${t}" viewBox="-9 -9 18 18" aria-hidden="true" style="display:block;overflow:visible">` +
      `<circle r="8.2" cy=".8" fill="#000" opacity=".18"/>` +
      `<circle r="7.2" fill="${color}" stroke="#fff" stroke-width="1.4"/>` +
      `<g fill="none" stroke="#fff" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round">${GLIFO[m.clase]}</g></svg>`;
  const etiqueta = conEtiqueta
    ? `<span style="position:absolute;left:${t + 4}px;top:50%;transform:translateY(-50%);white-space:nowrap;` +
      `font:600 12px/1.2 var(--font-geist-sans),system-ui,sans-serif;color:#2f3033;` +
      `text-shadow:0 0 3px #fff,0 0 3px #fff,0 0 3px #fff">${escaparHtml(m.nombre)}</span>`
    : "";
  return `<div style="position:relative;width:${t}px;height:${t}px" title="${escaparHtml(m.nombre)}">${circulo}${etiqueta}</div>`;
}

export type IconoYLogo = { ok: true; icono: CategoriaIcono | null; logo_path: string | null } | { ok: false; error: string };

// Lee y valida los campos `icono` y `logo_path` del formulario de destinos.
export function leerIconoYLogo(formData: FormData): IconoYLogo {
  const icono = String(formData.get("icono") ?? "").trim();
  const logo = String(formData.get("logo_path") ?? "").trim();
  if (icono && !esCategoria(icono)) return { ok: false, error: "Selecciona un icono válido." };
  if (logo && !RE_LOGO_DESTINO.test(logo)) return { ok: false, error: "El logo no es válido. Vuelve a subirlo (PNG o WebP)." };
  // El logo se dibuja dentro del icono: sin categoría no aparecería en el mapa.
  if (logo && !icono) return { ok: false, error: "Elige un icono para el mapa: el logo se muestra dentro de él." };
  return { ok: true, icono: icono ? (icono as CategoriaIcono) : null, logo_path: logo || null };
}

// Convierte la respuesta de la RPC; descarta filas sin coordenadas o sin clase.
export function marcadoresDeFilas(filas: FilaMarcador[] | null | undefined): MarcadorMapa[] {
  return (filas ?? []).map(aMarcador).filter((m): m is MarcadorMapa => m !== null);
}

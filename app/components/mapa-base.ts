// Capa base y centro de los mapas de rutas (alumno, visitante y mapa del grafo
// del administrador). Importa Leaflet, así que solo se usa desde componentes
// cargados con next/dynamic y ssr: false.
//
// Hoy la capa base son tiles de OpenStreetMap, SOLO para pruebas. Cuando el SVG
// del campus esté georreferenciado, se cambia aquí por
//   L.imageOverlay("/mapas/campus.svg", [[latSur, lngOeste], [latNorte, lngEste]])
// y todos los mapas lo toman, porque los nodos ya usan coordenadas reales.
import L from "leaflet";

export const CENTRO_CAMPUS: [number, number] = [22.323777, -97.880432];

// Límites del área navegable para alumno y visitante: [[sur, oeste], [norte, este]].
// Por ahora es un recuadro de ~330 m alrededor del centro. Ajústalo a los bordes
// reales del campus; cuando el SVG esté georreferenciado, usa aquí las mismas
// esquinas que el L.imageOverlay (con un pequeño margen).
export const LIMITES_CAMPUS: [[number, number], [number, number]] = [
  [CENTRO_CAMPUS[0] - 0.003, CENTRO_CAMPUS[1] - 0.0032],
  [CENTRO_CAMPUS[0] + 0.003, CENTRO_CAMPUS[1] + 0.0032],
];

export function crearCapaBase(): L.Layer {
  return L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 20,
    maxNativeZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  });
}

// Leaflet interpreta como HTML el texto de tooltips y popups: todo dato que
// venga de la base (nombres de nodos y edificios) pasa por aquí antes.
export function escaparHtml(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

// Capa base y centro de los mapas de rutas (alumno, visitante), del mapa del
// grafo y de las herramientas del administrador (selector de coordenadas y
// trazador de pasillos). Importa Leaflet, así que solo se usa desde componentes
// cargados con next/dynamic y ssr: false.
//
// La capa base son tiles de OpenStreetMap, SOLO para pruebas y para comprobar
// que el plano calza con las calles, más el plano de la planta baja encima como
// `L.imageOverlay`. Los nodos usan coordenadas reales, así que el plano y los
// nodos coinciden sin conversiones. Para el plano final, se reemplaza el
// archivo y los límites de PLANTA_BAJA (ver docs/CALIBRACION_PLANO.md).
import L from "leaflet";

export const CENTRO_CAMPUS: [number, number] = [22.323777, -97.880432];

type Limites = [[number, number], [number, number]];

// Planta baja (primera parte). `limites` = [[sur, oeste], [norte, este]] de TODO
// el SVG, calculados con 4 puntos de control (ver docs/CALIBRACION_PLANO.md).
export const PLANTA_BAJA = {
  url: "/mapas/planta-baja.svg",
  limites: [
    [22.3232386, -97.8810681],
    [22.3255536, -97.8785584],
  ] as Limites,
  // 1 = opaco. Para volver a comparar con las calles de OSM al calibrar un plano
  // nuevo, bajarlo temporalmente (p. ej. 0.7).
  opacidad: 1,
};

// Margen alrededor del plano que el usuario puede explorar (~45 m).
const MARGEN_LIMITES = 0.0004;

// Límites del área navegable para alumno y visitante: [[sur, oeste], [norte, este]].
// Si se agregan más planos (otras partes del campus), abarcar todos.
export const LIMITES_CAMPUS: Limites = [
  [PLANTA_BAJA.limites[0][0] - MARGEN_LIMITES, PLANTA_BAJA.limites[0][1] - MARGEN_LIMITES],
  [PLANTA_BAJA.limites[1][0] + MARGEN_LIMITES, PLANTA_BAJA.limites[1][1] + MARGEN_LIMITES],
];

// Agrega al mapa los tiles de OSM y el plano. El plano va en un panel propio
// entre los tiles (200) y las capas vectoriales (400): así las rutas, los nodos
// y los marcadores quedan siempre por encima, y los clics lo atraviesan.
export function agregarCapaBase(mapa: L.Map): void {
  mapa.createPane("plano").style.zIndex = "250";

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 20,
    maxNativeZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(mapa);

  L.imageOverlay(PLANTA_BAJA.url, PLANTA_BAJA.limites, {
    pane: "plano",
    opacity: PLANTA_BAJA.opacidad,
    interactive: false,
    alt: "",
  }).addTo(mapa);
}

// Leaflet interpreta como HTML el texto de tooltips y popups: todo dato que
// venga de la base (nombres de nodos y edificios) pasa por aquí antes.
export function escaparHtml(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

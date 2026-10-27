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

// Planos por piso. La clave es `nodos.piso` (planta baja = 0). Los planos de todos
// los pisos salen del mismo marco de AutoCAD (mismas 4 esquinas A-D), así que
// comparten `PLANTA_BAJA.limites` y no necesitan calibración propia. Los PDF se
// llaman PISO2/3/4 (segunda, tercera y cuarta planta) = piso 1, 2 y 3 en la base;
// si la convención cambia, basta con mover las claves de esta tabla.
export const PLANOS_POR_PISO: Record<number, { url: string; etiqueta: string }> = {
  0: { url: PLANTA_BAJA.url, etiqueta: "Planta baja" },
  1: { url: "/mapas/piso-2.svg", etiqueta: "Piso 1" },
  2: { url: "/mapas/piso-3.svg", etiqueta: "Piso 2" },
  3: { url: "/mapas/piso-4.svg", etiqueta: "Piso 3" },
};

// Texto corto de un piso para botones y etiquetas.
export function etiquetaPiso(piso: number): string {
  return PLANOS_POR_PISO[piso]?.etiqueta ?? `Piso ${piso}`;
}

export type CapaBase = {
  // Muestra el plano del piso indicado (y quita el anterior). `null` o un piso sin
  // plano dejan solo el mapa base. Cada plano se crea una vez y luego solo se
  // agrega o quita del mapa.
  cambiarPiso: (piso: number | null) => void;
};

// Agrega al mapa los tiles de OSM y el plano del piso inicial (planta baja por
// defecto). El plano va en un panel propio entre los tiles (200) y las capas
// vectoriales (400): así las rutas, los nodos y los marcadores quedan siempre por
// encima, y los clics lo atraviesan. Quien no necesite cambiar de piso puede
// ignorar el valor que devuelve.
export function agregarCapaBase(mapa: L.Map, pisoInicial: number | null = 0): CapaBase {
  mapa.createPane("plano").style.zIndex = "250";

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 20,
    maxNativeZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(mapa);

  const planos = new Map<number, L.ImageOverlay>();
  let visible: L.ImageOverlay | null = null;

  const planoDe = (piso: number | null): L.ImageOverlay | null => {
    if (piso === null || !PLANOS_POR_PISO[piso]) return null;
    let plano = planos.get(piso);
    if (!plano) {
      plano = L.imageOverlay(PLANOS_POR_PISO[piso].url, PLANTA_BAJA.limites, {
        pane: "plano",
        opacity: PLANTA_BAJA.opacidad,
        interactive: false,
        alt: "",
      });
      planos.set(piso, plano);
    }
    return plano;
  };

  const cambiarPiso = (piso: number | null) => {
    const siguiente = planoDe(piso);
    if (siguiente === visible) return;
    visible?.remove();
    siguiente?.addTo(mapa);
    visible = siguiente;
  };

  cambiarPiso(pisoInicial);
  return { cambiarPiso };
}

// Leaflet interpreta como HTML el texto de tooltips y popups: todo dato que
// venga de la base (nombres de nodos y edificios) pasa por aquí antes.
export function escaparHtml(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

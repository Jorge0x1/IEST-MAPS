// Pruebas de las rutas de evacuación. `npm test`.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { ConexionGrafo, NodoGrafo } from "./dijkstra.ts";
import { DISTANCIA_MAXIMA_ENLACE_M, enlacesVirtuales, rutaAlPuntoMasCercano } from "./evacuacion.ts";

const BASE = { lat: 22.324, lng: -97.88 };
type N = NodoGrafo & { evacuacion?: string | null };
// 0.0001° de latitud ≈ 11 m.
function nodo(id: string, dLat: number, extra: Partial<N> = {}): N {
  return { id, tipo: "pasillo", piso: 1, edificio_id: null, lat: BASE.lat + dLat, lng: BASE.lng, ...extra };
}
function con(a: string, b: string): ConexionGrafo {
  return { nodo_origen_id: a, nodo_destino_id: b, costo: null, bidireccional: true };
}
const ids = (r: { nodo: NodoGrafo }[] | null) => r?.map((p) => p.nodo.id) ?? null;

describe("enlacesVirtuales", () => {
  it("enlaza un punto sin conexiones con los nodos conectados más cercanos de su piso", () => {
    const nodos = [
      nodo("a", 0), nodo("b", 0.0003), nodo("c", 0.0006),
      nodo("arriba", 0.0005, { piso: 2 }),
      nodo("esc", 0.0005, { tipo: "escalera" }),
      nodo("p", 0.0005, { evacuacion: "punto_reunion", tipo: "servicio" }),
    ];
    const conexiones = [con("a", "b"), con("b", "c"), con("c", "arriba"), con("c", "esc")];
    const enlaces = enlacesVirtuales(nodos, conexiones);
    // c (≈11 m) y b (≈22 m) primero; a (≈55 m) tercero. Ni el piso 2 ni la escalera.
    assert.deepEqual(enlaces.map((e) => e.nodo_origen_id), ["c", "b", "a"]);
    assert.ok(enlaces.every((e) => e.nodo_destino_id === "p" && e.bidireccional));
  });
  it("respeta la distancia máxima y no toca puntos ya conectados", () => {
    const lejos = (DISTANCIA_MAXIMA_ENLACE_M + 30) / 111_000;
    const nodos = [nodo("a", 0), nodo("b", 0.0001), nodo("p", lejos, { evacuacion: "punto_reunion" }), nodo("q", 0.0002, { evacuacion: "punto_reunion" })];
    assert.deepEqual(enlacesVirtuales(nodos, [con("a", "b"), con("b", "q")]), []);
  });
});

describe("rutaAlPuntoMasCercano", () => {
  //  o — m — f1 ... lejano (P1)
  //      |
  //      x — P2 (cercano)
  const nodos = [
    nodo("o", 0), nodo("m", 0.0001), nodo("lejano", 0.001),
    nodo("x", 0.0002),
    nodo("P1", 0.0011, { evacuacion: "punto_reunion" }),
    nodo("P2", 0.0003, { evacuacion: "punto_reunion" }),
  ];
  const conexiones = [con("o", "m"), con("m", "lejano"), con("lejano", "P1"), con("m", "x"), con("x", "P2")];
  it("elige el punto de reunión más cercano por el grafo", () => {
    assert.deepEqual(ids(rutaAlPuntoMasCercano(nodos, conexiones, "o", {})), ["o", "m", "x", "P2"]);
  });
  it("no usa elevadores si se pide", () => {
    const n = [nodo("o", 0), nodo("el", 0.0001, { tipo: "elevador" }), nodo("P", 0.0002, { evacuacion: "punto_reunion" }), nodo("rodeo", 0.0005), nodo("Q", 0.001, { evacuacion: "punto_reunion" })];
    const c = [con("o", "el"), con("el", "P"), con("o", "rodeo"), con("rodeo", "Q")];
    assert.deepEqual(ids(rutaAlPuntoMasCercano(n, c, "o", {})), ["o", "el", "P"]);
    assert.deepEqual(ids(rutaAlPuntoMasCercano(n, c, "o", { evitarElevadores: true })), ["o", "rodeo", "Q"]);
  });
  it("si ya está en un punto de reunión, la ruta es solo ese punto", () => {
    assert.deepEqual(ids(rutaAlPuntoMasCercano(nodos, conexiones, "P2", {})), ["P2"]);
  });
  it("null sin puntos de reunión o sin camino", () => {
    assert.equal(rutaAlPuntoMasCercano([nodo("o", 0), nodo("m", 0.0001)], [con("o", "m")], "o", {}), null);
    assert.equal(rutaAlPuntoMasCercano(nodos, [con("o", "m")], "o", {}), null);
  });
  it("con enlaces virtuales llega a un punto sin conexiones", () => {
    const n = [nodo("o", 0), nodo("m", 0.0002), nodo("P", 0.0003, { evacuacion: "punto_reunion" })];
    const c = [con("o", "m")];
    assert.equal(rutaAlPuntoMasCercano(n, c, "o", {}), null);
    assert.deepEqual(ids(rutaAlPuntoMasCercano(n, [...c, ...enlacesVirtuales(n, c)], "o", {}))?.at(-1), "P");
  });
});

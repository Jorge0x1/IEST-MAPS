// Pruebas de la conversión de pasos de ruta a puntos del mapa. `npm test`.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { puntosDeRuta, type PasoConUbicacion } from "./mapa.ts";

function paso(id: string, lat: number | null, lng: number | null, extra: Partial<PasoConUbicacion> = {}): PasoConUbicacion {
  return { id, nombre: `Nodo ${id}`, piso: 0, lat, lng, cambioPiso: null, ...extra };
}

describe("puntosDeRuta", () => {
  it("ruta vacía: sin puntos ni omitidos", () => {
    assert.deepEqual(puntosDeRuta([]), { puntos: [], omitidos: 0 });
  });

  it("marca inicio, destino y pasos intermedios con su número en la lista", () => {
    const { puntos, omitidos } = puntosDeRuta([paso("a", 22.1, -97.1), paso("b", 22.2, -97.2), paso("c", 22.3, -97.3)]);
    assert.equal(omitidos, 0);
    assert.deepEqual(
      puntos.map((p) => [p.id, p.numero, p.rol]),
      [["a", 1, "inicio"], ["b", 2, "paso"], ["c", 3, "destino"]],
    );
    assert.deepEqual([puntos[1].lat, puntos[1].lng], [22.2, -97.2]);
  });

  it("marca los cambios de piso en pasos intermedios", () => {
    const { puntos } = puntosDeRuta([
      paso("a", 22.1, -97.1),
      paso("b", 22.2, -97.2, { piso: 1, cambioPiso: { desde: 0, hasta: 1 } }),
      paso("c", 22.3, -97.3, { piso: 1 }),
    ]);
    assert.equal(puntos[1].rol, "cambio_piso");
  });

  it("el destino sigue siendo destino aunque llegue con cambio de piso", () => {
    const { puntos } = puntosDeRuta([paso("a", 22.1, -97.1), paso("b", 22.2, -97.2, { piso: 1, cambioPiso: { desde: 0, hasta: 1 } })]);
    assert.deepEqual(puntos.map((p) => p.rol), ["inicio", "destino"]);
  });

  it("omite pasos sin coordenadas pero conserva la numeración original", () => {
    const { puntos, omitidos } = puntosDeRuta([paso("a", 22.1, -97.1), paso("b", null, null), paso("c", 22.3, null), paso("d", 22.4, -97.4)]);
    assert.equal(omitidos, 2);
    assert.deepEqual(puntos.map((p) => [p.id, p.numero]), [["a", 1], ["d", 4]]);
  });

  it("descarta coordenadas fuera de rango o no numéricas", () => {
    const { puntos, omitidos } = puntosDeRuta([paso("a", 91, -97), paso("b", 22, -181), paso("c", Number.NaN, -97), paso("d", 22, -97)]);
    assert.equal(omitidos, 3);
    assert.deepEqual(puntos.map((p) => p.id), ["d"]);
  });

  it("acepta coordenadas en 0 (no las confunde con vacías)", () => {
    const { puntos } = puntosDeRuta([paso("a", 0, 0)]);
    assert.equal(puntos.length, 1);
  });
});

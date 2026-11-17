// Pruebas del punto azul pegado a la ruta. `npm test`.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { distanciaMetros } from "../geo.ts";
import { ajustarARuta } from "./ajuste.ts";

const M = 1 / 111320; // 1 m de latitud en grados
const LAT = 22.324;
const OESTE = { lat: LAT, lng: -97.88, piso: 1 };
const ESTE = { lat: LAT, lng: -97.8796, piso: 1 }; // ~41 m al este
const tramo = [OESTE, ESTE];
const enMedio = -97.8798;

function norte(metros: number, precision: number, lng = enMedio) {
  return { lat: LAT + metros * M, lng, precision };
}

describe("ajustarARuta", () => {
  it("4 m al norte con precisión 5: se pega al tramo", () => {
    const r = ajustarARuta(norte(4, 5), tramo);
    assert.equal(r.ajustada, true);
    assert.ok(distanciaMetros(r.lat, r.lng, LAT, enMedio) < 0.3);
  });

  it("8 m al norte: se pega con precisión 10, no con precisión 3 (límite 5 m)", () => {
    assert.equal(ajustarARuta(norte(8, 10), tramo).ajustada, true);
    const r = ajustarARuta(norte(8, 3), tramo);
    assert.equal(r.ajustada, false);
    assert.deepEqual([r.lat, r.lng], [LAT + 8 * M, enMedio]);
  });

  it("12 m al norte: nunca se pega (tope de 10 m)", () => {
    assert.equal(ajustarARuta(norte(12, 30), tramo).ajustada, false);
  });

  it("más allá del extremo: se pega al extremo, no a la prolongación", () => {
    const r = ajustarARuta({ lat: LAT, lng: -97.8796 + 3 * M * 1.08, precision: 10 }, tramo);
    assert.equal(r.ajustada, true);
    assert.ok(distanciaMetros(r.lat, r.lng, ESTE.lat, ESTE.lng) < 0.3);
  });

  it("tramos de otro piso o que cruzan pisos no cuentan", () => {
    assert.equal(ajustarARuta(norte(2, 10), [{ ...OESTE, piso: 2 }, { ...ESTE, piso: 2 }]).ajustada, false);
    assert.equal(ajustarARuta(norte(2, 10), [OESTE, { ...ESTE, piso: 2 }]).ajustada, false);
  });

  it("sin tramos válidos: sin cambios y sin NaN", () => {
    for (const puntos of [[], [OESTE], [OESTE, { ...OESTE }]]) {
      const r = ajustarARuta(norte(2, 10), puntos);
      assert.equal(r.ajustada, false);
      assert.ok(Number.isFinite(r.lat) && Number.isFinite(r.lng));
    }
  });

  it("con varios tramos elige el más cercano", () => {
    const sur = { lat: LAT - 6 * M, lng: -97.8796, piso: 1 };
    // OESTE→ESTE (y=0) y ESTE→sur (vertical en el extremo este). Posición 1 m al
    // sur y 1 m al oeste del extremo este: más cerca del tramo vertical.
    const r = ajustarARuta({ lat: LAT - 3 * M, lng: -97.8796 - 1 * M * 1.08, precision: 10 }, [OESTE, ESTE, sur]);
    assert.equal(r.ajustada, true);
    assert.ok(Math.abs(r.lng - -97.8796) < 1e-7);
  });
});

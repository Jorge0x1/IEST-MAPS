// Pruebas unitarias de la distancia entre coordenadas. `npm test`.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { distanciaMetros } from "./geo.ts";

describe("distanciaMetros", () => {
  it("el mismo punto está a 0 m (sin NaN por el acos)", () => {
    assert.equal(distanciaMetros(22.25, -97.87, 22.25, -97.87), 0);
  });

  it("un grado de latitud mide ~111.2 km", () => {
    const d = distanciaMetros(0, 0, 1, 0);
    assert.ok(Math.abs(d - 111195) < 100, `fue ${d}`);
  });

  it("es simétrica", () => {
    const ida = distanciaMetros(22.25, -97.87, 22.26, -97.88);
    const vuelta = distanciaMetros(22.26, -97.88, 22.25, -97.87);
    assert.ok(Math.abs(ida - vuelta) < 1e-6);
  });

  it("puntos antípodas no producen NaN (el coseno se acota a [-1, 1])", () => {
    const d = distanciaMetros(0, 0, 0, 180);
    assert.ok(Number.isFinite(d));
    assert.ok(Math.abs(d - Math.PI * 6371000) < 1);
  });

  it("distancias de pocos metros salen razonables", () => {
    const d = distanciaMetros(22.25, -97.87, 22.25009, -97.87);
    assert.ok(d > 9 && d < 11, `fue ${d}`);
  });
});

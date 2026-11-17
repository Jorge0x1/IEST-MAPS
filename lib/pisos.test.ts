// Pruebas de la tabla de pisos. `npm test`.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { etiquetaPiso, PISOS_REGISTRADOS, pisoRegistrado } from "./pisos.ts";

describe("pisos registrados", () => {
  it("son los 4 pisos con plano, en orden y sin piso 0", () => {
    assert.deepEqual(PISOS_REGISTRADOS, [1, 2, 3, 4]);
  });

  it("acepta solo pisos dados de alta", () => {
    assert.equal(pisoRegistrado(1), true);
    assert.equal(pisoRegistrado(4), true);
    assert.equal(pisoRegistrado(0), false);
    assert.equal(pisoRegistrado(5), false);
    assert.equal(pisoRegistrado(1.5), false);
  });

  it("etiqueta un piso sin plano con su número", () => {
    assert.equal(etiquetaPiso(2), "Piso 2");
    assert.equal(etiquetaPiso(7), "Piso 7");
  });
});

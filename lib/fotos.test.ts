// Pruebas unitarias de las fotos de destinos. `npm test`.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { RE_FOTO_DESTINO, urlFotoDestino } from "./fotos.ts";

const UUID = "123e4567-e89b-42d3-a456-426614174000";

describe("RE_FOTO_DESTINO", () => {
  it("acepta uuid.jpg", () => {
    assert.ok(RE_FOTO_DESTINO.test(`${UUID}.jpg`));
  });

  it("rechaza recorridos de directorio, otras extensiones y rutas con carpetas", () => {
    for (const malo of [`../${UUID}.jpg`, `${UUID}.png`, `${UUID}.jpg.php`, `carpeta/${UUID}.jpg`, `${UUID}.jpg\n`, "", "foto.jpg"]) {
      assert.equal(RE_FOTO_DESTINO.test(malo), false, `debió rechazar ${JSON.stringify(malo)}`);
    }
  });
});

describe("urlFotoDestino", () => {
  it("devuelve null si no hay foto", () => {
    assert.equal(urlFotoDestino(null), null);
    assert.equal(urlFotoDestino(undefined), null);
    assert.equal(urlFotoDestino(""), null);
  });
});

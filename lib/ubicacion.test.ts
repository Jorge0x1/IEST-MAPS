// Pruebas de los estados de geolocalización. `npm test`.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { estadoDesdeError, estadoInicial, lecturaUtil, mensajeUbicacion } from "./ubicacion.ts";

describe("estadoInicial", () => {
  it("sin Geolocation API: no soportado", () => {
    assert.deepEqual(estadoInicial({ tieneGeolocalizacion: false, contextoSeguro: true }), { estado: "no_soportado" });
  });

  it("en http (contexto no seguro): avisa que hace falta https", () => {
    assert.deepEqual(estadoInicial({ tieneGeolocalizacion: true, contextoSeguro: false }), { estado: "no_seguro" });
  });

  it("con API y https: se queda pidiendo la ubicación", () => {
    assert.deepEqual(estadoInicial({ tieneGeolocalizacion: true, contextoSeguro: true }), { estado: "pidiendo" });
  });
});

describe("estadoDesdeError", () => {
  it("código 1 (PERMISSION_DENIED): denegado", () => {
    assert.deepEqual(estadoDesdeError(1), { estado: "denegado" });
  });

  it("códigos 2, 3 y desconocidos: sin señal", () => {
    for (const codigo of [2, 3, 99]) assert.deepEqual(estadoDesdeError(codigo), { estado: "sin_senal" });
  });
});

describe("mensajeUbicacion", () => {
  it("no seguro menciona https", () => {
    assert.match(mensajeUbicacion({ estado: "no_seguro" }) ?? "", /https/);
  });

  it("denegado menciona el permiso", () => {
    assert.match(mensajeUbicacion({ estado: "denegado" }) ?? "", /permiso/);
  });

  it("con lectura no hay mensaje", () => {
    assert.equal(mensajeUbicacion({ estado: "ok", lectura: { lat: 22.3, lng: -97.8, precision: 8, fecha: 0 } }), null);
  });
});

describe("lecturaUtil", () => {
  const lectura = (precision: number) => ({ lat: 22.3, lng: -97.8, precision, fecha: 0 });

  it("sirve con precisión de hasta 50 m", () => {
    assert.equal(lecturaUtil(lectura(8)), true);
    assert.equal(lecturaUtil(lectura(50)), true);
  });

  it("no sirve con precisión mayor a 50 m (laptop por wifi) ni sin lectura", () => {
    assert.equal(lecturaUtil(lectura(51)), false);
    assert.equal(lecturaUtil(lectura(2300)), false);
    assert.equal(lecturaUtil(null), false);
  });
});

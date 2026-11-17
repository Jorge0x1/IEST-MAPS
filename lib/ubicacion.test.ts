// Pruebas de los estados de geolocalización. `npm test`.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { estadoDesdeError, estadoInicial, lecturaUtil, mensajeUbicacion, PESO_MINIMO, suavizar, type Lectura } from "./ubicacion.ts";

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

describe("suavizar", () => {
  const T = 1_000_000;
  const L = (lat: number, lng: number, precision: number, fecha = T): Lectura => ({ lat, lng, precision, fecha });
  // 0.00001° de latitud ≈ 1.1 m
  const anterior = L(22.324, -97.88, 5, T - 2000);

  it("sin anterior toma la nueva", () => {
    const nueva = L(22.3241, -97.88, 5);
    assert.deepEqual(suavizar(null, nueva), nueva);
  });

  it("anterior de hace más de 30 s: toma la nueva", () => {
    const nueva = L(22.32405, -97.88, 5);
    assert.deepEqual(suavizar({ ...anterior, fecha: T - 31000 }, nueva), nueva);
  });

  it("lectura repetida o de caché (fecha igual o anterior): se queda la anterior", () => {
    const nueva = L(22.32405, -97.88, 5);
    const igual = { ...anterior, fecha: T };
    const posterior = { ...anterior, fecha: T + 500 };
    assert.equal(suavizar(igual, nueva), igual);
    assert.equal(suavizar(posterior, nueva), posterior);
  });

  it("salto mayor a 2×(suma de precisiones): toma la nueva", () => {
    const nueva = L(22.32423, -97.88, 5); // ~25 m > 20 m
    assert.deepEqual(suavizar(anterior, nueva), nueva);
  });

  it("misma precisión y salto chico: queda a medio camino con precisión y fecha de la nueva", () => {
    const nueva = L(22.32405, -97.8799, 5);
    const r = suavizar(anterior, nueva);
    assert.ok(Math.abs(r.lat - (anterior.lat + nueva.lat) / 2) < 1e-9);
    assert.ok(Math.abs(r.lng - (anterior.lng + nueva.lng) / 2) < 1e-9);
    assert.equal(r.precision, 5);
    assert.equal(r.fecha, T);
  });

  it("nueva mucho peor: se mueve solo el peso mínimo", () => {
    const nueva = L(22.32405, -97.88, 40);
    const r = suavizar({ ...anterior, precision: 4 }, nueva);
    // Fracción del camino en grados (distanciaMetros usa acos y pierde
    // precisión en distancias de un metro, no sirve para comparar 1e-6).
    const fraccion = (r.lat - anterior.lat) / (nueva.lat - anterior.lat);
    assert.ok(Math.abs(fraccion - PESO_MINIMO) < 1e-9);
  });

  it("nueva mucho mejor: se mueve casi todo el camino", () => {
    const nueva = L(22.32405, -97.88, 4);
    const r = suavizar({ ...anterior, precision: 40 }, nueva);
    // Fracción del camino en grados (distanciaMetros usa acos y pierde
    // precisión en distancias de un metro, no sirve para comparar 1e-6).
    const fraccion = (r.lat - anterior.lat) / (nueva.lat - anterior.lat);
    assert.ok(fraccion > 0.95);
  });

  it("precisión 0 en cualquiera: sin NaN, toma la nueva", () => {
    const nueva = L(22.32402, -97.88, 0);
    assert.deepEqual(suavizar(anterior, nueva), nueva);
    const nueva2 = L(22.32402, -97.88, 5);
    assert.deepEqual(suavizar({ ...anterior, precision: 0 }, nueva2), nueva2);
  });
});

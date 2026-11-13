// Pruebas de la elección del nodo de salida por GPS. `npm test`.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { distanciaMetros } from "../geo.ts";
import type { ConexionGrafo, NodoGrafo } from "./dijkstra.ts";
import { nodoMasCercano, validarPosicion, type PosicionUsuario } from "./cercano.ts";

const BASE = { lat: 22.324, lng: -97.88 };
// 0.0001° de latitud ≈ 11 m.
function nodo(id: string, dLat: number | null, extra: Partial<NodoGrafo> = {}): NodoGrafo {
  return {
    id,
    tipo: "pasillo",
    piso: 1,
    edificio_id: null,
    lat: dLat === null ? null : BASE.lat + dLat,
    lng: dLat === null ? null : BASE.lng,
    ...extra,
  };
}
function conexion(a: string, b: string): ConexionGrafo {
  return { nodo_origen_id: a, nodo_destino_id: b, costo: null, bidireccional: true };
}
function pos(precision = 8): PosicionUsuario {
  return { ...BASE, precision };
}
const SIN_OPCIONES = { evitarEscaleras: false };

describe("validarPosicion", () => {
  it("acepta una posición válida", () => {
    assert.deepEqual(validarPosicion({ lat: 22.324, lng: -97.88, precision: 8 }), { lat: 22.324, lng: -97.88, precision: 8 });
  });

  it("rechaza entradas inválidas", () => {
    const malas: unknown[] = [
      null,
      {},
      "22.3",
      { lat: Number.NaN, lng: -97.88, precision: 8 },
      { lat: "22.3", lng: -97.88, precision: 8 },
      { lat: 91, lng: -97.88, precision: 8 },
      { lat: 22.3, lng: -181, precision: 8 },
      { lat: 22.3, lng: -97.88, precision: -1 },
      { lat: 22.3, lng: -97.88, precision: Infinity },
    ];
    for (const entrada of malas) assert.equal(validarPosicion(entrada), null, JSON.stringify(entrada));
  });
});

describe("nodoMasCercano", () => {
  it("elige el nodo conectado más cercano y reporta la distancia", () => {
    const nodos = [nodo("lejos", 0.0005), nodo("cerca", 0.0002), nodo("otro", 0.0008)];
    const r = nodoMasCercano(pos(), nodos, [conexion("lejos", "cerca"), conexion("cerca", "otro")], SIN_OPCIONES);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.nodo.id, "cerca");
    const esperado = distanciaMetros(BASE.lat, BASE.lng, nodos[1].lat!, nodos[1].lng!);
    assert.ok(Math.abs(r.distanciaMetros - esperado) < 0.01);
  });

  it("ignora nodos sin coordenadas, de otro piso o sin conexiones", () => {
    const nodos = [
      nodo("sin_coord", null),
      nodo("piso2", 0.00001, { piso: 2 }),
      nodo("aislado", 0.00002),
      nodo("bueno", 0.0003),
      nodo("vecino", 0.0006),
    ];
    const conexiones = [conexion("sin_coord", "bueno"), conexion("piso2", "bueno"), conexion("bueno", "vecino")];
    const r = nodoMasCercano(pos(), nodos, conexiones, SIN_OPCIONES);
    assert.equal(r.ok && r.nodo.id, "bueno");
  });

  it("con evitar escaleras no sale desde una escalera", () => {
    const nodos = [nodo("esc", 0.0001, { tipo: "escalera" }), nodo("pas", 0.0003)];
    const conexiones = [conexion("esc", "pas")];
    const sin = nodoMasCercano(pos(), nodos, conexiones, { evitarEscaleras: true });
    assert.equal(sin.ok && sin.nodo.id, "pas");
    const con = nodoMasCercano(pos(), nodos, conexiones, SIN_OPCIONES);
    assert.equal(con.ok && con.nodo.id, "esc");
  });

  it("precisión mayor a 50 m: ubicación imprecisa; 50 m exactos sí sirve", () => {
    const nodos = [nodo("a", 0.0001), nodo("b", 0.0002)];
    const conexiones = [conexion("a", "b")];
    assert.deepEqual(nodoMasCercano(pos(51), nodos, conexiones, SIN_OPCIONES), { ok: false, motivo: "ubicacion_imprecisa" });
    assert.equal(nodoMasCercano(pos(50), nodos, conexiones, SIN_OPCIONES).ok, true);
  });

  it("nodo más cercano a más de 150 m: fuera del campus", () => {
    const nodos = [nodo("a", 0.0015), nodo("b", 0.002)]; // ~167 m y ~222 m
    assert.deepEqual(nodoMasCercano(pos(), nodos, [conexion("a", "b")], SIN_OPCIONES), { ok: false, motivo: "fuera_del_campus" });
  });

  it("sin candidatos válidos: sin_candidatos", () => {
    const nodos = [nodo("aislado", 0.0001), nodo("piso3", 0.0001, { piso: 3 }), nodo("p3b", 0.0002, { piso: 3 })];
    assert.deepEqual(nodoMasCercano(pos(), nodos, [conexion("piso3", "p3b")], SIN_OPCIONES), { ok: false, motivo: "sin_candidatos" });
  });
});

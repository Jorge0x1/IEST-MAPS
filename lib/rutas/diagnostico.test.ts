// Pruebas del diagnóstico del grafo. `npm test`.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { diagnosticarGrafo, type ConexionDiagnostico, type NodoDiagnostico } from "./diagnostico.ts";

function nodo(id: string, extra: Partial<NodoDiagnostico> = {}): NodoDiagnostico {
  return { id, tipo: "pasillo", piso: 0, lat: 22, lng: -97, buscable: false, ...extra };
}
function con(a: string, b: string, bidireccional = true): ConexionDiagnostico {
  return { nodo_origen_id: a, nodo_destino_id: b, bidireccional };
}
const ordenar = (ids: string[]) => [...ids].sort();

describe("diagnosticarGrafo", () => {
  it("grafo vacío no tiene red principal ni problemas", () => {
    const d = diagnosticarGrafo([], []);
    assert.equal(d.principal.size, 0);
    assert.equal(d.totalComponentes, 0);
    assert.deepEqual(d.desconectados, []);
    assert.deepEqual(d.aislados, []);
  });

  it("la red principal es la que contiene más entradas, aunque sea más chica", () => {
    const nodos = [
      nodo("e1", { tipo: "entrada" }), nodo("p1"),
      nodo("x1"), nodo("x2"), nodo("x3"),
    ];
    const d = diagnosticarGrafo(nodos, [con("e1", "p1"), con("x1", "x2"), con("x2", "x3")]);
    assert.deepEqual(ordenar([...d.principal]), ["e1", "p1"]);
    assert.deepEqual(ordenar(d.desconectados), ["x1", "x2", "x3"]);
    assert.equal(d.totalComponentes, 2);
  });

  it("sin entradas, la red principal es la más grande", () => {
    const d = diagnosticarGrafo([nodo("a"), nodo("b"), nodo("c"), nodo("d")], [con("a", "b"), con("b", "c")]);
    assert.deepEqual(ordenar([...d.principal]), ["a", "b", "c"]);
    assert.deepEqual(d.aislados, ["d"]);
  });

  it("las conexiones de un solo sentido también unen la red (conectividad sin dirección)", () => {
    const d = diagnosticarGrafo([nodo("e", { tipo: "entrada" }), nodo("a")], [con("a", "e", false)]);
    assert.deepEqual(ordenar([...d.principal]), ["a", "e"]);
  });

  it("los aislados no se cuentan como desconectados ni entran a la red principal", () => {
    const d = diagnosticarGrafo([nodo("e", { tipo: "entrada" }), nodo("a"), nodo("solo")], [con("e", "a")]);
    assert.deepEqual(d.aislados, ["solo"]);
    assert.deepEqual(d.desconectados, []);
  });

  it("una entrada sola sigue siendo la red principal si es la única con entradas", () => {
    const d = diagnosticarGrafo([nodo("e", { tipo: "entrada" }), nodo("a"), nodo("b")], [con("a", "b")]);
    assert.deepEqual([...d.principal], ["e"]);
    assert.deepEqual(d.aislados, ["e"]);
    assert.deepEqual(ordenar(d.desconectados), ["a", "b"]);
  });

  it("destinos buscables fuera de la red principal son inalcanzables", () => {
    const nodos = [
      nodo("e", { tipo: "entrada" }), nodo("ok", { tipo: "salon", buscable: true }),
      nodo("lejos", { tipo: "salon", buscable: true }), nodo("p"),
      nodo("suelto", { tipo: "oficina", buscable: true }),
    ];
    const d = diagnosticarGrafo(nodos, [con("e", "ok"), con("lejos", "p")]);
    assert.deepEqual(ordenar(d.destinosInalcanzables), ["lejos", "suelto"]);
  });

  it("detecta pasillos marcados como destino", () => {
    const d = diagnosticarGrafo([nodo("p", { buscable: true }), nodo("s", { tipo: "salon", buscable: true })], []);
    assert.deepEqual(d.pasillosBuscables, ["p"]);
  });

  it("detecta escaleras y elevadores que no llevan a otro piso", () => {
    const nodos = [
      nodo("esc-ok", { tipo: "escalera", piso: 0 }), nodo("arriba", { piso: 1 }),
      nodo("esc-mal", { tipo: "escalera", piso: 0 }), nodo("mismo", { piso: 0 }),
      nodo("elev-suelto", { tipo: "elevador", piso: 2 }),
    ];
    const d = diagnosticarGrafo(nodos, [con("esc-ok", "arriba"), con("esc-mal", "mismo")]);
    assert.deepEqual(ordenar(d.transicionesSinOtroPiso), ["elev-suelto", "esc-mal"]);
  });

  it("una transición cuenta si el otro piso llega por una conexión entrante", () => {
    const d = diagnosticarGrafo([nodo("elev", { tipo: "elevador", piso: 0 }), nodo("b", { piso: 3 })], [con("b", "elev", false)]);
    assert.deepEqual(d.transicionesSinOtroPiso, []);
  });

  it("lista nodos sin coordenadas", () => {
    const d = diagnosticarGrafo([nodo("a", { lat: null }), nodo("b", { lng: null }), nodo("c")], []);
    assert.deepEqual(ordenar(d.sinCoordenadas), ["a", "b"]);
  });

  it("ignora conexiones que apuntan a nodos inexistentes", () => {
    const d = diagnosticarGrafo([nodo("a")], [con("a", "fantasma")]);
    assert.deepEqual(d.aislados, ["a"]);
  });

  it("da el componente de cada nodo para colorear el mapa", () => {
    const d = diagnosticarGrafo([nodo("a"), nodo("b"), nodo("c")], [con("a", "b")]);
    assert.equal(d.componenteDe.get("a"), d.componenteDe.get("b"));
    assert.notEqual(d.componenteDe.get("a"), d.componenteDe.get("c"));
  });
});

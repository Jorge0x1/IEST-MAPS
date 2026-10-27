// Pruebas de la agrupación de pasos en instrucciones. `npm test`.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { agruparPasos, type PasoAgrupable } from "./instrucciones.ts";

function nodo(id: string, tipo: string, extra: Partial<PasoAgrupable> = {}): PasoAgrupable {
  return { id, tipo, piso: 1, edificioId: "e100", lat: null, lng: null, cambioPiso: null, ...extra };
}

const resumen = (pasos: PasoAgrupable[], opciones?: { agruparPasillos?: boolean }) =>
  agruparPasos(pasos, opciones).map((i) => [i.tipo, i.pasos.map((p) => p.id).join(",")]);

describe("agruparPasos", () => {
  it("ruta vacía: sin instrucciones", () => {
    assert.deepEqual(agruparPasos([]), []);
  });

  it("junta los pasillos consecutivos entre dos salones en una sola instrucción", () => {
    const pasos = [nodo("s103", "salon"), nodo("p6", "pasillo"), nodo("p5", "pasillo"), nodo("p4", "pasillo"), nodo("s101", "salon")];
    assert.deepEqual(resumen(pasos), [
      ["inicio", "s103"],
      ["pasillo", "p6,p5,p4"],
      ["llegada", "s101"],
    ]);
  });

  it("el ancla del tramo es el nodo de en medio", () => {
    const pasos = [nodo("a", "salon"), nodo("p1", "pasillo"), nodo("p2", "pasillo"), nodo("p3", "pasillo"), nodo("b", "salon")];
    assert.equal(agruparPasos(pasos)[1].ancla.id, "p2");
  });

  it("el ancla prefiere nodos con ubicación", () => {
    const pasos = [
      nodo("a", "salon"),
      nodo("p1", "pasillo", { lat: 22.1, lng: -97.1 }),
      nodo("p2", "pasillo"),
      nodo("p3", "pasillo"),
      nodo("b", "salon"),
    ];
    assert.equal(agruparPasos(pasos)[1].ancla.id, "p1");
  });

  it("corta el tramo al cambiar de piso, de edificio o al pasar por algo que no es pasillo", () => {
    const pasos = [
      nodo("inicio", "entrada"),
      nodo("p1", "pasillo"),
      nodo("p2", "pasillo", { edificioId: "e200" }),
      nodo("bano", "bano", { edificioId: "e200" }),
      nodo("p3", "pasillo", { edificioId: "e200" }),
      nodo("esc", "escalera", { edificioId: "e200", piso: 2, cambioPiso: { desde: 1, hasta: 2 } }),
      nodo("p4", "pasillo", { edificioId: "e200", piso: 2 }),
      nodo("fin", "salon", { edificioId: "e200", piso: 2 }),
    ];
    assert.deepEqual(resumen(pasos), [
      ["inicio", "inicio"],
      ["pasillo", "p1"],
      ["pasillo", "p2"],
      ["paso", "bano"],
      ["pasillo", "p3"],
      ["cambio_piso", "esc"],
      ["pasillo", "p4"],
      ["llegada", "fin"],
    ]);
  });

  it("un pasillo con cambio de piso es instrucción de cambio de piso, no parte de un tramo", () => {
    const pasos = [nodo("a", "salon"), nodo("p1", "pasillo"), nodo("p2", "pasillo", { piso: 2, cambioPiso: { desde: 1, hasta: 2 } }), nodo("b", "salon", { piso: 2 })];
    assert.deepEqual(resumen(pasos), [["inicio", "a"], ["pasillo", "p1"], ["cambio_piso", "p2"], ["llegada", "b"]]);
  });

  it("si el destino es un pasillo, sigue siendo la llegada", () => {
    const pasos = [nodo("a", "salon"), nodo("p1", "pasillo"), nodo("p2", "pasillo")];
    assert.deepEqual(resumen(pasos), [["inicio", "a"], ["pasillo", "p1"], ["llegada", "p2"]]);
  });

  it("calcula los metros desde el nodo anterior hasta el final del tramo", () => {
    // 0.0001° de longitud en el ecuador ≈ 11.1 m.
    const pasos = [
      nodo("a", "salon", { lat: 0, lng: 0 }),
      nodo("p1", "pasillo", { lat: 0, lng: 0.0001 }),
      nodo("p2", "pasillo", { lat: 0, lng: 0.0002 }),
      nodo("b", "salon", { lat: 0, lng: 0.0003 }),
    ];
    assert.equal(agruparPasos(pasos)[1].metros, 22);
  });

  it("sin ubicación en algún nodo del tramo no inventa metros", () => {
    const pasos = [nodo("a", "salon", { lat: 0, lng: 0 }), nodo("p1", "pasillo"), nodo("b", "salon", { lat: 0, lng: 0.0001 })];
    assert.equal(agruparPasos(pasos)[1].metros, null);
  });

  it("con agruparPasillos: false deja un nodo por instrucción", () => {
    const pasos = [nodo("a", "salon"), nodo("p1", "pasillo"), nodo("p2", "pasillo"), nodo("b", "salon")];
    assert.deepEqual(resumen(pasos, { agruparPasillos: false }), [["inicio", "a"], ["paso", "p1"], ["paso", "p2"], ["llegada", "b"]]);
  });
});

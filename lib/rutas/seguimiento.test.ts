// Pruebas de la geometría del seguimiento en vivo. `npm test`.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { armarTramos, maniobrasDeTramo, nombreLegible, proyectarAvance } from "./seguimiento.ts";
import { camino, paso, pos } from "./prueba-rutas.ts";

const cerca = (a: number, b: number, tol = 1) => assert.ok(Math.abs(a - b) <= tol, `${a} no está cerca de ${b}`);

describe("armarTramos", () => {
  it("corta la ruta por piso; los tramos que no son del piso 1 o tienen un solo punto son manuales", () => {
    const pasos = [
      paso(0, 0),
      paso(10, 0),
      paso(10, 0, { piso: 2, tipo: "escalera", cambioPiso: { desde: 1, hasta: 2, sentido: "sube", via: null } }),
      paso(20, 0, { piso: 2 }),
      paso(20, 0, { piso: 1, tipo: "escalera", cambioPiso: { desde: 2, hasta: 1, sentido: "baja", via: null } }),
    ];
    const tramos = armarTramos(pasos);
    assert.deepEqual(tramos.map((t) => [t.piso, t.desde, t.hasta]), [[1, 0, 1], [2, 2, 3], [1, 4, 4]]);
    assert.equal(tramos[0].linea?.length, 2);
    assert.equal(tramos[1].linea, null);
    assert.equal(tramos[2].linea, null);
  });

  it("salta los nodos sin coordenadas", () => {
    const tramos = armarTramos([paso(0, 0), paso(null, null), paso(10, 0)]);
    assert.equal(tramos[0].linea?.length, 2);
    assert.equal(tramos[0].linea?.[1].paso, 2);
    cerca(tramos[0].largo, 10, 0.1);
  });

  it("un tramo del piso 1 de largo casi cero es manual", () => {
    const pasos = [paso(0, 0), paso(0, 0), paso(0, 0, { piso: 2, cambioPiso: { desde: 1, hasta: 2, sentido: "sube", via: null } })];
    assert.equal(armarTramos(pasos)[0].linea, null);
  });

  it("nodos repetidos no producen NaN", () => {
    const tramos = armarTramos([paso(0, 0), paso(0, 0), paso(10, 0)]);
    cerca(tramos[0].largo, 10, 0.1);
    assert.ok(tramos[0].linea!.every((p) => Number.isFinite(p.metros)));
  });
});

describe("maniobrasDeTramo", () => {
  function conDestino(vertices: [number, number][]) {
    const pasos = camino(vertices);
    pasos[pasos.length - 1] = { ...pasos[pasos.length - 1], nombre: "Salón 204", tipo: "salon" };
    return pasos;
  }

  it("una L hacia el norte: giro a la izquierda en la esquina y llegada al final", () => {
    const pasos = conDestino([[0, 0], [30, 0], [30, 30]]);
    const m = maniobrasDeTramo(pasos, armarTramos(pasos), 0);
    assert.deepEqual(m.map((x) => x.tipo), ["izquierda", "llegada"]);
    cerca(m[0].metros, 30);
    cerca(m[1].metros, 60);
    assert.equal(m[1].hacia, "Salón 204");
    assert.equal(m[0].hacia, "Pasillo prueba");
  });

  it("una L hacia el sur: giro a la derecha", () => {
    const pasos = conDestino([[0, 0], [30, 0], [30, -30]]);
    assert.equal(maniobrasDeTramo(pasos, armarTramos(pasos), 0)[0].tipo, "derecha");
  });

  it("una curva suave no es giro", () => {
    const vertices: [number, number][] = [[0, 0]];
    let rumbo = 0;
    for (let i = 0; i < 9; i++) {
      const [x, y] = vertices[vertices.length - 1];
      vertices.push([x + 3 * Math.cos(rumbo), y + 3 * Math.sin(rumbo)]);
      rumbo += (10 * Math.PI) / 180;
    }
    const pasos = conDestino(vertices);
    assert.deepEqual(maniobrasDeTramo(pasos, armarTramos(pasos), 0).map((x) => x.tipo), ["llegada"]);
  });

  it("dos esquinas de 40° a 4 m una de otra son un solo giro", () => {
    const a = (40 * Math.PI) / 180;
    const p1: [number, number] = [20, 0];
    const p2: [number, number] = [20 + 4 * Math.cos(a), 4 * Math.sin(a)];
    const p3: [number, number] = [p2[0] + 20 * Math.cos(2 * a), p2[1] + 20 * Math.sin(2 * a)];
    const pasos = conDestino([[0, 0], p1, p2, p3]);
    const giros = maniobrasDeTramo(pasos, armarTramos(pasos), 0).filter((x) => x.tipo !== "llegada");
    assert.equal(giros.length, 1);
    assert.equal(giros[0].tipo, "izquierda");
  });

  it("antes de un tramo de otro piso, la última maniobra es el elevador o la escalera", () => {
    const base = camino([[0, 0], [30, 0]]);
    const conElevador = [
      ...base,
      paso(30, 0, { piso: 2, tipo: "elevador", cambioPiso: { desde: 1, hasta: 2, sentido: "sube", via: { nombre: "Elevador A", tipo: "elevador" } } }),
      paso(40, 0, { piso: 2 }),
    ];
    const ultima = maniobrasDeTramo(conElevador, armarTramos(conElevador), 0).at(-1)!;
    assert.equal(ultima.tipo, "elevador");
    assert.deepEqual(ultima.piso, { hasta: 2, sentido: "sube", via: "Elevador A" });
    cerca(ultima.metros, 30);

    const sinVia = [...base, paso(30, 0, { piso: 2, cambioPiso: { desde: 1, hasta: 2, sentido: "sube", via: null } }), paso(40, 0, { piso: 2 })];
    assert.equal(maniobrasDeTramo(sinVia, armarTramos(sinVia), 0).at(-1)!.tipo, "escalera");
  });
});

describe("proyectarAvance", () => {
  const recta = armarTramos(camino([[0, 0], [100, 0]]))[0].linea!;

  it("a 3 m de la línea en el metro 40", () => {
    const r = proyectarAvance(recta, pos(40, 3), 35);
    cerca(r.metros, 40, 0.5);
    cerca(r.distancia, 3, 0.2);
  });

  it("nunca retrocede", () => {
    assert.equal(proyectarAvance(recta, pos(33, 0), 40).metros, 40);
  });

  it("en una ida y vuelta no salta al regreso", () => {
    const vuelta = armarTramos(camino([[0, 0], [50, 0], [0, 0]]))[0].linea!;
    cerca(proyectarAvance(vuelta, pos(10, 0), 10).metros, 10, 0.5);
  });

  it("con pasillos paralelos a 6 m (una U) no salta al regreso por el error del GPS", () => {
    const u = armarTramos(camino([[0, 0], [25, 0], [25, 6], [0, 6]]))[0].linea!;
    cerca(proyectarAvance(u, pos(10, 4), 8, { tolerancia: 8 }).metros, 10, 1);
  });

  it("sin límite hacia adelante encuentra una posición lejana en la línea", () => {
    const r = proyectarAvance(recta, pos(90, 0), 5, { adelante: Number.POSITIVE_INFINITY });
    cerca(r.metros, 90, 0.5);
    cerca(r.distancia, 0, 0.2);
  });

  it("mide la distancia a la línea", () => {
    cerca(proyectarAvance(recta, pos(40, 30), 35).distancia, 30, 0.5);
  });
});

describe("nombreLegible", () => {
  it("quita el número final de un pasillo trazado", () => {
    assert.equal(nombreLegible(paso(0, 0, { nombre: "Pasillo edificio 3 12" })), "Pasillo edificio 3");
  });
  it("un salón conserva su nombre", () => {
    assert.equal(nombreLegible(paso(0, 0, { nombre: "Salón 204", tipo: "salon" })), "Salón 204");
  });
});

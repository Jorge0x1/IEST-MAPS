// Pruebas de estrés y fuerza (R9): el motor de rutas con grafos muchas veces más
// grandes que el campus real y con entradas hostiles. Los límites de tiempo son
// holgados a propósito (varias veces lo medido) para que no sean intermitentes.
// `npm run test:estres`
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buscarRuta, explicarSinRuta, type ConexionGrafo, type NodoGrafo } from "../../lib/rutas/dijkstra.ts";
import { agruparPasos } from "../../lib/rutas/instrucciones.ts";
import { nodoMasCercano, validarPosicion } from "../../lib/rutas/cercano.ts";
import { cuadricula, idCuadricula, medir, mulberry32 } from "../helpers/grafo.ts";

describe("carga: grafos grandes", () => {
  it("cuadrícula de 100x100 (10 000 nodos): esquina a esquina en < 1.5 s", () => {
    const { nodos, conexiones } = cuadricula(100, 100);
    const { resultado, ms } = medir(() => buscarRuta(nodos, conexiones, idCuadricula(0, 0), idCuadricula(99, 99)));
    console.log(`  · 10 000 nodos / ${conexiones.length} conexiones: ${ms.toFixed(0)} ms`);
    assert.equal(resultado!.length, 199);
    assert.ok(ms < 1500, `tardó ${ms.toFixed(0)} ms`);
  });

  it("cuadrícula de 250x250 (62 500 nodos): esquina a esquina en < 6 s", () => {
    const { nodos, conexiones } = cuadricula(250, 250);
    const { resultado, ms } = medir(() => buscarRuta(nodos, conexiones, idCuadricula(0, 0), idCuadricula(249, 249)));
    console.log(`  · 62 500 nodos / ${conexiones.length} conexiones: ${ms.toFixed(0)} ms`);
    assert.equal(resultado!.length, 499);
    assert.ok(ms < 6000, `tardó ${ms.toFixed(0)} ms`);
  });

  it("peor caso: destino inalcanzable obliga a recorrer todo el grafo y responde null", () => {
    const { nodos, conexiones } = cuadricula(100, 100);
    nodos.push({ id: "isla", tipo: "pasillo", piso: 1, edificio_id: null, lat: 23, lng: -98 });
    conexiones.push({ nodo_origen_id: "isla", nodo_destino_id: "isla-2", costo: 1, bidireccional: true });
    nodos.push({ id: "isla-2", tipo: "pasillo", piso: 1, edificio_id: null, lat: 23.001, lng: -98 });
    const { resultado, ms } = medir(() => buscarRuta(nodos, conexiones, idCuadricula(0, 0), "isla"));
    assert.equal(resultado, null);
    assert.equal(explicarSinRuta(nodos, conexiones, idCuadricula(0, 0), "isla"), "grafo_desconectado");
    assert.ok(ms < 1500, `tardó ${ms.toFixed(0)} ms`);
  });

  it("cadena de 50 000 nodos: reconstruir la ruta no desborda la pila (nada recursivo)", () => {
    const nodos: NodoGrafo[] = [];
    const conexiones: ConexionGrafo[] = [];
    for (let i = 0; i < 50000; i++) {
      nodos.push({ id: `c${i}`, tipo: "pasillo", piso: 1, edificio_id: null, lat: null, lng: null });
      if (i > 0) conexiones.push({ nodo_origen_id: `c${i - 1}`, nodo_destino_id: `c${i}`, costo: 1, bidireccional: true });
    }
    const { resultado, ms } = medir(() => buscarRuta(nodos, conexiones, "c0", "c49999"));
    assert.equal(resultado!.length, 50000);
    assert.equal(resultado!.at(-1)!.costoAcumulado, 49999);
    assert.ok(ms < 3000, `tardó ${ms.toFixed(0)} ms`);
  });

  it("agrupar una ruta de 50 000 pasos en < 1 s", () => {
    const pasos = Array.from({ length: 50000 }, (_, i) => ({
      id: `p${i}`, tipo: "pasillo", piso: 1, edificioId: "e", lat: 22.25 + i * 0.00001, lng: -97.87, cambioPiso: null,
    }));
    const { resultado, ms } = medir(() => agruparPasos(pasos));
    assert.equal(resultado[0].tipo, "inicio");
    assert.equal(resultado.at(-1)!.tipo, "llegada");
    assert.ok(ms < 1000, `tardó ${ms.toFixed(0)} ms`);
  });
});

describe("carga: muchas consultas seguidas (usuarios simultáneos)", () => {
  it("1 000 rutas aleatorias sobre un campus de 1 600 nodos: todas válidas y < 6 s en total", () => {
    const { nodos, conexiones } = cuadricula(40, 40);
    const azar = mulberry32(2026);
    const elegir = () => idCuadricula(Math.floor(azar() * 40), Math.floor(azar() * 40));
    const { ms } = medir(() => {
      for (let i = 0; i < 1000; i++) {
        const a = elegir();
        const b = elegir();
        const ruta = buscarRuta(nodos, conexiones, a, b)!;
        assert.equal(ruta[0].nodo.id, a);
        assert.equal(ruta.at(-1)!.nodo.id, b);
      }
    });
    console.log(`  · 1 000 consultas: ${ms.toFixed(0)} ms (${(ms / 1000).toFixed(2)} ms c/u)`);
    assert.ok(ms < 6000, `tardó ${ms.toFixed(0)} ms`);
  });

  it("la ruta no cambia entre ejecuciones repetidas (determinista)", () => {
    const { nodos, conexiones } = cuadricula(30, 30);
    const base = buscarRuta(nodos, conexiones, idCuadricula(0, 0), idCuadricula(29, 29))!.map((p) => p.nodo.id).join(">");
    for (let i = 0; i < 50; i++) {
      assert.equal(buscarRuta(nodos, conexiones, idCuadricula(0, 0), idCuadricula(29, 29))!.map((p) => p.nodo.id).join(">"), base);
    }
  });

  it("buscarRuta no modifica los datos de entrada (seguro con un grafo compartido)", () => {
    const { nodos, conexiones } = cuadricula(20, 20);
    const antes = JSON.stringify({ nodos, conexiones });
    for (let i = 0; i < 20; i++) buscarRuta(nodos, conexiones, idCuadricula(0, 0), idCuadricula(19, 19), { evitarEscaleras: true });
    assert.equal(JSON.stringify({ nodos, conexiones }), antes);
  });
});

describe("fuerza: entradas hostiles y aleatorias (fuzz con semilla)", () => {
  it("validarPosicion nunca lanza con 20 000 valores raros y solo acepta coordenadas válidas", () => {
    const azar = mulberry32(7);
    const raros: unknown[] = [Number.NaN, Infinity, -Infinity, 0, -0, 1e308, "x", "", null, undefined, true, {}, [], () => 1, Symbol("s"), BigInt(10)];
    const pick = () => raros[Math.floor(azar() * raros.length)];
    for (let i = 0; i < 20000; i++) {
      const entrada = azar() < 0.5 ? { lat: pick(), lng: pick(), precision: pick() } : pick();
      const r = validarPosicion(entrada);
      if (r !== null) {
        assert.ok(Math.abs(r.lat) <= 90 && Math.abs(r.lng) <= 180 && r.precision >= 0);
        assert.ok(Number.isFinite(r.lat) && Number.isFinite(r.lng) && Number.isFinite(r.precision));
      }
    }
  });

  it("buscarRuta con identificadores raros no lanza: devuelve null", () => {
    const { nodos, conexiones } = cuadricula(5, 5);
    const raros = ["", " ", "null", "undefined", "__proto__", "constructor", "toString", "'; drop table nodos; --", "a".repeat(100000), "\u0000", "💥"];
    for (const a of raros) {
      for (const b of raros) assert.equal(buscarRuta(nodos, conexiones, a, b), null);
      assert.equal(buscarRuta(nodos, conexiones, a, idCuadricula(0, 0)), null);
    }
  });

  it("grafo con conexiones corruptas al azar (ciclos, autoconexiones, costos basura) no cuelga ni lanza", () => {
    const azar = mulberry32(99);
    const nodos: NodoGrafo[] = Array.from({ length: 300 }, (_, i) => ({ id: `n${i}`, tipo: "pasillo", piso: 1, edificio_id: null, lat: azar() < 0.2 ? null : 22 + azar() / 100, lng: azar() < 0.2 ? null : -97 - azar() / 100 }));
    const costos: ConexionGrafo["costo"][] = [null, 0, -1, "abc", "", "3.5", 7, Number.NaN, Infinity];
    const conexiones: ConexionGrafo[] = Array.from({ length: 2000 }, () => ({
      nodo_origen_id: `n${Math.floor(azar() * 310)}`, // algunos no existen
      nodo_destino_id: `n${Math.floor(azar() * 310)}`, // y hay autoconexiones
      costo: costos[Math.floor(azar() * costos.length)],
      bidireccional: azar() < 0.5,
    }));
    const { ms } = medir(() => {
      for (let i = 0; i < 200; i++) {
        const ruta = buscarRuta(nodos, conexiones, `n${Math.floor(azar() * 300)}`, `n${Math.floor(azar() * 300)}`);
        if (ruta) for (const p of ruta) assert.ok(Number.isFinite(p.costoAcumulado) && p.costoAcumulado >= 0, `costo ${p.costoAcumulado}`);
      }
    });
    assert.ok(ms < 5000, `tardó ${ms.toFixed(0)} ms`);
  });

  it("nodoMasCercano con 10 000 nodos responde rápido", () => {
    const { nodos, conexiones } = cuadricula(100, 100);
    const { resultado, ms } = medir(() => nodoMasCercano({ lat: 22.25 + 0.005, lng: -97.87 + 0.005, precision: 5 }, nodos, conexiones, {}));
    assert.ok(resultado.ok);
    assert.ok(ms < 500, `tardó ${ms.toFixed(0)} ms`);
  });
});

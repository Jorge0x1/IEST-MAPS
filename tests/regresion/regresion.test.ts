// Pruebas de regresión (R10): cada prueba fija un defecto que ya apareció (o
// que el código documenta como trampa) para que no vuelva. `npm run test:regresion`.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { buscarRuta, type ConexionGrafo, type NodoGrafo } from "../../lib/rutas/dijkstra.ts";
import { agruparPasos, tieneUbicacion } from "../../lib/rutas/instrucciones.ts";
import { puntosDeRuta } from "../../lib/rutas/mapa.ts";
import { validarPosicion } from "../../lib/rutas/cercano.ts";
import { cuadricula, idCuadricula } from "../helpers/grafo.ts";

const nodo = (id: string, extra: Partial<NodoGrafo> = {}): NodoGrafo => ({ id, tipo: "pasillo", piso: 1, edificio_id: null, lat: null, lng: null, ...extra });
const con = (a: string, b: string, costo: ConexionGrafo["costo"] = 1, bidireccional = true): ConexionGrafo => ({ nodo_origen_id: a, nodo_destino_id: b, costo, bidireccional });
const idsDe = (r: ReturnType<typeof buscarRuta>) => r?.map((p) => p.nodo.id);

describe("regresión del motor de rutas", () => {
  it("un costo 0 es un costo válido: no se confunde con 'sin costo'", () => {
    const nodos = [nodo("a"), nodo("b"), nodo("c")];
    // a-b con costo 0 debe ganarle al peso por defecto (1) de a-c-b.
    const r = buscarRuta(nodos, [con("a", "b", 0), con("a", "c", null), con("c", "b", null)], "a", "b");
    assert.deepEqual(idsDe(r), ["a", "b"]);
    assert.equal(r!.at(-1)!.costoAcumulado, 0);
  });

  it("el costo que PostgREST devuelve como texto ('12.5') se compara como número", () => {
    const nodos = [nodo("a"), nodo("b"), nodo("c")];
    // Si se concatenara como texto, "4"+"6" daría "46" y se elegiría mal; como
    // número 4+6=10 pierde contra el directo de 9.
    const r = buscarRuta(nodos, [con("a", "b", "9"), con("a", "c", "4"), con("c", "b", "6")], "a", "b");
    assert.deepEqual(idsDe(r), ["a", "b"]);
    assert.equal(r!.at(-1)!.costoAcumulado, 9);
  });

  it("una conexión de un solo sentido no se recorre al revés", () => {
    const nodos = [nodo("a"), nodo("b")];
    assert.deepEqual(idsDe(buscarRuta(nodos, [con("a", "b", 1, false)], "a", "b")), ["a", "b"]);
    assert.equal(buscarRuta(nodos, [con("a", "b", 1, false)], "b", "a"), null);
  });

  it("conexiones duplicadas o repetidas al revés (datos anteriores a la migración 0006) no rompen la ruta", () => {
    const nodos = [nodo("a"), nodo("b")];
    const r = buscarRuta(nodos, [con("a", "b", 5), con("b", "a", 2), con("a", "b", 9)], "a", "b");
    assert.equal(r!.at(-1)!.costoAcumulado, 2, "toma la más barata");
  });

  it("origen = destino devuelve un solo paso con costo 0", () => {
    const r = buscarRuta([nodo("a")], [], "a", "a");
    assert.deepEqual(idsDe(r), ["a"]);
    assert.equal(r![0].costoAcumulado, 0);
  });

  it("conexiones hacia nodos que no existen se ignoran en lugar de lanzar", () => {
    const r = buscarRuta([nodo("a"), nodo("b")], [con("a", "fantasma"), con("a", "b")], "a", "b");
    assert.deepEqual(idsDe(r), ["a", "b"]);
  });

  it("cuadrícula 3x3: de esquina a esquina son 5 nodos (distancia Manhattan)", () => {
    const { nodos, conexiones } = cuadricula(3, 3);
    const r = buscarRuta(nodos, conexiones, idCuadricula(0, 0), idCuadricula(2, 2))!;
    assert.equal(r.length, 5);
    assert.equal(r[0].costoAcumulado, 0);
  });
});

describe("regresión de instrucciones y mapa", () => {
  const paso = (id: string, extra: Record<string, unknown> = {}) => ({
    id, nombre: id, tipo: "pasillo", piso: 1, edificioId: "e", lat: 22.25 + Number(id.replace(/\D/g, "") || 0) * 0.0001, lng: -97.87, cambioPiso: null, ...extra,
  });

  it("el último nodo siempre es la llegada, aunque sea un pasillo", () => {
    const i = agruparPasos([paso("a1"), paso("a2"), paso("a3"), paso("a4")]);
    assert.equal(i.at(-1)!.tipo, "llegada");
    assert.deepEqual(i.at(-1)!.pasos.map((p) => p.id), ["a4"]);
  });

  it("coordenadas basura (NaN, fuera de rango, null) cuentan como 'sin ubicación'", () => {
    assert.equal(tieneUbicacion({ lat: Number.NaN, lng: -97 }), false);
    assert.equal(tieneUbicacion({ lat: 999, lng: -97 }), false);
    assert.equal(tieneUbicacion({ lat: 22, lng: 400 }), false);
    assert.equal(tieneUbicacion({ lat: null, lng: -97 }), false);
    assert.equal(tieneUbicacion({ lat: 22.25, lng: -97.87 }), true);
  });

  it("un nodo sin coordenadas no tira el mapa: se cuenta como omitido", () => {
    const pasos = [paso("a1"), paso("a2", { lat: null, lng: null }), paso("a3"), paso("a4")];
    const { puntos, omitidos } = puntosDeRuta(pasos);
    assert.ok(puntos.length >= 2);
    assert.equal(typeof omitidos, "number");
  });
});

describe("regresión de la entrada que llega del navegador (GPS)", () => {
  it("rechaza NaN, Infinity, texto numérico y valores fuera de rango", () => {
    for (const mala of [
      { lat: Number.NaN, lng: -97, precision: 5 },
      { lat: 22, lng: Number.POSITIVE_INFINITY, precision: 5 },
      { lat: "22.2", lng: -97, precision: 5 },
      { lat: 91, lng: -97, precision: 5 },
      { lat: 22, lng: -181, precision: 5 },
      { lat: 22, lng: -97, precision: -1 },
      { lat: 22, lng: -97 },
      null,
      undefined,
      "22,-97",
      42,
      [],
    ]) {
      assert.equal(validarPosicion(mala), null, `debió rechazar ${JSON.stringify(mala)}`);
    }
  });
});

describe("regresión del repositorio", () => {
  const raiz = join(import.meta.dirname, "..", "..");

  function archivos(dir: string, acc: string[] = []): string[] {
    for (const nombre of readdirSync(dir)) {
      if (nombre === "node_modules" || nombre === ".next" || nombre.startsWith(".")) continue;
      const ruta = join(dir, nombre);
      if (statSync(ruta).isDirectory()) archivos(ruta, acc);
      else acc.push(ruta);
    }
    return acc;
  }

  it("no quedan marcas de conflicto de merge en el código (el merge roto del historial)", () => {
    const sospechosos: string[] = [];
    for (const carpeta of ["app", "lib", "utils", "supabase", "tests"]) {
      for (const ruta of archivos(join(raiz, carpeta))) {
        if (!/\.(ts|tsx|css|sql|md)$/.test(ruta) || ruta.endsWith("regresion.test.ts")) continue;
        if (/^(<{7} |>{7} |={7}$)/m.test(readFileSync(ruta, "utf8"))) sospechosos.push(ruta.slice(raiz.length + 1));
      }
    }
    assert.deepEqual(sospechosos, []);
  });

  it("las migraciones están numeradas de forma consecutiva, sin huecos ni repetidas", () => {
    const nombres = readdirSync(join(raiz, "supabase", "migrations")).filter((n) => n.endsWith(".sql")).sort();
    assert.ok(nombres.length > 0);
    nombres.forEach((nombre, i) => {
      assert.equal(nombre.slice(0, 4), String(i + 1).padStart(4, "0"), `falta o sobra una migración cerca de ${nombre}`);
    });
  });
});

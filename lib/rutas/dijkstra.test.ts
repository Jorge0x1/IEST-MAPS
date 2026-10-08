// Pruebas del motor de rutas. Ejecutar con `npm test` (node --test, sin dependencias).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buscarRuta,
  explicarSinRuta,
  pesoConexion,
  PESO_POR_DEFECTO,
  type ConexionGrafo,
  type NodoGrafo,
} from "./dijkstra.ts";
import { distanciaMetros } from "../geo.ts";

function nodo(id: string, extra: Partial<NodoGrafo> = {}): NodoGrafo {
  return { id, tipo: "pasillo", piso: 0, edificio_id: null, lat: null, lng: null, ...extra };
}

function con(
  origen: string,
  destino: string,
  costo: ConexionGrafo["costo"] = 1,
  bidireccional = true,
): ConexionGrafo {
  return { nodo_origen_id: origen, nodo_destino_id: destino, costo, bidireccional };
}

const ids = (ruta: ReturnType<typeof buscarRuta>) => ruta?.map((paso) => paso.nodo.id) ?? null;

describe("pesoConexion", () => {
  const a = nodo("a", { lat: 22.25, lng: -97.87 });
  const b = nodo("b", { lat: 22.2505, lng: -97.8705 });

  it("usa el costo explícito si existe", () => {
    assert.equal(pesoConexion(con("a", "b", 42), a, b), 42);
  });

  it("acepta costo 0", () => {
    assert.equal(pesoConexion(con("a", "b", 0), a, b), 0);
  });

  it("acepta costo numeric que llega como texto", () => {
    assert.equal(pesoConexion(con("a", "b", "12.5"), a, b), 12.5);
  });

  it("sin costo, calcula la distancia real con las coordenadas", () => {
    const esperado = distanciaMetros(22.25, -97.87, 22.2505, -97.8705);
    assert.equal(pesoConexion(con("a", "b", null), a, b), esperado);
    assert.ok(esperado > 50 && esperado < 100, `distancia razonable, fue ${esperado}`);
  });

  it("sin costo y sin coordenadas en algún nodo, usa el peso fijo", () => {
    assert.equal(pesoConexion(con("a", "b", null), a, nodo("b")), PESO_POR_DEFECTO);
    assert.equal(pesoConexion(con("a", "b", null), nodo("a", { lat: 22 }), b), PESO_POR_DEFECTO);
  });

  it("costos inválidos (negativos, texto basura) caen al siguiente criterio", () => {
    assert.equal(pesoConexion(con("a", "b", -5), nodo("a"), nodo("b")), PESO_POR_DEFECTO);
    assert.equal(pesoConexion(con("a", "b", "abc"), nodo("a"), nodo("b")), PESO_POR_DEFECTO);
    assert.equal(pesoConexion(con("a", "b", ""), nodo("a"), nodo("b")), PESO_POR_DEFECTO);
  });
});

describe("buscarRuta", () => {
  it("recorre una línea simple con costos acumulados", () => {
    const ruta = buscarRuta(
      [nodo("a"), nodo("b"), nodo("c")],
      [con("a", "b", 3), con("b", "c", 4)],
      "a",
      "c",
    );
    assert.deepEqual(ids(ruta), ["a", "b", "c"]);
    assert.deepEqual(ruta!.map((p) => p.costoAcumulado), [0, 3, 7]);
  });

  it("prefiere el camino más barato aunque tenga más saltos", () => {
    const ruta = buscarRuta(
      [nodo("a"), nodo("b"), nodo("c"), nodo("d")],
      [con("a", "d", 10), con("a", "b", 2), con("b", "c", 2), con("c", "d", 2)],
      "a",
      "d",
    );
    assert.deepEqual(ids(ruta), ["a", "b", "c", "d"]);
    assert.equal(ruta!.at(-1)!.costoAcumulado, 6);
  });

  it("usa conexiones bidireccionales en ambos sentidos", () => {
    const ruta = buscarRuta([nodo("a"), nodo("b")], [con("a", "b", 5)], "b", "a");
    assert.deepEqual(ids(ruta), ["b", "a"]);
  });

  it("no recorre al revés una conexión de un solo sentido", () => {
    const nodos = [nodo("a"), nodo("b")];
    const conexiones = [con("a", "b", 5, false)];
    assert.deepEqual(ids(buscarRuta(nodos, conexiones, "a", "b")), ["a", "b"]);
    assert.equal(buscarRuta(nodos, conexiones, "b", "a"), null);
  });

  it("origen igual a destino devuelve un solo paso con costo 0", () => {
    const ruta = buscarRuta([nodo("a")], [], "a", "a");
    assert.deepEqual(ruta, [{ nodo: nodo("a"), costoAcumulado: 0 }]);
  });

  it("devuelve null si el origen o el destino no existen", () => {
    assert.equal(buscarRuta([nodo("a")], [], "x", "a"), null);
    assert.equal(buscarRuta([nodo("a")], [], "a", "x"), null);
  });

  it("devuelve null para un nodo sin ninguna conexión", () => {
    assert.equal(
      buscarRuta([nodo("a"), nodo("b"), nodo("aislado")], [con("a", "b")], "a", "aislado"),
      null,
    );
  });

  it("devuelve null si el grafo está desconectado", () => {
    assert.equal(
      buscarRuta(
        [nodo("a"), nodo("b"), nodo("c"), nodo("d")],
        [con("a", "b"), con("c", "d")],
        "a",
        "d",
      ),
      null,
    );
  });

  it("ignora conexiones hacia nodos que no están en la lista", () => {
    const ruta = buscarRuta(
      [nodo("a"), nodo("b")],
      [con("a", "fantasma", 0), con("fantasma", "b", 0), con("a", "b", 9)],
      "a",
      "b",
    );
    assert.deepEqual(ids(ruta), ["a", "b"]);
    assert.equal(ruta!.at(-1)!.costoAcumulado, 9);
  });

  it("mezcla costo explícito, distancia real y peso fijo sin fallar", () => {
    const nodos = [
      nodo("a", { lat: 22.25, lng: -97.87 }),
      nodo("b", { lat: 22.2501, lng: -97.87 }),
      nodo("c"), // sin coordenadas
    ];
    const ruta = buscarRuta(nodos, [con("a", "b", null), con("b", "c", null)], "a", "c");
    const tramo = distanciaMetros(22.25, -97.87, 22.2501, -97.87);
    assert.deepEqual(ids(ruta), ["a", "b", "c"]);
    assert.equal(ruta![1].costoAcumulado, tramo);
    assert.equal(ruta![2].costoAcumulado, tramo + PESO_POR_DEFECTO);
  });

  describe("evitarEscaleras", () => {
    // Planta baja: entrada → pasillo; sube al piso 1 por escalera (barata) o elevador (cara).
    const nodos = [
      nodo("entrada", { tipo: "entrada" }),
      nodo("pasillo0"),
      nodo("esc0", { tipo: "escalera" }),
      nodo("esc1", { tipo: "escalera", piso: 1 }),
      nodo("elev0", { tipo: "elevador" }),
      nodo("elev1", { tipo: "elevador", piso: 1 }),
      nodo("salon", { tipo: "salon", piso: 1 }),
    ];
    const conexiones = [
      con("entrada", "pasillo0", 5),
      con("pasillo0", "esc0", 2),
      con("esc0", "esc1", 3),
      con("esc1", "salon", 2),
      con("pasillo0", "elev0", 10),
      con("elev0", "elev1", 5),
      con("elev1", "salon", 10),
    ];

    it("sin la opción, toma la escalera por ser más corta", () => {
      assert.deepEqual(ids(buscarRuta(nodos, conexiones, "entrada", "salon")), [
        "entrada", "pasillo0", "esc0", "esc1", "salon",
      ]);
    });

    it("con la opción, rodea por el elevador", () => {
      const ruta = buscarRuta(nodos, conexiones, "entrada", "salon", { evitarEscaleras: true });
      assert.deepEqual(ids(ruta), ["entrada", "pasillo0", "elev0", "elev1", "salon"]);
      assert.equal(ruta!.at(-1)!.costoAcumulado, 30);
    });

    it("con la opción y sin elevador, el destino queda inalcanzable", () => {
      const sinElevador = nodos.filter((n) => n.tipo !== "elevador");
      assert.equal(
        buscarRuta(sinElevador, conexiones, "entrada", "salon", { evitarEscaleras: true }),
        null,
      );
    });

    it("si el destino es una escalera, con la opción no hay ruta", () => {
      assert.equal(buscarRuta(nodos, conexiones, "entrada", "esc0", { evitarEscaleras: true }), null);
    });
  });

  it("coincide con Bellman-Ford en grafos aleatorios", () => {
    // Generador pseudoaleatorio con semilla fija para que la prueba sea reproducible.
    let semilla = 12345;
    const aleatorio = () => {
      semilla = (semilla * 1103515245 + 12345) % 2 ** 31;
      return semilla / 2 ** 31;
    };

    for (let caso = 0; caso < 200; caso++) {
      const totalNodos = 2 + Math.floor(aleatorio() * 25);
      const nodos = Array.from({ length: totalNodos }, (_, i) => nodo(`n${i}`));
      const conexiones: ConexionGrafo[] = [];
      const totalAristas = Math.floor(aleatorio() * totalNodos * 3);
      for (let k = 0; k < totalAristas; k++) {
        const a = Math.floor(aleatorio() * totalNodos);
        const b = Math.floor(aleatorio() * totalNodos);
        if (a === b) continue;
        conexiones.push(con(`n${a}`, `n${b}`, Math.floor(aleatorio() * 20), aleatorio() < 0.7));
      }

      // Bellman-Ford de referencia (lento pero obvio).
      const dist = new Map<string, number>(nodos.map((n) => [n.id, Infinity]));
      dist.set("n0", 0);
      for (let r = 0; r < totalNodos; r++) {
        for (const c of conexiones) {
          const peso = Number(c.costo);
          const relajar = (u: string, v: string) => {
            if (dist.get(u)! + peso < dist.get(v)!) dist.set(v, dist.get(u)! + peso);
          };
          relajar(c.nodo_origen_id, c.nodo_destino_id);
          if (c.bidireccional) relajar(c.nodo_destino_id, c.nodo_origen_id);
        }
      }

      const destino = `n${totalNodos - 1}`;
      const ruta = buscarRuta(nodos, conexiones, "n0", destino);
      const esperado = dist.get(destino)!;

      if (esperado === Infinity) {
        assert.equal(ruta, null, `caso ${caso}: no debía haber ruta`);
        continue;
      }
      assert.ok(ruta, `caso ${caso}: debía haber ruta`);
      assert.equal(ruta.at(-1)!.costoAcumulado, esperado, `caso ${caso}: costo total`);
      assert.equal(ruta[0].nodo.id, "n0");
      assert.equal(ruta.at(-1)!.nodo.id, destino);

      // Cada paso debe corresponder a una arista real con el peso que suma.
      for (let i = 1; i < ruta.length; i++) {
        const u = ruta[i - 1].nodo.id;
        const v = ruta[i].nodo.id;
        const delta = ruta[i].costoAcumulado - ruta[i - 1].costoAcumulado;
        const existe = conexiones.some(
          (c) =>
            Number(c.costo) === delta &&
            ((c.nodo_origen_id === u && c.nodo_destino_id === v) ||
              (c.bidireccional && c.nodo_origen_id === v && c.nodo_destino_id === u)),
        );
        assert.ok(existe, `caso ${caso}: el tramo ${u}→${v} (${delta}) no es una arista válida`);
      }
    }
  });
});

describe("explicarSinRuta", () => {
  const nodos = [
    nodo("a"),
    nodo("b"),
    nodo("esc", { tipo: "escalera" }),
    nodo("c"),
    nodo("aislado"),
    nodo("x"),
    nodo("y"),
  ];
  const conexiones = [con("a", "b"), con("b", "esc"), con("esc", "c"), con("x", "y")];

  it("detecta origen o destino inexistente", () => {
    assert.equal(explicarSinRuta(nodos, conexiones, "nope", "a"), "origen_inexistente");
    assert.equal(explicarSinRuta(nodos, conexiones, "a", "nope"), "destino_inexistente");
  });

  it("detecta nodos sin ninguna conexión", () => {
    assert.equal(explicarSinRuta(nodos, conexiones, "aislado", "a"), "origen_sin_conexiones");
    assert.equal(explicarSinRuta(nodos, conexiones, "a", "aislado"), "destino_sin_conexiones");
  });

  it("detecta que las escaleras son las que bloquean", () => {
    assert.equal(buscarRuta(nodos, conexiones, "a", "c", { evitarEscaleras: true }), null);
    assert.equal(
      explicarSinRuta(nodos, conexiones, "a", "c", { evitarEscaleras: true }),
      "bloqueado_por_escaleras",
    );
  });

  it("detecta grafo desconectado", () => {
    assert.equal(explicarSinRuta(nodos, conexiones, "a", "y"), "grafo_desconectado");
    assert.equal(
      explicarSinRuta(nodos, conexiones, "a", "y", { evitarEscaleras: true }),
      "grafo_desconectado",
    );
  });
});

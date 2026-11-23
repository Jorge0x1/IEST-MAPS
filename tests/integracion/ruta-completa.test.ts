// Pruebas de integración (R11): el flujo completo del motor de rutas con los
// módulos reales juntos, sin mocks y sin red:
//   GPS -> nodo más cercano -> Dijkstra -> instrucciones -> puntos del mapa ->
//   navegación en vivo.
// El grafo vive en memoria y replica la forma de lo que devuelve Supabase.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buscarRuta, explicarSinRuta, type ConexionGrafo, type NodoGrafo } from "../../lib/rutas/dijkstra.ts";
import { agruparPasos } from "../../lib/rutas/instrucciones.ts";
import { puntosDeRuta } from "../../lib/rutas/mapa.ts";
import { nodoMasCercano, validarPosicion } from "../../lib/rutas/cercano.ts";
import { avanzar, iniciarNavegacion, type AccionNavegacion } from "../../lib/rutas/navegacion.ts";
import type { PasoSeguible } from "../../lib/rutas/seguimiento.ts";
import { pos } from "../../lib/rutas/prueba-rutas.ts";

type Def = { id: string; nombre: string; tipo: string; piso: number; x: number; y: number };

// Edificio de dos pisos: entrada -> pasillo -> (escalera | elevador) -> salón 204.
const DEFS: Def[] = [
  { id: "ent", nombre: "Entrada principal", tipo: "entrada", piso: 1, x: 0, y: 0 },
  { id: "p1", nombre: "Pasillo A", tipo: "pasillo", piso: 1, x: 30, y: 0 },
  { id: "p2", nombre: "Pasillo B", tipo: "pasillo", piso: 1, x: 60, y: 0 },
  { id: "esc1", nombre: "Escalera norte", tipo: "escalera", piso: 1, x: 60, y: 15 },
  { id: "esc2", nombre: "Escalera norte", tipo: "escalera", piso: 2, x: 60, y: 15 },
  { id: "el1", nombre: "Elevador", tipo: "elevador", piso: 1, x: 30, y: 15 },
  { id: "el2", nombre: "Elevador", tipo: "elevador", piso: 2, x: 30, y: 15 },
  { id: "p3", nombre: "Pasillo piso 2 oeste", tipo: "pasillo", piso: 2, x: 30, y: 35 },
  { id: "p4", nombre: "Pasillo piso 2 este", tipo: "pasillo", piso: 2, x: 60, y: 35 },
  { id: "s204", nombre: "Salón 204", tipo: "salon", piso: 2, x: 90, y: 35 },
];

const nodos: (NodoGrafo & { nombre: string })[] = DEFS.map((d) => ({
  id: d.id,
  nombre: d.nombre,
  tipo: d.tipo,
  piso: d.piso,
  edificio_id: "edif-1",
  ...pos(d.x, d.y),
}));

const c = (a: string, b: string, costo: number | null = null): ConexionGrafo => ({
  nodo_origen_id: a,
  nodo_destino_id: b,
  costo,
  bidireccional: true,
});

const conexiones: ConexionGrafo[] = [
  c("ent", "p1"),
  c("p1", "p2"),
  c("p2", "esc1"),
  c("esc1", "esc2", 3), // subir un piso no tiene coordenadas distintas: costo explícito
  c("esc2", "p4"),
  c("p1", "el1"),
  c("el1", "el2", 5),
  c("el2", "p3"),
  c("p3", "p4"),
  c("p4", "s204"),
];

// Igual que armarRuta() de lib/rutas/actions.ts: nodo -> paso con cambio de piso.
function aPasos(ruta: NonNullable<ReturnType<typeof buscarRuta>>): PasoSeguible[] {
  return ruta.map((p, i) => {
    const nodo = p.nodo as (typeof nodos)[number];
    const anterior = i > 0 ? (ruta[i - 1].nodo as (typeof nodos)[number]) : null;
    let cambioPiso: PasoSeguible["cambioPiso"] = null;
    if (anterior && anterior.piso !== nodo.piso) {
      const via = [anterior, nodo].find((n) => n.tipo === "escalera" || n.tipo === "elevador");
      cambioPiso = {
        desde: anterior.piso,
        hasta: nodo.piso,
        sentido: nodo.piso > anterior.piso ? "sube" : "baja",
        via: via ? { nombre: via.nombre, tipo: via.tipo as "escalera" | "elevador" } : null,
      };
    }
    return { id: nodo.id, nombre: nodo.nombre, tipo: nodo.tipo, piso: nodo.piso, edificioId: nodo.edificio_id, lat: nodo.lat, lng: nodo.lng, cambioPiso };
  });
}

const ids = (ruta: NonNullable<ReturnType<typeof buscarRuta>>) => ruta.map((p) => p.nodo.id);

describe("ruta completa: motor + instrucciones + mapa", () => {
  const ruta = buscarRuta(nodos, conexiones, "ent", "s204")!;

  it("por defecto toma la escalera, que es más corta", () => {
    assert.deepEqual(ids(ruta), ["ent", "p1", "p2", "esc1", "esc2", "p4", "s204"]);
    // 30 + 30 + 15 + 3 + 20 + 30 = 128 m (±1 por el redondeo del coseno)
    assert.ok(Math.abs(ruta.at(-1)!.costoAcumulado - 128) < 1, `costo ${ruta.at(-1)!.costoAcumulado}`);
  });

  it("con 'evitar escaleras' toma el elevador y nunca pasa por la escalera", () => {
    const r = buscarRuta(nodos, conexiones, "ent", "s204", { evitarEscaleras: true })!;
    assert.deepEqual(ids(r), ["ent", "p1", "el1", "el2", "p3", "p4", "s204"]);
  });

  it("si no hay elevador, evitar escaleras deja sin ruta y se explica el motivo", () => {
    const sinElevador = conexiones.filter((x) => !x.nodo_origen_id.startsWith("el") && !x.nodo_destino_id.startsWith("el"));
    assert.equal(buscarRuta(nodos, sinElevador, "ent", "s204", { evitarEscaleras: true }), null);
    assert.equal(explicarSinRuta(nodos, sinElevador, "ent", "s204", { evitarEscaleras: true }), "bloqueado_por_escaleras");
  });

  it("las instrucciones cubren cada nodo exactamente una vez y en orden", () => {
    const instrucciones = agruparPasos(aPasos(ruta));
    assert.deepEqual(instrucciones.flatMap((i) => i.pasos.map((p) => p.id)), ids(ruta));
    assert.equal(instrucciones[0].tipo, "inicio");
    assert.equal(instrucciones.at(-1)!.tipo, "llegada");
    assert.equal(instrucciones.filter((i) => i.tipo === "cambio_piso").length, 1);
  });

  it("los puntos del mapa abarcan los dos pisos, con inicio y destino", () => {
    const { puntos, omitidos } = puntosDeRuta(aPasos(ruta));
    assert.equal(omitidos, 0);
    assert.equal(puntos[0].rol, "inicio");
    assert.equal(puntos.at(-1)!.rol, "destino");
    assert.deepEqual([...new Set(puntos.map((p) => p.piso))].sort(), [1, 2]);
  });
});

describe("ruta desde la ubicación GPS del alumno", () => {
  it("valida la posición, elige el nodo más cercano y traza la ruta desde ahí", () => {
    const posicion = validarPosicion({ ...pos(29, 2), precision: 6 });
    assert.ok(posicion, "la posición válida debe aceptarse");
    const cercano = nodoMasCercano(posicion, nodos, conexiones, {});
    assert.ok(cercano.ok);
    assert.equal(cercano.nodo.id, "p1");
    const ruta = buscarRuta(nodos, conexiones, cercano.nodo.id, "s204")!;
    assert.equal(ruta[0].nodo.id, "p1");
    assert.equal(ruta.at(-1)!.nodo.id, "s204");
  });

  it("una posición imprecisa o fuera del campus no produce ruta", () => {
    const imprecisa = nodoMasCercano({ ...pos(29, 2), precision: 500 }, nodos, conexiones, {});
    assert.deepEqual(imprecisa, { ok: false, motivo: "ubicacion_imprecisa" });
    const lejos = nodoMasCercano({ lat: 25.0, lng: -100.0, precision: 5 }, nodos, conexiones, {});
    assert.deepEqual(lejos, { ok: false, motivo: "fuera_del_campus" });
  });
});

describe("navegación en vivo sobre una ruta real del motor", () => {
  it("camina el piso 1, confirma el cambio de piso y llega al salón", () => {
    const pasos = aPasos(buscarRuta(nodos, conexiones, "ent", "s204")!);
    let estado = iniciarNavegacion(pasos);
    let reloj = 0;
    const efectos: string[] = [];
    const fase = () => estado.fase; // función: evita que TS "recuerde" la fase tras un assert
    const aplicar = (accion: AccionNavegacion) => {
      const r = avanzar(estado, accion);
      estado = r.estado;
      for (const e of r.efectos) efectos.push(e.tipo === "aviso" ? e.clase : e.tipo);
    };
    const lectura = (x: number, y: number) => aplicar({ tipo: "lectura", ...pos(x, y), precision: 5, ahora: (reloj += 1000) });
    const caminar = (puntos: [number, number][]) => {
      for (let i = 1; i < puntos.length; i++) {
        const [x0, y0] = puntos[i - 1];
        const [x1, y1] = puntos[i];
        const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / 3));
        for (let k = 1; k <= n; k++) lectura(x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n);
      }
    };

    caminar([[0, 0], [60, 0], [60, 15]]);
    assert.equal(fase(), "preguntando_piso", "al llegar a la escalera pregunta si ya subió");
    aplicar({ tipo: "confirmar_piso" });
    // El GPS solo se usa en el piso 1: en el piso 2 el tramo es manual y el
    // alumno avanza con "siguiente" hasta llegar al salón.
    for (let i = 0; i < 20 && fase() === "caminando"; i++) aplicar({ tipo: "siguiente" });

    assert.equal(fase(), "llegada");
    assert.ok(efectos.includes("piso"), `avisos: ${efectos.join(",")}`);
    assert.equal(efectos.at(-1), "llegada");
  });
});

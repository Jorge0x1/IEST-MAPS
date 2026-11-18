// Pruebas de la máquina de navegación en vivo. `npm test`.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  avanzar,
  esManual,
  indicacionActual,
  iniciarNavegacion,
  metrosRestantes,
  PAUSA_RECALCULO_MS,
  pisoActual,
  preguntaPiso,
  textoIndicacion,
  type AccionNavegacion,
  type EstadoNavegacion,
  type Efecto,
  type Indicacion,
} from "./navegacion.ts";
import type { PasoSeguible } from "./seguimiento.ts";
import { camino, paso, pos } from "./prueba-rutas.ts";

const cerca = (a: number | null, b: number, tol = 1.5) => assert.ok(a !== null && Math.abs(a - b) <= tol, `${a} no está cerca de ${b}`);

// Aplica acciones y junta todos los efectos.
function aplicar(estado: EstadoNavegacion, acciones: AccionNavegacion[]) {
  const efectos: Efecto[] = [];
  for (const accion of acciones) {
    const r = avanzar(estado, accion);
    estado = r.estado;
    efectos.push(...r.efectos);
  }
  return { estado, efectos };
}

let reloj = 0;
function lectura(este: number, norte: number, precision = 5): AccionNavegacion {
  reloj += 1000;
  return { tipo: "lectura", ...pos(este, norte), precision, ahora: reloj };
}

// Lecturas cada 3 m sobre una línea quebrada.
function caminar(vertices: [number, number][], precision = 5): AccionNavegacion[] {
  const acciones: AccionNavegacion[] = [];
  for (let i = 1; i < vertices.length; i++) {
    const [x0, y0] = vertices[i - 1];
    const [x1, y1] = vertices[i];
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / 3));
    for (let k = 1; k <= n; k++) acciones.push(lectura(x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n, precision));
  }
  return acciones;
}

function rutaL(): PasoSeguible[] {
  const pasos = camino([[0, 0], [60, 0], [60, 30]]);
  pasos[pasos.length - 1] = { ...pasos[pasos.length - 1], nombre: "Salón 204", tipo: "salon" };
  return pasos;
}

const clases = (efectos: Efecto[]) => efectos.map((e) => (e.tipo === "aviso" ? e.clase : e.tipo));

describe("caminar una ruta en el piso 1", () => {
  it("avisa una vez el giro y luego la llegada", () => {
    const r = aplicar(iniciarNavegacion(rutaL()), [...caminar([[0, 0], [60, 0], [60, 30]]), lectura(60, 30), lectura(60, 30)]);
    assert.deepEqual(clases(r.efectos), ["giro", "llegada"]);
    assert.equal(r.estado.fase, "llegada");
  });

  it("la indicación cambia según la distancia a la esquina", () => {
    let e = aplicar(iniciarNavegacion(rutaL()), [lectura(3, 0), lectura(6, 0), lectura(9, 0)]).estado;
    assert.equal(indicacionActual(e).maniobra, "recto"); // esquina a 51 m
    e = aplicar(e, caminar([[9, 0], [35, 0]])).estado;
    const i = indicacionActual(e);
    assert.equal(i.maniobra, "izquierda");
    cerca(i.metros, 25);
    assert.equal(i.ahora, false);
    e = aplicar(e, caminar([[35, 0], [57, 0]])).estado;
    assert.equal(indicacionActual(e).ahora, true);
  });

  it("metros restantes", () => {
    const e = aplicar(iniciarNavegacion(rutaL()), caminar([[0, 0], [30, 0]])).estado;
    cerca(metrosRestantes(e), 60);
  });
});

describe("ruta en U con pasillos paralelos", () => {
  it("un error lateral del GPS no salta al regreso ni da la llegada", () => {
    const pasos = camino([[0, 0], [25, 0], [25, 6], [0, 6]]);
    const r = aplicar(iniciarNavegacion(pasos), [lectura(3, 0, 8), lectura(6, 0, 8), lectura(9, 4.2, 8)]);
    assert.equal(r.estado.fase, "caminando");
    assert.ok(r.estado.metros < 15, `avance ${r.estado.metros}`);
  });
});

describe("avance a mano en un tramo con GPS", () => {
  it("'siguiente' pasa a la siguiente maniobra y luego llega", () => {
    let e = aplicar(iniciarNavegacion(rutaL()), [lectura(3, 0), lectura(6, 0)]).estado;
    e = avanzar(e, { tipo: "siguiente" }).estado;
    assert.ok(e.metros > 60, `avance ${e.metros}`);
    assert.equal(indicacionActual(e).maniobra, "llegada");
    const r = avanzar(e, { tipo: "siguiente" });
    assert.equal(r.estado.fase, "llegada");
    assert.deepEqual(clases(r.efectos), ["llegada"]);
  });

  it("en un tramo manual, una lectura imprecisa no marca 'GPS impreciso'", () => {
    const e = aplicar(iniciarNavegacion(rutaConPiso("escalera")), [...caminar([[0, 0], [27, 0]]), { tipo: "confirmar_piso" }, lectura(30, 0, 80)]).estado;
    assert.equal(e.gpsImpreciso, false);
  });
});

describe("desvío", () => {
  it("3 lecturas lejos: aviso y recálculo una sola vez hasta volver a la ruta", () => {
    const e = aplicar(iniciarNavegacion(rutaL()), caminar([[0, 0], [12, 0]])).estado;
    let r = aplicar(e, [lectura(12, 30), lectura(12, 30)]);
    assert.deepEqual(r.efectos, []);
    r = aplicar(r.estado, [lectura(12, 30)]);
    assert.deepEqual(clases(r.efectos), ["desvio", "recalcular"]);
    assert.equal(r.estado.lecturasFuera, 0);
    assert.ok(r.estado.ultimoRecalculo !== null);
    // El recálculo falló (no llegó ruta nueva): no se repite aunque pase la pausa.
    reloj += PAUSA_RECALCULO_MS;
    r = aplicar(r.estado, [lectura(12, 30), lectura(12, 30), lectura(12, 30), lectura(12, 30)]);
    assert.deepEqual(r.efectos, []);
    // De vuelta en la ruta, un desvío nuevo sí avisa.
    r = aplicar(r.estado, [lectura(15, 0), lectura(15, 30), lectura(15, 30), lectura(15, 30)]);
    assert.deepEqual(clases(r.efectos), ["desvio", "recalcular"]);
  });

  it("tras una ruta nueva, la pausa de 15 s evita otro recálculo inmediato", () => {
    let r = aplicar(iniciarNavegacion(rutaL()), [{ tipo: "ruta_nueva", pasos: rutaL(), ahora: reloj }]);
    r = aplicar(r.estado, [lectura(12, 30), lectura(12, 30), lectura(12, 30)]);
    assert.deepEqual(r.efectos, []);
    reloj += PAUSA_RECALCULO_MS;
    r = aplicar(r.estado, [lectura(12, 30)]);
    assert.deepEqual(clases(r.efectos), ["desvio", "recalcular"]);
  });

  it("si la señal vuelve más adelante en la ruta, avanza sin avisar desvío", () => {
    const recta = camino([[0, 0], [150, 0]]);
    let r = aplicar(iniciarNavegacion(recta), [lectura(3, 0), lectura(5, 0)]);
    r = aplicar(r.estado, [lectura(100, 0), lectura(100, 0), lectura(101, 0)]);
    assert.deepEqual(r.efectos, []);
    cerca(r.estado.metros, 100, 2);
  });

  it("con precisión 20 el límite es 40 m: 30 m no cuenta", () => {
    const r = aplicar(iniciarNavegacion(rutaL()), [lectura(3, 30, 20), lectura(3, 30, 20), lectura(3, 30, 20)]);
    assert.deepEqual(r.efectos, []);
  });

  it("precisión 60: GPS impreciso, no cuenta ni avanza", () => {
    const r = aplicar(iniciarNavegacion(rutaL()), [lectura(30, 30, 60), lectura(30, 30, 60), lectura(30, 30, 60), lectura(30, 0, 60)]);
    assert.deepEqual(r.efectos, []);
    assert.equal(r.estado.gpsImpreciso, true);
    assert.equal(r.estado.metros, 0);
  });
});

function rutaConPiso(via: "escalera" | "elevador" | null, sentido: "sube" | "baja" = "sube") {
  const hasta = sentido === "sube" ? 2 : 0;
  const base = camino([[0, 0], [30, 0]]);
  return [
    ...base,
    paso(30, 0, {
      piso: hasta,
      tipo: via ?? "pasillo",
      cambioPiso: { desde: 1, hasta, sentido, via: via ? { nombre: via === "elevador" ? "Elevador A" : "Escalera B", tipo: via } : null },
    }),
    paso(30, 10, { piso: hasta }),
    paso(30, 20, { piso: hasta, nombre: "Salón 304", tipo: "salon" }),
  ];
}

describe("cambio de piso", () => {
  it("pregunta al llegar a la escalera, espera con 'todavía no' y sigue en el piso nuevo", () => {
    let r = aplicar(iniciarNavegacion(rutaConPiso("escalera")), caminar([[0, 0], [21, 0]]));
    assert.equal(r.estado.fase, "caminando");
    r = aplicar(r.estado, [lectura(24, 0)]);
    assert.equal(r.estado.fase, "preguntando_piso");
    assert.deepEqual(clases(r.efectos), ["piso"]);
    assert.equal(preguntaPiso(r.estado), "¿Ya subiste al piso 2?");
    const quieto = aplicar(r.estado, [lectura(12, 30), lectura(12, 30), lectura(12, 30)]);
    assert.deepEqual(quieto.efectos, []);
    assert.equal(quieto.estado, r.estado);
    let e = aplicar(r.estado, [{ tipo: "todavia_no" }]).estado;
    assert.equal(e.fase, "esperando_piso");
    e = aplicar(e, [{ tipo: "confirmar_piso" }]).estado;
    assert.equal(e.fase, "caminando");
    assert.equal(pisoActual(e), 2);
    assert.equal(esManual(e), true);
    assert.equal(metrosRestantes(e), null);
  });

  it("textos de la pregunta: elevador y bajando por escalera", () => {
    const elevador = aplicar(iniciarNavegacion(rutaConPiso("elevador")), [...caminar([[0, 0], [27, 0]])]).estado;
    assert.equal(preguntaPiso(elevador), "¿Ya llegaste al piso 2?");
    const baja = aplicar(iniciarNavegacion(rutaConPiso("escalera", "baja")), [...caminar([[0, 0], [27, 0]])]).estado;
    assert.equal(preguntaPiso(baja), "¿Ya bajaste al piso 0?");
  });

  it("tramo manual: 'siguiente' avanza y en la última instrucción llega", () => {
    let e = aplicar(iniciarNavegacion(rutaConPiso("escalera")), [...caminar([[0, 0], [27, 0]]), { tipo: "confirmar_piso" }]).estado;
    const sinCambio = aplicar(e, [lectura(50, 50), lectura(50, 50), lectura(50, 50)]);
    assert.deepEqual(sinCambio.efectos, []);
    const pasosManual: Efecto[] = [];
    for (let i = 0; i < 10 && e.fase === "caminando"; i++) {
      const r = avanzar(e, { tipo: "siguiente" });
      e = r.estado;
      pasosManual.push(...r.efectos);
    }
    assert.equal(e.fase, "llegada");
    assert.deepEqual(clases(pasosManual), ["llegada"]);
  });

  it("al volver a un tramo del piso 1, el avance empieza en 0 y sigue al GPS", () => {
    const pasos: PasoSeguible[] = [
      paso(0, 0, { piso: 2 }),
      paso(0, 10, { piso: 2 }),
      paso(0, 10, { piso: 1, tipo: "escalera", cambioPiso: { desde: 2, hasta: 1, sentido: "baja", via: { nombre: "Escalera B", tipo: "escalera" } } }),
      ...camino([[0, 13], [0, 40]]),
    ];
    let e = iniciarNavegacion(pasos);
    assert.equal(esManual(e), true);
    for (let i = 0; i < 5 && e.fase === "caminando"; i++) e = avanzar(e, { tipo: "siguiente" }).estado;
    assert.equal(e.fase, "preguntando_piso");
    e = avanzar(e, { tipo: "confirmar_piso" }).estado;
    assert.equal(esManual(e), false);
    assert.equal(e.metros, 0);
    e = aplicar(e, caminar([[0, 10], [0, 25]])).estado;
    cerca(e.metros, 15);
  });
});

describe("ruta nueva y llegada forzada", () => {
  it("ruta_nueva reinicia el avance y guarda la hora del recálculo", () => {
    const e = aplicar(iniciarNavegacion(rutaL()), [...caminar([[0, 0], [30, 0]]), { tipo: "ruta_nueva", pasos: rutaL(), ahora: 99 }]).estado;
    assert.equal(e.metros, 0);
    assert.deepEqual(e.avisados, []);
    assert.equal(e.lecturasFuera, 0);
    assert.equal(e.ultimoRecalculo, 99);
  });

  it("llegar termina con aviso de llegada", () => {
    const r = aplicar(iniciarNavegacion(rutaL()), [{ tipo: "llegar" }, { tipo: "llegar" }]);
    assert.equal(r.estado.fase, "llegada");
    assert.deepEqual(clases(r.efectos), ["llegada"]);
  });
});

describe("textoIndicacion", () => {
  const base: Indicacion = { maniobra: "izquierda", metros: 25, ahora: false, hacia: "Pasillo edificio 3", piso: null };
  it("giros", () => {
    assert.deepEqual(textoIndicacion(base), { titulo: "En 25 m gira a la izquierda", detalle: "hacia Pasillo edificio 3" });
    assert.equal(textoIndicacion({ ...base, maniobra: "derecha", metros: 23 }).titulo, "En 25 m gira a la derecha");
    assert.equal(textoIndicacion({ ...base, ahora: true, metros: 3 }).titulo, "Gira a la izquierda ahora");
    assert.equal(textoIndicacion({ ...base, metros: 1 }).titulo, "En 5 m gira a la izquierda");
  });
  it("recto", () => {
    assert.equal(textoIndicacion({ ...base, maniobra: "recto", metros: 60, hacia: null }).titulo, "Sigue recto 60 m");
    assert.equal(textoIndicacion({ ...base, maniobra: "recto", metros: null, hacia: "Salón 304" }).titulo, "Sigue hasta Salón 304");
  });
  it("escalera y elevador", () => {
    const piso = { hasta: 2, sentido: "sube" as const, via: "Escalera B" };
    assert.deepEqual(textoIndicacion({ ...base, maniobra: "escalera", metros: 10, piso }), { titulo: "En 10 m toma la escalera", detalle: "Sube al piso 2" });
    assert.equal(textoIndicacion({ ...base, maniobra: "elevador", metros: 10, piso }).titulo, "En 10 m toma el elevador");
    assert.equal(textoIndicacion({ ...base, maniobra: "escalera", metros: 2, ahora: true, piso }).titulo, "Toma la escalera ahora");
    assert.equal(textoIndicacion({ ...base, maniobra: "escalera", metros: null, piso }).titulo, "Toma la escalera Escalera B y sube al piso 2");
  });
  it("llegada", () => {
    const llegada = { ...base, maniobra: "llegada" as const, hacia: "Salón 204" };
    assert.equal(textoIndicacion({ ...llegada, metros: 20 }).titulo, "En 20 m llegas a Salón 204");
    assert.equal(textoIndicacion({ ...llegada, metros: 2, ahora: true }).titulo, "Llegaste a Salón 204");
    assert.equal(textoIndicacion({ ...llegada, metros: null }).titulo, "Llega a Salón 204");
  });
});

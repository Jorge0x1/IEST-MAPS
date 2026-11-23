// Pruebas unitarias de los marcadores del mapa (iconos y logos). `npm test`.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  RE_LOGO_DESTINO,
  aMarcador,
  colorMarcador,
  htmlMarcador,
  leerIconoYLogo,
  marcadoresVisibles,
  mostrarEtiqueta,
  type MarcadorMapa,
} from "./marcadores.ts";

const UUID = "123e4567-e89b-42d3-a456-426614174000";
const fila = {
  id: "n1", nombre: "Subway", tipo: "servicio", icono: "comida" as string | null,
  logo_path: null as string | null, piso: 1, lat: 22.32 as number | null, lng: -97.88 as number | null, buscable: true,
};

describe("RE_LOGO_DESTINO", () => {
  it("acepta uuid.png y uuid.webp", () => {
    assert.ok(RE_LOGO_DESTINO.test(`${UUID}.png`));
    assert.ok(RE_LOGO_DESTINO.test(`${UUID}.webp`));
  });
  it("rechaza SVG, JPG, carpetas, recorridos y saltos de línea", () => {
    for (const malo of [`${UUID}.svg`, `${UUID}.jpg`, `a/${UUID}.png`, `../${UUID}.png`, `${UUID}.png\n`, ""]) {
      assert.equal(RE_LOGO_DESTINO.test(malo), false, `debió rechazar ${JSON.stringify(malo)}`);
    }
  });
});

describe("aMarcador", () => {
  it("usa el icono como clase", () => {
    assert.equal(aMarcador(fila)?.clase, "comida");
  });
  it("el icono gana sobre el tipo", () => {
    assert.equal(aMarcador({ ...fila, tipo: "escalera", icono: "cafe" })?.clase, "cafe");
  });
  it("escaleras, elevadores y baños sin icono tienen su propia clase", () => {
    for (const tipo of ["escalera", "elevador", "bano"]) {
      assert.equal(aMarcador({ ...fila, tipo, icono: null })?.clase, tipo);
    }
  });
  it("null sin coordenadas o sin clase", () => {
    assert.equal(aMarcador({ ...fila, lat: null }), null);
    assert.equal(aMarcador({ ...fila, lng: null }), null);
    assert.equal(aMarcador({ ...fila, tipo: "salon", icono: null }), null);
    assert.equal(aMarcador({ ...fila, icono: "inventado" }), null);
  });
});

describe("marcadoresVisibles y mostrarEtiqueta", () => {
  const m = (clase: MarcadorMapa["clase"], piso = 1): MarcadorMapa => ({
    id: `${clase}${piso}`, nombre: clase, clase, piso, lat: 0, lng: 0, buscable: true, logoUrl: null,
  });
  const todos = [m("comida"), m("escalera"), m("bano"), m("cafe", 2)];
  it("filtra por piso", () => {
    assert.deepEqual(marcadoresVisibles(todos, 2, 19).map((x) => x.id), ["cafe2"]);
  });
  it("oculta escaleras y baños con zoom < 17", () => {
    assert.deepEqual(marcadoresVisibles(todos, 1, 16).map((x) => x.clase), ["comida"]);
    assert.deepEqual(marcadoresVisibles(todos, 1, 17).map((x) => x.clase), ["comida", "escalera", "bano"]);
  });
  it("etiqueta solo con zoom >= 19", () => {
    assert.equal(mostrarEtiqueta(18), false);
    assert.equal(mostrarEtiqueta(19), true);
  });
});

describe("htmlMarcador", () => {
  const base: MarcadorMapa = { id: "x", nombre: '<b>"x"', clase: "comida", piso: 1, lat: 0, lng: 0, buscable: true, logoUrl: null };
  it("escapa el nombre", () => {
    const html = htmlMarcador(base, true);
    assert.ok(html.includes("&lt;b&gt;&quot;x&quot;"));
    assert.ok(!html.includes("<b>"));
  });
  it("sin etiqueta no muestra el nombre (solo queda en el title)", () => {
    const html = htmlMarcador(base, false);
    assert.ok(!html.includes("white-space:nowrap"));
    assert.ok(html.includes('title="&lt;b&gt;&quot;x&quot;"'));
  });
  it("con logo usa <img> con la URL escapada", () => {
    const html = htmlMarcador({ ...base, logoUrl: "https://x/a.png?b=1&c=2" }, false);
    assert.ok(html.includes('<img src="https://x/a.png?b=1&amp;c=2"'));
  });
  it("colores del spec", () => {
    assert.equal(colorMarcador("bano"), "#1c7ed6");
    assert.equal(colorMarcador("comida"), "#e8590c");
    assert.equal(colorMarcador("escalera"), "#0369a1");
  });
});

describe("leerIconoYLogo", () => {
  const datos = (icono: string, logo: string) => {
    const f = new FormData();
    f.set("icono", icono);
    f.set("logo_path", logo);
    return f;
  };
  it("vacío = sin icono ni logo", () => {
    assert.deepEqual(leerIconoYLogo(datos("", "")), { ok: true, icono: null, logo_path: null });
  });
  it("acepta icono y logo válidos", () => {
    assert.deepEqual(leerIconoYLogo(datos("cafe", `${UUID}.webp`)), { ok: true, icono: "cafe", logo_path: `${UUID}.webp` });
  });
  it("un logo sin icono no se vería en el mapa: se rechaza", () => {
    const r = leerIconoYLogo(datos("", `${UUID}.png`));
    assert.equal(r.ok, false);
  });
  it("rechaza icono fuera de la lista y logo SVG", () => {
    assert.equal(leerIconoYLogo(datos("pizza", "")).ok, false);
    assert.equal(leerIconoYLogo(datos("cafe", `${UUID}.svg`)).ok, false);
  });
});

describe("marcadoresDeFilas", () => {
  it("descarta filas inválidas y tolera null", async () => {
    const { marcadoresDeFilas } = await import("./marcadores.ts");
    assert.deepEqual(marcadoresDeFilas(null), []);
    assert.deepEqual(marcadoresDeFilas([fila, { ...fila, id: "n2", lat: null }]).map((m) => m.id), ["n1"]);
  });
});

// Pruebas de la búsqueda de destinos. Ejecutar con `npm test`.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buscarDestinos, normalizar, type DestinoBuscable } from "./busqueda.ts";

function destino(id: string, nombre: string, alias: string[] = []): DestinoBuscable {
  return { id, nombre, alias };
}

const nombres = (lista: DestinoBuscable[]) => lista.map((d) => d.nombre);

describe("normalizar", () => {
  it("quita acentos, mayúsculas y espacios de más", () => {
    assert.equal(normalizar("  Salón   ÁREA  Común "), "salon area comun");
  });

  it("conserva la ñ como n", () => {
    assert.equal(normalizar("Diseño"), "diseno");
  });
});

describe("buscarDestinos", () => {
  const catalogo = [
    destino("1", "Salón 604", ["604", "laboratorio de sistemas", "Lab"]),
    destino("2", "Salón 60", []),
    destino("3", "Biblioteca", ["centro de información"]),
    destino("4", "Servicios Escolares", ["escolares", "control escolar"]),
    destino("5", "Cafetería", []),
  ];

  it("devuelve vacío con consulta vacía o solo espacios", () => {
    assert.deepEqual(buscarDestinos(catalogo, ""), []);
    assert.deepEqual(buscarDestinos(catalogo, "   "), []);
  });

  it("encuentra sin importar acentos ni mayúsculas", () => {
    assert.deepEqual(nombres(buscarDestinos(catalogo, "CAFETERIA")), ["Cafetería"]);
    assert.deepEqual(nombres(buscarDestinos(catalogo, "salon 604")), ["Salón 604"]);
  });

  it("encuentra por alias", () => {
    assert.deepEqual(nombres(buscarDestinos(catalogo, "laboratorio")), ["Salón 604"]);
    assert.deepEqual(nombres(buscarDestinos(catalogo, "control escolar")), ["Servicios Escolares"]);
  });

  it("acepta palabras sueltas en otro orden como inicio de palabra", () => {
    assert.deepEqual(nombres(buscarDestinos(catalogo, "sistemas lab")), ["Salón 604"]);
  });

  it("ordena: exacto antes que empieza-con antes que contiene", () => {
    // "Salón 60" es exacto; "Salón 604" solo empieza con la consulta.
    assert.deepEqual(nombres(buscarDestinos(catalogo, "salon 60")), ["Salón 60", "Salón 604"]);
  });

  it("una coincidencia en el nombre pesa más que en un alias", () => {
    const lista = [
      destino("a", "Auditorio", ["sala de escolares"]),
      destino("b", "Escolares Norte", []),
    ];
    assert.deepEqual(nombres(buscarDestinos(lista, "escolares")), ["Escolares Norte", "Auditorio"]);
  });

  it("encuentra texto en medio de una palabra como último recurso", () => {
    assert.deepEqual(nombres(buscarDestinos(catalogo, "blio")), ["Biblioteca"]);
  });

  it("no devuelve nada si no hay coincidencias", () => {
    assert.deepEqual(buscarDestinos(catalogo, "gimnasio"), []);
  });

  it("respeta el límite de resultados", () => {
    assert.equal(buscarDestinos(catalogo, "s", 2).length, 2);
  });

  it("no rompe con alias vacíos o nulos", () => {
    const lista = [{ id: "x", nombre: "Caseta", alias: null as unknown as string[] }];
    assert.deepEqual(nombres(buscarDestinos(lista, "caseta")), ["Caseta"]);
  });
});

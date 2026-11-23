// Pruebas de seguridad (R8) — autorización. Análisis estático del código: cada
// Server Action y cada página protegida debe validar el rol en el servidor
// (AGENTS.md: "ocultar una opción en la interfaz no sustituye una validación").
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { accionesExportadas, leer, listar, RAIZ, relativa } from "../helpers/fuentes.ts";

const archivosAccion = (carpeta: string) =>
  listar(join(RAIZ, "app", carpeta)).filter((r) => /actions\.ts$/.test(r));

describe("Server Actions de administrador y guardia exigen su rol", () => {
  const casos: [string, string][] = [
    ["admin", "administrador"],
    ["guardia", "guardia"],
  ];
  for (const [carpeta, rol] of casos) {
    for (const archivo of archivosAccion(carpeta)) {
      const texto = leer(archivo);
      it(`${relativa(archivo)}: arranca con "use server"`, () => {
        assert.match(texto.trimStart(), /^"use server"/);
      });
      for (const { nombre, cuerpo } of accionesExportadas(texto)) {
        it(`${relativa(archivo)} → ${nombre}() llama requerirRol("${rol}")`, () => {
          assert.ok(cuerpo.includes(`requerirRol("${rol}")`), `${nombre} no valida el rol ${rol}`);
        });
      }
    }
  }
});

describe("las páginas de cada rol validan sesión y rol en el servidor", () => {
  const roles: [string, string][] = [
    ["admin", "administrador"],
    ["guardia", "guardia"],
    ["usuario", "alumno"],
  ];
  for (const [carpeta, rol] of roles) {
    const base = join(RAIZ, "app", carpeta);
    const paginas = listar(base).filter((r) => /page\.tsx$/.test(r));
    for (const pagina of paginas) {
      it(`${relativa(pagina)} (directo o por su layout) exige "${rol}"`, () => {
        // Sube por las carpetas buscando requerirRol en la página o en un layout.
        let dir = join(pagina, "..");
        const textos = [leer(pagina)];
        while (dir.startsWith(base)) {
          const layout = join(dir, "layout.tsx");
          try {
            textos.push(leer(layout));
          } catch {
            /* sin layout en este nivel */
          }
          if (dir === base) break;
          dir = join(dir, "..");
        }
        assert.ok(textos.some((t) => t.includes(`requerirRol("${rol}")`)), "ninguna página ni layout valida el rol");
      });
    }
  }
});

describe("el motor de rutas autoriza antes de tocar el grafo con service-role", () => {
  const texto = leer(join(RAIZ, "lib", "rutas", "actions.ts"));
  const acciones = accionesExportadas(texto);
  const por = (n: string) => acciones.find((a) => a.nombre === n)!;
  // Primer punto donde la acción llega al grafo (cargarlo o calcular sin validar).
  const usoDelGrafo = (cuerpo: string) => cuerpo.search(/cargarGrafo\(|calcularRutaSinValidar\(/);

  it("calcularRuta y calcularRutaDesdeUbicacion exigen sesión activa", () => {
    for (const n of ["calcularRuta", "calcularRutaDesdeUbicacion"]) {
      const { cuerpo } = por(n);
      assert.ok(cuerpo.includes("obtenerSesionConPerfil()"), `${n} no revisa la sesión`);
      assert.ok(cuerpo.includes("no_autorizado"), `${n} no responde no_autorizado`);
      assert.ok(usoDelGrafo(cuerpo) > cuerpo.indexOf("obtenerSesionConPerfil()"), `${n} toca el grafo antes de autorizar`);
    }
  });

  it("calcularRutaDeVisita valida el token (tipo, longitud, hash) antes de usar el grafo", () => {
    const { cuerpo } = por("calcularRutaDeVisita");
    assert.ok(/typeof token !== "string"/.test(cuerpo));
    assert.ok(/token\.length > 200/.test(cuerpo));
    assert.ok(cuerpo.includes("createHash"), "el token debe viajar como hash");
    assert.ok(cuerpo.includes("obtener_visita_por_token"));
    assert.ok(usoDelGrafo(cuerpo) > cuerpo.indexOf("obtener_visita_por_token"), "toca el grafo antes de validar el token");
  });

  it("no se exporta nada más que las tres acciones previstas (cada export es un endpoint público)", () => {
    assert.deepEqual(acciones.map((a) => a.nombre).sort(), ["calcularRuta", "calcularRutaDeVisita", "calcularRutaDesdeUbicacion"]);
  });
});

describe("acciones del visitante y del login", () => {
  it("finalizarMiVisita acota el token y solo envía su hash", () => {
    const texto = leer(join(RAIZ, "app", "visitante", "ruta", "actions.ts"));
    assert.ok(/token\.length > 200/.test(texto));
    assert.ok(texto.includes("createHash"));
    assert.ok(!/p_token\s*:/.test(texto), "no debe mandar el token en claro");
  });

  it("el login con contraseña no revela si el correo existe", () => {
    const texto = leer(join(RAIZ, "app", "login", "actions.ts"));
    assert.ok(texto.includes("Correo o contraseña incorrectos."));
    assert.ok(!/user not found|no existe|invalid login credentials/i.test(texto));
  });

  it("las cuentas desactivadas cierran la sesión (login y callback de Google)", () => {
    for (const ruta of [["login", "actions.ts"], ["auth", "callback", "route.ts"]]) {
      const texto = leer(join(RAIZ, "app", ...ruta));
      assert.ok(/!profile\.activo/.test(texto) && texto.includes("signOut()"), `${ruta.join("/")} no revoca cuentas inactivas`);
    }
  });

  it("el callback de Google redirige solo a rutas propias (sin open redirect)", () => {
    const texto = leer(join(RAIZ, "app", "auth", "callback", "route.ts"));
    assert.ok(!/searchParams\.get\("(next|redirect|redirect_to|returnTo)"\)/.test(texto));
  });
});

describe("validación de identificadores", () => {
  // Antes se usaba /^[0-9a-f-]{36}$/i, que aceptaba 36 guiones. Se exige 8-4-4-4-12.
  const estricta = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
  const archivos = ["app/admin/conexiones/actions.ts", "app/admin/destinos/trazar/actions.ts", "app/guardia/dashboard/actions.ts"];
  for (const archivo of archivos) {
    it(`${archivo} valida uuid con formato estricto`, () => {
      const texto = leer(join(RAIZ, archivo));
      assert.ok(texto.includes(estricta), "UUID_RE debería ser 8-4-4-4-12");
    });
  }
});

// Pruebas de seguridad (R8) — secretos, RLS en las migraciones y rutas públicas.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { codigoFuente, gitDisponible, leer, listar, RAIZ, relativa } from "../helpers/fuentes.ts";

describe("secretos", () => {
  const fuentes = codigoFuente();

  it("no hay claves ni JWT escritos en el código ni en la documentación", () => {
    const patrones = [/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/, /sb_secret_[A-Za-z0-9_-]{10,}/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/];
    const revisables = [
      ...fuentes,
      ...["docs", "supabase", "scripts"].flatMap((d) => listar(join(RAIZ, d))).filter((r) => /\.(md|sql|ts|py)$/.test(r)),
    ];
    const hallazgos = revisables.filter((r) => patrones.some((p) => p.test(leer(r)))).map(relativa);
    assert.deepEqual(hallazgos, []);
  });

  it("la clave service-role solo se lee en utils/supabase/service.ts", () => {
    const usos = fuentes.filter((r) => leer(r).includes("SUPABASE_SERVICE_ROLE_KEY")).map(relativa);
    assert.deepEqual(usos, ["utils/supabase/service.ts"]);
  });

  it("ninguna variable NEXT_PUBLIC_ lleva la palabra service/secret (se publicaría al navegador)", () => {
    const malas = fuentes.flatMap((r) => [...leer(r).matchAll(/NEXT_PUBLIC_\w*(SERVICE|SECRET)\w*/gi)].map((m) => `${relativa(r)}: ${m[0]}`));
    assert.deepEqual(malas, []);
  });

  it("el cliente service-role solo lo importan archivos 'use server'", () => {
    const infractores = fuentes
      .filter((r) => /from ["']@\/utils\/supabase\/service["']/.test(leer(r)))
      .filter((r) => !/^\s*["']use server["']/.test(leer(r)))
      .map(relativa);
    assert.deepEqual(infractores, []);
  });

  it("ningún componente 'use client' importa en tiempo de ejecución el cliente service-role ni utils/auth", () => {
    // `import type` se borra al compilar, así que no entra al bundle del navegador.
    const importaValores = /^import\s+(?!type\b)[^;]*from\s+["']@\/utils\/(auth|supabase\/service)["']/m;
    const infractores = fuentes
      .filter((r) => /^\s*["']use client["']/.test(leer(r)))
      .filter((r) => importaValores.test(leer(r)))
      .map(relativa);
    assert.deepEqual(infractores, []);
  });

  it("service.ts y auth.ts están protegidos con 'server-only'", () => {
    for (const f of ["utils/supabase/service.ts", "utils/auth.ts"]) {
      assert.ok(leer(join(RAIZ, f)).includes('import "server-only"'), `${f} debe importar server-only`);
    }
  });

  it(".env.local está ignorado por git y no está versionado", { skip: !gitDisponible() && "sin git" }, () => {
    assert.match(leer(join(RAIZ, ".gitignore")), /^\.env\*$/m);
    const versionados = execFileSync("git", ["-C", RAIZ, "ls-files", "--", ".env*"], { encoding: "utf8" }).trim();
    assert.equal(versionados, "", `archivos .env versionados: ${versionados}`);
  });

  it("no se usa eval, new Function ni dangerouslySetInnerHTML", () => {
    const peligrosos = fuentes.filter((r) => /\beval\(|new Function\(|dangerouslySetInnerHTML/.test(leer(r))).map(relativa);
    assert.deepEqual(peligrosos, []);
  });

  it("el token del visitante se genera con randomBytes y solo se guarda su hash", () => {
    const texto = leer(join(RAIZ, "app", "guardia", "dashboard", "actions.ts"));
    assert.match(texto, /randomBytes\(32\)/);
    assert.match(texto, /access_token_hash:\s*tokenHash/);
    assert.ok(!/access_token\s*:/.test(texto), "no debe insertarse el token en claro");
  });
});

describe("migraciones de Supabase", () => {
  const dir = join(RAIZ, "supabase", "migrations");
  const sql = listar(dir).filter((r) => r.endsWith(".sql")).sort().map((r) => ({ nombre: relativa(r), texto: leer(r) }));
  const todo = sql.map((m) => m.texto).join("\n");

  it("toda tabla de public tiene RLS activado", () => {
    const tablas = [...todo.matchAll(/create table (?:if not exists )?public\.(\w+)/gi)].map((m) => m[1]);
    assert.ok(tablas.length >= 5);
    const sinRls = tablas.filter((t) => !new RegExp(`alter table public\\.${t}\\s+enable row level security`, "i").test(todo));
    assert.deepEqual(sinRls, []);
  });

  it("toda función security definer fija search_path (evita secuestro de funciones)", () => {
    const sinFijar: string[] = [];
    for (const { nombre, texto } of sql) {
      for (const trozo of texto.split(/create (?:or replace )?function /i).slice(1)) {
        const cabecera = trozo.split(/\$\$|\$function\$|\$body\$/)[0];
        if (/security definer/i.test(cabecera) && !/set search_path/i.test(cabecera)) {
          sinFijar.push(`${nombre}: ${trozo.slice(0, trozo.indexOf("(")).trim()}`);
        }
      }
    }
    assert.deepEqual(sinFijar, []);
  });

  it("toda RPC security definer con parámetros revoca EXECUTE a public", () => {
    const sinRevocar = new Set<string>();
    for (const { texto } of sql) {
      for (const trozo of texto.split(/create (?:or replace )?function /i).slice(1)) {
        const cabecera = trozo.split(/\$\$|\$function\$|\$body\$/)[0];
        const m = /^public\.(\w+)\s*\(\s*(\w)/.exec(cabecera);
        if (!m || !/security definer/i.test(cabecera) || /returns trigger/i.test(cabecera)) continue;
        if (!new RegExp(`revoke all on function public\\.${m[1]}\\(`, "i").test(todo)) sinRevocar.add(m[1]);
      }
    }
    assert.deepEqual([...sinRevocar], []);
  });

  it("anon solo puede ejecutar las RPC de visitante (token), nada más", () => {
    const paraAnon = [...todo.matchAll(/grant execute on function public\.(\w+)\([^)]*\)\s+to\s+([^;]+);/gi)]
      .filter((m) => /\banon\b/.test(m[2]))
      .map((m) => m[1]);
    assert.deepEqual([...new Set(paraAnon)].sort(), ["finalizar_visita_por_token", "obtener_visita_por_token"]);
  });

  it("no se conceden permisos directos sobre tablas a anon", () => {
    assert.ok(!/grant\s+(select|insert|update|delete|all)[^;]*\s+on\s+(table\s+)?public\.\w+\s+to\s+[^;]*\banon\b/i.test(todo));
  });
});

describe("rutas públicas del proxy (middleware)", () => {
  const texto = leer(join(RAIZ, "utils", "supabase", "middleware.ts"));

  it("solo /login, /auth/callback y /visitante/ruta son públicas", () => {
    const publicas = [...texto.matchAll(/pathname\.startsWith\("([^"]+)"\)/g)].map((m) => m[1]).sort();
    assert.deepEqual(publicas, ["/auth/callback", "/login", "/visitante/ruta"]);
  });

  it("sin sesión en una ruta privada redirige a /login", () => {
    assert.match(texto, /!claims && !isPublicRoute/);
    assert.match(texto, /url\.pathname = "\/login"/);
  });

  it("valida la sesión con getClaims y no con getSession (cookie sin verificar)", () => {
    assert.match(texto, /auth\.getClaims\(\)/);
    assert.ok(!/auth\.getSession\(\)/.test(texto));
  });

  it("los roles tienen cada uno su propio dashboard distinto", () => {
    const auth = leer(join(RAIZ, "utils", "auth.ts"));
    const rutas = [...auth.matchAll(/^\s+(administrador|guardia|alumno|visitante):\s*"([^"]+)"/gm)].map((m) => m[2]);
    assert.equal(rutas.length, 4);
    assert.equal(new Set(rutas).size, 4);
  });
});

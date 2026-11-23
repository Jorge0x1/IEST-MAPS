// Pruebas de seguridad (R8) contra el Supabase REAL, solo lectura y con la
// clave pública (anon): confirma que sin sesión no se puede leer ni ejecutar nada
// sensible. Es opt-in porque necesita red y .env.local:
//   PRUEBA_EN_VIVO=1 npm run test:seguridad
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { RAIZ } from "../helpers/fuentes.ts";

const activo = process.env.PRUEBA_EN_VIVO === "1";
if (activo) process.loadEnvFile(join(RAIZ, ".env.local"));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const clave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const cabeceras = { apikey: clave ?? "", Authorization: `Bearer ${clave ?? ""}`, "Content-Type": "application/json" };

describe("Supabase en vivo, sin sesión (anon)", { skip: !activo && "defina PRUEBA_EN_VIVO=1" }, () => {
  for (const tabla of ["profiles", "usuarios_autorizados", "registro_visitante", "nodos", "conexiones", "edificios"]) {
    it(`no puede leer ${tabla}`, async () => {
      const r = await fetch(`${url}/rest/v1/${tabla}?select=*&limit=1`, { headers: cabeceras });
      if (r.status === 200) assert.deepEqual(await r.json(), [], `anon leyó filas de ${tabla}`);
      else assert.ok([401, 403, 404].includes(r.status), `estado inesperado ${r.status}`);
    });

    it(`no puede escribir en ${tabla}`, async () => {
      const r = await fetch(`${url}/rest/v1/${tabla}`, { method: "POST", headers: cabeceras, body: JSON.stringify({}) });
      assert.ok(r.status >= 400, `anon pudo insertar en ${tabla} (${r.status})`);
    });
  }

  it("obtener_visita_por_token con un hash inventado no devuelve datos", async () => {
    const r = await fetch(`${url}/rest/v1/rpc/obtener_visita_por_token`, {
      method: "POST",
      headers: cabeceras,
      body: JSON.stringify({ p_token_hash: "0".repeat(64) }),
    });
    assert.equal(r.status, 200);
    assert.deepEqual(await r.json(), []);
  });

  it("crear_cadena_nodos no está disponible para anon", async () => {
    const r = await fetch(`${url}/rest/v1/rpc/crear_cadena_nodos`, {
      method: "POST",
      headers: cabeceras,
      body: JSON.stringify({ p_puntos: [], p_bidireccional: true }),
    });
    assert.ok(r.status >= 400, `anon ejecutó crear_cadena_nodos (${r.status})`);
  });
});

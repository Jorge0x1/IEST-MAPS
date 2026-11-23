// Lectura de archivos del proyecto para las pruebas estáticas de seguridad.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export const RAIZ = join(import.meta.dirname, "..", "..");

export function listar(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const nombre of readdirSync(dir)) {
    if (nombre === "node_modules" || nombre === ".next" || nombre.startsWith(".")) continue;
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) listar(ruta, acc);
    else acc.push(ruta);
  }
  return acc;
}

export const leer = (ruta: string) => readFileSync(ruta, "utf8");
export const relativa = (ruta: string) => relative(RAIZ, ruta).replaceAll("\\", "/");

export function codigoFuente(): string[] {
  return ["app", "lib", "utils"].flatMap((d) => listar(join(RAIZ, d))).filter((r) => /\.(ts|tsx)$/.test(r) && !/\.test\.ts$/.test(r));
}

// Trozos `export async function nombre(...) { ... }` de un archivo "use server".
export function accionesExportadas(texto: string): { nombre: string; cuerpo: string }[] {
  const marcas = [...texto.matchAll(/export async function (\w+)/g)];
  return marcas.map((m, i) => ({ nombre: m[1], cuerpo: texto.slice(m.index!, marcas[i + 1]?.index ?? texto.length) }));
}

export function gitDisponible(): boolean {
  try {
    execFileSync("git", ["-C", RAIZ, "rev-parse", "--is-inside-work-tree"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

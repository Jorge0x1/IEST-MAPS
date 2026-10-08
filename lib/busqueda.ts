// Búsqueda de destinos por nombre y alias, sin acceso a red.
//
// El catálogo de destinos buscables es chico (cientos de nodos), así que la
// vista del alumno lo carga una vez y filtra en el navegador con estas
// funciones puras. Se prueban con `npm test` (ver busqueda.test.ts).

export type DestinoBuscable = {
  id: string;
  nombre: string;
  alias: string[];
};

// Minúsculas, sin acentos/diacríticos y con espacios colapsados.
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// Menor es mejor; null = no coincide.
//   0 exacto · 1 empieza con · 2 cada palabra de la consulta inicia una
//   palabra del texto · 3 contiene
function puntuarTexto(texto: string, consulta: string, palabrasConsulta: string[]): number | null {
  const t = normalizar(texto);
  if (!t) return null;
  if (t === consulta) return 0;
  if (t.startsWith(consulta)) return 1;
  const palabras = t.split(" ");
  if (palabrasConsulta.every((p) => palabras.some((w) => w.startsWith(p)))) return 2;
  if (t.includes(consulta)) return 3;
  return null;
}

// Las coincidencias por alias van después de cualquier coincidencia por nombre.
const PENALIZACION_ALIAS = 4;

export function buscarDestinos<T extends DestinoBuscable>(
  destinos: T[],
  consulta: string,
  limite = 8,
): T[] {
  const q = normalizar(consulta);
  if (!q) return [];
  const palabrasConsulta = q.split(" ");

  const puntuados: { destino: T; puntaje: number }[] = [];
  for (const destino of destinos) {
    let puntaje = puntuarTexto(destino.nombre, q, palabrasConsulta);
    for (const alias of destino.alias ?? []) {
      const deAlias = puntuarTexto(alias, q, palabrasConsulta);
      if (deAlias !== null) {
        const conPenalizacion = deAlias + PENALIZACION_ALIAS;
        if (puntaje === null || conPenalizacion < puntaje) puntaje = conPenalizacion;
      }
    }
    if (puntaje !== null) puntuados.push({ destino, puntaje });
  }

  puntuados.sort(
    (a, b) => a.puntaje - b.puntaje || a.destino.nombre.localeCompare(b.destino.nombre, "es"),
  );
  return puntuados.slice(0, limite).map((p) => p.destino);
}

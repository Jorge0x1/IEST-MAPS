// Supabase (PostgREST) devuelve como máximo 1000 filas por consulta aunque se
// pida un .range() mayor; si se rebasa, la lista sale cortada sin ningún
// error. leerTodo pide página por página hasta traer todas las filas.

const TAMANO_PAGINA = 1000;

type RespuestaPagina = PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>;

/**
 * Lee todas las filas de una consulta paginando con .range(desde, hasta).
 * La consulta debe tener un orden estable (por ejemplo, terminar en .order("id"))
 * para que ninguna fila se repita ni se salte entre páginas. Lanza si falla.
 */
export async function leerTodo<T>(consulta: (desde: number, hasta: number) => RespuestaPagina): Promise<T[]> {
  const filas: T[] = [];
  for (let desde = 0; ; desde += TAMANO_PAGINA) {
    const { data, error } = await consulta(desde, desde + TAMANO_PAGINA - 1);
    if (error) throw new Error(error.message);
    filas.push(...((data ?? []) as T[]));
    if (!data || data.length < TAMANO_PAGINA) return filas;
  }
}

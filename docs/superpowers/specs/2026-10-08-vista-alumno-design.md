# Vista de alumno v1 — diseño

Fecha: 8 de octubre de 2026. Aprobado por Carlos.

## Objetivo

Que un alumno con sesión pueda buscar un destino del campus, elegir por qué entrada
llega y ver la ruta paso a paso. Sin mapa todavía (el SVG del campus sigue en proceso).

## Flujo (`/usuario/dashboard`, una sola pantalla)

1. **Buscar**: campo de texto; resultados mientras escribe (nodos `buscable = true`),
   por nombre y `nombres_alternativos`, sin distinguir acentos ni mayúsculas.
2. **Destino elegido**: tarjeta con nombre, tipo, edificio, piso y alias; selector de
   entrada (nodos tipo `entrada`); casilla "Evitar escaleras"; botón **Iniciar ruta**.
3. **Ruta**: lista de pasos con cambios de piso; botones **Cancelar** (vuelve a buscar)
   y **Recalcular** (al cambiar entrada o escaleras).

## Decisiones

- Origen: el alumno elige una entrada de la lista. GPS queda para cuando exista mapa.
- Búsqueda en el navegador: la página (server component) carga una vez los nodos
  buscables y las entradas con el cliente normal de Supabase (RLS: usuarios activos
  leen `nodos` y `edificios`). Se filtra en el cliente; sin migración nueva. Si el
  catálogo crece mucho, se cambia por una RPC usando el índice trigram existente.
- Ranking: exacto > empieza con > alguna palabra empieza con > contiene; coincidencia
  en nombre pesa más que en alias; empate por nombre.
- La ruta usa `calcularRuta()` (Server Action existente, valida sesión). El motor no
  se modifica.
- La lista de pasos se extrae a `app/components/pasos-ruta.tsx` y la usan visitante y
  alumno; el visitante se ve igual.

## Archivos

- `lib/busqueda.ts` + `lib/busqueda.test.ts`: normalización y ranking (funciones puras).
- `app/usuario/dashboard/page.tsx`: carga datos.
- `app/usuario/dashboard/navegador.tsx`: componente cliente con los 3 estados.
- `app/components/pasos-ruta.tsx`: lista de pasos compartida.

## Casos borde

Sin entradas registradas, sin coincidencias, origen igual al destino, errores del
motor (se muestra `mensaje`), ruta bloqueada por escaleras (se ofrece verla con
escaleras), error al cargar el catálogo.

## Fuera de alcance

GPS, mapa, compactar pasos consecutivos de pasillo, recordar la última entrada.

## Verificación

`npm test` (búsqueda), `tsc`, lint y `next build`.

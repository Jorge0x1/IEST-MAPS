# GPS: suavizado y punto pegado a la ruta — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** El punto azul deja de brincar estando quieto y, con una ruta abierta, se dibuja sobre el tramo de la ruta más cercano.

**Architecture:** Dos funciones puras con pruebas `node --test`: `suavizar` en `lib/ubicacion.ts` (la aplica el hook `useUbicacion` a cada lectura) y `ajustarARuta` en `lib/rutas/ajuste.ts` (la aplica `navegador.tsx` con la ruta mostrada antes de pasar la ubicación al mapa). Nada en el servidor.

**Tech Stack:** TypeScript, React 19 (`useSyncExternalStore`, `useMemo`), `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-14-gps-suavizado-y-ajuste-design.md`

## Global Constraints

- Constantes: `VIGENCIA_LECTURA_MS = 30000`, factor de salto `2`, `PESO_MINIMO = 0.2`, `DISTANCIA_AJUSTE_MAX_M = 10`, `DISTANCIA_AJUSTE_MIN_M = 5`, piso de tramos `1`.
- La precisión y la fecha de la lectura suavizada son las de la lectura nueva.
- `lib/` no importa React, Leaflet ni nada de `app/`.
- La ubicación no sale del celular salvo al pedir una ruta desde "Mi ubicación".
- Commits: Carlos al final.

## Review Focus

1. **Fecha retrocedida o igual** (lecturas en caché con `timestamp` viejo): no debe tratarse como "vigente" una anterior más nueva que la nueva; se toma la nueva. → Tarea 1.
2. **Precisión 0** (algunos navegadores): sin divisiones entre cero ni `NaN`. → Tarea 1.
3. **Ruta con un solo punto, sin puntos del piso 1, o tramo de longitud 0** (nodos repetidos): devuelve la posición sin cambios, sin `NaN`. → Tarea 2.
4. **Tramo que cruza pisos** (escalera de piso 1 a 2): no se usa como tramo. → Tarea 2.
5. **Proyección fuera de los extremos del tramo:** se acota al extremo más cercano (no se "pega" a la prolongación de la línea). → Tarea 2.

---

### Task 1: `suavizar` + uso en `useUbicacion`

**Files:** Modify `lib/ubicacion.ts`, `lib/ubicacion.test.ts`, `app/components/use-ubicacion.ts`

**Interfaces:**
- Produces: `export function suavizar(anterior: Lectura | null, nueva: Lectura): Lectura` y las constantes `VIGENCIA_LECTURA_MS`, `PESO_MINIMO`.

- [ ] **Step 1: pruebas (`describe("suavizar")`)**
  - sin anterior → devuelve `nueva` (deepEqual).
  - anterior con `fecha` 31 s antes → devuelve `nueva`.
  - anterior con `fecha` mayor o igual a la nueva → devuelve `nueva`.
  - salto mayor a `2 × (pa + pn)` (p. ej. pa=pn=5, ~25 m) → devuelve `nueva`.
  - misma precisión (5 y 5), salto chico → posición a medio camino (tolerancia 1e-9), `precision` y `fecha` de la nueva.
  - nueva mucho peor (pa=4, pn=40) → se mueve exactamente `PESO_MINIMO` del camino.
  - nueva mucho mejor (pa=40, pn=4) → se mueve > 0.95 del camino.
  - `precision: 0` en cualquiera → resultado finito (sin `NaN`) e igual a `nueva`.
- [ ] **Step 2:** `node --test lib/ubicacion.test.ts` → FAIL (no existe `suavizar`).
- [ ] **Step 3:** implementar; distancia con `distanciaMetros` de `lib/geo.ts`; con precisión 0 se toma la nueva.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** en `use-ubicacion.ts`, publicar `suavizar(lecturaActual, nueva)` donde `lecturaActual` es la lectura del estado `ok` vigente (o `null`).
- [ ] **Step 6:** `npx tsc --noEmit -p .` y `npm run lint` → sin errores.

### Task 2: `ajustarARuta`

**Files:** Create `lib/rutas/ajuste.ts`, `lib/rutas/ajuste.test.ts`

**Interfaces:**
- Consumes: `PuntoMapa` de `lib/rutas/mapa.ts` (`lat`, `lng`, `piso`).
- Produces:
  ```ts
  export const DISTANCIA_AJUSTE_MAX_M = 10;
  export const DISTANCIA_AJUSTE_MIN_M = 5;
  export type PosicionAjustada = { lat: number; lng: number; ajustada: boolean };
  export function ajustarARuta(
    posicion: { lat: number; lng: number; precision: number },
    puntos: Pick<PuntoMapa, "lat" | "lng" | "piso">[],
  ): PosicionAjustada;
  ```

- [ ] **Step 1: pruebas** (tramo este-oeste de ~44 m en `22.324, -97.880` → `-97.8796`, piso 1):
  - posición 4 m al norte del tramo, precisión 5 → `ajustada: true`, lat ≈ la del tramo (< 0.3 m), lng sin cambio (< 0.3 m).
  - 8 m al norte con precisión 10 → ajustada; con precisión 3 → no (límite `max(3,5)=5`).
  - 12 m al norte con precisión 30 → no (tope 10 m).
  - más allá del extremo este por 3 m → se pega al extremo (no a la prolongación).
  - tramo de piso 2, o tramo piso 1 → piso 2 → no ajustada.
  - lista vacía, un solo punto, o dos puntos iguales → no ajustada y sin `NaN`.
  - con dos tramos, elige el más cercano.
- [ ] **Step 2:** `node --test lib/rutas/ajuste.test.ts` → FAIL.
- [ ] **Step 3:** implementar: proyección en plano local (x = Δlng·cos(lat₀)·111320, y = Δlat·111320), parámetro t acotado a [0,1]; distancia final con `distanciaMetros`.
- [ ] **Step 4:** `npm test` → PASS.

### Task 3: Vista del alumno + documentación

**Files:** Modify `app/usuario/dashboard/navegador.tsx`, `docs/PROJECT_STATUS.md`, `CLAUDE.md`

**Interfaces:** Consumes Task 1 (lecturas ya suavizadas por el hook) y Task 2 (`ajustarARuta`).

- [ ] **Step 1:** `const ubicacionMapa = useMemo(...)`: con `ruta?.ok` y `lectura`, `ajustarARuta(lectura, puntos)` → `{ ...lectura, lat, lng }`; si no, `lectura`. Pasarla al mapa en lugar de `lectura`. "Mi ubicación" y el cálculo de ruta siguen usando `lectura` (suavizada, no pegada).
- [ ] **Step 2:** `npm test`, `npm run lint`, `npx tsc --noEmit -p .`, build en copia → PASS.
- [ ] **Step 3:** docs: en `PROJECT_STATUS.md` agregar bajo GPS "[x] Suavizado de lecturas y punto pegado a la ruta (lib/ubicacion.ts, lib/rutas/ajuste.ts)"; en `CLAUDE.md`, una línea en la decisión del GPS con los umbrales.

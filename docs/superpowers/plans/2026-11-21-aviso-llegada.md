# Aviso de llegada Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Al llegar al destino la navegación muestra una tarjeta "¡Llegaste!" que permanece hasta tocar un botón, y la llegada se declara a 5 m (no 10).

**Architecture:** La máquina de navegación pura (`lib/rutas/navegacion.ts`) conserva la fase `llegada`; solo cambia el radio y gana un predicado para el botón "Ya llegué". `ModoNavegacion` deja de llamar a `onLlegada` (que cerraba todo) y renderiza una tarjeta nueva con dos acciones que provee `navegador.tsx`.

**Tech Stack:** Next.js (React), TypeScript, Tailwind, `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-21-aviso-llegada-design.md`

## Global Constraints

- Textos de UI y comentarios en español; identificadores como ya están en el repo.
- Color de marca: variables CSS `--brand-primary*` de `app/globals.css`.
- La animación debe respetar `prefers-reduced-motion`.
- Verificar con `npm test` y `npm run lint` antes de terminar.
- NO ejecutar `git commit`/`push`: al final entregar a Carlos el bloque `git add` / `git commit -m` / `git push` listo para copiar, terminando el mensaje de commit con las líneas de atribución vigentes.
- Los pisos se numeran desde 1 (planta baja = piso 1).

## Review Focus

- Lecturas GPS que siguen llegando con la tarjeta abierta: no deben repetir el aviso de llegada ni cambiar la fase.
- Último tramo de menos de 5 m: llega en la primera lectura; es esperado, no un error.
- GPS que se queda corto (faltan 6–25 m y no avanza): debe aparecer "Ya llegué".
- Último tramo manual (sin línea GPS): sigue usando el botón existente, `puedeDeclararLlegada` no debe duplicarlo.
- "Buscar otro destino" desde la tarjeta: no debe dejar destino, ruta ni piso forzado del mapa.

---

### Task 1: Radio de llegada y predicado "Ya llegué"

**Files:**
- Modify: `lib/rutas/navegacion.ts` (constante `LLEGADA_M`, línea ~32; nueva función exportada)
- Test: `lib/rutas/navegacion.test.ts`

**Interfaces:**
- Produces: `LLEGADA_M = 5`; `YA_LLEGUE_CERCA_M = 25`; `puedeDeclararLlegada(e: EstadoNavegacion): boolean` — true solo si `e.fase === "caminando"`, el tramo actual es el último (`!hayTramoSiguiente(e)`), tiene línea GPS (`tramoActual(e).linea !== null`) y `tramoActual(e).largo - e.metros <= YA_LLEGUE_CERCA_M`.

- [ ] **Step 1: Escribir las pruebas que fallan** (describe nuevo `"llegada a 5 m"`), usando `rutaL()`, `aplicar`, `lectura`:
  - `"no llega a 8 m del final"`: lecturas hasta (60, 22) → `fase === "caminando"` (faltan 8).
  - `"llega a 4 m del final"`: lectura (60, 26) → `fase === "llegada"`, efectos `["llegada"]`.
  - `"lecturas posteriores no repiten el aviso"`: tras llegar, aplicar `lectura(60, 30)` y `lectura(60, 10)` → `efectos` sin un segundo `"llegada"` y `fase === "llegada"`.
  - `"puedeDeclararLlegada"`: false a 40 m del final; true a 20 m (lectura (60, 10)); false en fase `llegada`; false en un tramo con siguiente tramo (ruta de dos pisos, usar el helper de pruebas existente para ese caso en este archivo).
  - `"tramo final corto"`: ruta de 3 m (`camino([[0, 0], [3, 0]])`) llega en la primera lectura.
- [ ] **Step 2:** Run `npm test` — Expected: las pruebas nuevas FALLAN (`puedeDeclararLlegada` no existe / radio 10).
- [ ] **Step 3:** Implementar en `lib/rutas/navegacion.ts`: cambiar `LLEGADA_M` a 5, añadir `YA_LLEGUE_CERCA_M` y `puedeDeclararLlegada` según Interfaces (comentario en español explicando que el GPS del teléfono se desvía unos metros).
- [ ] **Step 4:** Run `npm test` — Expected: todo PASS. Si una prueba existente fijaba el valor 10 m, ajustar solo su valor esperado y dejar nota en el mensaje final; no tocar las demás.

### Task 2: Tarjeta de llegada y flujo de botones

**Files:**
- Create: `app/usuario/dashboard/tarjeta-llegada.tsx`
- Modify: `app/usuario/dashboard/modo-navegacion.tsx` (props, efecto `onLlegada` ~línea 142, botón "Ya llegué" ~línea 214, render)
- Modify: `app/usuario/dashboard/navegador.tsx` (uso de `<ModoNavegacion>` ~línea 266)
- Modify: `app/globals.css` (keyframes)

**Interfaces:**
- Consumes: `puedeDeclararLlegada(e: EstadoNavegacion): boolean` de Task 1; en `navegador.tsx` existen `terminarNavegacion()` (cierra navegación, conserva destino y ruta, panel "medio") y `volverABuscar()` (sale de navegación y limpia destino y ruta).
- Produces: `TarjetaLlegada({ destino, lugar, onListo, onBuscarOtro }: { destino: string; lugar: string; onListo: () => void; onBuscarOtro: () => void })`; `ModoNavegacion` cambia la prop `onLlegada` por `onListo: () => void` y `onBuscarOtro: () => void`, y recibe `destinoNombre: string` y `destinoLugar: string` (texto "Edificio · Piso N", el mismo que ya arma `lugar(destino.edificioNombre, destino.piso)` en `navegador.tsx`).

- [ ] **Step 1:** Crear `tarjeta-llegada.tsx`: tarjeta centrada (modal no bloqueante del mapa, `role="dialog"`, `aria-live="polite"`), título "¡Llegaste!", nombre y lugar del destino, pin SVG con animación de caída + pulso definida por clases `.llegada-pin` / `.llegada-pulso` y dos botones: "Listo" (principal, `--brand-primary`) llama `onListo`; "Buscar otro destino" (secundario) llama `onBuscarOtro`. Enfocar "Listo" con `autoFocus`.
- [ ] **Step 2:** En `app/globals.css` añadir los `@keyframes` y las clases dentro de `@media (prefers-reduced-motion: no-preference)`; fuera de ese media query el pin se ve estático.
- [ ] **Step 3:** En `modo-navegacion.tsx`: eliminar el `useEffect` que llama `onLlegada`; cuando `estado.fase === "llegada"` renderizar `<TarjetaLlegada …/>` y ocultar el banner superior y la barra inferior (la persona decide con los botones de la tarjeta). El botón "Ya llegué"/"Siguiente" se muestra si `(avanceAMano || puedeDeclararLlegada(estado)) && estado.fase === "caminando"`, y su texto es "Ya llegué" también cuando `puedeDeclararLlegada(estado)`.
- [ ] **Step 4:** En `navegador.tsx` pasar `destinoNombre={destino.nombre}`, `destinoLugar={lugar(destino.edificioNombre, destino.piso)}`, `onListo={terminarNavegacion}`, `onBuscarOtro={volverABuscar}` y quitar `onLlegada`.
- [ ] **Step 5:** Run `npm run lint` y `npm test` — Expected: sin errores. Prueba manual: `npm run dev`, iniciar una ruta como alumno de prueba, pulsar "Ya llegué" hasta llegar; la tarjeta debe quedarse hasta pulsar un botón; "Listo" deja el destino en el panel, "Buscar otro destino" regresa a la búsqueda; con "reducir movimiento" del sistema activado el pin no se anima.
- [ ] **Step 6:** Entregar a Carlos el bloque `git add` / `git commit -m "feat(nav): tarjeta de llegada y radio de 5 m"` / `git push` (sin ejecutarlo).

# Puntos de interés y decoración — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Iconos de escaleras, elevadores, baños y destinos con categoría/logo en el mapa del alumno y del visitante, más árboles y jardineras en el plano de la planta baja.

**Architecture:** La lógica pura (categorías, colores, validación de logo, qué marcador se ve en qué piso y zoom, HTML del marcador) vive en `lib/marcadores.ts` con pruebas. Una RPC pública (`marcadores_mapa`) alimenta las dos páginas; `MapaLeafletRuta` dibuja los marcadores en un panel debajo de la ruta. La decoración se agrega al SVG con `scripts/estilo-plano.py`.

**Tech Stack:** Next.js (App Router), Supabase (Postgres + Storage), Leaflet, `node:test`, Python 3 + `unittest`.

**Spec:** `docs/superpowers/specs/2026-11-22-puntos-de-interes-design.md`

## Global Constraints
- Categorías exactas: `comida, cafe, monumento, tienda, deporte, servicio`.
- Colores: comida `#e8590c`, cafe `#8a5a3b`, monumento `#c2255c`, tienda `#7048e8`, deporte `#2b8a3e`, servicio `#495057`, escalera/elevador `#0369a1`, bano `#1c7ed6`.
- Logo: `<uuid v4 minúsculas>.(png|webp)`; nunca SVG; lado máx. 256 px, transparencia conservada.
- Etiqueta visible solo con zoom ≥ 19; escaleras/elevadores/baños ocultos con zoom < 17.
- Los marcadores van debajo de ruta, pines y GPS (panel `marcadores`, zIndex 350: encima del plano (250) y debajo de la línea de ruta (overlayPane, 400) y los pines (markerPane, 600)).
- Todo texto de la base pasa por `escaparHtml` antes de Leaflet.
- Migraciones: Carlos las aplica (SQL Editor). No aplicar a producción sin su OK.
- No commitear archivos ajenos ya modificados en el árbol (`app/**/actions.ts` previos, `package.json`, `tests/`, `lib/fotos.test.ts`, `lib/geo.test.ts`).

## Review Focus
- Nombre de destino con `<script>` o comillas: el marcador lo muestra como texto.
- Destino con icono pero sin `lat`/`lng`: no aparece en el mapa y no rompe nada.
- Logo subido que luego se reemplaza o se borra el destino: el archivo viejo se borra del bucket.
- Marcador encima de un pin de la ruta: el toque llega al pin de la ruta, no al marcador.
- Alumno en navegación activa toca un marcador: no cambia de destino.

---

### Task 1: Lógica de marcadores (`lib/marcadores.ts`)

**Files:** Create `lib/marcadores.ts`, `lib/marcadores.test.ts`.

**Interfaces — Produces:**
- `CATEGORIAS_ICONO: readonly ["comida","cafe","monumento","tienda","deporte","servicio"]`, `type CategoriaIcono`.
- `ETIQUETA_ICONO: Record<CategoriaIcono, string>` (Comida, Café, Monumento, Tienda, Deporte, Servicio).
- `type MarcadorMapa = { id: string; nombre: string; clase: CategoriaIcono | "escalera" | "elevador" | "bano"; piso: number; lat: number; lng: number; buscable: boolean; logoUrl: string | null }`.
- `RE_LOGO_DESTINO: RegExp`; `urlLogoDestino(path): string | null` (misma base que `urlFotoDestino`).
- `aMarcador(fila: { id; nombre; tipo; icono; logo_path; piso; lat; lng; buscable }): MarcadorMapa | null` — `null` sin coordenadas o sin clase; `icono` gana sobre `tipo`.
- `marcadoresVisibles(m: MarcadorMapa[], piso: number, zoom: number): MarcadorMapa[]`.
- `mostrarEtiqueta(zoom: number): boolean`.
- `colorMarcador(clase): string`; `htmlMarcador(m: MarcadorMapa, conEtiqueta: boolean): string` (glifo SVG blanco por clase; con logo, `<img>` dentro de círculo blanco; nombre escapado).

- [ ] Pruebas: `RE_LOGO_DESTINO` acepta `uuid.png`/`uuid.webp`, rechaza `.svg`, `.jpg`, rutas con `/`, `..`, saltos de línea; `aMarcador` devuelve null sin lat, null para tipo `salon` sin icono, clase `cafe` si icono=cafe aunque tipo=`escalera`; `marcadoresVisibles` filtra por piso, oculta escalera/bano con zoom 16 y los deja con 17, siempre deja los de categoría; `mostrarEtiqueta(18)=false`, `(19)=true`; `htmlMarcador` con nombre `<b>"x"` contiene `&lt;b&gt;&quot;x&quot;` y no `<b>`; color de `bano` = `#1c7ed6`.
- [ ] `npm run test:unitarias` → falla (no existe el módulo).
- [ ] Implementar. `escaparHtml` se importa de un módulo sin Leaflet: moverla de `app/components/mapa-base.ts` a `lib/html.ts` y reexportarla desde `mapa-base.ts`.
- [ ] `npm run test:unitarias` → pasa. Commit.

### Task 2: Migración 0011

**Files:** Create `supabase/migrations/0011_iconos_y_logos_destinos.sql`.

**Interfaces — Produces:** columnas `nodos.icono`, `nodos.logo_path`; RPC `public.marcadores_mapa()` que devuelve `(id uuid, nombre text, tipo text, icono text, logo_path text, piso int, lat float8, lng float8, buscable bool)`.

- [ ] Escribir: columnas + checks (lista exacta de categorías; regex de logo igual a `RE_LOGO_DESTINO`); `update storage.buckets set allowed_mime_types = array['image/jpeg','image/png','image/webp'] where id='destinos'`; función `language sql stable security definer set search_path = public` con el filtro del spec; `revoke all ... from public; grant execute ... to anon, authenticated`. Encabezado con "Cómo aplicar" igual que 0010.
- [ ] Verificar: Carlos la aplica; luego `select count(*) from marcadores_mapa();` responde sin error, e `insert` con `icono='x'` falla por el check.
- [ ] Commit.

### Task 3: Admin — icono y logo

**Files:** Modify `app/admin/destinos/actions.ts`, `destination-form.tsx`, `page.tsx` (select de columnas); Create `app/admin/destinos/logo-destino-input.tsx`; Modify `reducir-imagen.ts` (nueva `reducirLogo(archivo): Promise<{ blob: Blob; extension: "png" | "webp" }>`, 256 px, sin fondo blanco, `image/webp` si el navegador lo soporta, si no PNG).

**Interfaces — Consumes:** `CATEGORIAS_ICONO`, `ETIQUETA_ICONO`, `RE_LOGO_DESTINO`, `urlLogoDestino`, `htmlMarcador` (vista previa) de Task 1.

- [ ] Prueba en `lib/marcadores.test.ts`: `leerIconoYLogo(formData)` (nueva en `lib/marcadores.ts`) → `{ ok: true, icono: null, logo_path: null }` con campos vacíos; error con icono fuera de la lista; error con logo `uuid.svg`.
- [ ] Correr → falla. Implementar `leerIconoYLogo`; usarla en `validarDestino`; al actualizar/borrar, borrar el logo viejo igual que `foto_path`.
- [ ] Formulario: select "Icono en el mapa" (Ninguno + categorías) con vista previa (`htmlMarcador`), y `LogoDestinoInput` (mismo patrón que `FotoDestinoInput`, acepta solo PNG/WebP, hidden `logo_path`).
- [ ] `npm run test:unitarias`, `npm run lint`, `npx tsc --noEmit` → pasan. Commit.

### Task 4: Marcadores en el mapa (alumno y visitante)

**Files:** Modify `app/components/mapa-leaflet-ruta.tsx`, `app/usuario/dashboard/page.tsx`, `navegador.tsx`, `app/visitante/ruta/page.tsx`, `vista-visitante.tsx`.

**Interfaces — Consumes:** `MarcadorMapa`, `aMarcador`, `marcadoresVisibles`, `mostrarEtiqueta`, `htmlMarcador` (Task 1); RPC `marcadores_mapa` (Task 2).
**Produces:** props nuevas de `MapaLeafletRuta`: `marcadores?: MarcadorMapa[]` (default `[]`), `onMarcador?: (id: string) => void`.

- [ ] En el mapa: panel `marcadores` (zIndex 350); un efecto que, con `pisoActivo`, `marcadores` y el zoom (`zoomend`), redibuja con `L.divIcon` (`htmlMarcador`, tamaño 28, `interactive` solo si `onMarcador` y `buscable`). Leer `onMarcador` vía ref para no recrear capas.
- [ ] Alumno: `page.tsx` llama `supabase.rpc("marcadores_mapa")` en el mismo `Promise.all`; si falla, `[]` y `console.error` (el mapa sigue funcionando). `navegador.tsx` pasa `onMarcador={enNavegacion ? undefined : (id) => { const d = destinos.find(x => x.id === id); if (d) elegirDestino(d); }}`.
- [ ] Visitante: `page.tsx` llama la RPC y pasa `marcadores` a `VistaVisitante` → `MapaLeafletRuta` sin `onMarcador`.
- [ ] Verificar: `npm run test:unitarias`, `npm run lint`, `npx tsc --noEmit`, `npm run build` → pasan. Revisión manual en `npm run dev` con un destino de prueba de cada clase. Commit.

### Task 5: Árboles y jardineras en el SVG

**Files:** Modify `scripts/estilo-plano.py`, `scripts/test_estilo_plano.py`; Create `scripts/decoracion.json` (vacío: `{"arboles": [], "jardineras": []}`).

**Interfaces — Produces:** `latlng_a_plano(lat, lng) -> (x, y)` (coordenadas internas del `<g>` raíz; usa `LIMITES = [[22.3232386, -97.8810681], [22.3255536, -97.8785584]]` en Mercator contra el `viewBox`, luego invierte `matrix(0.06,0,0,-0.06,14,794)`); `agregar_decoracion(svg, deco) -> str`; `estilizar(svg, deco=None)`; CLI lee `scripts/decoracion.json`.

- [ ] Pruebas: esquina noroeste de `LIMITES` → esquina superior izquierda del viewBox (±1 unidad); con 2 árboles y 1 jardinera aparece un solo bloque `<!--decoracion-->`; idempotente; `piso-4.svg` no recibe decoración; JSON vacío no agrega bloque.
- [ ] Correr → falla. Implementar (árbol: sombra + copa + brillo; jardinera: rectángulo blanco con borde `#c9a58a`, relleno `#4caf50`, dos arbustos `#2e8b3a`, rotada con `angulo`; medidas en metros vía la escala del plano). Bloque antes de la cancha.
- [ ] Pruebas pasan; documentar en `docs/CALIBRACION_PLANO.md`. Commit.

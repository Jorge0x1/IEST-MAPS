# Paleta cálida y cancha de fútbol — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recolorear los 4 planos con la paleta cálida y dibujar la cancha de fútbol en la planta baja.

**Architecture:** Un script de Python sin dependencias (`scripts/estilo-plano.py`) toma un SVG ya procesado,
cambia colores viejos→nuevos y agrega/reemplaza `<g id="cancha">`. Es idempotente. No se toca código de la app.

**Tech Stack:** Python 3 (stdlib + `re`), `unittest`, `rsvg-convert` para revisar visualmente.

**Spec:** `docs/superpowers/specs/2026-11-21-paleta-plano-design.md`

## Global Constraints
- Paleta (antes → después): `#efebe2→#fbf7f2`, `#dccbb3→#ffe9d9`, `#d3dfbb→#6cc45a`, `#d9dee4→#e2e5ec`, `#e8eef3→#9dd8f2`, `#5a554c→#c9a58a`.
- No cambiar `viewBox`, `width`, `height` ni el `<g transform>` raíz (rompería la calibración).
- La planta baja no debe crecer más de ~20 KB.
- No commitear cambios ajenos que ya están en el árbol de trabajo (`app/**/actions.ts`, `package.json`, `tests/`, `lib/*.test.ts`).

## Review Focus
- Correr el script dos veces: no duplica la cancha ni re-mapea colores ya nuevos.
- SVG sin polígono de cancha (pisos 2–4): solo recolorea, no falla.
- La cancha queda dentro del polígono verde grande y alineada con su inclinación.
- La ruta naranja `#ff5900` sigue resaltando sobre suelo, edificios y pasto.
- El SVG resultante sigue siendo XML válido.

---

### Task 1: Script de estilo + pruebas

**Files:**
- Create: `scripts/estilo-plano.py`
- Create: `scripts/test_estilo_plano.py`
- Modify: `scripts/preparar-plano.py:44-51` (`PALETA` apunta a los colores nuevos)

**Interfaces:**
- Produces: `recolorear(svg: str) -> str`, `agregar_cancha(svg: str) -> str`, `estilizar(svg: str) -> str`;
  CLI `python scripts/estilo-plano.py <archivo.svg> [...]` reescribe cada archivo en sitio.

- [ ] Pruebas (`unittest`): `test_recolorea` (cada color viejo desaparece y aparece el nuevo),
  `test_idempotente` (`estilizar(estilizar(x)) == estilizar(x)` con `planta-baja.svg`),
  `test_sin_campo_no_agrega_cancha` (con `piso-4.svg` no aparece `id="cancha"`),
  `test_una_sola_cancha` (en planta baja aparece exactamente un `id="cancha"`),
  `test_xml_valido` (`xml.etree.ElementTree.fromstring` no falla), `test_viewbox_intacto`.
- [ ] Correr `python3 scripts/test_estilo_plano.py` → falla (módulo no existe).
- [ ] Implementar. Cancha: localizar el path con `fill` verde de mayor área de caja; tomar sus 4 esquinas
  principales (polígono en coordenadas internas del `<g transform>`), encoger ~6 % hacia adentro y dibujar
  en el mismo sistema: franjas alternas `#62b951`/`#6cc45a` (12), líneas blancas `#ffffff` (borde, media
  cancha, círculo central, áreas grande y chica, punto penal) y porterías blancas en los lados cortos.
  Todo se interpola sobre el cuadrilátero, así hereda la inclinación del plano. El `<g id="cancha">` va
  justo después del path del campo. Si ya existe, se reemplaza.
- [ ] Correr pruebas → pasan.
- [ ] Commit (solo estos 3 archivos).

### Task 2: Aplicar a los 4 pisos y documentar

**Files:**
- Modify: `public/mapas/planta-baja.svg`, `piso-2.svg`, `piso-3.svg`, `piso-4.svg`
- Modify: `docs/CALIBRACION_PLANO.md` (nota de paleta + paso `estilo-plano.py`)

- [ ] `python3 scripts/estilo-plano.py public/mapas/*.svg`
- [ ] Renderizar con `rsvg-convert` y revisar: cancha alineada, ruta naranja visible; tamaño de planta baja ≤ +20 KB.
- [ ] Commit (SVGs + doc).

# Calibración del plano sobre el mapa de Leaflet

El plano del campus (exportado de AutoCAD) se coloca sobre Leaflet con un
`L.imageOverlay` (`agregarCapaBase()` en `app/components/mapa-base.ts`). Como los
nodos del grafo usan coordenadas reales (lat/lng), el plano y los nodos coinciden
sin convertir nada.

## Planta baja — primera parte (`public/mapas/planta-baja.svg`)

Origen: `PRIMERA_PARTE_PB_PINTADO.pdf` (AutoCAD 2027, A4, una página). Las
coordenadas del plano están en puntos del PDF, con el origen arriba a la izquierda
y la `y` hacia abajo (así salen de `pdftocairo -svg`).

Puntos de control (las 4 esquinas del plano):

| Punto | Plano (x, y)    | Lat, Lng                  |
| ----- | --------------- | ------------------------- |
| A     | 36.98, 175.16   | 22.3253992, -97.8809671   |
| B     | 53.9, 695.9     | 22.3232741, -97.8808893   |
| C     | 550.1, 143.24   | 22.3255307, -97.8786953   |
| D     | 557.72, 654.02  | 22.323449, -97.8786618    |

Resultado del ajuste (transformación afín por mínimos cuadrados, en Mercator):

- Escala ≈ 0.456 m en el terreno por cada punto del PDF.
- Rotación del plano respecto al norte: ≈ 0.07° → **no hace falta rotarlo**; un
  `imageOverlay` normal (rectángulo alineado al norte) alcanza.
- Error de los 4 puntos con solo los límites del rectángulo: **≤ 0.4 m**.
- Límites del SVG completo: `[[22.3232386, -97.8810681], [22.3255536, -97.8785584]]`
  (en `PLANTA_BAJA.limites`).

## Cómo regenerar con una versión nueva del plano

1. Exportar el PDF y convertirlo: `pdftocairo -svg plano.pdf plano.svg`.
2. Medir las 4 esquinas en el plano nuevo (x, y en puntos) y su lat/lng real, y
   actualizar `PUNTOS_DE_CONTROL` en `scripts/preparar-plano.py`.
3. `python scripts/preparar-plano.py plano.svg public/mapas/planta-baja.svg`
   (necesita `numpy`). Limpia el SVG, imprime el error de cada punto y los nuevos
   límites.
4. Pegar los límites en `PLANTA_BAJA.limites` (`mapa-base.ts`). `LIMITES_CAMPUS`
   (el área que se puede explorar) se recalcula solo, con ~45 m de margen.

Si el plano nuevo sale con rotación notable (más de ~1°), un `imageOverlay` ya no
alcanza: habría que rotar el SVG dentro de su propio `viewBox` antes de calcular los
límites.

## Notas

- El PDF exportado de AutoCAD trae los rellenos como mallas de triángulos; en el
  navegador se ven costuras finas. El script engruesa el contorno de cada relleno
  para taparlas. Si AutoCAD exporta los rellenos como regiones sólidas, desaparecen.
- Planos por piso (`PLANOS_POR_PISO` en `mapa-base.ts`, clave = `nodos.piso`):
  planta baja = piso 1 (`planta-baja.svg`), `piso-2.svg` = piso 2, `piso-3.svg` =
  piso 3, `piso-4.svg` = piso 4. Los PDF de los pisos 2, 3 y 4 salen del mismo marco de
  AutoCAD que la planta baja (mismas esquinas A-D), por eso comparten
  `PLANTA_BAJA.limites` y no se recalibran. Se generan igual que la planta baja:
  `python scripts/preparar-plano.py pisoN.svg public/mapas/piso-N.svg`.
- `agregarCapaBase(mapa, piso)` devuelve `{ cambiarPiso }`. El mapa de rutas muestra
  un piso a la vez (selector arriba a la derecha cuando la ruta pasa por más de uno);
  el mapa del grafo sigue el filtro de piso del admin ("todos" = piso 1).
- `PLANTA_BAJA.opacidad` está en 1. Al calibrar un plano nuevo conviene bajarlo
  temporalmente (p. ej. 0.7) para comparar con las calles de OSM, y volver a 1.
- Paleta: AutoCAD usa colores oscuros pensados para imprimir; `PALETA` en
  `scripts/preparar-plano.py` los cambia por tonos claros (suelo, edificios, verde,
  estacionamiento, contornos) para que resalten la ruta y los marcadores. Con
  `PALETA = {}` se conservan los colores originales.

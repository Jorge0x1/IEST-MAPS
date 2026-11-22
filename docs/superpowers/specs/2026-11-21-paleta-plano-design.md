# Paleta cálida de los planos y cancha de fútbol — diseño corto

## Por qué
Los planos se sienten vacíos y apagados frente a la app (blanco + naranja `#ff5900`).
Carlos quiere un mapa más vivo y personalizado. Primer paso: paleta y cancha.
Iconos (escaleras, árboles, la A de Anáhuac) vienen después, con fotos de Carlos.

## Objetivos
- Paleta "B, cálida" (elegida por Carlos) en los 4 pisos.
- Cancha de fútbol de la planta baja con franjas de pasto, líneas blancas y porterías,
  con proporciones tomadas de la vista satelital.

## No objetivos (por ahora)
- Iconos, árboles, puntos de interés, etiquetas de edificios.
- Rellenar el fondo vacío de los pisos 2–4.
- Cambiar calibración, límites o código de Leaflet.

## Anti-objetivos
- Que la ruta naranja o los marcadores pierdan contraste con el plano.
- Que el plano pese mucho más (hoy la planta baja pesa ~500 KB).

## Paleta
| Elemento | Antes | Después |
| --- | --- | --- |
| Suelo / plazas | `#efebe2` | `#fbf7f2` |
| Edificios | `#dccbb3` | `#ffe9d9` |
| Áreas verdes | `#d3dfbb` | `#6cc45a` |
| Estacionamiento | `#d9dee4` | `#e2e5ec` |
| Vidrio / agua | `#e8eef3` | `#9dd8f2` |
| Contornos | `#5a554c` | `#c9a58a` |

## Enfoques considerados
1. **Elegido:** recolorear los SVG ya procesados y dibujar la cancha dentro del SVG con
   un script. Fija, sin código nuevo en el mapa, se regenera con un comando.
2. Cancha como capa aparte de Leaflet: se puede apagar, pero es más complejo para algo
   que nunca cambia. Descartado.

## Cómo
- `scripts/estilo-plano.py <svg>`: cambia los colores viejos por los nuevos y agrega
  (o reemplaza, si ya existe) un `<g id="cancha">` dentro del polígono del campo.
  Se puede correr varias veces sin duplicar nada.
- `PALETA` en `scripts/preparar-plano.py` pasa a los colores nuevos, para que un plano
  regenerado desde AutoCAD salga igual.
- Se actualiza la nota de paleta en `docs/CALIBRACION_PLANO.md`.

## Lo que decide quien lo construye
Tono exacto de las franjas, grosor de las líneas, tamaño de las porterías y si el contorno
de los edificios necesita un ajuste fino tras verlo en el mapa real.

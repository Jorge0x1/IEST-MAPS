# GPS: suavizado y punto pegado a la ruta — diseño

Fecha: 14 de noviembre de 2026. Tamaño: cambio chico (dos funciones puras con
pruebas y su uso en el hook de ubicación y la vista del alumno).

## Intención

En la prueba en campo (14/11) el punto azul "caminaba" estando quieto y caía 5–10 m
fuera de donde estaba Carlos (sobre el pasto en vez del caminito, dentro del campo en
vez de al lado). Comparando 5 pines satelitales con el plano, el plano está a 2–5 m de
su lugar real, así que el error viene sobre todo del GPS del celular. Decisión: no
mover el plano ni los nodos por ahora; mejorar cómo se muestra la ubicación.

## Metas

- **Suavizado (siempre):** el punto deja de brincar estando quieto.
- **Pegado a la ruta (solo con ruta abierta):** si la posición cae cerca de un tramo
  de la ruta mostrada, el punto se dibuja sobre ese tramo.

## No metas

- Saber en qué paso de la ruta vas, indicaciones en vivo, recalcular al desviarse
  (siguiente parte, fase 2).
- Pegar el punto a caminos que no son de la ruta (opción A, descartada: el grafo aún
  es chico — 21 pasillos en piso 1 — y lo pegaría a un pasillo equivocado).
- Recalibrar el plano o mover nodos.

## Anti-metas

- Nunca "inventar" una posición lejana: si no hay tramo cerca, se muestra la posición
  (suavizada) tal cual.
- La ubicación sigue sin salir del celular salvo al pedir una ruta desde ella.

## Enfoques considerados

Pegado: **en el celular con los puntos de la ruta que ya tiene (elegido)** vs. en el
servidor con cada lectura (agrega retraso y manda la ubicación cada segundo; descartado).

Suavizado: **promedio ponderado por precisión (elegido)** vs. reglas simples (el punto
se queda pegado y luego salta) vs. filtro de Kalman (excesivo, difícil de ajustar).

Carlos eligió ambos recomendados.

## Diseño

**`suavizar(anterior, nueva): Lectura`** (`lib/ubicacion.ts`, pura, con pruebas):
- Sin anterior, anterior de hace más de 30 s, o salto mayor a
  `2 × (precisión anterior + precisión nueva)` → se toma la nueva tal cual (sí te
  moviste, o la anterior ya no vale).
- Si no, `peso = (1/pn²) / (1/pn² + 1/pa²)`, acotado a `[0.2, 1]` para que el punto
  nunca se quede congelado; posición = anterior + peso × (nueva − anterior).
- La precisión y la fecha son las de la lectura nueva (honesto: no se presume más
  precisión de la que da el GPS).
- Se aplica en `use-ubicacion.ts` a cada lectura antes de publicarla: lo usan el mapa
  y "Mi ubicación".

**`ajustarARuta(posicion, puntos): { lat, lng, ajustada }`** (`lib/rutas/ajuste.ts`,
pura, con pruebas):
- Tramos = pares consecutivos de `PuntoMapa` de la ruta con ambos extremos en el piso 1
  (el GPS no sabe el piso).
- Proyecta la posición sobre cada tramo (plano local en metros, equirectangular) y
  toma el más cercano.
- Se pega si la distancia es ≤ `min(10, max(precisión, 5))` m; si no, devuelve la
  posición sin cambios con `ajustada: false`.
- En `navegador.tsx`, con ruta ok, el mapa recibe la ubicación ajustada (punto y
  círculo centrados en el punto pegado); sin ruta, la suavizada.

## Decisiones que tomé yo (revisar)

- Umbrales: 30 s de vigencia, salto de 2× la suma de precisiones, peso mínimo 0.2,
  pegado a ≤ 10 m. Se ajustan en campo.
- El círculo de precisión se centra en el punto pegado.
- Al calcular una ruta desde "Mi ubicación" se usa la lectura suavizada.

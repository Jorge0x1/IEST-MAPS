# Puntos de interés y decoración del mapa — diseño

## Por qué
Con la paleta nueva el mapa se ve mejor, pero sigue sin decir *qué* hay en el campus.
Carlos quiere ubicarse de un vistazo, como en Google Maps: escaleras, las 5 A de
Anáhuac, lugares de comida (Subway, Campus Café, Natural Bowl, mesas) con su logo, y
árboles y jardineras (frente a la biblioteca) que llenen las zonas vacías. Muchos
destinos aún no están dados de alta, así que los puntos se agregan con el tiempo
desde el admin. Los logos oficiales ya los tiene el equipo; mientras no se suban, se
ve un icono genérico.

## Objetivos
1. Iconos automáticos para los nodos de tipo `escalera`, `elevador` y `bano`.
2. Destinos con icono en el mapa (categoría elegida en el admin) y logo opcional.
3. Árboles y jardineras dibujados en el plano de la planta baja.
4. Lo ven el alumno y el visitante.

## No objetivos
- Fotos panorámicas, horarios de los locales, buscar por categoría.
- Decoración en los pisos 2–4 (no hay árboles adentro de los edificios).
- Dibujar los logos reales: los sube el equipo.

## Anti-objetivos
- Que los iconos tapen la ruta, los pines de inicio/destino o el punto azul del GPS.
- Un mapa saturado al alejar el zoom.
- Aceptar logos SVG (un SVG en un bucket público puede llevar scripts).

## Enfoques considerados
1. **Elegido — mixto:** iconos automáticos desde `nodos.tipo`; categoría y logo como
   campos de los destinos; árboles y jardineras en el SVG con `estilo-plano.py`.
   Reusa el formulario de destinos, la búsqueda y la tarjeta de vista previa.
2. Tabla aparte `puntos_interes` con su página de admin: más flexible, pero duplica
   los destinos y es más trabajo.
3. Lista fija en el código: cada punto nuevo pide un deploy; no sirve si los
   destinos se siguen dando de alta.

## Diseño

### Datos (migración `0011_iconos_y_logos_destinos.sql`)
- `nodos.icono text null`, con check en `('comida', 'cafe', 'monumento', 'tienda', 'deporte', 'servicio')`.
  `null` = sin icono propio.
- `nodos.logo_path text null`, con check `<uuid>.(png|webp)` (mismo estilo que `foto_path`).
- Bucket `destinos`: `allowed_mime_types` pasa a `image/jpeg, image/png, image/webp`.
  SVG no.
- RPC `marcadores_mapa()` (`security definer`, `stable`), ejecutable por `anon` y
  `authenticated`. Devuelve solo `id, nombre, tipo, icono, logo_path, piso, lat, lng, buscable`
  de los nodos con `lat`/`lng` y (`icono` no nulo **o** `tipo in ('escalera','elevador','bano')`).
  Así el visitante, que no tiene sesión de Supabase, también los ve, y no se abre la
  tabla `nodos` completa a `anon`.

### Admin (formulario de destinos)
- Selector "Icono en el mapa": Ninguno / Comida / Café / Monumento / Tienda /
  Deporte / Servicio, con una vista previa del icono.
- Campo "Logo (opcional)": PNG o WebP. El navegador lo reduce a 256 px máx.
  conservando la transparencia y lo sube como `<uuid>.png|webp`. Si se reemplaza o se
  borra el destino, se borra el archivo viejo (igual que hoy con la foto).

### Mapa (`MapaLeafletRuta`)
- Prop nueva `marcadores: MarcadorMapa[]`; se muestran solo los del piso activo.
- Panel propio de Leaflet entre el plano y la ruta, así la ruta, los pines y el GPS
  quedan siempre encima.
- Cada marcador es un círculo de color con un glifo blanco (como la vista previa del
  21/11). Si tiene logo, el logo va dentro de un círculo blanco.
  - Colores: comida `#e8590c`, café `#8a5a3b`, monumento `#c2255c`,
    tienda `#7048e8`, deporte `#2b8a3e`, servicio `#495057`,
    escalera/elevador `#0369a1`, baño `#1c7ed6`.
- El nombre se ve al lado solo con zoom ≥ 19. Con zoom < 17 se ocultan escaleras y baños.
- Al tocar un marcador **buscable** (alumno, sin navegación activa) se elige como
  destino y se abre la tarjeta de vista previa que ya existe. En el visitante, o si no
  es buscable, solo se muestra el nombre.
- Los datos se cargan con la RPC en la página del alumno y en la del visitante
  (server), y bajan al componente como prop.

### Decoración en el SVG (`scripts/estilo-plano.py`)
- `scripts/decoracion.json`: `{"arboles": [[lat, lng], ...], "jardineras": [{"lat", "lng", "ancho_m", "largo_m", "angulo"}]}`.
  Las coordenadas se obtienen tocando el mapa en el selector de ubicación del admin.
- El script convierte lat/lng a coordenadas del plano con la misma relación que usa
  Leaflet (rectángulo `PLANTA_BAJA.limites`, en Mercator) y dibuja, en un bloque
  `<!--decoracion-->` reemplazable, árboles (copa con sombra, como en la vista previa)
  y jardineras (macetón blanco con arbustos). Solo en la planta baja.
- Sigue siendo idempotente.

## Lo que decide quien lo construye
Glifos exactos de cada icono, tamaño del marcador (~28 px), estilo de la etiqueta,
cómo se ve el selector de icono en el admin y el tamaño exacto de los árboles.

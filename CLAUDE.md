# IEST-MAPS v2

App para orientar alumnos y visitantes dentro del campus del IEST: buscar destinos,
calcular rutas sobre un grafo del campus y mostrar recorridos exteriores e interiores.
Reconstruye la app original con Next.js + Supabase, sin reutilizar su backend ni su UI.

## Stack

- Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS 4
- Supabase: Postgres, Auth y RLS. Sesión SSR con `@supabase/ssr`
- `leaflet` para mapas (mini mapa de coordenadas y trazador de pasillos en el admin)
- `qrcode` para generar QR localmente en el navegador
- Rama de desarrollo: `next`

## Comandos

```bash
npm run dev
npm run lint
npm run build
npm test          # pruebas unitarias (node --test, sin dependencias)
```

- En Windows PowerShell puede hacer falta `npm.cmd` en lugar de `npm`.
- Si `npm run build` falla con `EPERM` dentro de `.next/`: detener `npm run dev` en
  otra terminal (o esperar a que OneDrive termine de sincronizar) y reintentar.

## Reglas duras

- **Migraciones:** nunca editar una migración ya aplicada. Todo cambio de esquema va en
  un archivo nuevo `supabase/migrations/NNNN_nombre.sql`.
- **Estado de migraciones:** `0001` a `0009` están aplicadas en Supabase. `0010`
  (descripción y foto de destinos + bucket público `destinos`) está creada; actualizar
  esta línea cuando se aplique y al agregar una nueva.
- **Service role:** `utils/supabase/service.ts` ignora RLS. Solo se importa desde
  archivos `"use server"` (hoy `lib/rutas/actions.ts`), y cada acción valida sesión o
  token antes de usarlo. `SUPABASE_SERVICE_ROLE_KEY` nunca lleva prefijo `NEXT_PUBLIC_`.
- **Autorización siempre en el servidor:** validar rol en Server Actions/Route Handlers
  y respaldar con RLS. Nunca confiar solo en ocultar botones en la UI.
- **Tokens de visitante:** el token original solo se devuelve al registrar la visita.
  En la base se guarda únicamente `access_token_hash` (SHA-256). Nunca guardar ni
  loguear el token en claro.
- **Leaflet** requiere `window`: cargarlo con `next/dynamic(..., { ssr: false })`.
- No agregar servicios externos para QR ni para datos personales de visitantes.

## Decisiones de arquitectura (FINALES, no reabrir sin avisar)

- **Auth:** Supabase Auth es la única fuente. Usuarios institucionales con Google y
  correo autorizado previamente. Dar de alta un correo lo preautoriza; el perfil se
  vincula en el primer login.
- **Visitantes:** usan token propio del QR, sin cuenta de Supabase (NO usar Anonymous
  Sign-ins). Vigencia 12 h.
- **Mapas:** Leaflet (NO MapLibre). Tiles de OpenStreetMap para herramientas del admin
  y, TEMPORALMENTE, como "mapa de prueba" de la ruta en alumno y visitante
  (`app/components/mapa-base.ts`, función `crearCapaBase`, compartida por todos los mapas de
  rutas y el mapa del grafo). Plan: cargar nodos
  con coordenadas reales y sustituir la capa base por el SVG del campus con
  `L.imageOverlay`. No usar tiles de OSM en producción.
- **Grafo:** tablas `nodos` y `conexiones` en Supabase, administrables sin desplegar.
  Escaleras/elevadores conectan nodos entre pisos. No hay restricción de mismo
  edificio/piso en una conexión.
- **Destino de visita:** nodo con `buscable = true`. **Origen:** nodo tipo `entrada`.
  `destino_edificio_id` se deriva del nodo y se conserva por compatibilidad.
- **Peso de conexiones:** `costo` si no es null; si es null, distancia real entre los
  dos nodos (`distanciaMetros()` en `lib/geo.ts`, réplica de `distancia_metros()` en
  SQL); si falta alguna coordenada, peso fijo 1. Nunca falla por datos incompletos.
- **GPS y pisos:** el GPS no detecta cambio de piso. El cambio de piso se indica en la
  ruta y se confirma manualmente.
- **Pathfinding:** Dijkstra con montículo binario, en el servidor y en TypeScript (no
  PL/pgSQL). Función pura en `lib/rutas/dijkstra.ts` (probada con `npm test`); punto de
  entrada único en `lib/rutas/actions.ts` (`calcularRuta`, `calcularRutaDeVisita`).
  `evitarEscaleras` excluye nodos tipo `escalera`, deja pasar `elevador`.

## Roles

- **Administrador:** usuarios y roles, edificios, nodos y conexiones, trazador de pasillos,
  mapa del grafo (`/admin/grafo`: diagnóstico, mapa y probar ruta; solo lectura).
- **Guardia:** registra visitantes, genera QR, ve visitas activas, finaliza visitas.
- **Alumno:** login con Google institucional. `/usuario/dashboard`: busca destinos por
  nombre/alias mientras escribe (`lib/busqueda.ts`, filtrado en el navegador), elige
  entrada como origen y ve la ruta (mapa de prueba + lista de pasos) vía `calcularRuta`.
  Pendiente: GPS y SVG del campus.
- **Visitante:** entra por QR (`/visitante/ruta`), ve su visita, su ruta fija como lista
  de pasos y en el mapa de prueba (con opción de evitar escaleras) y puede finalizarla.
  Pendiente: SVG del campus.

## Estructura relevante

- `app/admin/components/location-picker.tsx`: selector de coordenadas con Leaflet.
- `app/admin/components/path-drawer.tsx`: trazador de pasillos.
- Vistas de alumno y visitante: mapa Leaflet a pantalla completa (`h-dvh`) + barra flotante
  + `app/components/panel-deslizable.tsx`. Móvil: panel inferior con 3 alturas. Escritorio
  (`md`, 768 px; hook `use-escritorio.ts`): barra y panel son tarjetas flotantes a la
  izquierda (368 px) y el mapa deja libre esa columna al encuadrar la ruta
  (`margenIzquierdo`/`margenInferior`/`margenSuperior` de `mapa-leaflet-ruta.tsx`).
  El alumno no tiene header: "Cerrar sesión" está en `usuario/dashboard/menu-cuenta.tsx`.
  `LIMITES_CAMPUS` (`mapa-base.ts`) limita el desplazamiento y el zoom mínimo; al llegar
  el SVG, usar sus mismas esquinas.
- Fotos de destinos: bucket público `destinos` (solo el admin escribe, RLS en
  `storage.objects`). En `nodos.foto_path` solo va el nombre `<uuid>.jpg`; la URL se arma
  con `urlFotoDestino()` (`lib/fotos.ts`). El admin las reduce y sube desde el navegador
  (`app/admin/destinos/foto-destino-input.tsx`); la Server Action solo guarda la ruta y
  borra la foto anterior. `DetalleDestino` (`app/components/`) la muestra con la descripción.
- `lib/rutas/diagnostico.ts`: diagnóstico del grafo (red principal = la que tiene más
  entradas; desconectados, aislados, destinos inalcanzables, pasillos buscables,
  escaleras/elevadores sin otro piso). Lo usa `/admin/grafo`.
- Los tooltips de Leaflet interpretan HTML: pasar todo dato de la base por
  `escaparHtml()` (`app/components/mapa-base.ts`).
- `app/admin/destinos/trazar/actions.ts`: Server Action `crearCadenaNodos`, llama a la
  función SQL `crear_cadena_nodos()` (una sola transacción, `SECURITY INVOKER`).

## Convenciones de trabajo

- Responder y comentar en español; identificadores de código en inglés o como ya estén
  en el repo.
- Antes de tareas grandes, proponer un plan y esperar confirmación.
- Cambios pequeños y verificables: correr `npm run lint` antes de dar algo por terminado.
- Si algo contradice esta guía (por ejemplo, un documento viejo que proponga MapLibre o
  Anonymous Sign-ins), gana este archivo; avisar de la contradicción.

## Estado y pendientes

El checklist detallado vive en `docs/PROJECT_STATUS.md` (importarlo solo cuando haga
falta, para no inflar este archivo).

Siguiente bloque: completar el grafo real (pasillos conectados a entradas y destinos,
escaleras/elevadores entre pisos) con coordenadas reales, probándolo en el mapa de
prueba; después, sobreponer el SVG del campus georreferenciado.
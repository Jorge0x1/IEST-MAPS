# GPS como punto de partida (fase 1) — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** El alumno puede elegir "Mi ubicación" como punto de partida; el servidor convierte su posición en el nodo más cercano del piso 1 y calcula la ruta. La lista de siempre sigue intacta.

**Architecture:** Funciones puras nuevas en `lib/` (validar posición, elegir nodo más cercano, interpretar errores de geolocalización) con pruebas `node --test`. Una Server Action nueva en `lib/rutas/actions.ts` que reutiliza la carga del grafo y el armado de la ruta. En el cliente, un hook `useUbicacion` alimenta el mapa (punto azul + círculo) y el selector de origen de `navegador.tsx`.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Leaflet, Supabase (service role ya existente), `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-13-gps-origen-design.md`

## Global Constraints

- Umbrales: `PRECISION_MAXIMA_M = 50`, `DISTANCIA_MAXIMA_M = 150`, piso de candidatos `PISO_GPS = 1`.
- Nunca se guarda ni se loguea la ubicación (ni en `console.error`).
- La lista de puntos de partida no se quita ni cambia de comportamiento cuando no hay GPS.
- Toda ruta pasa por `lib/rutas/actions.ts`; cada acción exportada valida sesión.
- Nada en `lib/` importa Leaflet ni React (se usa en servidor y pruebas).
- `watchPosition` con `{ enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }`.
- Textos de UI en español, mismo tono que los existentes.
- Commits: Carlos los hace al final (bloque de `git add/commit/push`); no hacer commits por tarea.

## Review Focus

1. **Contexto no seguro** (`http://192.168.x.x`): `navigator.geolocation` existe pero falla; debe verse "La ubicación solo funciona con https" y caer a la lista. → Tarea 1 (`estadoInicial`).
2. **Permiso negado o revocado a mitad de sesión**: "Mi ubicación" queda deshabilitada con motivo y el origen vuelve a la primera entrada sin borrar el destino. → Tareas 1 y 5.
3. **"Evitar escaleras" con el nodo más cercano siendo una escalera**: no debe elegirse como origen (Dijkstra la excluiría). → Tarea 2.
4. **El nodo más cercano es el propio destino**: mensaje "Ya estás junto a tu destino", no un error genérico. → Tarea 3.
5. **Entrada basura a la Server Action** (NaN, strings, precisión negativa/Infinity, lat 999): se rechaza con `ubicacion_invalida` sin tocar el grafo. → Tarea 2 (`validarPosicion`).

---

### Task 1: Estados de geolocalización (puro) + hook `useUbicacion`

**Files:**
- Create: `lib/ubicacion.ts`
- Test: `lib/ubicacion.test.ts`
- Create: `app/components/use-ubicacion.ts`

**Interfaces:**
- Produces (`lib/ubicacion.ts`):
  ```ts
  export type Lectura = { lat: number; lng: number; precision: number; fecha: number };
  export type EstadoUbicacion =
    | { estado: "no_soportado" }
    | { estado: "no_seguro" }
    | { estado: "pidiendo" }
    | { estado: "denegado" }
    | { estado: "sin_senal" }
    | { estado: "ok"; lectura: Lectura };
  export function estadoInicial(entorno: { tieneGeolocalizacion: boolean; contextoSeguro: boolean }): EstadoUbicacion;
  export function estadoDesdeError(codigo: number): EstadoUbicacion; // 1 → denegado; 2, 3 y otros → sin_senal
  export function mensajeUbicacion(e: EstadoUbicacion): string | null; // null solo para "ok"
  ```
- Produces (`app/components/use-ubicacion.ts`, `"use client"`): `export function useUbicacion(): EstadoUbicacion`

- [ ] **Step 1: Write the failing tests** (`lib/ubicacion.test.ts`, estilo de `lib/rutas/mapa.test.ts`)
  - `estadoInicial({tieneGeolocalizacion:false, contextoSeguro:true})` → `{estado:"no_soportado"}`
  - `estadoInicial({tieneGeolocalizacion:true, contextoSeguro:false})` → `{estado:"no_seguro"}`
  - `estadoInicial({tieneGeolocalizacion:true, contextoSeguro:true})` → `{estado:"pidiendo"}`
  - `estadoDesdeError(1)` → `denegado`; `estadoDesdeError(2)`, `(3)`, `(99)` → `sin_senal`
  - `mensajeUbicacion` de `no_seguro` contiene `"https"`; de `denegado` contiene `"permiso"`; de `ok` es `null`.
- [ ] **Step 2:** `node --test lib/ubicacion.test.ts` → FAIL (módulo no existe).
- [ ] **Step 3:** Implementar `lib/ubicacion.ts`. Mensajes: no_soportado "Tu navegador no permite usar la ubicación."; no_seguro "La ubicación solo funciona cuando la app se abre con https."; pidiendo "Buscando tu ubicación…"; denegado "No diste permiso de ubicación. Puedes activarlo en tu navegador."; sin_senal "No pudimos obtener tu ubicación. Intenta al aire libre."
- [ ] **Step 4:** `npm test` → PASS (todas las pruebas, también las existentes).
- [ ] **Step 5:** Implementar `useUbicacion()`: estado inicial `{estado:"pidiendo"}` (para que SSR y cliente coincidan); en `useEffect` calcula `estadoInicial({ tieneGeolocalizacion: "geolocation" in navigator, contextoSeguro: window.isSecureContext })`; si no es `pidiendo`, lo aplica de forma diferida (no `setState` síncrono en el cuerpo del efecto, la regla de lint de React 19 lo marca); si es `pidiendo`, `watchPosition` con las opciones de Global Constraints, éxito → `ok` con `coords.accuracy` como `precision`, error → `estadoDesdeError(err.code)`. Limpieza con `clearWatch`. Si llega una lectura después de un error `sin_senal`, vuelve a `ok`.
- [ ] **Step 6:** `npm run lint` → sin errores nuevos.

### Task 2: Nodo más cercano y validación de posición (puro)

**Files:**
- Create: `lib/rutas/cercano.ts`
- Test: `lib/rutas/cercano.test.ts`

**Interfaces:**
- Consumes: `NodoGrafo`, `ConexionGrafo`, `OpcionesRuta` de `lib/rutas/dijkstra.ts`; `distanciaMetros` de `lib/geo.ts`.
- Produces:
  ```ts
  export const PRECISION_MAXIMA_M = 50;
  export const DISTANCIA_MAXIMA_M = 150;
  export const PISO_GPS = 1;
  export type PosicionUsuario = { lat: number; lng: number; precision: number };
  export function validarPosicion(entrada: unknown): PosicionUsuario | null;
  export type ResultadoCercano<N extends NodoGrafo> =
    | { ok: true; nodo: N; distanciaMetros: number }
    | { ok: false; motivo: "ubicacion_imprecisa" | "sin_candidatos" | "fuera_del_campus" };
  export function nodoMasCercano<N extends NodoGrafo>(
    posicion: PosicionUsuario, nodos: N[], conexiones: ConexionGrafo[], opciones: OpcionesRuta,
  ): ResultadoCercano<N>;
  ```

- [ ] **Step 1: Write the failing tests** (`lib/rutas/cercano.test.ts`). Nodos de prueba alrededor de `22.3240, -97.8800`:
  - `validarPosicion({lat:22.324,lng:-97.88,precision:8})` devuelve el objeto; devuelve `null` para: `NaN`, `"22.3"` (string), `lat: 91`, `lng: -181`, `precision: -1`, `precision: Infinity`, `null`, `{}`.
  - elige el nodo conectado más cercano y reporta `distanciaMetros` ≈ `distanciaMetros(...)` (tolerancia 0.01).
  - ignora nodos sin coordenadas, de piso ≠ 1, y nodos sin ninguna conexión (aunque estén más cerca).
  - con `{evitarEscaleras:true}` ignora un nodo `tipo:"escalera"` más cercano y elige el siguiente; con `false` sí lo elige.
  - `precision: 51` → `{ok:false, motivo:"ubicacion_imprecisa"}`; `precision: 50` → ok.
  - nodo más cercano a > 150 m → `fuera_del_campus`.
  - sin candidatos válidos → `sin_candidatos`.
- [ ] **Step 2:** `node --test lib/rutas/cercano.test.ts` → FAIL.
- [ ] **Step 3:** Implementar. Búsqueda lineal (el grafo es chico). Un nodo cuenta como conectado si aparece como `nodo_origen_id` o `nodo_destino_id` en alguna conexión. Orden de chequeo: precisión → candidatos → distancia.
- [ ] **Step 4:** `npm test` → PASS.

### Task 3: Server Action `calcularRutaDesdeUbicacion`

**Files:**
- Modify: `lib/rutas/actions.ts`

**Interfaces:**
- Consumes: Task 2 (`validarPosicion`, `nodoMasCercano`).
- Produces:
  ```ts
  export type OrigenUbicacion = { id: string; nombre: string; distanciaMetros: number };
  // ResultadoRuta: la rama ok gana `origen?: OrigenUbicacion`; `motivo` agrega
  // "ubicacion_invalida" | "ubicacion_imprecisa" | "fuera_del_campus" | "sin_candidatos" | "ya_en_destino".
  export async function calcularRutaDesdeUbicacion(
    posicion: unknown, destinoId: string, opciones?: OpcionesRuta,
  ): Promise<ResultadoRuta>;
  ```

- [ ] **Step 1:** Refactor sin cambiar comportamiento: separar de `calcularRutaSinValidar` una función privada `cargarGrafo(): Promise<{ nodos; conexiones; edificios } | null>` (null = error, ya logueado) y otra `armarRuta(grafo, origenId, destinoId, opciones): ResultadoRuta`. `calcularRutaSinValidar` = cargar + armar.
- [ ] **Step 2:** `npm test` y `npm run lint` → PASS (nada roto).
- [ ] **Step 3:** Implementar la acción: sesión (igual que `calcularRuta`) → `validarPosicion` (falla → `ubicacion_invalida`) → UUID del destino → `cargarGrafo` → `nodoMasCercano` → si `nodo.id === destinoId` → `ya_en_destino` → `armarRuta` y, si ok, adjuntar `origen`. Mensajes: ubicacion_invalida "No pudimos leer tu ubicación."; ubicacion_imprecisa "Tu ubicación es imprecisa (más de 50 m). Elige tu punto de partida de la lista."; fuera_del_campus "Parece que no estás en el campus. Elige tu punto de partida de la lista."; sin_candidatos "Todavía no hay puntos del mapa cerca de tu ubicación. Elige tu punto de partida de la lista."; ya_en_destino "Ya estás junto a tu destino." Ningún log incluye la posición.
- [ ] **Step 4:** `npm run lint` → PASS. Actualizar el comentario de cabecera del archivo con la nueva acción.

### Task 4: Ubicación en el mapa

**Files:**
- Modify: `app/components/mapa-leaflet-ruta.tsx`

**Interfaces:**
- Consumes: `Lectura` de Task 1.
- Produces: prop opcional `ubicacion?: Lectura | null` en `MapaLeafletRuta`.

- [ ] **Step 1:** Capa propia (`L.layerGroup`, creada en el efecto de inicialización) que no se borra con la ruta. Efecto sobre `ubicacion`: dibuja `L.circle` (radio = `precision`, azul translúcido, sin interacción) y `L.circleMarker` (radio 8, relleno `#2563eb`, borde blanco 3) con tooltip "Tú estás aquí". Se muestra en cualquier piso. `null` → capa vacía.
- [ ] **Step 2:** Control Leaflet "centrar en mí" (botón `bottomright`, mismo estilo que el selector de piso), solo cuando hay `ubicacion`; `mapa.setView([lat,lng], max(zoom actual, 19))`. No re-encuadrar automáticamente en cada lectura.
- [ ] **Step 3:** `npm run lint` → PASS.

### Task 5: "Mi ubicación" en la vista del alumno + documentación

**Files:**
- Modify: `app/usuario/dashboard/navegador.tsx`
- Modify: `docs/PROJECT_STATUS.md`, `CLAUDE.md`

**Interfaces:**
- Consumes: `useUbicacion`, `mensajeUbicacion` (Task 1); `calcularRutaDesdeUbicacion`, `ResultadoRuta.origen` (Task 3); prop `ubicacion` (Task 4).

- [ ] **Step 1:** `const ubicacion = useUbicacion()`; pasar `ubicacion.estado === "ok" ? ubicacion.lectura : null` al mapa.
- [ ] **Step 2:** Constante `ORIGEN_GPS = "gps"`. En el `<select>`, primer `<option value="gps">Mi ubicación</option>`, `disabled` si el estado no es `ok`. Debajo del select: si ok, "Precisión ±N m"; si no, `mensajeUbicacion(...)`.
- [ ] **Step 3:** Origen por defecto: GPS cuando hay lectura `ok` y el alumno no ha tocado el selector; si el GPS deja de estar `ok` mientras está elegido, mostrar la primera entrada sin borrar el destino. Derivar el origen efectivo en el render (sin efectos que copien estado).
- [ ] **Step 4:** Al pedir la ruta con GPS: `calcularRutaDesdeUbicacion({lat, lng, precision}, destino.id, opciones)` con la última lectura; si no, `calcularRuta` como hoy. `mismoPunto` no aplica al GPS. El resumen usa `ruta.origen` cuando existe: "Desde {nombre} (a {round(distancia)} m de ti)". Los errores se muestran con el `mensaje` del resultado, como los demás.
- [ ] **Step 5:** `npm test`, `npm run lint` y `npm run build` → PASS.
- [ ] **Step 6:** Documentación: en `PROJECT_STATUS.md` marcar "Usar la ubicación GPS como origen" y "Mostrar la ubicación del usuario mediante Geolocation API con consentimiento", y en "Definir límites de precisión" anotar 50 m / 150 m (ajustables en `lib/rutas/cercano.ts`). En `CLAUDE.md`, sección de decisiones: el GPS elige el nodo más cercano del piso 1 en el servidor, nunca se guarda la ubicación.
- [ ] **Step 7: Verificación en campo (Carlos):** desplegar en Vercel, abrir en el celular, aceptar el permiso, comprobar el punto azul y que "Desde … (a N m de ti)" sea el punto correcto en 3–4 lugares del campus; negar el permiso y comprobar que la lista funciona igual.

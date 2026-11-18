# GPS fase 2: seguimiento en vivo — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Con una ruta abierta, el alumno toca "Empezar a caminar" y la app lo sigue: indicación actual con metros y giro, aviso y recálculo si se desvía, ventana de "¿ya subiste?" en escaleras y elevadores, y aviso de llegada.

**Architecture:** Dos módulos puros en `lib/rutas/` con pruebas `node --test`: `seguimiento.ts` (geometría: tramos por piso, línea con metros, giros, proyección del avance) y `navegacion.ts` (máquina de estados: acciones → nuevo estado + efectos como sonidos o "recalcular"). En `app/`, un hook de avisos (Web Audio, vibración, pantalla encendida), un componente de modo navegación que conecta la máquina con la ubicación y con `calcularRutaDesdeUbicacion`, y dos props nuevas en el mapa (seguir al usuario y piso forzado). Nada nuevo en el servidor ni en la base.

**Tech Stack:** TypeScript, React 19, Leaflet, Web Audio API, Vibration API, Screen Wake Lock API, `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-17-gps-seguimiento-en-vivo-design.md`

## Global Constraints

- Constantes (en `lib/rutas/seguimiento.ts` o `navegacion.ts`, exportadas para las pruebas): `PISO_GPS = 1` (reusar el de `cercano.ts`), `ANGULO_GIRO_GRADOS = 35`, `DISTANCIA_RUMBO_M = 5`, `FUSION_GIROS_M = 8`, `VENTANA_ATRAS_M = 10`, `VENTANA_ADELANTE_M = 60`, `DESVIO_MIN_M = 20` (fuera de ruta si distancia > `max(20, 2 × precisión)`), `LECTURAS_DESVIO = 3`, `PAUSA_RECALCULO_MS = 15000`, `PREAVISO_GIRO_M = 15`, `GIRO_AHORA_M = 5`, `PREGUNTA_PISO_M = 8`, `LLEGADA_M = 10`, `SIGUE_RECTO_M = 50`, precisión máxima útil `PRECISION_MAXIMA_M = 50` (de `lib/ubicacion.ts`).
- Solo los tramos de piso 1 con ≥ 2 puntos con coordenadas se siguen por GPS; los demás se avanzan con "Siguiente". En tramos manuales no se recalcula.
- La ubicación solo sale del celular al recalcular (`calcularRutaDesdeUbicacion`), nunca en cada lectura.
- Avisos solo con sonido y vibración (sin voz). El audio se desbloquea con el toque en "Empezar a caminar".
- `lib/` no importa React, Leaflet ni nada de `app/` (las pruebas corren con `node --test`).
- Sin `setState` síncrono dentro de efectos (regla `react-hooks/set-state-in-effect`): el estado derivado de lecturas nuevas se ajusta durante el render (patrón de `trazar-form.tsx`) y los efectos solo ejecutan efectos secundarios.
- Solo vista del alumno (`app/usuario/dashboard`). Sin migraciones.
- Commits: Carlos al final.

## Review Focus

1. **La ruta pasa dos veces cerca del mismo lugar** (ida y vuelta por un pasillo, o una "U"): el avance no debe brincar al tramo de regreso. → Tarea 1, prueba de ventana.
2. **El GPS brinca hacia atrás unos metros:** el avance nunca disminuye y no se repite un aviso de giro ya dado. → Tareas 1 y 2.
3. **Precisión peor que 50 m:** no cuenta lecturas de desvío ni recalcula; la indicación avisa "GPS impreciso". → Tarea 2.
4. **Nodos sin coordenadas, nodos repetidos (tramo de largo 0) o tramo de piso 1 con un solo punto:** sin `NaN`, sin giros falsos; el tramo se vuelve manual si queda con < 2 puntos. → Tarea 1.
5. **Recálculo que falla o tarda** (sin red, `fuera_del_campus`, `ya_en_destino`): se conserva la ruta anterior con un mensaje, no hay bucle de recálculos, y `ya_en_destino` cuenta como llegada. → Tareas 2 y 4.

---

### Task 1: Geometría de la ruta (`lib/rutas/seguimiento.ts`)

**Files:**
- Create: `lib/rutas/seguimiento.ts`, `lib/rutas/seguimiento.test.ts`

**Interfaces:**
- Consumes: `distanciaMetros` (`lib/geo.ts`), `tieneUbicacion` (`lib/rutas/instrucciones.ts`), `PISO_GPS` (`lib/rutas/cercano.ts`).
- Produces:
  ```ts
  // Tipo estructural (no importar de actions.ts, que es "use server").
  export type PasoSeguible = {
    id: string; nombre: string; tipo: string; piso: number; edificioId: string | null;
    lat: number | null; lng: number | null;
    cambioPiso: { desde: number; hasta: number; sentido: "sube" | "baja";
                  via: { nombre: string; tipo: "escalera" | "elevador" } | null } | null;
  };
  export type PuntoLinea = { lat: number; lng: number; metros: number; paso: number }; // paso = índice en la ruta completa
  export type Tramo = {
    piso: number;
    desde: number; hasta: number;       // índices de pasos (inclusive) en la ruta completa
    linea: PuntoLinea[] | null;         // null = tramo manual
    largo: number;                      // metros de la línea (0 si manual)
  };
  export type TipoManiobra = "izquierda" | "derecha" | "escalera" | "elevador" | "llegada";
  export type Maniobra = {
    id: string;                         // estable: `${tramo}:${metros redondeados}:${tipo}`
    tipo: TipoManiobra;
    metros: number;                     // posición en la línea del tramo
    hacia: string | null;               // nombre legible del siguiente lugar
    piso: { hasta: number; sentido: "sube" | "baja"; via: string | null } | null; // solo escalera/elevador
  };
  export function armarTramos(pasos: PasoSeguible[]): Tramo[];
  export function maniobrasDeTramo(pasos: PasoSeguible[], tramos: Tramo[], indiceTramo: number): Maniobra[];
  export function proyectarAvance(linea: PuntoLinea[], posicion: { lat: number; lng: number }, avanceAnterior: number): { metros: number; distancia: number };
  export function nombreLegible(paso: PasoSeguible): string;
  ```

- [ ] **Step 1: pruebas** (`describe` por función; helpers como en `ajuste.test.ts`: `M = 1/111320`, rutas sintéticas en metros alrededor de `LAT = 22.324`)
  - `armarTramos`: ruta piso 1 → 1 → 2 → 2 → 1 da 3 tramos con `desde/hasta` correctos; el tramo de piso 2 tiene `linea: null`; un tramo de piso 1 con un solo nodo con coordenadas tiene `linea: null`; nodos sin coordenadas no entran en la línea; dos nodos en el mismo punto no producen `NaN` y `largo` es la suma de distancias.
  - `maniobrasDeTramo`: "L" de 30 m al este y luego 30 m al norte → una maniobra `izquierda` a ~30 m; al sur → `derecha`; curva suave (10° por nodo cada 3 m) → ninguna; dos esquinas de 40° a 4 m una de otra → una sola maniobra; la última maniobra del último tramo es `llegada` en `largo` con `hacia` = nombre del destino; si sigue un tramo de piso 2 cuyo primer paso tiene `cambioPiso.via.tipo = "elevador"`, la última es `elevador` con `piso.hasta = 2`; sin `via` → `escalera`.
  - `proyectarAvance`: en un recto de 100 m, posición a 3 m al lado en el metro 40 con avance anterior 35 → `metros ≈ 40`, `distancia ≈ 3`; posición unos metros "atrás" (metro 33, anterior 40) → `metros = 40`; ruta de ida y vuelta (50 m al este y regreso por la misma línea), avance anterior 10 y posición en el metro 10 → `metros ≈ 10` (no ≈ 90); posición a 30 m de la línea → `distancia ≈ 30`.
  - `nombreLegible`: pasillo "Pasillo edificio 3 12" → "Pasillo edificio 3"; un salón conserva su nombre.
- [ ] **Step 2:** `node --test lib/rutas/seguimiento.test.ts` → FAIL (no existe el módulo).
- [ ] **Step 3: implementar.**
  - Tramos: cortar donde cambia `piso`; el paso con `cambioPiso` es el primero del tramo nuevo. GPS si `piso === PISO_GPS` y ≥ 2 puntos con coordenadas.
  - Giros: en cada vértice interior de la línea, rumbo de entrada = del punto a `DISTANCIA_RUMBO_M` atrás (interpolado sobre la línea) al vértice; rumbo de salida = del vértice al punto a `DISTANCIA_RUMBO_M` adelante. Delta normalizado a (−180, 180]; `|delta| ≥ ANGULO_GIRO_GRADOS` es giro, positivo (horario) = `derecha`. Giros a menos de `FUSION_GIROS_M` se fusionan en el de mayor `|delta|`. Se ignoran giros a menos de `GIRO_AHORA_M` del final del tramo. `hacia` = `nombreLegible` del primer paso después del vértice. Rumbo en plano local equirectangular (igual que `ajuste.ts`).
  - Fin de tramo: `escalera`/`elevador` si hay tramo siguiente (datos del `cambioPiso` de su primer paso), si no `llegada`.
  - Proyección: solo segmentos que tocan `[avanceAnterior − VENTANA_ATRAS_M, avanceAnterior + VENTANA_ADELANTE_M]`; `metros = max(avanceAnterior, proyección)`.
  - `nombreLegible`: si `tipo === "pasillo"`, quitar el número final (`/\s+\d+$/`).
- [ ] **Step 4:** `npm test` → PASS (incluye las 104 pruebas existentes).

### Task 2: Máquina de navegación (`lib/rutas/navegacion.ts`)

**Files:**
- Create: `lib/rutas/navegacion.ts`, `lib/rutas/navegacion.test.ts`

**Interfaces:**
- Consumes: todo lo de Task 1; `agruparPasos` (`instrucciones.ts`) para los tramos manuales.
- Produces:
  ```ts
  export type FaseNavegacion = "caminando" | "preguntando_piso" | "esperando_piso" | "llegada";
  export type EstadoNavegacion = {
    pasos: PasoSeguible[]; tramos: Tramo[];
    tramo: number; metros: number;      // avance en la línea del tramo actual (GPS)
    manual: number;                     // instrucción actual dentro de un tramo manual
    lecturasFuera: number; ultimoRecalculo: number | null;
    avisados: string[];                 // ids de maniobras ya avisadas
    fase: FaseNavegacion; gpsImpreciso: boolean;
  };
  export type AccionNavegacion =
    | { tipo: "lectura"; lat: number; lng: number; precision: number; ahora: number }
    | { tipo: "siguiente" }             // tramos manuales; en la última instrucción = "Ya llegué"
    | { tipo: "confirmar_piso" }
    | { tipo: "todavia_no" }
    | { tipo: "ruta_nueva"; pasos: PasoSeguible[]; ahora: number }
    | { tipo: "llegar" };               // p. ej. el recálculo devolvió `ya_en_destino`
  export type ClaseAviso = "giro" | "desvio" | "piso" | "llegada";
  export type Efecto = { tipo: "aviso"; clase: ClaseAviso } | { tipo: "recalcular" };
  export type Indicacion = {
    maniobra: "recto" | TipoManiobra;
    metros: number | null;              // null en tramos manuales
    ahora: boolean;
    hacia: string | null;
    piso: Maniobra["piso"];
  };
  export function iniciarNavegacion(pasos: PasoSeguible[], ultimoRecalculo?: number | null): EstadoNavegacion;
  export function avanzar(estado: EstadoNavegacion, accion: AccionNavegacion): { estado: EstadoNavegacion; efectos: Efecto[] };
  export function indicacionActual(estado: EstadoNavegacion): Indicacion;
  export function textoIndicacion(i: Indicacion): { titulo: string; detalle: string | null };
  export function preguntaPiso(estado: EstadoNavegacion): string | null;
  export function metrosRestantes(estado: EstadoNavegacion): number | null; // null si queda algún tramo manual
  export function pisoActual(estado: EstadoNavegacion): number;
  export function esManual(estado: EstadoNavegacion): boolean;
  ```

- [ ] **Step 1: pruebas** (rutas sintéticas; "caminar" = una lectura cada 3 m sobre la línea con `precision: 5` y `ahora` creciente)
  - Caminar una "L" completa en piso 1: exactamente un efecto `aviso giro` (al cruzar `PREAVISO_GIRO_M` antes de la esquina), luego `aviso llegada` y `fase: "llegada"` a ≤ `LLEGADA_M` del final; sin efectos repetidos aunque lleguen lecturas de más.
  - `indicacionActual`: a 25 m de la esquina → `{ maniobra: "izquierda", metros: 25, ahora: false }`; a 3 m → `ahora: true`; con la siguiente maniobra a más de `SIGUE_RECTO_M` → `maniobra: "recto"`.
  - Desvío: 2 lecturas a 30 m de la línea → sin efectos; la 3.ª → `aviso desvio` + `recalcular` y `lecturasFuera` vuelve a 0; otras 3 lecturas fuera antes de `PAUSA_RECALCULO_MS` → sin `recalcular`; después de la pausa → sí. A 30 m con `precision: 20` (límite 40 m) → no cuenta.
  - Precisión 60: `gpsImpreciso: true`, no cuenta desvío, no mueve el avance.
  - Escalera: ruta piso 1 → piso 2 por escalera; al llegar a ≤ `PREGUNTA_PISO_M` del fin del tramo → `fase: "preguntando_piso"` + `aviso piso`; `preguntaPiso` = "¿Ya subiste al piso 2?" (elevador: "¿Ya llegaste al piso 2?"; bajando por escalera: "¿Ya bajaste al piso 1?"); lecturas en esa fase no cambian nada; `todavia_no` → `"esperando_piso"`; `confirmar_piso` → `tramo` siguiente, `fase: "caminando"`, `pisoActual = 2`, `esManual = true`.
  - Tramo manual: `siguiente` avanza `manual`; en la última instrucción del tramo hacia otro tramo → `preguntando_piso`; en la última de la ruta → `llegada` + `aviso llegada`. Lecturas en tramo manual no generan desvío ni avance.
  - Vuelta al piso 1: tras `confirmar_piso` hacia un tramo GPS, `metros = 0` y las lecturas se proyectan sobre esa línea.
  - `ruta_nueva`: reinicia avance, `avisados` y `lecturasFuera`, conserva `ultimoRecalculo = ahora`.
  - `llegar` → `fase: "llegada"` + `aviso llegada`.
  - `textoIndicacion` (copia fija):
    - izquierda, 25 m → `{ titulo: "En 25 m gira a la izquierda", detalle: "hacia Pasillo edificio 3" }`; `ahora` → `"Gira a la izquierda ahora"`.
    - recto 60 m → `"Sigue recto 60 m"`.
    - escalera 10 m → `"En 10 m toma la escalera"`, detalle `"Sube al piso 2"`; elevador → `"toma el elevador"`; `ahora` → `"Toma la escalera ahora"`.
    - llegada 20 m → `"En 20 m llegas a Salón 204"`; `ahora` → `"Llegaste a Salón 204"`.
    - manual (`metros: null`): `"Sigue hasta {hacia}"`, escalera `"Toma la escalera {via} y sube al piso N"`, llegada `"Llega a {hacia}"`.
    - Metros mostrados: redondeo a múltiplos de 5, mínimo 5.
- [ ] **Step 2:** `node --test lib/rutas/navegacion.test.ts` → FAIL.
- [ ] **Step 3: implementar** con las constantes de Global Constraints. Las instrucciones de un tramo manual son `agruparPasos(pasos.slice(desde, hasta + 1))`. Un aviso de giro se marca en `avisados` por su `id` para no repetirse.
- [ ] **Step 4:** `npm test` → PASS.

### Task 3: Avisos y pantalla encendida (`app/components/use-avisos.ts`)

**Files:**
- Create: `app/components/use-avisos.ts`

**Interfaces:**
- Consumes: `ClaseAviso` (Task 2).
- Produces:
  ```ts
  export function useAvisos(): {
    desbloquear: () => void;            // llamar dentro del toque de "Empezar a caminar"
    avisar: (clase: ClaseAviso) => void;
    silencio: boolean; setSilencio: (valor: boolean) => void;
  };
  export function usePantallaEncendida(activo: boolean): void;
  ```

- [ ] **Step 1: implementar.** Un solo `AudioContext` creado/reanudado en `desbloquear`; tonos con `OscillatorNode` (sin archivos): giro 1 × 880 Hz 150 ms; desvío 2 × 440 Hz; piso 660 → 880 Hz; llegada 523 → 659 → 784 Hz. Vibración con `navigator.vibrate?.()`: giro `[150]`, desvío `[200, 100, 200]`, piso `[150, 80, 150]`, llegada `[100, 50, 100, 50, 300]`. `silencio` apaga sonido y vibración. `usePantallaEncendida`: pide `navigator.wakeLock.request("screen")` mientras `activo`, lo vuelve a pedir en `visibilitychange` al regresar y lo suelta al desactivar; si la API no existe o falla, no hace nada ni avisa.
- [ ] **Step 2:** `npx tsc --noEmit` y `npx eslint app/components/use-avisos.ts` → sin errores.

### Task 4: Modo navegación y mapa

**Files:**
- Create: `app/usuario/dashboard/modo-navegacion.tsx`
- Modify: `app/components/mapa-leaflet-ruta.tsx`, `app/usuario/dashboard/navegador.tsx`

**Interfaces:**
- Consumes: Task 2 (`iniciarNavegacion`, `avanzar`, `indicacionActual`, `textoIndicacion`, `preguntaPiso`, `metrosRestantes`, `pisoActual`, `esManual`), Task 3, `useUbicacion`, `calcularRutaDesdeUbicacion`, `PasoRutaDetallado`, `ResultadoRuta`.
- Produces:
  ```ts
  // mapa-leaflet-ruta.tsx, props nuevas:
  seguir?: boolean;            // centra en `ubicacion` con cada lectura (zoom ≥ 19) hasta que el usuario arrastre; "centrar en mí" lo reactiva
  pisoForzado?: number | null; // si no es null, es el piso activo (ignora el selector)
  // modo-navegacion.tsx:
  export function ModoNavegacion(props: {
    pasos: PasoRutaDetallado[]; destinoId: string; evitarEscaleras: boolean;
    onRutaNueva: (pasos: PasoRutaDetallado[]) => void; // el navegador actualiza el mapa
    onPiso: (piso: number) => void;                     // piso que debe mostrar el mapa
    onSalir: () => void;                                // vuelve a la ruta mostrada
    onLlegada: () => void;                              // termina y muestra el destino
  }): JSX.Element;
  ```

- [ ] **Step 1: mapa.** Agregar `seguir` (un `dragstart` del mapa lo pausa; el botón "centrar en mí" lo reanuda) y `pisoForzado` (gana sobre `elegido`; oculta el selector de piso mientras no sea null).
- [ ] **Step 2: `ModoNavegacion`.**
  - Estado `EstadoNavegacion` creado con `iniciarNavegacion(pasos)`. Cada lectura nueva de `useUbicacion` se pasa a `avanzar` durante el render (comparando con la lectura anterior guardada en estado); los efectos devueltos se encolan en el estado con un id creciente y un `useEffect` ejecuta los que no ha ejecutado (id guardado en una ref): `aviso` → `avisar(clase)`; `recalcular` → `calcularRutaDesdeUbicacion({ lat, lng, precision }, destinoId, { evitarEscaleras })`.
  - Resultado del recálculo: `ok` → acción `ruta_nueva` + `onRutaNueva(pasos)`; `motivo === "ya_en_destino"` → acción `llegar`; otro error o excepción → conserva la ruta y muestra "No pudimos recalcular: {mensaje}" en el banner hasta la siguiente lectura en ruta.
  - Llamar `onPiso(pisoActual(estado))` cuando cambie el piso, y `onLlegada()` al pasar a `fase: "llegada"`.
  - UI (estilo de las tarjetas existentes; diseño fino a criterio):
    - Banner arriba (sustituye la barra de búsqueda): ícono de maniobra (izquierda/derecha/recto/escalera/elevador/llegada; SVG en línea), `titulo` y `detalle` de `textoIndicacion`; si `gpsImpreciso`, línea "GPS impreciso, sigue con cuidado"; en `esperando_piso`, botón "Ya subí" / "Ya llegué al piso N" que despacha `confirmar_piso`.
    - Barra inferior (sustituye el panel deslizable): "Faltan N m" (o "Piso N" si `metrosRestantes` es null), botón de silencio (`aria-pressed`), "Siguiente" (o "Ya llegué" en la última instrucción) solo si `esManual`, y "Salir" → `onSalir`.
    - Ventana modal (`role="dialog"`, `aria-modal`) en `preguntando_piso` con el texto de `preguntaPiso`, "Sí" → `confirmar_piso`, "Todavía no" → `todavia_no`.
  - `usePantallaEncendida(true)` mientras está montado.
- [ ] **Step 3: `navegador.tsx`.**
  - Estado `navegando: boolean` y `pisoNavegacion: number | null`.
  - Con `ruta.ok`, en la lista de pasos y en la cabecera, botón principal "Empezar a caminar": desactivado si no hay `gpsUtil`, con el texto de motivo debajo (`mensajeUbicacion` o "Tu ubicación es imprecisa"). Al tocarlo: `desbloquear()` y `setNavegando(true)`.
  - Navegando: renderizar `ModoNavegacion` en lugar de la barra de búsqueda y el panel; el mapa recibe `seguir`, `pisoForzado={pisoNavegacion}` y márgenes del banner y la barra. `onRutaNueva` actualiza `ruta` (mismo `ResultadoRuta` con los pasos nuevos) para que el mapa y `ajustarARuta` usen la ruta nueva. `onSalir` → `navegando = false`, `pisoNavegacion = null`, ruta intacta. `onLlegada` → igual que salir, panel en `"medio"` mostrando el destino (foto y descripción como hoy).
  - Los handlers que hoy invalidan la ruta (`volverABuscar`, `editarRuta`, `cambiarOrigen`, `cambiarEscaleras`) también ponen `navegando = false`.
- [ ] **Step 4:** `npx tsc --noEmit`, `npx eslint app/components app/usuario` y `npm test` → sin errores.
- [ ] **Step 5:** `npm run build` → compila.

### Task 5: Documentación y prueba en campo

**Files:**
- Modify: `docs/PROJECT_STATUS.md`

- [ ] **Step 1:** marcar "Fase 2 del GPS" y "Pedir confirmación manual al completar una transición de piso" como hechos (con referencia al spec y a `lib/rutas/navegacion.ts`), y agregar pendientes: voz, visitante, ajustar umbrales en campo.
- [ ] **Step 2:** lista de prueba en campo para Carlos (al final del spec o del status): ruta corta recta; ruta con 1–2 esquinas (aviso a ~15 m, sentido correcto); desviarse a propósito (aviso + recálculo, sin bucle); escalera y elevador (ventana, "Todavía no", luego confirmar); tramo en piso 2 con "Siguiente"; llegada; GPS impreciso (bajo techo); "Salir" y volver a "Empezar a caminar"; silencio; pantalla no se apaga.
- [ ] **Step 3:** comandos de commit para Carlos (spec, plan, código y docs).

# GPS como punto de partida (fase 1) — diseño

Fecha: 13 de noviembre de 2026. Tamaño: cambio chico (un componente nuevo, una acción
de servidor nueva y ajustes en la vista del alumno).

## Intención

Que el alumno pueda empezar una ruta desde donde está, sin elegir de una lista. Esta
fase sirve sobre todo para **comprobar en el campus si la ubicación se detecta bien**.
La navegación en vivo (seguir la ruta e ir dando indicaciones) es la fase 2.

## Metas

- Al abrir `/usuario/dashboard` se pide permiso de ubicación (el navegador muestra su
  aviso). Con permiso, el mapa muestra un punto azul con círculo de precisión.
- En las opciones de la ruta aparece **"Mi ubicación"** como punto de partida, arriba
  de las entradas. Se elige por defecto cuando hay una lectura útil.
- Debajo de "Mi ubicación" se ve la precisión de la lectura (*"precisión ±8 m"*). Al
  calcular la ruta, el resumen dice con qué nodo arrancó, para validar en campo:
  *"Desde Pasillo Edificio B (a 12 m de ti)"*. (El nodo lo elige el servidor, así que
  se conoce hasta calcular la ruta.)
- La ruta se calcula en el servidor desde el nodo más cercano.

## No metas (de esta fase)

- Seguir la ruta en vivo, recalcular al desviarse, indicaciones por voz o por avance.
- Detectar el piso (decisión ya tomada: el GPS no detecta pisos).
- GPS en la vista del visitante.

## Anti-metas

- **Nunca quitar la lista de puntos de partida.** Si el alumno no da permiso, no hay
  señal, la lectura es mala o está fuera del campus, la app funciona exactamente como hoy.
- No guardar la ubicación del alumno en la base ni en logs.

## Restricciones

- La Geolocation API solo funciona en HTTPS (Vercel y `localhost` sí; una IP de la red
  local por `http://` no).
- El GPS del celular falla 10–30 m o más dentro de edificios.
- Toda ruta pasa por `lib/rutas/actions.ts` (punto de entrada único, valida sesión).

## Enfoques considerados

1. **Nodo más cercano en el servidor (elegido).** Nueva acción
   `calcularRutaDesdeUbicacion(lat, lng, destinoId, opciones)`. El servidor ya carga el
   grafo completo; el celular no recibe coordenadas de todos los nodos y la lógica de
   rutas sigue en un solo lugar.
2. Nodo más cercano en el celular. Respuesta instantánea del "saliendo desde", pero
   expone el grafo completo al cliente y duplica lógica. Descartado.
3. Nodo virtual en la posición del usuario conectado a los nodos cercanos. Más preciso
   en espacios abiertos, pero agrega complejidad que esta fase no necesita. Descartado.

Carlos eligió el enfoque 1.

## Diseño

**Hook `usarUbicacion()`** (`app/components/use-ubicacion.ts`, cliente): envuelve
`navigator.geolocation.watchPosition` con `enableHighAccuracy: true`. Expone un estado:
`no_soportado | pidiendo | denegado | sin_senal | ok { lat, lng, precision, fecha }`.
Se detiene al desmontar.

**Función pura `nodoMasCercano(posicion, nodos, opciones)`** (`lib/rutas/cercano.ts`,
con pruebas en `node --test`): usa `distanciaMetros()` de `lib/geo.ts`. Solo considera
nodos con coordenadas, del **piso 1** y conectados a algo. Devuelve el nodo y la
distancia, o un motivo (`sin_candidatos`, `muy_lejos`).

**Acción `calcularRutaDesdeUbicacion`** (`lib/rutas/actions.ts`): valida sesión igual
que `calcularRuta`, valida que lat/lng/precisión sean números finitos y en rango (estar
fuera del campus se detecta con el umbral de 150 m al nodo más cercano, porque los
límites del plano viven en un módulo que importa Leaflet); elige el nodo más cercano y reutiliza
`calcularRutaSinValidar`. Devuelve además `origen: { id, nombre, distanciaMetros }`.
Nuevos motivos: `fuera_del_campus`, `ubicacion_imprecisa`, con mensaje para la UI.

**Umbrales (mi propuesta, ajustables en campo):** precisión > 50 m → "Tu ubicación es
imprecisa"; nodo más cercano a > 150 m → "Parece que no estás en el campus". En ambos
casos se sugiere elegir una entrada de la lista.

**Mapa (`mapa-leaflet-ruta.tsx`):** prop opcional `ubicacion`. Dibuja un
`L.circleMarker` azul y un `L.circle` con la precisión en una capa propia, encima de
la ruta. Se ve en cualquier piso (el GPS no sabe el piso). Botón "centrar en mí".

**Vista del alumno (`navegador.tsx`):** "Mi ubicación" en el selector de origen. Si
está elegida, "Ver ruta" llama a `calcularRutaDesdeUbicacion` con la última lectura;
si no, a `calcularRuta` como hoy. Si el permiso se niega o no hay lectura, la opción
aparece deshabilitada con el motivo y se usa la primera entrada.

## Decisiones que tomé yo (revisar)

- Pedir permiso al abrir el dashboard, como pidió Carlos (no hasta tocar un botón).
- Candidatos solo del piso 1, porque el GPS no da piso. Si los alumnos suelen arrancar
  desde pisos altos, se puede agregar un selector "estoy en el piso…" después.
- Umbrales de 50 m y 150 m; se calibran con pruebas en el campus.
- La ruta no se recalcula sola cuando cambia la ubicación (eso es la fase 2).

# GPS fase 2: seguimiento en vivo de la ruta — diseño

Fecha: 17 de noviembre de 2026. Tamaño: proyecto (varias piezas: cálculo del avance,
indicaciones con giros, desvío y recálculo, cambio de piso, avisos y pantalla).

## Intención

Hoy el alumno ve la ruta como lista de pasos y un punto azul pegado a la ruta, pero la
app no sabe en qué paso va. Carlos quiere que, al iniciar la ruta, la app siga la
ubicación del alumno mientras camina y le vaya diciendo qué hacer ("En 25 m gira a la
izquierda hacia el pasillo del Edificio 3", "En 10 m toma las escaleras"), que avise si
se equivoca de camino y recalcule, y que en escaleras y elevadores pregunte si ya subió.
Ya hay muchas conexiones dadas de alta en el grafo y quiere empezar a probarlo en campo.

Lo dijo así: iniciar la ruta y seguir la ubicación; indicaciones con metros y giro; si
se va por un camino equivocado, que suene algo y recalcule; al llegar a escaleras o
elevadores, una ventana que pregunte si ya subió (o llegó, en elevador). Para el aviso,
por ahora solo un sonido corto o vibración; la voz queda para después.

## Metas

- Con una ruta abierta, un modo de navegación que muestra la indicación actual y cuánto
  falta para el siguiente giro o cambio de piso, y la actualiza al caminar.
- Giro a izquierda o derecha calculado con la geometría de la ruta.
- Detectar que el alumno se salió de la ruta, avisarle con sonido y vibración, y pedir
  una ruta nueva desde donde está.
- Al llegar a una escalera o elevador de la ruta, preguntar si ya cambió de piso y
  seguir en el piso nuevo.
- Avisar con sonido y vibración (no con voz) en: giro próximo, desvío, cambio de piso y
  llegada.
- Poder probarlo en campo con el grafo real.

## No metas

- Voz que lea las indicaciones (después).
- Detectar el piso automáticamente o posicionamiento dentro de edificios (beacons, wifi).
- Seguimiento con la pantalla apagada o la app en segundo plano.
- Vista del visitante (por ahora solo el alumno; el visitante después).
- Girar el mapa según la brújula.
- Modo sin conexión.

## Anti-metas (fallaría aunque "funcione")

- Recalcular o sonar por el brinco normal del GPS (5 a 10 m): un falso "te desviaste" es
  peor que no avisar.
- Entrar en bucle de recálculos o llenar de sonidos cada segundo.
- Mandar la ubicación al servidor en cada lectura: la ubicación solo sale del celular
  cuando se pide una ruta nueva (igual que hoy).
- Dar un giro equivocado (izquierda por derecha) o un giro donde no lo hay.
- Dejar al alumno atorado si el GPS falla: siempre debe poder avanzar a mano y salir.

## Restricciones

- Stack actual: Next.js 16, React 19, TypeScript, Leaflet; `npm test` usa `node --test`
  sobre `lib/**/*.test.ts` (las funciones puras no importan React ni Leaflet).
- El GPS solo vale en piso 1 (como `PISO_GPS` y `ajustarARuta` hoy). En pisos 2 a 4 el
  avance es manual.
- La lectura ya llega suavizada (`use-ubicacion.ts`, `suavizar`) con su precisión;
  precisión mayor a 50 m no se usa para decidir nada (`lecturaUtil`).
- El GPS del celular en campo tiene error de unos pocos metros; el plano está a 2–5 m de
  su lugar real. Los umbrales se ajustan en campo.
- La ruta viene de `calcularRuta`/`calcularRutaDesdeUbicacion` como lista de pasos con
  nodos, coordenadas y `cambioPiso`; hay un nodo cada pocos metros de pasillo.
- Los sonidos en navegador solo se pueden reproducir después de un toque del usuario:
  el botón de iniciar la navegación sirve para eso.
- La vibración no existe en iPhone (Safari): ahí solo suena.

## Enfoques considerados

- **A. Medir el avance sobre la ruta, en el celular (elegido).** Cada lectura se proyecta
  sobre la línea de la ruta; de ahí salen metros recorridos, instrucción actual, metros al
  siguiente giro y distancia a la ruta. Solo se llama al servidor al recalcular.
- **B. Cambiar de instrucción al acercarse al siguiente nodo.** Más simple, pero con un
  nodo cada pocos metros y GPS con 5–10 m de error se salta nodos o se atrasa, y se
  confunde si la ruta pasa dos veces cerca del mismo lugar. Descartado.
- **C. Calcular el avance en el servidor con cada lectura.** Retraso y envía la
  ubicación cada segundo. Descartado (ya se descartó en el diseño de suavizado).

Carlos no eligió entre enfoques: pidió el resultado y dejó el cómo; el enfoque A es
decisión mía.

## Diseño

### Qué ve y hace el alumno

Con una ruta mostrada, un botón nuevo "Empezar a caminar" (necesita ubicación útil; si no
hay, queda desactivado con el motivo). Al tocarlo se entra en modo navegación:

- Banner superior con una flecha y la indicación actual, por ejemplo "En 25 m gira a la
  izquierda hacia el pasillo del Edificio 3"; cuando falta poco, "Gira ahora"; si no hay
  giro cerca, "Sigue recto 40 m".
- Barra inferior con los metros que faltan, un botón de silencio y "Salir".
- El mapa sigue al punto azul, con un botón para recentrar si el alumno mueve el mapa, y
  muestra el piso en el que va.
- El panel de la lista de pasos se baja al mínimo.
- La flecha es un ícono de maniobra (izquierda, derecha, recto, escalera, elevador,
  llegada), no una brújula.
- Al llegar (a ~10 m del destino si es de piso 1 y su tramo se sigue por GPS; con el
  último "Siguiente", que dice "Ya llegué", si es de otro piso): aviso de llegada (sonido distinto), el modo termina y
  se muestra el destino con su foto y descripción como hoy.
- "Salir" vuelve a la ruta mostrada (lista de pasos) sin perderla.

### Cálculo del avance (pura, `lib/rutas/seguimiento.ts`, con pruebas)

- La ruta se convierte en una línea de puntos con metros acumulados. El avance de una
  lectura es el punto de la línea más cercano a ella, buscado solo cerca del avance
  anterior (un poco hacia atrás y una ventana hacia adelante), para no saltar a otra parte
  de la ruta que pasa por el mismo lugar.
- Con el avance se obtiene: instrucción actual, metros recorridos y restantes, metros al
  siguiente evento (giro, escalera/elevador o llegada) y distancia perpendicular a la
  ruta.
- Los giros se calculan con el cambio de rumbo en la línea (no con las instrucciones
  agrupadas, porque un tramo agrupado de pasillo puede tener curvas): un cambio de unos
  35° o más, medido sobre una distancia corta para no reaccionar al ruido de nodos muy
  cercanos, es un giro; izquierda o derecha según el signo. Los nombres de las
  indicaciones salen del siguiente nodo con nombre de la ruta.

### Tramos por piso (call mío)

- La ruta se parte en tramos consecutivos del mismo piso. Solo los tramos de piso 1 se
  siguen por GPS, cada uno con su propia línea: así una caminata en piso 2 nunca se
  proyecta sobre la geometría del piso 1, aunque se encimen en el plano.
- Los nodos sin coordenadas (migración 0007) se saltan al armar la línea, igual que en
  `puntosDeRuta`. Si un tramo de piso 1 queda con menos de 2 puntos con coordenadas, ese
  tramo se avanza a mano como los de otros pisos.
- Al confirmar la vuelta al piso 1, el avance arranca en el inicio de ese tramo (el nodo
  de escalera o elevador confirmado) y desde ahí sigue al GPS.

### Desvío y recálculo

- Fuera de ruta = a más de max(20 m, 2 × precisión) de la línea durante unas 3 lecturas
  seguidas. Con precisión peor que 50 m no se juzga (se avisa "GPS impreciso").
- Al detectarlo: sonido y vibración, y se pide una ruta nueva con
  `calcularRutaDesdeUbicacion` (mismo destino y misma opción de evitar escaleras). Si el
  recálculo falla o no hay ruta, se conserva la ruta anterior y se muestra el motivo.
- Cómo funciona hoy `calcularRutaDesdeUbicacion`: parte del nodo conectado de piso 1 más
  cercano a la posición (máximo 150 m, `lib/rutas/cercano.ts`); la ruta nueva empieza en
  ese nodo, no a media conexión, y trae a cuántos metros de ti está. Puede fallar con
  `ubicacion_imprecisa`, `fuera_del_campus`, `sin_candidatos` o `ya_en_destino`
  (`ya_en_destino` se trata como llegada).
- Pausa de unos 15 s entre recálculos para que no haya bucle. Después de recalcular, el
  avance empieza en el inicio de la ruta nueva; el desvío vuelve a contarse desde cero.
- Solo aplica mientras el tramo actual es de piso 1; en otros pisos no se recalcula
  (call mío).

### Cambio de piso

- Al llegar (unos 8 m) al nodo donde la ruta cambia de piso, se pausa el seguimiento y
  sale una ventana: "¿Ya subiste al piso 2?" (escalera) o "¿Ya llegaste al piso 2?"
  (elevador), con "Sí" y "Todavía no". "Todavía no" cierra la ventana pero deja un
  botón visible en el banner para confirmar después. Sonido y vibración al abrirla.
- Al confirmar, el mapa cambia al plano del piso nuevo. En pisos distintos del 1 el
  avance es manual: la indicación actual se avanza con un botón "Siguiente". Si la ruta
  vuelve al piso 1 (por ejemplo, para salir), el seguimiento por GPS se reanuda al
  confirmar ese cambio de piso.

### Avisos y pantalla

- Un sonido corto (Web Audio, sin archivos) y vibración donde exista. Eventos: giro
  próximo (una vez por giro, a unos 15 m), desvío, cambio de piso, llegada; el de llegada
  suena distinto. Se desbloquea con el toque en "Empezar a caminar". Botón de silencio.
- Pantalla encendida durante la navegación (Wake Lock API); si no está disponible, sigue
  sin ella y no avisa.

### Piezas

- `lib/rutas/seguimiento.ts` (+ pruebas): línea de la ruta, avance, giros, indicación
  actual, estado de desvío.
- Un hook en el navegador para sonido, vibración y pantalla encendida.
- Banner de indicación, barra inferior y ventana de cambio de piso (componentes nuevos),
  conectados en `app/usuario/dashboard/navegador.tsx` y el mapa (`mapa-leaflet-ruta.tsx`)
  para seguir al usuario y cambiar de piso.
- Sin migraciones ni cambios de base de datos.

## Lo que decidió Carlos

- Modo que sigue la ubicación una vez iniciada la ruta.
- Indicaciones con metros y giro ("En tantos metros gira a la izquierda a tal pasillo",
  "En tantos metros toma las escaleras").
- Desvío: que suene algo y recalcule.
- Escaleras y elevadores: ventana que pregunta si ya subió.
- Aviso por ahora solo sonido o vibración; voz para después.

## Calls míos (revisar)

- Enfoque A y todos los umbrales (35° de giro, 20 m o 2× precisión de desvío, 3 lecturas,
  15 s entre recálculos, 15 m de preaviso de giro, 8 m para el cambio de piso, 10 m de
  llegada); se ajustan en campo.
- Avance manual con "Siguiente" en pisos 2 a 4; ahí no se recalcula y la llegada se
  confirma a mano.
- Ruta partida en tramos por piso; nodos sin coordenadas se saltan.
- La flecha es un ícono de maniobra.
- Pantalla encendida, botón de silencio, botón para recentrar el mapa.
- Solo alumno; el botón se llama "Empezar a caminar" y va después de mostrar la ruta.

## Lo que queda al constructor

- Nombres y firmas de las funciones, forma exacta de la línea de la ruta y de la ventana
  de búsqueda del avance.
- Diseño visual del banner y las ventanas, textos exactos, la flecha.
- Cómo mezclar el seguimiento con el estado de `navegador.tsx` (ya es largo;
  conviene separar el modo navegación en su propio componente).
- Cómo calcular el rumbo de forma robusta cuando hay nodos muy juntos o duplicados.
- Pruebas: funciones puras con `npm test`; la lista de pruebas en campo.

## Prueba en campo (después de construir)

- [ ] Ruta corta recta: "Sigue recto", luego "En N m llegas a…" y aviso de llegada.
- [ ] Ruta con una o dos esquinas: aviso a ~15 m, lado correcto (izquierda/derecha), "Gira ahora".
- [ ] Desviarse a propósito: aviso y recálculo; quedarse fuera no repite el recálculo antes de 15 s.
- [ ] Escalera: ventana "¿Ya subiste?", "Todavía no" deja el botón arriba, luego confirmar.
- [ ] Elevador: ventana "¿Ya llegaste al piso N?".
- [ ] Tramo en piso 2 a 4: avanzar con "Siguiente" y terminar con "Ya llegué".
- [ ] GPS impreciso (bajo techo): aviso "GPS impreciso", sin recálculos falsos.
- [ ] "Salir" y volver a "Empezar a caminar"; botón de silencio; la pantalla no se apaga.
- [ ] Arrastrar el mapa deja de seguirte; "centrar en mí" lo reanuda.

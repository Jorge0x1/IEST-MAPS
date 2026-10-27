# Registro de la planta baja — orden de trabajo

Checklist para capturar en el admin (`/admin/edificios`, `/admin/destinos`,
`/admin/destinos/trazar`, `/admin/conexiones`) lo que se ve en el plano de la
planta baja. Se marca con `[x]` a medida que se avanza. Al final de cada edificio se
verifica en `/admin/grafo` antes de pasar al siguiente.

Cuántos son: ~31 salones, ~12 oficinas/servicios, 5 locales de comida, 2 edificios
sueltos (Capilla y Biblioteca) y 3 baños; unos 55 destinos en total.

## 0. Antes de empezar (una sola vez)

- [ ] **Convención de pisos.** Este plano es la planta baja → `piso 1`. (La entrada
      principal debe estar en piso 1.) Un salón de planta baja es piso 1 aunque su número
      empiece con otro dígito: el primer dígito es el **edificio**, no el piso.
- [ ] **Datos de prueba.** Revisar `/admin/destinos` y editar o borrar los nodos de
      prueba (p. ej. "Salon 604" en piso 1, "Cancha multiusos") para no duplicar.
- [ ] **Nombres.** Salones: `Salón 604` (con acento, alias `604`, `aula 604`).
      Oficinas con su nombre real. Si un nombre se repite entre edificios (hay dos
      "Ciencias Exactas"), agregar el edificio: `Ciencias Exactas (Edificio 100)`.
- [ ] **Qué es buscable.** Sí: salones, oficinas, servicios, comida, capilla,
      biblioteca, baños. No: pasillos, andadores ni puntos auxiliares.
- [ ] Bajar `PLANTA_BAJA.opacidad` a 0.8 solo si hace falta ver las calles; si no, dejar 1.

## 1. Edificios (`/admin/edificios`)

- [ ] Edificio 100
- [ ] Edificio 200
- [ ] Edificio 300
- [ ] Edificio 400
- [ ] Edificio 500
- [ ] Edificio 600
- [ ] Andadores (exterior) — para los pasillos y caminos que no son de un edificio
- [ ] Biblioteca
- [ ] Capilla
- [ ] Zona de comida (La Café, Sorbitos, Snacks, Subway)
- [ ] Servicios (Caja, Servicios Escolares, Promoción)

## 2. Esqueleto exterior (andadores)

Primero el "esqueleto": los caminos abiertos que unen todo. Edificio `Andadores`,
tipo `Pasillo`, no buscable. Cada tramo en una sola pasada del trazador, con un punto
en cada esquina, en cada cruce y cada ~8–10 m en tramos largos. **Cada cruce
necesita su propio nodo**, porque ahí se conectan los demás tramos.

- [ ] Entrada(s) del campus (tipo `Entrada`; ya existe "Entrada Principal"). Confirmar
      cuántas entradas hay en este plano.
- [ ] Andador central (el camino largo que sube por el centro del plano).
- [ ] Ramales hacia cada edificio, de sur a norte: 600 → 100 → 200 → 300 → 400.
- [ ] Andador izquierdo (a lo largo de la columna de salones 5xx).
- [ ] Camino a la Capilla (curvo, abajo a la izquierda).
- [ ] Camino hacia Biblioteca y zona de comida (arriba a la derecha).
- [ ] **Conectar** cada ramal con el andador central en su cruce (`/admin/conexiones`).
- [ ] Verificar en `/admin/grafo`: una sola red, sin nodos aislados.

## 3. Edificio por edificio (de sur a norte, empezando cerca de la entrada)

Receta para **cada edificio** (misma secuencia siempre):

1. Trazar el pasillo frente a las puertas (edificio N, tipo `Pasillo`, no buscable).
2. Conectarlo al andador exterior (1 conexión).
3. Crear los salones y oficinas de un extremo al otro, cada uno en su puerta
   (`/admin/destinos`, buscable).
4. Conectar cada salón al nodo de pasillo **más cercano**.
5. Verificar en `/admin/grafo`: 0 aislados, 0 desconectados, 0 inalcanzables y
   "Probar ruta" desde la entrada hasta el salón más lejano.
6. Marcar el edificio como terminado.

### Edificio 600 (derecha, abajo)
- [ ] Pasillo 600
- [ ] Salón 605 · [ ] Salón 604 · [ ] Salón 603 · [ ] Salón 602 · [ ] DTI
- [ ] Caja · [ ] Servicios Escolares · [ ] Promoción (bloque junto a 605; mismo
      acceso, tres nodos)
- [ ] Verificado

### Edificio 100 (abajo, centro)
- [ ] Pasillo 100
- [ ] Salón 105 · [ ] 104 · [ ] 103 · [ ] 102 · [ ] 101
- [ ] Prefectura · [ ] Ciencias Exactas (Edificio 100)
- [ ] Verificado

### Edificio 200
- [ ] Pasillo 200
- [ ] Salón 209 · [ ] 208 · [ ] 207 · [ ] 206 · [ ] 205 · [ ] 204 · [ ] 203
- [ ] Ciencias Exactas (Edificio 200) · [ ] Consultorio Médico
- [ ] Baño (mujeres) — extremo izquierdo
- [ ] Verificado

### Edificio 300
- [ ] Pasillo 300
- [ ] Salón 305 · [ ] 304 · [ ] 303 · [ ] 301 (no veo el 302 en el plano: ¿existe?)
- [ ] Pastoral · [ ] Gastronomía
- [ ] Verificado

### Edificio 500 (columna izquierda)
- [ ] Pasillo 500
- [ ] Salón 506 · [ ] 505 · [ ] 504 · [ ] 503 · [ ] 502 · [ ] 501
- [ ] Baño hombres · [ ] Baño mujeres (junto al 506)
- [ ] Verificado

### Edificio 400 (arriba)
- [ ] Pasillo 400
- [ ] Orientación Académica · [ ] División Preparatoria
- [ ] Salón 403 · [ ] 402 · [ ] 401
- [ ] Salón 432 · [ ] 431 (fila aparte, más arriba)
- [ ] Verificado

## 4. Edificios sueltos y servicios

- [ ] Capilla (con su camino ya trazado)
- [ ] Biblioteca (el edificio grande de arriba a la derecha; confirmar nombre)
- [ ] La Café · [ ] Sorbitos · [ ] Snacks · [ ] Subway
- [ ] Las tres marcas "A" naranjas del plano: ¿qué son? (no registrar hasta saberlo)

## 5. Revisión final de la planta baja

- [ ] `/admin/grafo`: una sola red, 0 aislados, 0 desconectados, 0 inalcanzables.
- [ ] 0 pasillos marcados como buscables y 0 nodos sin coordenadas.
- [ ] Probar 5 rutas reales desde cada entrada (a un salón de cada edificio).
- [ ] Probar la búsqueda como alumno: "604", "baño", "biblioteca", "caja".
- [ ] Revisar en el celular que ruta y plano se vean bien.

## Límites de las herramientas de hoy (para planear el trabajo)

- El trazador crea una cadena **nueva** de nodos; no se engancha a nodos que ya
  existen. Cada cruce o ramal se une a mano en `/admin/conexiones`.
- Crear salones es de uno en uno (formulario + una conexión cada uno): con ~55
  destinos son ~110 formularios. Hay una mejora propuesta para hacerlo por lote.
- **No** trazar una fila de salones con el trazador: conectaría un salón con el
  siguiente, y la ruta atravesaría los salones.

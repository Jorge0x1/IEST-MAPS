# IEST-MAPS v2 — estado del proyecto

Última actualización: 17 de noviembre de 2026.

## Objetivo

IEST-MAPS es una aplicación para orientar usuarios y visitantes dentro del campus del
IEST. Debe permitir buscar destinos, calcular rutas sobre un grafo del campus y mostrar
recorridos exteriores e interiores. El proyecto reconstruye la aplicación original con
Next.js y Supabase, sin reutilizar su backend ni su interfaz anterior.

## Stack actual

- Next.js 16.3.3 con App Router y Turbopack.
- React 19 y TypeScript.
- Tailwind CSS 4.
- Supabase para Postgres, autenticación y Row Level Security.
- `@supabase/ssr` para integrar la sesión con Next.js.
- `qrcode` para generar códigos QR localmente en el navegador.
- Leaflet para los mapas (tiles de OpenStreetMap + planos del campus como `imageOverlay`).
- Despliegue en Vercel; `next` es la rama de producción prevista.
- Rama de desarrollo utilizada actualmente: `next`.

## Roles y alcance

### Administrador

- Gestiona usuarios autorizados y sus roles.
- Activa o revoca el acceso de usuarios.
- Gestiona edificios.
- Gestiona destinos/nodos y conexiones; traza pasillos en el mapa.
- Agrega descripción y foto a cada destino.
- Crea cuentas de prueba por rol o asigna contraseña a usuarios existentes.
- Pendiente: salones, oficinas y maestros como catálogos propios.

### Guardia

- Registra visitantes con nombre, teléfono opcional, motivo y destino.
- Genera un acceso temporal mediante QR.
- Consulta visitas activas y actividad reciente.
- Puede finalizar una visita activa.

### Alumno

- Accede mediante Google con correo institucional autorizado (o con correo y contraseña si el
  admin le asignó una).
- Busca destinos por nombre o alias mientras escribe (sin distinguir acentos).
- Elige la entrada por la que llega y ve la ruta como lista de pasos, con opción de
  evitar escaleras.
- Puede salir desde "Mi ubicación" (GPS) o elegir de la lista; ve su posición en el mapa.
- Ve el mapa a pantalla completa con panel deslizable (móvil) o panel lateral (escritorio),
  la ficha del destino con descripción y foto, y un selector de piso (1 a 4).
- Navegación en vivo ("Empezar a caminar"): indicación con metros y giro, aviso con sonido y
  vibración, recálculo si se desvía, ventana de cambio de piso y avance manual en pisos 2 a 4.

### Visitante

- No necesita una cuenta de Google.
- Entra mediante el token contenido en el QR generado por el guardia.
- Solo puede consultar la visita y destino asociados al token.
- Puede finalizar su propia visita.
- Ve la ruta fija asignada en el mapa, con el mismo layout y selector de piso del alumno.

## Funcionalidad terminada

### Base del proyecto

- [x] Scaffolding de Next.js, TypeScript y Tailwind CSS.
- [x] Conexión SSR con Supabase.
- [x] Middleware/proxy de sesión.
- [x] Esquema inicial y políticas RLS.
- [x] Layouts y dashboards separados por rol.

### Autenticación y autorización

- [x] Login con Google mediante Supabase Auth.
- [x] Restricción a correos institucionales.
- [x] Protección de rutas por rol en el servidor.
- [x] Creación automática de `profiles` al iniciar sesión por primera vez.
- [x] Preautorización de correos antes del primer acceso.
- [x] Asignación anticipada de rol.
- [x] Activación y revocación de acceso.
- [x] Acceso con correo y contraseña además de Google (cuentas de prueba por rol).

### Panel de administrador

- [x] Listado de usuarios.
- [x] Alta previa de correos autorizados.
- [x] Cambio de roles.
- [x] Activación y desactivación de usuarios.
- [x] CRUD de edificios.
- [x] Captura de nombre, descripción, latitud y longitud de edificios.
- [x] CRUD de destinos/nodos con edificio, piso, tipo, alias y coordenadas.
- [x] Clasificación de nodos entre destinos buscables y puntos auxiliares del recorrido.
- [x] Descripción (máx. 500 caracteres) y foto JPEG de cada destino (migración 0010).
- [x] Mapa del grafo (`/admin/grafo`): todos los nodos y conexiones sobre Leaflet,
  filtro por piso, diagnóstico de problemas (partes desconectadas, nodos aislados,
  destinos inalcanzables, pasillos marcados como destino, escaleras/elevadores sin
  otro piso, nodos sin coordenadas) y prueba de rutas entre cualquier par de nodos.
- [x] Modo "Conectar" en el mapa del grafo: clic en dos nodos crea la conexión (costo =
  distancia real, calculada en el servidor), opción de encadenar para seguir trazando,
  clic en una línea para eliminarla o cambiar su sentido, deshacer la última, y lista de
  escaleras/elevadores de otros pisos ordenados por cercanía para conectar pisos sin
  cambiar de vista (`app/admin/grafo/actions.ts`). Pendiente: trazar pasillos desde el
  mismo mapa enganchándose a nodos existentes y sugerir el pasillo más cercano a salones
  aislados.

### Guardia y visitantes

- [x] Formulario de registro de visitantes.
- [x] Selección de edificio de destino.
- [x] Registro de hora de entrada y vigencia del acceso.
- [x] Generación de token aleatorio de acceso.
- [x] Almacenamiento exclusivo del hash SHA-256 del token en Supabase.
- [x] Vigencia actual del token: 12 horas.
- [x] Generación local del QR sin servicios externos.
- [x] Modal automático con QR después de registrar la visita.
- [x] El modal está enfocado en escanear en recepción; no ofrece copiar, descargar ni
  imprimir el QR.
- [x] Pantalla pública de visitante validada mediante token.
- [x] Listado de visitas activas y recientes para el guardia.
- [x] Finalización de visita por el guardia o por el visitante.

## Migraciones de Supabase

Las migraciones existentes y aplicadas son:

1. `0001_schema_inicial.sql`: perfiles, roles, edificios, nodos, conexiones, registro de
   visitantes, funciones auxiliares y políticas RLS iniciales.
2. `0002_usuarios_autorizados.sql`: preautorización de correos, roles anticipados,
   activación y revocación de acceso.
3. `0003_visitas_por_token.sql`: visitantes sin cuenta obligatoria, destino por edificio,
   hash y expiración del token, consulta pública controlada y finalización por token.
4. `0004_catalogo_destinos.sql`: tipo de nodo `servicio`, marca de destino buscable e
   índice para consultar el catálogo por edificio y piso.
5. `0005_destino_nodo_visitas.sql`: visitas ligadas a un nodo de destino buscable y a un
   nodo de origen de tipo entrada.
6. `0006_conexiones_sin_duplicados.sql`: bloqueo de conexiones duplicadas (incluida la
   inversa de una bidireccional) y de costos negativos.
7. `0007_coordenadas_opcionales.sql`: `lat`/`lng` de nodos pasan a ser opcionales.
8. `0008_cadena_de_nodos.sql`: función `distancia_metros` (Haversine) y
   `crear_cadena_nodos` para crear en una transacción los nodos y conexiones de un
   pasillo trazado en el mapa.

9. `0009_visita_ids_para_ruta.sql`: `obtener_visita_por_token` devuelve también
   `origen_nodo_id` y `destino_nodo_id` para el motor de rutas.
10. `0010_foto_y_descripcion_destinos.sql`: `descripcion` y `foto_path` en `nodos` y bucket
    público `destinos` en Storage (solo el admin escribe). Verificar que esté aplicada en
    Supabase antes de desplegar.

Cuando se agregue una migración, debe crearse un archivo nuevo. No se deben editar las
migraciones ya aplicadas para cambiar una base existente.

## Decisiones de arquitectura

### Autenticación

- Supabase Auth es la única fuente de autenticación.
- Los usuarios institucionales entran mediante Google.
- Dar de alta un correo no crea manualmente una cuenta de Google: lo preautoriza. El
  perfil se vincula cuando la persona inicia sesión por primera vez.
- Los visitantes usan tokens propios y no requieren una cuenta temporal de Supabase.

### Seguridad de los QR

- El token original solo se entrega como resultado inmediato del registro.
- La base almacena `access_token_hash`, nunca el token original.
- La pantalla pública calcula SHA-256 y consulta una función limitada de Supabase.
- El QR se genera en el navegador con la URL del proyecto y no se envía a un proveedor
  externo.

### Mapas, GPS y pisos

- Leaflet puede mostrar un mapa real o una imagen/SVG mediante capas diferentes.
- Los planos del campus (exportados de AutoCAD) se superponen sobre OSM con
  `L.imageOverlay` (`app/components/mapa-base.ts`). Planta baja = piso 1, luego pisos 2, 3
  y 4 (no existe piso 0); todos comparten las mismas cuatro esquinas de calibración
  (`docs/CALIBRACION_PLANO.md`). El SVG todavía tiene detalles por completar.
- GPS: tras la prueba en campo (celular mucho mejor que laptop, con error de pocos metros)
  se decidió no recalibrar plano ni nodos por ahora. El punto azul se suaviza y solo se pega
  a los segmentos de la ruta mientras hay una ruta abierta (piso 1, hasta 10 m). Si el
  alumno no da permiso de ubicación, se conserva el origen por lista.
- La estrategia prevista es híbrida:
  - exterior: coordenadas reales y geolocalización del navegador;
  - interior: plano por edificio y piso, con nodos y conexiones propios;
  - transiciones: escaleras y elevadores conectan nodos entre pisos.
- El GPS convencional no determina de manera confiable si alguien subió o bajó de piso.
  El cambio de piso debe indicarse como parte de la ruta y confirmarse manualmente, salvo
  que en el futuro se incorpore infraestructura adicional como beacons.
- El grafo se almacena en las tablas `nodos` y `conexiones` de Supabase para que pueda
  administrarse sin desplegar código.
### Motor de rutas

- Dijkstra con cola de prioridad (montículo binario), en el servidor y en TypeScript.
  No se implementa en PL/pgSQL.
- `lib/rutas/dijkstra.ts`: funciones puras (`buscarRuta`, `explicarSinRuta`,
  `pesoConexion`) sin acceso a red; pruebas en `lib/rutas/dijkstra.test.ts` (`npm test`).
- Peso de cada conexión: `costo` si no es null; si no, la distancia real entre los dos
  nodos (`lib/geo.ts`, misma fórmula que `distancia_metros()` en SQL); si falta alguna
  coordenada, peso fijo 1.
- `evitarEscaleras` excluye los nodos tipo `escalera` antes de calcular; los elevadores
  siguen disponibles.
- `lib/rutas/actions.ts` es el único punto de entrada. Carga todo el grafo con el
  cliente service-role (`utils/supabase/service.ts`), porque el visitante no tiene sesión
  y RLS solo deja leer el grafo a usuarios autenticados. Por eso cada acción valida antes:
  - `calcularRuta(origenId, destinoId, opciones)`: requiere sesión activa.
  - `calcularRutaDeVisita(token, opciones)`: valida el token y solo calcula la ruta fija
    de esa visita activa; no acepta IDs arbitrarios.
- El resultado incluye nombre, tipo, piso y edificio de cada nodo, y marca los pasos
  con cambio de piso (sube/baja, y por qué escalera o elevador).
- Los casos sin ruta (nodo sin conexiones, grafo desconectado, destino inalcanzable sin
  escaleras, visita sin nodos asignados) devuelven un motivo y un mensaje para la UI.
- Listas grandes del grafo: Supabase corta cada consulta en 1000 filas aunque se pida un
  `.range()` mayor, así que nodos y conexiones se leen con `leerTodo` (`lib/leer-todo.ts`),
  que pagina hasta traer todo. En `/admin/destinos` y `/admin/conexiones` la búsqueda y
  los filtros corren en el navegador (sin recargar), se dibujan 40 tarjetas con "Mostrar
  más" y el formulario de edición de un nodo (con su mapa) solo se monta al abrirlo.

## Flujo actual de una visita

1. Una persona solicita acceso en la entrada de la institución.
2. El guardia pregunta nombre, teléfono opcional, motivo y destino.
3. El guardia registra la visita.
4. El servidor genera el token, almacena únicamente su hash y devuelve el acceso temporal.
5. Aparece un modal con los datos principales y un QR grande.
6. El visitante escanea el QR en ese momento.
7. La URL abre `/visitante/ruta` y valida el token.
8. Se muestran los datos de la visita, la ruta en un mapa de prueba (Leaflet + OSM) y
   la lista de pasos.
9. El guardia o el visitante pueden finalizar la visita.

## Checklist pendiente

El orden refleja la prioridad recomendada mientras el mapa SVG sigue incompleto.

### 1. Catálogo de destinos y grafo

- [x] Crear el CRUD administrativo de destinos/nodos.
- [x] Permitir los tipos entrada, pasillo, salón, oficina, baño, escalera, elevador,
  servicio y edificio.
- [x] Asociar cada destino con edificio y piso.
- [x] Definir cuáles nodos son buscables como destino y cuáles solo forman parte del
  recorrido.
- [x] Agregar nombres alternativos o alias para búsquedas como “salón 204” o “servicios
  escolares”.
- [x] Validar las coordenadas requeridas por el esquema actual de nodos.
- [x] Crear el CRUD de conexiones entre nodos.
- [x] Evitar conexiones inválidas, duplicadas o de un nodo consigo mismo.
- [x] Sugerir como costo la distancia real en metros cuando ambos nodos tienen
  coordenadas (editable por el administrador).
- [x] Trazar un pasillo en el mapa (`/admin/destinos/trazar`) para crear una cadena de
  nodos y sus conexiones de una sola vez.
- [ ] Representar escaleras y elevadores como conexiones entre pisos.

### 2. Mejorar el flujo del guardia

- [x] Cambiar la selección de edificio por un destino específico.
- [x] Guardar `destino_nodo_id` en el registro de la visita.
- [x] Definir y guardar una entrada/origen fijo para el visitante.
- [x] Guardar `origen_nodo_id` en el registro de la visita.
- [ ] Mostrar destino y piso en el modal del QR.
- [ ] Añadir filtros de visitas por estado y fecha si el volumen lo requiere.
- [ ] Revisar si el historial debe paginarse en vez de limitarse a 100 registros.

### 3. Experiencia del alumno

- [x] Diseñar la pantalla principal del alumno (`/usuario/dashboard`; diseño en
  `docs/superpowers/specs/2026-10-08-vista-alumno-design.md`).
- [x] Crear búsqueda de destinos por nombre y alias (`lib/busqueda.ts`, con pruebas).
- [x] Seleccionar manualmente una entrada como origen.
- [x] Usar la ubicación GPS como origen ("Mi ubicación"; el servidor elige el nodo
  conectado más cercano del piso 1 — `calcularRutaDesdeUbicacion`, `lib/rutas/cercano.ts`).
  Diseño: `docs/superpowers/specs/2026-11-13-gps-origen-design.md`.
- [x] Mostrar información del destino antes de iniciar una ruta.
- [x] Permitir iniciar, cancelar y reiniciar una ruta.

### 4. Motor de rutas

- [x] Definir formalmente el peso de las conexiones (costo → distancia → peso fijo).
- [x] Decidir si el pathfinding se ejecutará en servidor o cliente (servidor).
- [x] Implementar y probar Dijkstra.
- [x] Manejar rutas sin conexión y datos incompletos sin romper la interfaz.
- [x] Instrucciones básicas por paso, edificio y piso en la pantalla del visitante.
- [x] Opción de evitar escaleras.
- [ ] Agregar `SUPABASE_SERVICE_ROLE_KEY` también en las variables del despliegue.
- [x] Compactar pasos consecutivos de pasillo en una sola instrucción.
- [x] Usar `calcularRuta` desde la vista del alumno.

### 5. Mapa exterior e interiores

- [ ] Elegir y documentar la capa base definitiva para el mapa exterior.
- [x] Integrar Leaflet con coordenadas reales del campus (mapa de prueba con tiles de
  OSM en alumno y visitante: `app/components/mapa-ruta.tsx`; puntos calculados en
  `lib/rutas/mapa.ts`, con pruebas).
- [x] Dibujar la ruta sobre el mapa (línea, inicio, destino, pasos numerados y
  cambios de piso; los pasos sin coordenadas se omiten y se avisa).
- [x] Mostrar la ubicación del usuario mediante Geolocation API con consentimiento
  (punto azul con círculo de precisión y botón "centrar en mí" en la vista del alumno).
- [x] Definir límites de precisión y estados cuando el GPS no esté disponible: precisión
  máxima 50 m, nodo más cercano a máximo 150 m (`lib/rutas/cercano.ts`, ajustar con
  pruebas en campo); sin permiso, sin señal o sin https se usa la lista de siempre.
- [x] Suavizado de lecturas (`suavizar`, `lib/ubicacion.ts`) y punto azul pegado al
  tramo más cercano de la ruta abierta, piso 1, ≤ 10 m (`ajustarARuta`,
  `lib/rutas/ajuste.ts`). Diseño: `docs/superpowers/specs/2026-11-14-gps-suavizado-y-ajuste-design.md`.
- [x] Fase 2 del GPS: seguir la ruta en vivo y dar indicaciones mientras se camina
  (`lib/rutas/seguimiento.ts`, `lib/rutas/navegacion.ts`, `app/usuario/dashboard/modo-navegacion.tsx`).
  Diseño: `docs/superpowers/specs/2026-11-17-gps-seguimiento-en-vivo-design.md`.
- [ ] Probar la navegación en campo y ajustar sus umbrales (giro 35°, desvío 20 m o 2× precisión,
  3 lecturas, 15 s entre recálculos, preaviso 15 m, piso 8 m, llegada 10 m).
- [ ] Indicaciones por voz durante la navegación.
- [ ] Navegación en vivo también para el visitante.
- [ ] Terminar y limpiar el SVG del campus (faltan elementos del plano).
- [x] Preparar planos por piso (`planta-baja.svg`, `piso-2.svg` a `piso-4.svg`).
- [x] Georreferenciar los planos (4 puntos de control, error ≤ 0.4 m en planta baja).
- [x] Superponer el plano georreferenciado sobre OSM (`agregarCapaBase`).
- [x] Cambiar la capa visible por piso (selector en el mapa de rutas).
- [ ] Registrar en el admin los edificios, salones y pasillos reales (guía:
  `docs/REGISTRO_PLANTA_BAJA.md`) y repetirlo en los pisos 2 a 4.
- [x] Pedir confirmación manual al completar una transición de piso (ventana "¿Ya subiste?").
- [ ] Ajustar el punto azul a la ruta también en pisos 2 a 4 (hoy solo piso 1).

### 6. Catálogos administrativos restantes

- [ ] Definir si salones y oficinas serán nodos con metadatos o tablas de negocio
  separadas vinculadas a nodos.
- [ ] Implementar la administración de salones.
- [ ] Implementar la administración de oficinas y servicios.
- [ ] Definir el modelo de maestros y su relación con oficinas/salones.
- [ ] Implementar el CRUD de maestros si continúa dentro del alcance aprobado.

### 7. Calidad, seguridad y operación

- [ ] Corregir cualquier texto con codificación incorrecta que todavía aparezca en la UI.
- [ ] Añadir estados de carga, errores y confirmaciones consistentes.
- [ ] Añadir pruebas unitarias para validaciones, permisos y pathfinding.
- [ ] Añadir pruebas de integración para Server Actions y funciones RPC.
- [ ] Añadir pruebas end-to-end para administrador, guardia, alumno y visitante.
- [ ] Revisar expiración, reutilización y revocación de tokens de visitante.
- [ ] Revisar si finalizar una visita desde el QR debe requerir confirmación.
- [ ] Definir retención y eliminación de datos personales de visitantes.
- [ ] Preparar variables de entorno y configuración de producción.
- [ ] Desplegar en un dominio accesible por celular; un QR con `localhost` no funciona
  desde otro dispositivo.
- [ ] Validar comportamiento responsive y accesibilidad.
- [ ] Actualizar el README genérico con instalación, variables, migraciones y comandos.

## Próximo bloque recomendado

1. **Prueba en campo de la navegación en vivo** y ajuste de umbrales (lista al final del
   diseño `2026-11-17-gps-seguimiento-en-vivo-design.md`).
2. **Datos del grafo**: terminar de trazar pasillos y registrar salones en los pisos 1 a 4,
   y conectar escaleras y elevadores entre pisos. Sin esto no se pueden probar rutas
   completas entre pisos.
3. **Operación**: agregar `SUPABASE_SERVICE_ROLE_KEY` en Vercel y confirmar que la
   migración 0010 está aplicada.

## Documentación relacionada

- `docs/CALIBRACION_PLANO.md`: cómo calibrar y regenerar los planos.
- `docs/REGISTRO_PLANTA_BAJA.md`: orden de trabajo para capturar la planta baja.
- `docs/superpowers/specs/` y `docs/superpowers/plans/`: diseños y planes de la vista del
  alumno y del GPS.

## Comandos habituales

```bash
npm run dev
npm run lint
npm run build
git status --short
git branch --show-current
```

En Windows PowerShell puede ser necesario ejecutar `npm.cmd` en lugar de `npm` si la
política de ejecución bloquea `npm.ps1`.

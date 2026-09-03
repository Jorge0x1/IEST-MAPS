# IEST-MAPS v2 — estado del proyecto

Última actualización: 3 de septiembre de 2026.

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
- Rama de desarrollo utilizada actualmente: `next`.

## Roles y alcance

### Administrador

- Gestiona usuarios autorizados y sus roles.
- Activa o revoca el acceso de usuarios.
- Gestiona edificios.
- Pendiente: gestionar destinos/nodos, conexiones, salones, oficinas y maestros.

### Guardia

- Registra visitantes con nombre, teléfono opcional, motivo y destino.
- Genera un acceso temporal mediante QR.
- Consulta visitas activas y actividad reciente.
- Puede finalizar una visita activa.

### Alumno

- Accede mediante Google con correo institucional autorizado.
- Actualmente cuenta con dashboard protegido por rol.
- Pendiente: búsqueda de destinos, selección de origen y navegación.

### Visitante

- No necesita una cuenta de Google.
- Entra mediante el token contenido en el QR generado por el guardia.
- Solo puede consultar la visita y destino asociados al token.
- Puede finalizar su propia visita.
- Pendiente: visualizar la ruta fija asignada en el mapa.

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

### Panel de administrador

- [x] Listado de usuarios.
- [x] Alta previa de correos autorizados.
- [x] Cambio de roles.
- [x] Activación y desactivación de usuarios.
- [x] CRUD de edificios.
- [x] Captura de nombre, descripción, latitud y longitud de edificios.

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
- El mapa detallado del campus en SVG está aproximadamente al 50 % y todavía no debe
  bloquear el desarrollo de los demás módulos.
- La estrategia prevista es híbrida:
  - exterior: coordenadas reales y geolocalización del navegador;
  - interior: plano por edificio y piso, con nodos y conexiones propios;
  - transiciones: escaleras y elevadores conectan nodos entre pisos.
- El GPS convencional no determina de manera confiable si alguien subió o bajó de piso.
  El cambio de piso debe indicarse como parte de la ruta y confirmarse manualmente, salvo
  que en el futuro se incorpore infraestructura adicional como beacons.
- El grafo se almacena en las tablas `nodos` y `conexiones` de Supabase para que pueda
  administrarse sin desplegar código.
- El cálculo de ruta se basará en un algoritmo de camino más corto; la ubicación exacta
  donde se ejecutará se decidirá al implementar el módulo.

## Flujo actual de una visita

1. Una persona solicita acceso en la entrada de la institución.
2. El guardia pregunta nombre, teléfono opcional, motivo y destino.
3. El guardia registra la visita.
4. El servidor genera el token, almacena únicamente su hash y devuelve el acceso temporal.
5. Aparece un modal con los datos principales y un QR grande.
6. El visitante escanea el QR en ese momento.
7. La URL abre `/visitante/ruta` y valida el token.
8. Por ahora se muestran los datos de la visita y un espacio reservado para la ruta.
9. El guardia o el visitante pueden finalizar la visita.

## Checklist pendiente

El orden refleja la prioridad recomendada mientras el mapa SVG sigue incompleto.

### 1. Catálogo de destinos y grafo

- [ ] Crear el CRUD administrativo de destinos/nodos.
- [ ] Permitir los tipos entrada, pasillo, salón, oficina, baño, escalera, elevador,
  servicio y edificio.
- [ ] Asociar cada destino con edificio y piso.
- [ ] Definir cuáles nodos son buscables como destino y cuáles solo forman parte del
  recorrido.
- [ ] Agregar nombres alternativos o alias para búsquedas como “salón 204” o “servicios
  escolares”.
- [ ] Validar coordenadas requeridas según el tipo de nodo.
- [ ] Crear el CRUD de conexiones entre nodos.
- [ ] Evitar conexiones inválidas, duplicadas o de un nodo consigo mismo.
- [ ] Representar escaleras y elevadores como conexiones entre pisos.

### 2. Mejorar el flujo del guardia

- [ ] Cambiar la selección de edificio por un destino específico.
- [ ] Guardar `destino_nodo_id` en el registro de la visita.
- [ ] Definir y guardar una entrada/origen fijo para el visitante.
- [ ] Guardar `origen_nodo_id` en el registro de la visita.
- [ ] Mostrar destino y piso en el modal del QR.
- [ ] Añadir filtros de visitas por estado y fecha si el volumen lo requiere.
- [ ] Revisar si el historial debe paginarse en vez de limitarse a 100 registros.

### 3. Experiencia del alumno

- [ ] Diseñar la pantalla principal del alumno.
- [ ] Crear búsqueda de destinos por nombre y alias.
- [ ] Permitir usar ubicación GPS o seleccionar manualmente una entrada.
- [ ] Mostrar información del destino antes de iniciar una ruta.
- [ ] Permitir iniciar, cancelar y reiniciar una ruta.

### 4. Motor de rutas

- [ ] Definir formalmente el peso de las conexiones: distancia, tiempo o costo manual.
- [ ] Decidir si el pathfinding se ejecutará en servidor o cliente.
- [ ] Implementar y probar Dijkstra u otro algoritmo de camino más corto.
- [ ] Manejar rutas sin conexión y datos incompletos sin romper la interfaz.
- [ ] Generar instrucciones por tramo, edificio y piso.
- [ ] Incorporar preferencias de accesibilidad, por ejemplo evitar escaleras.

### 5. Mapa exterior e interiores

- [ ] Elegir y documentar la capa base definitiva para el mapa exterior.
- [ ] Integrar Leaflet con coordenadas reales del campus.
- [ ] Mostrar la ubicación del usuario mediante Geolocation API con consentimiento.
- [ ] Definir límites de precisión y estados cuando el GPS no esté disponible.
- [ ] Terminar y limpiar el SVG del campus.
- [ ] Dividir o preparar planos por edificio/piso según el formato final.
- [ ] Georreferenciar los planos interiores cuando sea necesario.
- [ ] Dibujar la ruta sobre el mapa y cambiar la capa visible por piso.
- [ ] Pedir confirmación manual al completar una transición de piso.

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

Construir el CRUD de destinos/nodos en el panel de administrador. El primer incremento
debe permitir crear, editar, listar y eliminar destinos asociados a un edificio y piso,
sin exigir todavía que el SVG o el mapa definitivo estén completos. Después se conecta
el formulario del guardia a esos destinos específicos.

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

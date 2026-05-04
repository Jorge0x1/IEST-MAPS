# IEST-MAPS

Mapa interactivo del campus con funciones para administradores y guardias.

## Estructura

- `iestmaps_react/`: frontend React + Vite.
- `iestmaps_api/`: backend Node.js + Express + MySQL.
- `iestmaps_react/iest_maps_db.sql`: dump publico de base de datos para importar en local.

## Requisitos

- Node.js 20+
- npm 10+
- MySQL o MariaDB

Nota: Es necesario encender el servicio de MySQL/MariaDB en XAMPP. La app no requiere Apache para funcionar.

## Instalacion

Git Bash en vscode:
```bash
git clone https://github.com/Jorge0x1/IEST-MAPS.git
cd IEST-MAPS
code .
```

Desde la raiz del repo (en Command Prompt):

```bash
npm run setup
```

`npm run setup` intenta instalar `cloudflared` automáticamente (en Windows con `winget` o `choco`, en macOS con `brew`).
Si en Windows no logra instalarlo globalmente, descarga un binario local en `scripts/bin/cloudflared.exe` y `npm run dev` lo usa automáticamente.
Si aun asi no se puede, el proyecto igual puede correr con `npm run dev:no-tunnel`, aunque el tunel es necesario para pruebas con el QR.

## Variables de entorno

Copia los ejemplos y ajusta valores locales (en Command Prompt):

```bash
copy iestmaps_api\.env.example iestmaps_api\.env
copy iestmaps_react\.env.example iestmaps_react\.env
```

## Base de datos

La base se prepara de forma automática al ejecutar `npm run dev` o `npm run dev:no-tunnel`. Solo asegurate de antes levantar XAMPP.

Si quieres hacerlo manualmente, también puedes usar phpMyAdmin o la CLI de MySQL.

### phpMyAdmin

1. Crea una base de datos llamada `iest_maps`.
2. Importa el archivo `iestmaps_react/iest_maps_db.sql`.

### MySQL CLI

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS iest_maps CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"
mysql -u root -p iest_maps < iestmaps_react/iest_maps_db.sql
```

## Ejecutar

```bash
npm run dev:no-tunnel
```
Opcional con tunel cloudflared (necesario para probar qr del guardia):
```bash
npm run dev
```


Cuando uses `npm run dev`, busca la línea `TUNNEL URL:` en la terminal; ahí aparece el enlace público.

## Descripcion

Sistema institucional, cuenta con cuatro tipo de usuarios diferentes: administrador / guardia / usuarios "comunes" / visitantes.
*   El administrador lleva el registro de salones y usuarios del instituto, a su vez puede agregar, eliminar y modificar estos mismos.
*   El guardia puede registrar visitantes y llevar un control de estos mismos, ofrece a los visitantes un qr pára un facil acceso al sitio.
*   Los usuarios comunes pueden ver un mapa del plantel el cual puede trazar rutas de un punto "A" a "B".
*   Los visitantes pueden ver la misma vista que los usuarios comunes con la diferencia que el trazado de rutas esta limitado a la que el guardia le asigno.

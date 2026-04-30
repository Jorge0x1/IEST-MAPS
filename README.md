# IEST MAPS

Repositorio monorepo con:

- `iestmaps_react/`: frontend React + Vite.
- `iestmaps_api/`: backend Node.js + Express + MySQL.
- `iestmaps_react/iest_maps_db.sql`: dump publico de base de datos para importar en local.

## Requisitos

- Node.js 20+
- npm 10+
- MySQL o MariaDB

## Instalacion

Desde la raiz del repo:

```bash
npm run setup
```

## Variables de entorno

Copia los ejemplos y ajusta valores locales:

```bash
copy iestmaps_api\.env.example iestmaps_api\.env
copy iestmaps_react\.env.example iestmaps_react\.env
```

## Base de datos

### phpMyAdmin

1. Crea una base de datos llamada `iest_maps`.
2. Importa el archivo `iestmaps_react/iest_maps_db.sql`.
3. Verifica que la conexion de `iestmaps_api/.env` apunte a esa base.

### MySQL CLI

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS iest_maps CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"
mysql -u root -p iest_maps < iestmaps_react/iest_maps_db.sql
```

## Ejecutar

```bash
npm run dev:no-tunnel
```

## Publicar en GitHub

```bash
git init
git add .
git commit -m "chore: initial public release"
git branch -M main
git remote add origin https://github.com/Jorge0x1/IEST-MAPS.git
git push -u origin main
```

## Notas

- El dump SQL esta versionado de forma publica para que otros puedan importar la base.
- No subas tus archivos `.env` reales.
- Si cambias credenciales o secretos, actualiza solo los `.env` locales.

# iestmaps_api

Backend Node.js/Express para `iestmaps_react`.

## 1) Instalación

```bash
npm install
```

## 2) Configuración

1. Copia `.env.example` a `.env`.
2. Ajusta credenciales de MySQL y variables necesarias.

## 3) Ejecutar en desarrollo

```bash
npm run dev
```

La API inicia por defecto en `http://localhost:3000`.

## Endpoints

- `GET /api/health`
- `POST /api/auth/login`
- `POST /api/auth/google`
- `POST /api/ruta/lookup`
- `GET /api/google-auth-url`

## Google Login (correo institucional)

Configura estas variables en `.env`:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` (ej. `http://localhost:5173/auth/google/callback`)
- `GOOGLE_ALLOWED_DOMAINS` (ej. `iest.edu.mx`, o varios separados por coma)

En Google Cloud Console, agrega exactamente el mismo `GOOGLE_REDIRECT_URI` en Authorized redirect URIs.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# IEST-MAPS v2 — instrucciones del proyecto

Antes de proponer o implementar cambios, lee completo `docs/PROJECT_STATUS.md`. Ese
archivo contiene el alcance, las decisiones de arquitectura, el trabajo terminado y la
checklist vigente del proyecto.

## Acuerdos de trabajo

- Mantén los cuatro roles del producto: administrador, guardia, alumno y visitante.
- Usa Next.js App Router, TypeScript, Tailwind CSS y Supabase; no introduzcas una segunda
  capa de autenticación ni un backend paralelo.
- Conserva la autorización en el servidor y las políticas RLS de Supabase. Ocultar una
  opción en la interfaz no sustituye una validación de permisos.
- Los códigos QR se generan localmente con la dependencia `qrcode`; no uses servicios
  externos para enviar o transformar tokens de acceso.
- El grafo del campus debe vivir en Supabase (`nodos` y `conexiones`), nunca hardcodeado
  en el frontend.
- No construyas el mapa definitivo hasta contar con el SVG y los datos suficientes del
  campus. Sí se pueden preparar catálogos, flujos y modelos de datos que no dependan del
  plano terminado.
- Separa navegación exterior por GPS de navegación interior por edificio y piso. El GPS
  no debe usarse como fuente automática para detectar el piso dentro de un edificio.
- Antes de entregar cambios de código, ejecuta `npm run lint` y `npm run build`.
- No incluyas archivos ajenos al producto en commits. Revisa `git status` y agrega rutas
  explícitas cuando existan archivos sin seguimiento.
- Actualiza `docs/PROJECT_STATUS.md` cuando cambie una decisión, se complete un módulo o
  se agregue un pendiente relevante.

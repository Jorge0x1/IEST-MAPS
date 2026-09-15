-- ============================================================================
-- IEST-MAPS v2 — Coordenadas opcionales en nodos
-- ============================================================================
-- El plan es capturar la ubicación tocando un mini mapa (Leaflet) en vez de
-- escribirla a mano, y el mapa detallado del campus todavía no existe. Para
-- no bloquear la captura de destinos mientras tanto, lat/lng dejan de ser
-- obligatorias. edificios.lat/lng ya eran opcionales desde 0001.

alter table public.nodos
  alter column lat drop not null,
  alter column lng drop not null;

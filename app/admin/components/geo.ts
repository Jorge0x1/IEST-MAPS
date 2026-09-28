// Fórmula de Haversine: distancia en metros entre dos coordenadas.
// Réplica en TypeScript de public.distancia_metros() en Supabase, para poder
// sugerir el costo de una conexión en el navegador sin ida y vuelta al servidor.
export function distanciaMetros(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const radioTierra = 6371000;
  const aRadianes = (grados: number) => (grados * Math.PI) / 180;
  const valor =
    Math.sin(aRadianes(lat1)) * Math.sin(aRadianes(lat2)) +
    Math.cos(aRadianes(lat1)) * Math.cos(aRadianes(lat2)) * Math.cos(aRadianes(lng2 - lng1));
  const acotado = Math.min(1, Math.max(-1, valor));
  return radioTierra * Math.acos(acotado);
}

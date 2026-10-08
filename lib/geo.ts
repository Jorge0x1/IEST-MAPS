// Distancia en metros entre dos coordenadas sobre una esfera de radio terrestre.
// Réplica en TypeScript de public.distancia_metros() en Supabase (misma fórmula:
// ley esférica de cosenos, acotada a [-1, 1]). Se usa tanto en el navegador
// (sugerir el costo de una conexión) como en el servidor (peso de aristas en
// el motor de rutas), así que no debe importar nada de red ni de React.
export function distanciaMetros(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const radioTierra = 6371000;
  const aRadianes = (grados: number) => (grados * Math.PI) / 180;
  const valor =
    Math.sin(aRadianes(lat1)) * Math.sin(aRadianes(lat2)) +
    Math.cos(aRadianes(lat1)) * Math.cos(aRadianes(lat2)) * Math.cos(aRadianes(lng2 - lng1));
  const acotado = Math.min(1, Math.max(-1, valor));
  return radioTierra * Math.acos(acotado);
}

// Convierte los pasos de una ruta en los puntos que se dibujan en el mapa.
// Función pura (sin Leaflet ni React) para poder probarla con `npm test`.
//
// lat/lng son opcionales en los nodos (migración 0007): los pasos sin
// coordenadas válidas no se dibujan, pero se cuentan para avisarlo en la UI.
// `numero` es la posición en la lista completa de pasos, así el número del
// marcador coincide con el de la lista aunque falten puntos intermedios.

export type PasoConUbicacion = {
  id: string;
  nombre: string;
  piso: number;
  lat: number | null;
  lng: number | null;
  cambioPiso: unknown | null;
};

export type RolPunto = "inicio" | "destino" | "cambio_piso" | "paso";

export type PuntoMapa = {
  id: string;
  numero: number;
  nombre: string;
  piso: number;
  lat: number;
  lng: number;
  rol: RolPunto;
};

function coordenadaValida(valor: number | null, limite: number): valor is number {
  return typeof valor === "number" && Number.isFinite(valor) && Math.abs(valor) <= limite;
}

export function puntosDeRuta(pasos: PasoConUbicacion[]): { puntos: PuntoMapa[]; omitidos: number } {
  const puntos: PuntoMapa[] = [];
  let omitidos = 0;
  const ultimo = pasos.length - 1;

  pasos.forEach((paso, indice) => {
    if (!coordenadaValida(paso.lat, 90) || !coordenadaValida(paso.lng, 180)) {
      omitidos++;
      return;
    }
    const rol: RolPunto =
      indice === 0 ? "inicio" : indice === ultimo ? "destino" : paso.cambioPiso ? "cambio_piso" : "paso";
    puntos.push({ id: paso.id, numero: indice + 1, nombre: paso.nombre, piso: paso.piso, lat: paso.lat, lng: paso.lng, rol });
  });

  return { puntos, omitidos };
}

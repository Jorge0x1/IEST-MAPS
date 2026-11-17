// Pisos dados de alta en la app: los que tienen plano. Es la única tabla que hay que
// tocar al agregar un piso (el selector del mapa, los formularios del admin y la
// validación del servidor leen de aquí). Sin dependencias, para poder usarla tanto
// en el servidor como en el navegador y en las pruebas.
//
// La clave es `nodos.piso` (planta baja = piso 1, no existe piso 0). Los planos de
// todos los pisos salen del mismo marco de AutoCAD (mismas 4 esquinas), así que
// comparten los límites de `PLANTA_BAJA` en `app/components/mapa-base.ts`.
export const PISO_PLANTA_BAJA = 1;

export const PLANOS_POR_PISO: Record<number, { url: string; etiqueta: string }> = {
  1: { url: "/mapas/planta-baja.svg", etiqueta: "Piso 1" },
  2: { url: "/mapas/piso-2.svg", etiqueta: "Piso 2" },
  3: { url: "/mapas/piso-3.svg", etiqueta: "Piso 3" },
  4: { url: "/mapas/piso-4.svg", etiqueta: "Piso 4" },
};

// Pisos dados de alta, de menor a mayor.
export const PISOS_REGISTRADOS: number[] = Object.keys(PLANOS_POR_PISO)
  .map(Number)
  .sort((a, b) => a - b);

export function pisoRegistrado(piso: number): boolean {
  return PISOS_REGISTRADOS.includes(piso);
}

// Texto corto de un piso para botones y etiquetas.
export function etiquetaPiso(piso: number): string {
  return PLANOS_POR_PISO[piso]?.etiqueta ?? `Piso ${piso}`;
}

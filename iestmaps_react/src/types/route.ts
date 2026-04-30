// datos del formulario de busqueda de rutas
export type RouteFormData = {
  // lugar de salida (nombre buscable, ej: 'Salon 101')
  origin: string
  // lugar de llegada (nombre buscable, ej: 'Oficina Admisiones')
  destination: string
}

// resultado de la busqueda de lugares encontrados
export type RoutePreview = {
  // ID de nodo del lugar de salida
  originRouteId: string
  // ID de nodo del lugar de llegada
  destinationRouteId: string
}
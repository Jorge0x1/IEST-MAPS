// usuario autenticado en el sistema
// contiene datos de la sesion actual
export type AuthUser = {
  // nombre de usuario para login
  usuario: string
  // tipo de usuario determina que vistas puede ver
  // administrador: manejo de usuarios/salones/oficinas
  // guardia: genera qr para visitantes
  // visitante: acceso con qr generado por guardia
  // usuario: acceso basico al mapa
  rol: 'administrador' | 'guardia' | 'visitante' | 'usuario'
  // pagina a la que redirigir post-login segun el rol
  redirectTo: string
  // token de autenticacion (puede estar en cookie tambien)
  token?: string
  // ID del registro de visita (visitantes solamente)
  visitanteRegistroId?: number
  // lugar de salida asignado al visitante
  visitanteOrigen?: string
  // lugar de llegada asignado al visitante
  visitanteDestino?: string
}

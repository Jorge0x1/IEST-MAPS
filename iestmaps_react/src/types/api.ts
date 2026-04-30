// respuesta al buscar una ruta por nombre de lugar
export type RouteLookupResponse = {
  // indica si la operacion fue exitosa
  ok: boolean
  // numero de celda donde esta ubicado el lugar (ID para pathfinding)
  ruta?: number
  // mensaje de error si no se encontro
  error?: string
}

// respuesta del login (usuario/contraseña o google)
export type LoginResponse = {
  // indica si el login fue exitoso
  ok: boolean
  // nombre de usuario (para mostrar en interfaz)
  usuario?: string
  // tipo de rol del usuario logueado
  rol?: 'administrador' | 'guardia' | 'visitante' | 'usuario'
  // pagina a redirigir segun el rol
  redirectTo?: string
  // ID del registro del visitante (solo visitantes)
  visitanteRegistroId?: number
  // lugar de salida asignado (solo visitantes)
  visitanteOrigen?: string
  // lugar de llegada asignado (solo visitantes)
  visitanteDestino?: string
  // token de sesion (puede guardarse en cookie o localStorage)
  token?: string
  // mensaje de error si fallo el login
  error?: string
}

// respuesta con la URL de autenticacion de Google
export type GoogleAuthUrlResponse = {
  // indica si la operacion fue exitosa
  ok: boolean
  // URL de Google OAuth para redirigir al usuario
  authUrl?: string
  // mensaje de error
  error?: string
}

// respuesta al crear un visitante (genera QR o credenciales)
export type CreateVisitorResponse = {
  // indica si el visitante se creo correctamente
  ok: boolean
  // mensaje de exito con detalles
  message?: string
  // ID del nuevo visitante creado
  id?: number
  // nombre de usuario generado para el visitante
  usuario?: string
  // contraseña generada para el visitante
  contrasena?: string
  // token para acceso por QR (mas seguro que usuario/contraseña)
  qrToken?: string
  // mensaje de error si fallo
  error?: string
}

// registro individual de un visitante (para historial)
export type VisitorRecord = {
  // ID del registro
  id: number
  // nombre del visitante
  nombre: string
  // usuario creado para el visitante
  usuario_visitante: string
  // motivo de la visita
  motivo: string
  // lugar que iba a visitar
  destino: string
  // telefono del visitante
  telefono: string
  // fecha/hora de entrada al edificio
  hora_entrada: string | null
  // fecha/hora de salida del edificio
  hora_salida: string | null
}

// respuesta con el historial de visitantes
export type VisitorHistoryResponse = {
  // indica si la operacion fue exitosa
  ok: boolean
  // lista de registros de visitantes
  data?: VisitorRecord[]
  // mensaje de error si fallo
  error?: string
}

// respuesta al finalizar la visita de un visitante
export type FinalizeVisitorTripResponse = {
  // indica si se registro la salida correctamente
  ok: boolean
  // mensaje de exito
  message?: string
  // mensaje de error si fallo
  error?: string
}
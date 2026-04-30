// usuario creado en el sistema para administradores
export type AdminUsuario = {
  // identificacion interna del usuario
  ID_IEST: number
  // nombre completo del usuario
  nombre: string
  // nombre de usuario para login
  usuario: string
  // tipo de usuario: administrador, guardia, usuario
  rol: string
  // contraseña del usuario (solo obtenida una vez)
  contrasena: string
}

// maestro base: profesor o personal administrativo
export type AdminMaestro = {
  // identificacion del maestro
  ID_IEST: number
  // nombre completo
  nombre: string
  // usuario para login
  usuario: string
  // area o departamento que pertenece
  area: string
  // referencia a la oficina donde trabaja
  ID_oficina: number
  // contraseña (solo obtenida una vez)
  contrasena: string
}

// salon/aula en el edificio
export type AdminSalon = {
  // numero del salon (ej: 101, 205)
  numero_salon: number
  // numero de edificio
  edificio: number
  // piso del edificio (1 o 2)
  piso: number
  // uso del salon (clase, laboratorio, etc)
  uso: string
}

// oficina/dependencia en el edificio
export type AdminOficina = {
  // identificacion de la oficina
  ID_oficina: number
  // numero de edificio
  edificio: number
  // piso (1 o 2)
  piso: number
  // ubicacion o nombre del area
  lugar: string
}

// respuesta al obtener usuarios y maestros
export type AdminUsuariosResponse = {
  // indica si la operacion fue exitosa
  ok: boolean
  // lista de usuarios encontrados
  usuarios?: AdminUsuario[]
  // lista de maestros encontrados
  maestros?: AdminMaestro[]
  // mensaje de error si fallo
  error?: string
}

// respuesta al obtener salones y oficinas
export type AdminSalonesOficinasResponse = {
  // indica si la operacion fue exitosa
  ok: boolean
  // lista de salones encontrados
  salones?: AdminSalon[]
  // lista de oficinas encontradas
  oficinas?: AdminOficina[]
  // mensaje de error si fallo
  error?: string
}

// respuesta generica para acciones (crear, actualizar, eliminar)
export type AdminActionResponse = {
  // indica si la operacion fue exitosa
  ok: boolean
  // mensaje de exito opcional
  message?: string
  // mensaje de error si fallo
  error?: string
}

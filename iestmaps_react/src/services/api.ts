// cliente de api: todas las funciones para comunicarse con el backend
import type {
  AdminActionResponse,
  AdminSalonesOficinasResponse,
  AdminUsuariosResponse,
  CreateVisitorResponse,
  FinalizeVisitorTripResponse,
  GoogleAuthUrlResponse,
  LoginResponse,
  RouteLookupResponse,
  VisitorHistoryResponse,
} from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

// helper para post requests que retorna json
// envia las credenciales en cookies automaticamente
async function postJson<TResponse>(path: string, body: unknown): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const data = (await response.json()) as TResponse
  return data
}

// helper para get requests que retorna json
// envia las credenciales en cookies automaticamente
async function getJson<TResponse>(path: string): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  const data = (await response.json()) as TResponse
  return data
}

// helper para put requests que retorna json
// envia las credenciales en cookies automaticamente
async function putJson<TResponse>(path: string, body: unknown): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const data = (await response.json()) as TResponse
  return data
}

// busca un salon por numero
export async function lookupRouteByPlace(place: string): Promise<RouteLookupResponse> {
  return postJson<RouteLookupResponse>('/ruta/lookup', {
    numero_salon: place,
  })
}

export async function loginUser(usuario: string, contrasena: string): Promise<LoginResponse> {
  return postJson<LoginResponse>('/auth/login', {
    usuario,
    contrasena,
  })
}

export async function loginWithGoogleCode(code: string, redirectUri?: string): Promise<LoginResponse> {
  return postJson<LoginResponse>('/auth/google', { code, redirectUri })
}

export async function loginWithVisitorQrToken(token: string): Promise<LoginResponse> {
  return postJson<LoginResponse>('/auth/visitante-qr-login', { token })
}

export async function fetchGoogleAuthUrl(redirectUri?: string): Promise<GoogleAuthUrlResponse> {
  const query = redirectUri ? `?redirect_uri=${encodeURIComponent(redirectUri)}` : ''
  return getJson<GoogleAuthUrlResponse>(`/google-auth-url${query}`)
}

export async function createVisitor(payload: {
  nombre: string
  usuario?: string
  contrasena?: string
  motivo: string
  destino: string
  telefono: string
}): Promise<CreateVisitorResponse> {
  return postJson<CreateVisitorResponse>('/visitantes', payload)
}

export async function fetchVisitorHistory(search = ''): Promise<VisitorHistoryResponse> {
  const query = search.trim()
  const path = query ? `/visitantes?q=${encodeURIComponent(query)}` : '/visitantes'
  return getJson<VisitorHistoryResponse>(path)
}

export async function finalizeVisitorTrip(registroId: number): Promise<FinalizeVisitorTripResponse> {
  return postJson<FinalizeVisitorTripResponse>('/visitantes/finalizar', { registroId })
}

export async function fetchAdminUsers(idPrefix = ''): Promise<AdminUsuariosResponse> {
  const query = idPrefix.trim()
  const path = query ? `/admin/usuarios?idPrefix=${encodeURIComponent(query)}` : '/admin/usuarios'
  return getJson<AdminUsuariosResponse>(path)
}

export async function createAdminUser(payload: {
  nombre: string
  usuario: string
  rol: string
  contrasena: string
}): Promise<AdminActionResponse> {
  return postJson<AdminActionResponse>('/admin/usuarios', payload)
}

export async function updateAdminUser(
  idOriginal: number,
  payload: { idIest: number; nombre: string; usuario: string; rol: string; contrasena: string },
): Promise<AdminActionResponse> {
  return putJson<AdminActionResponse>(`/admin/usuarios/${idOriginal}`, payload)
}

export async function deleteAdminUser(id: number): Promise<AdminActionResponse> {
  const response = await fetch(`${API_BASE_URL}/admin/usuarios/${id}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  })
  return (await response.json()) as AdminActionResponse
}

export async function createAdminMaestro(payload: {
  idIest: number
  nombre: string
  usuario: string
  area: string
  idOficina: number
  contrasena: string
}): Promise<AdminActionResponse> {
  return postJson<AdminActionResponse>('/admin/maestros', payload)
}

export async function updateAdminMaestro(
  id: number,
  payload: { area: string; idOficina: number },
): Promise<AdminActionResponse> {
  return putJson<AdminActionResponse>(`/admin/maestros/${id}`, payload)
}

export async function deleteAdminMaestro(id: number): Promise<AdminActionResponse> {
  const response = await fetch(`${API_BASE_URL}/admin/maestros/${id}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  })
  return (await response.json()) as AdminActionResponse
}

export async function fetchAdminSalonesOficinas(): Promise<AdminSalonesOficinasResponse> {
  return getJson<AdminSalonesOficinasResponse>('/admin/salones-oficinas')
}

export async function createAdminSalon(payload: {
  numeroSalon: number
  edificio: number
  piso: number
  uso: string
}): Promise<AdminActionResponse> {
  return postJson<AdminActionResponse>('/admin/salones', payload)
}

export async function updateAdminSalon(
  numeroOriginal: number,
  payload: { numeroSalon: number; edificio: number; piso: number; uso: string },
): Promise<AdminActionResponse> {
  return putJson<AdminActionResponse>(`/admin/salones/${numeroOriginal}`, payload)
}

export async function deleteAdminSalon(numero: number): Promise<AdminActionResponse> {
  const response = await fetch(`${API_BASE_URL}/admin/salones/${numero}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  })
  return (await response.json()) as AdminActionResponse
}

export async function createAdminOficina(payload: {
  idOficina: number
  edificio: number
  piso: number
  lugar: string
}): Promise<AdminActionResponse> {
  return postJson<AdminActionResponse>('/admin/oficinas', payload)
}

export async function updateAdminOficina(
  idOriginal: number,
  payload: { idOficina: number; edificio: number; piso: number; lugar: string },
): Promise<AdminActionResponse> {
  return putJson<AdminActionResponse>(`/admin/oficinas/${idOriginal}`, payload)
}

export async function deleteAdminOficina(id: number): Promise<AdminActionResponse> {
  const response = await fetch(`${API_BASE_URL}/admin/oficinas/${id}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  })
  return (await response.json()) as AdminActionResponse
}

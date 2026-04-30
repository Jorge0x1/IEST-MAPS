// hook que maneja la autenticacion del usuario
// guarda el usuario en storage local y maneja login normal o por google
import { useEffect, useState } from 'react'
import { fetchGoogleAuthUrl, loginUser, loginWithGoogleCode, loginWithVisitorQrToken } from '../services/api'
import type { LoginResponse } from '../types'
import type { AuthUser } from '../types'

const AUTH_STORAGE_KEY = 'iestmaps_auth_user'

// variables globales para evitar multiples peticiones de google
let googleCodeInFlight = ''
let googleLoginPromise: Promise<LoginResponse> | null = null

// carga el usuario guardado en storage local
function loadStoredUser(): AuthUser | null {
  try {
    const rawValue = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!rawValue) return null

    const parsedValue = JSON.parse(rawValue) as AuthUser
    if (!parsedValue?.usuario || !parsedValue?.rol || !parsedValue?.redirectTo) {
      return null
    }

    return parsedValue
  } catch {
    return null
  }
}

function useAuth() {
  // estado del usuario actual
  const [user, setUser] = useState<AuthUser | null>(() => loadStoredUser())
  // estados de carga y error
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  // url para acceso via google
  const [googleAuthUrl, setGoogleAuthUrl] = useState('')

  // cuando cambia el usuario, lo guarda en storage o lo elimina
  useEffect(() => {
    if (!user) {
      localStorage.removeItem(AUTH_STORAGE_KEY)
      return
    }

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
  }, [user])

  useEffect(() => {
    const loadGoogleAuthUrl = async () => {
      try {
        const redirectUri = `${window.location.origin}/auth/google/callback`
        const result = await fetchGoogleAuthUrl(redirectUri)
        if (result.ok && result.authUrl) {
          setGoogleAuthUrl(result.authUrl)
        }
      } catch {
        setGoogleAuthUrl('')
      }
    }

    loadGoogleAuthUrl()
  }, [])

  // funcion auxiliar para procesar el resultado del login
  // valida que tiene todos los datos requeridos y actualiza el estado
  const applyLoginResult = (result: LoginResponse) => {
    // verifica que la respuesta tiene todos los campos obligatorios
    if (!result.ok || !result.usuario || !result.rol || !result.redirectTo) {
      // si falta algo, limpia el usuario y muestra error
      setUser(null)
      setErrorMessage(result.error ?? 'Credenciales invalidas')
      return false
    }

    // si todo es valido, guarda el usuario con todos sus datos
    setUser({
      usuario: result.usuario,
      rol: result.rol,
      redirectTo: result.redirectTo,
      visitanteRegistroId: result.visitanteRegistroId,
      visitanteOrigen: result.visitanteOrigen,
      visitanteDestino: result.visitanteDestino,
      token: result.token,
    })

    return true
  }

  // login con usuario y contrasena
  const login = async (usuario: string, contrasena: string) => {
    // valida que los campos no esten vacios
    if (usuario.trim() === '' || contrasena.trim() === '') {
      setErrorMessage('Usuario y contrasena son obligatorios')
      return false
    }

    try {
      setIsLoading(true)
      setErrorMessage('')

      // envia credenciales al servidor
      const result = await loginUser(usuario, contrasena)
      return applyLoginResult(result)
    } catch {
      // si hay error de red o servidor
      setUser(null)
      setErrorMessage('No se pudo conectar con la API de login')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const loginWithGoogle = async (code: string) => {
    if (!code.trim()) {
      setErrorMessage('Código de Google inválido')
      return false
    }

    try {
      setIsLoading(true)
      setErrorMessage('')

      if (!googleLoginPromise || googleCodeInFlight !== code) {
        googleCodeInFlight = code
        const redirectUri = `${window.location.origin}/auth/google/callback`
        googleLoginPromise = loginWithGoogleCode(code, redirectUri)
      }

      const result = await googleLoginPromise
      return applyLoginResult(result)
    } catch {
      setUser(null)
      setErrorMessage('No se pudo iniciar sesión con Google')
      return false
    } finally {
      googleCodeInFlight = ''
      googleLoginPromise = null
      setIsLoading(false)
    }
  }

  const loginWithQrToken = async (token: string) => {
    if (!token.trim()) {
      setErrorMessage('Token QR invalido')
      return false
    }

    try {
      setIsLoading(true)
      setErrorMessage('')

      const result = await loginWithVisitorQrToken(token)
      return applyLoginResult(result)
    } catch {
      setUser(null)
      setErrorMessage('No se pudo validar el QR del visitante')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    setErrorMessage('')
  }

  return {
    user,
    isAuthenticated: user !== null,
    isLoading,
    errorMessage,
    googleAuthUrl,
    login,
    loginWithGoogle,
    loginWithQrToken,
    logout,
  }
}

export default useAuth

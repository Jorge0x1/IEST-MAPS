// pagina de callback para google oauth
// recibe un codigo o error de google y lo procesa
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../components'
import type { AuthUser } from '../types'

interface GoogleAuthCallbackPageProps {
  user: AuthUser | null
  onGoogleCode: (code: string) => Promise<boolean>
}

// determina a que pagina ir segun el tipo de usuario
function getUserHomePath(user: AuthUser): string {
  if (user.rol === 'administrador') return '/admin/usuarios'
  if (user.rol === 'guardia') return '/guardia'
  if (user.rol === 'visitante') return '/visitante'
  return '/inicio'
}

function GoogleAuthCallbackPage({ user, onGoogleCode }: GoogleAuthCallbackPageProps) {
  const [searchParams] = useSearchParams()
  // indica si se esta procesando el código
  const [isProcessing, setIsProcessing] = useState(true)
  const [localError, setLocalError] = useState('')
  const hasProcessedRef = useRef(false)

  // obtiene el codigo o error de la url
  const googleCode = useMemo(() => searchParams.get('code')?.trim() ?? '', [searchParams])
  const googleError = useMemo(() => searchParams.get('error')?.trim() ?? '', [searchParams])

  // procesa el codigo de google apenas carga
  // usa un ref para evitar procesar dos veces en modo estricto de react
  useEffect(() => {
    // si ya se proceso una vez, no vuelve a ejecutar
    if (hasProcessedRef.current) {
      return
    }

    // marca que el procesamiento comenzo
    hasProcessedRef.current = true
    // flag para verificar si el componente sigue montado
    let isActive = true

    const processGoogleLogin = async () => {
      // si google devolvio un error, lo muestra
      if (googleError) {
        if (isActive) {
          setLocalError('Google canceló o rechazó la autenticación')
          setIsProcessing(false)
        }
        return
      }

      // si no hay codigo, muestra error
      if (!googleCode) {
        if (isActive) {
          setLocalError('No se recibió el código de Google')
          setIsProcessing(false)
        }
        return
      }

      // envia el codigo al servidor para validar
      const success = await onGoogleCode(googleCode)
      // solo actualiza estado si el componente sigue montado
      if (isActive) {
        if (!success) {
          setLocalError('No se pudo iniciar sesión con Google')
        }
        setIsProcessing(false)
      }
    }

    void processGoogleLogin()

    return () => {
      isActive = false
    }
  }, [googleCode, googleError, onGoogleCode])

  if (user) {
    return <Navigate to={getUserHomePath(user)} replace />
  }

  return (
    <div className="app-layout">
      <PageHeader title="IEST MAPS" subtitle="Autenticando con Google" />
      <main className="auth-content">
        <section className="login-box-react" aria-label="Resultado de autenticación con Google">
          <h2>Acceso con Google</h2>
          {isProcessing ? <p>Validando tu cuenta institucional...</p> : null}
          {!isProcessing && localError ? <p className="login-error">{localError}</p> : null}
          {!isProcessing && localError ? (
            <Link to="/login" className="google-btn-react">
              Volver al login
            </Link>
          ) : null}
        </section>
      </main>
    </div>
  )
}

export default GoogleAuthCallbackPage

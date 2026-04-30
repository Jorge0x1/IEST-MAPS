// pagina de acceso para visitantes con codigo qr
// recibe un token en la url y lo valida
import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import type { AuthUser } from '../types'

interface VisitorQrAccessPageProps {
  user: AuthUser | null
  isLoading: boolean
  onQrLogin: (token: string) => Promise<boolean>
}

function VisitorQrAccessPage({ user, isLoading, onQrLogin }: VisitorQrAccessPageProps) {
  const [searchParams] = useSearchParams()
  // obtiene el token de la url
  const token = useMemo(() => searchParams.get('token')?.trim() || '', [searchParams])
  const [errorMessage, setErrorMessage] = useState('')
  const loginStartedRef = useRef(false)

  // intenta autenticar con el token apenas carga
  // usa un ref para evitar ejecutar el login mas de una vez
  useEffect(() => {
    // si no hay token o ya se inicio sesion, no hace nada
    if (!token || loginStartedRef.current) {
      return
    }

    // marca que el login ya se intento
    loginStartedRef.current = true
    
    // ejecuta el login de forma asincrona sin bloquear
    void (async () => {
      // intenta validar el token con el servidor
      const success = await onQrLogin(token)
      // si falla, muestra error
      if (!success) {
        setErrorMessage('No se pudo validar el QR. Solicita uno nuevo al guardia.')
      }
      // si es exitoso, la redirección sucede automaticamente
      // porque el usuario cambia de null a visitante
    })()
  }, [token, onQrLogin])

  if (user?.rol === 'visitante') {
    return <Navigate to="/visitante" replace />
  }

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="app-layout">
      <main className="auth-content">
        <section className="auth-card" aria-label="Acceso por QR de visitante">
          <h2>Acceso de Visitante</h2>
          <p>{isLoading ? 'Validando QR...' : 'Preparando acceso...'}</p>
          {errorMessage ? <p className="error">{errorMessage}</p> : null}
        </section>
      </main>
    </div>
  )
}

export default VisitorQrAccessPage

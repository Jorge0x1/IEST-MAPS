import { Navigate } from 'react-router-dom'
import { LoginForm, PageHeader } from '../components'
import type { AuthUser } from '../types'

// determina a cual pagina ir segun el tipo de usuario
// administrador: pagina de usuarios
// guardia: pagina de guardias
// visitante: pagina de visitantes
// otros: inicio por defecto
function getUserHomePath(user: AuthUser): string {
  if (user.rol === 'administrador') return '/admin/usuarios'
  if (user.rol === 'guardia') return '/guardia'
  if (user.rol === 'visitante') return '/visitante'
  return '/inicio'
}

interface LoginPageProps {
  user: AuthUser | null
  isLoading: boolean
  errorMessage: string
  googleAuthUrl: string
  onLogin: (usuario: string, contrasena: string) => Promise<boolean>
}

function LoginPage({ user, isLoading, errorMessage, googleAuthUrl, onLogin }: LoginPageProps) {
  // si ya hay usuario logueado, redirige a su pagina principal
  if (user) {
    return <Navigate to={getUserHomePath(user)} replace />
  }

  // procesa el login del formulario
  const handleLogin = async (usuario: string, contrasena: string) => {
    return onLogin(usuario, contrasena)
  }

  return (
    <div className="app-layout">
      <PageHeader title="IEST MAPS" subtitle="Inicia sesión para continuar" />
      <main className="auth-content">
        <LoginForm
          isLoading={isLoading}
          errorMessage={errorMessage}
          googleAuthUrl={googleAuthUrl}
          onSubmit={handleLogin}
        />
      </main>
    </div>
  )
}

export default LoginPage

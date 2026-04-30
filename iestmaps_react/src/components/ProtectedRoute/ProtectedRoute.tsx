// ruta protegida: redirige a login si no esta autenticado
import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'

interface ProtectedRouteProps {
  isAuthenticated: boolean
  children: ReactNode
}

function ProtectedRoute({ isAuthenticated, children }: ProtectedRouteProps) {
  // si no esta logueado, va al login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // si esta logueado, muestra el contenido
  return children
}

export default ProtectedRoute

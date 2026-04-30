import './App.css'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components'
import { useAuth } from './hooks'
import {
  AdminCreateOficinaPage,
  AdminCreateSalonPage,
  AdminCreateUserPage,
  AdminSalonesPage,
  AdminUsersPage,
  GuardHistoryPage,
  GuardPage,
  GoogleAuthCallbackPage,
  LoginPage,
  MapPage,
  VisitorPage,
  VisitorQrAccessPage,
} from './pages'

// determina la pagina por defecto segun el rol del usuario
// administrador -> manejo de usuarios
// guardia -> registro de visitantes
// visitante -> ver su ruta asignada
// otros -> mapa principal
function getDefaultPrivateRoute(userRole?: string): string {
  if (userRole === 'administrador') return '/admin/usuarios'
  if (userRole === 'guardia') return '/guardia'
  if (userRole === 'visitante') return '/visitante'
  return '/inicio'
}

// componente principal que gestiona el enrutamiento de toda la aplicacion
function App() {
  // hook que maneja autenticacion, login, logout, tokens, etc
  const {
    user,
    isAuthenticated,
    isLoading: isLoginLoading,
    errorMessage: loginError,
    googleAuthUrl,
    login,
    loginWithGoogle,
    logout,
    loginWithQrToken,
  } = useAuth()

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <LoginPage
            user={user}
            isLoading={isLoginLoading}
            errorMessage={loginError}
            googleAuthUrl={googleAuthUrl}
            onLogin={login}
          />
        }
      />
      <Route
        path="/auth/google/callback"
        element={<GoogleAuthCallbackPage user={user} onGoogleCode={loginWithGoogle} />}
      />
      <Route
        path="/visitante/acceso"
        element={<VisitorQrAccessPage user={user} isLoading={isLoginLoading} onQrLogin={loginWithQrToken} />}
      />
      <Route
        path="/inicio"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            {user ? (
              user.rol === 'visitante' || user.rol === 'administrador' ? (
                <Navigate to={getDefaultPrivateRoute(user.rol)} replace />
              ) : (
                <MapPage user={user} onLogout={logout} />
              )
            ) : (
              <Navigate to="/login" replace />
            )}
          </ProtectedRoute>
        }
      />
      <Route
        path="/guardia"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            {user?.rol === 'guardia' ? (
              <GuardPage user={user} onLogout={logout} />
            ) : (
              <Navigate to={getDefaultPrivateRoute(user?.rol)} replace />
            )}
          </ProtectedRoute>
        }
      />
      <Route
        path="/guardia/historial"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            {user?.rol === 'guardia' ? (
              <GuardHistoryPage user={user} onLogout={logout} />
            ) : (
              <Navigate to={getDefaultPrivateRoute(user?.rol)} replace />
            )}
          </ProtectedRoute>
        }
      />
      <Route
        path="/visitante"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            {user?.rol === 'visitante' ? (
              <VisitorPage user={user} onLogout={logout} />
            ) : (
              <Navigate to={getDefaultPrivateRoute(user?.rol)} replace />
            )}
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/usuarios"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            {user?.rol === 'administrador' ? (
              <AdminUsersPage user={user} onLogout={logout} />
            ) : (
              <Navigate to={getDefaultPrivateRoute(user?.rol)} replace />
            )}
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/salones"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            {user?.rol === 'administrador' ? (
              <AdminSalonesPage user={user} onLogout={logout} />
            ) : (
              <Navigate to={getDefaultPrivateRoute(user?.rol)} replace />
            )}
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/usuarios/alta"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            {user?.rol === 'administrador' ? (
              <AdminCreateUserPage user={user} onLogout={logout} />
            ) : (
              <Navigate to={getDefaultPrivateRoute(user?.rol)} replace />
            )}
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/salones/alta"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            {user?.rol === 'administrador' ? (
              <AdminCreateSalonPage user={user} onLogout={logout} />
            ) : (
              <Navigate to={getDefaultPrivateRoute(user?.rol)} replace />
            )}
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/oficinas/alta"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            {user?.rol === 'administrador' ? (
              <AdminCreateOficinaPage user={user} onLogout={logout} />
            ) : (
              <Navigate to={getDefaultPrivateRoute(user?.rol)} replace />
            )}
          </ProtectedRoute>
        }
      />
      <Route
        path="*"
        element={<Navigate to={isAuthenticated ? getDefaultPrivateRoute(user?.rol) : '/login'} replace />}
      />
    </Routes>
  )
}

export default App

// formulario para crear un nuevo usuario en el sistema
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminSidebar, PageHeader } from '../components'
import { createAdminUser } from '../services/api'
import type { AuthUser } from '../types'
import './AdminPages.css'

interface AdminCreateUserPageProps {
  user: AuthUser
  onLogout: () => void
}

function AdminCreateUserPage({ user, onLogout }: AdminCreateUserPageProps) {
  const navigate = useNavigate()
  // campos del formulario de alta de usuario
  const [nombre, setNombre] = useState('')
  const [usuario, setUsuario] = useState('')
  const [rol, setRol] = useState('')
  const [contrasena, setContrasena] = useState('')
  // estado para mostrar errores si algo sale mal
  const [errorMessage, setErrorMessage] = useState('')

  // envia los datos del nuevo usuario al servidor
  // si es exitoso, vuelve a la pagina de lista
  // si hay error, lo muestra en pantalla
  const handleSubmit = async () => {
    // limpia mensajes de error previos
    setErrorMessage('')

    // envia los datos al servidor
    const result = await createAdminUser({ nombre, usuario, rol, contrasena })
    // verifica si la operacion fue exitosa
    if (!result.ok) {
      // muestra el error
      setErrorMessage(result.error ?? 'No se pudo crear el usuario')
      return
    }

    // si fue exitoso, navega a la lista de usuarios
    navigate('/admin/usuarios')
  }

  return (
    <div className="app-layout">
      <PageHeader title="Alta de Usuario" actionLabel="Cerrar sesión" actionUser={user.usuario} onAction={onLogout} />
      <main className="admin-content admin-create-content">
        <AdminSidebar />
        <section className="admin-form-card admin-create-card">
          <h3>Alta de Usuario</h3>
          <label>
            Nombre
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </label>
          <label>
            Usuario
            <input value={usuario} onChange={(e) => setUsuario(e.target.value)} />
          </label>
          <label>
            Rol
            <select value={rol} onChange={(e) => setRol(e.target.value)}>
              <option value="">Seleccione un rol</option>
              <option value="Alumno">Alumno</option>
              <option value="Maestro">Maestro</option>
              <option value="Guardia">Guardia</option>
              <option value="Administrador">Administrador</option>
            </select>
          </label>
          <label>
            Contraseña
            <input type="text" value={contrasena} onChange={(e) => setContrasena(e.target.value)} />
          </label>
          {errorMessage ? <p className="admin-message error">{errorMessage}</p> : null}
          <div className="admin-modal-actions">
            <button type="button" className="admin-btn-cancel" onClick={() => navigate('/admin/usuarios')}>Cancelar</button>
            <button type="button" onClick={() => void handleSubmit()}>Crear</button>
          </div>
        </section>
      </main>
    </div>
  )
}

export default AdminCreateUserPage

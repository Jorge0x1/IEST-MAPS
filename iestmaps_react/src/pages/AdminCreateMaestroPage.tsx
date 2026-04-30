// formulario para crear un nuevo maestro base
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminSidebar, PageHeader } from '../components'
import { createAdminMaestro } from '../services/api'
import type { AuthUser } from '../types'
import './AdminPages.css'

interface AdminCreateMaestroPageProps {
  user: AuthUser
  onLogout: () => void
}

function AdminCreateMaestroPage({ user, onLogout }: AdminCreateMaestroPageProps) {
  const navigate = useNavigate()
  const [idIest, setIdIest] = useState('')
  const [nombre, setNombre] = useState('')
  const [usuario, setUsuario] = useState('')
  const [area, setArea] = useState('')
  const [idOficina, setIdOficina] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  // envia datos del nuevo maestro base al servidor
  // un maestro base es un profesor o personal administrativo
  const handleSubmit = async () => {
    // limpia errores previos
    setErrorMessage('')

    // envia: idIest, nombre, usuario, area, idOficina, contrasena
    const result = await createAdminMaestro({
      idIest: Number(idIest),
      nombre,
      usuario,
      area,
      idOficina: Number(idOficina),
      contrasena,
    })

    // verifica si la creacion fue exitosa
    if (!result.ok) {
      // muestra error pero mantiene los datos
      setErrorMessage(result.error ?? 'No se pudo crear el maestro base')
      return
    }

    // si todo esta bien, vuelve a usuarios
    navigate('/admin/usuarios')
  }

  return (
    <div className="app-layout">
      <PageHeader title="Alta de Maestro Base" actionLabel="Cerrar sesión" actionUser={user.usuario} onAction={onLogout} />
      <main className="admin-content admin-create-content">
        <AdminSidebar />
        <section className="admin-form-card admin-create-card">
          <h3>Alta de Maestro Base</h3>
          <label>
            ID IEST
            <input type="number" value={idIest} onChange={(e) => setIdIest(e.target.value)} />
          </label>
          <label>
            Nombre
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </label>
          <label>
            Usuario
            <input value={usuario} onChange={(e) => setUsuario(e.target.value)} />
          </label>
          <label>
            Área
            <input value={area} onChange={(e) => setArea(e.target.value)} />
          </label>
          <label>
            ID Oficina
            <input type="number" value={idOficina} onChange={(e) => setIdOficina(e.target.value)} />
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

export default AdminCreateMaestroPage

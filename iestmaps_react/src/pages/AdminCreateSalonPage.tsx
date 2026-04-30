// formulario para crear un nuevo salon
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminSidebar, PageHeader } from '../components'
import { createAdminSalon } from '../services/api'
import type { AuthUser } from '../types'
import './AdminPages.css'

interface AdminCreateSalonPageProps {
  user: AuthUser
  onLogout: () => void
}

function AdminCreateSalonPage({ user, onLogout }: AdminCreateSalonPageProps) {
  const navigate = useNavigate()
  const [numeroSalon, setNumeroSalon] = useState('')
  const [edificio, setEdificio] = useState('')
  const [piso, setPiso] = useState('')
  const [uso, setUso] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  // envia datos del nuevo salon al servidor
  // valida que los campos numericos tengan valores validos
  const handleSubmit = async () => {
    // limpia mensajes de error previos
    setErrorMessage('')

    // envia: numero de salon, edificio, piso, uso
    const result = await createAdminSalon({
      numeroSalon: Number(numeroSalon),
      edificio: Number(edificio),
      piso: Number(piso),
      uso,
    })

    // verifica si la operacion fue exitosa
    if (!result.ok) {
      // muestra el error sin perder los datos del formulario
      setErrorMessage(result.error ?? 'No se pudo crear el salón')
      return
    }

    // si tiene exito, vuelve a la lista de salones
    navigate('/admin/salones')
  }

  return (
    <div className="app-layout">
      <PageHeader title="Alta de Salón" actionLabel="Cerrar sesión" actionUser={user.usuario} onAction={onLogout} />
      <main className="admin-content admin-create-content">
        <AdminSidebar />
        <section className="admin-form-card admin-create-card">
          <h3>Alta de Salón</h3>
          <label>
            Número de salón
            <input type="number" value={numeroSalon} onChange={(e) => setNumeroSalon(e.target.value)} />
          </label>
          <label>
            Edificio
            <input type="number" value={edificio} onChange={(e) => setEdificio(e.target.value)} />
          </label>
          <label>
            Piso
            <input type="number" value={piso} onChange={(e) => setPiso(e.target.value)} />
          </label>
          <label>
            Uso
            <input value={uso} onChange={(e) => setUso(e.target.value)} />
          </label>
          {errorMessage ? <p className="admin-message error">{errorMessage}</p> : null}
          <div className="admin-modal-actions">
            <button type="button" className="admin-btn-cancel" onClick={() => navigate('/admin/salones')}>Cancelar</button>
            <button type="button" onClick={() => void handleSubmit()}>Crear</button>
          </div>
        </section>
      </main>
    </div>
  )
}

export default AdminCreateSalonPage

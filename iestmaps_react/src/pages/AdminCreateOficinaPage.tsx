// formulario para crear una nueva oficina
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminSidebar, PageHeader } from '../components'
import { createAdminOficina } from '../services/api'
import type { AuthUser } from '../types'
import './AdminPages.css'

interface AdminCreateOficinaPageProps {
  user: AuthUser
  onLogout: () => void
}

function AdminCreateOficinaPage({ user, onLogout }: AdminCreateOficinaPageProps) {
  const navigate = useNavigate()
  const [idOficina, setIdOficina] = useState('')
  const [edificio, setEdificio] = useState('')
  const [piso, setPiso] = useState('')
  const [lugar, setLugar] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  // envia datos de la nueva oficina al servidor
  // una oficina es una dependencia especifica del edificio
  const handleSubmit = async () => {
    // limpia errores previos
    setErrorMessage('')

    // envia: idOficina, edificio, piso, lugar/area
    const result = await createAdminOficina({
      idOficina: Number(idOficina),
      edificio: Number(edificio),
      piso: Number(piso),
      lugar,
    })

    // verifica si la creacion fue exitosa
    if (!result.ok) {
      // muestra error sin perder datos del formulario
      setErrorMessage(result.error ?? 'No se pudo crear la oficina')
      return
    }

    // si tiene exito, vuelve a salones
    navigate('/admin/salones')
  }

  return (
    <div className="app-layout">
      <PageHeader title="Alta de Oficina" actionLabel="Cerrar sesión" actionUser={user.usuario} onAction={onLogout} />
      <main className="admin-content admin-create-content">
        <AdminSidebar />
        <section className="admin-form-card admin-create-card">
          <h3>Alta de Oficina</h3>
          <label>
            ID Oficina
            <input type="number" value={idOficina} onChange={(e) => setIdOficina(e.target.value)} />
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
            Área / Lugar
            <input value={lugar} onChange={(e) => setLugar(e.target.value)} />
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

export default AdminCreateOficinaPage

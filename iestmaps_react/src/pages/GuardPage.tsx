import { useCallback, useRef, useState } from 'react'
import type { FormEventHandler } from 'react'
import { GuardSidebar, PageHeader } from '../components'
import { useDialogFocusTrap } from '../hooks'
import { createVisitor } from '../services/api'
import type { AuthUser } from '../types'
import './GuardPage.css'

interface GuardPageProps {
  user: AuthUser
  onLogout: () => void
}

function GuardPage({ user, onLogout }: GuardPageProps) {
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [motivo, setMotivo] = useState('')
  const [destino, setDestino] = useState('')
  const [qrLoginUrl, setQrLoginUrl] = useState('')
  const [isQrOpen, setIsQrOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const submitButtonRef = useRef<HTMLButtonElement | null>(null)
  const qrModalRef = useRef<HTMLElement | null>(null)
  const qrCloseButtonRef = useRef<HTMLButtonElement | null>(null)
  const publicAppUrl = (import.meta.env.VITE_PUBLIC_APP_URL || '').toString().trim()

  const clearForm = () => {
    setNombre('')
    setTelefono('')
    setMotivo('')
    setDestino('')
  }

  // procesa el formulario de registro de visitante
  // valida datos, crea visitante en backend, genera qr/credenciales
  const handleSubmit: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    try {
      setIsSaving(true)
      // envia datos al servidor: nombre, telefono, motivo visita, destino
      const result = await createVisitor({
        nombre,
        telefono,
        motivo,
        destino,
      })

      // si falla, muestra error
      if (!result.ok) {
        setErrorMessage(result.error ?? 'No se pudo registrar el visitante')
        return
      }

      // construye la url con la que el visitante accede por QR
      // si hay qrToken, usa acceso por QR (mas seguro)
      // sino usa usuario/contraseña generada
      const usuarioVisitante = result.usuario ?? ''
      const contrasenaVisitante = result.contrasena ?? ''
      const appBaseUrl = publicAppUrl || window.location.origin
      const qrToken = (result.qrToken || '').trim()
      const loginUrl = qrToken
        ? `${appBaseUrl}/visitante/acceso?token=${encodeURIComponent(qrToken)}`
        : `${appBaseUrl}/login?usuario=${encodeURIComponent(usuarioVisitante)}&contrasena=${encodeURIComponent(contrasenaVisitante)}`

      // muestra el codigo QR
      setQrLoginUrl(loginUrl)
      setIsQrOpen(true)

      // muestra exito y limpia formulario
      setSuccessMessage(result.message ?? 'Visitante registrado con exito')
      clearForm()
    } catch {
      // error de conexion con el servidor
      setErrorMessage('No se pudo conectar con la API de visitantes')
    } finally {
      setIsSaving(false)
    }
  }

  // cierra el modal del codigo qr
  const closeQrModal = useCallback(() => {
    setIsQrOpen(false)
  }, [])

  // aplica accesibilidad de teclado al modal del qr
  // escape cierra, tab circula, foco vuelve al boton que abrio

  useDialogFocusTrap({
    isOpen: isQrOpen,
    containerRef: qrModalRef,
    onClose: closeQrModal,
    initialFocusRef: qrCloseButtonRef,
    returnFocusRef: submitButtonRef,
  })

  return (
    <div className="app-layout">
      <PageHeader title="IEST MAPS" actionLabel="Cerrar sesión" actionUser={user.usuario} onAction={onLogout} />

      <main className="guard-content guard-register-content">
        <GuardSidebar />

        <section className="guard-card guard-register-card" aria-label="Registro de visitantes">
          <h2>Registro de Visitantes</h2>

          <form onSubmit={handleSubmit} className="guard-form guard-register-form">
            <label>
              Nombre
              <input value={nombre} onChange={(event) => setNombre(event.target.value)} required />
            </label>

            <label>
              Teléfono
              <input value={telefono} onChange={(event) => setTelefono(event.target.value)} required />
            </label>

            <label>
              Motivo
              <input value={motivo} onChange={(event) => setMotivo(event.target.value)} required />
            </label>

            <label>
              Destino
              <input value={destino} onChange={(event) => setDestino(event.target.value)} required />
            </label>

            <button type="submit" disabled={isSaving} ref={submitButtonRef}>
              {isSaving ? 'Registrando...' : 'Registrar'}
            </button>
          </form>

          {errorMessage ? <p className="guard-message error">{errorMessage}</p> : null}
          {successMessage ? <p className="guard-message success">{successMessage}</p> : null}
        </section>

        {isQrOpen ? (
          <div className="guard-qr-overlay" role="dialog" aria-modal="true" aria-label="QR de acceso visitante">
            <section className="guard-qr-modal" ref={qrModalRef}>
              <h3>QR del Visitante</h3>
              <img
                className="guard-qr-image"
                src={`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(qrLoginUrl)}`}
                alt="Codigo QR de acceso para visitante"
              />
              {qrLoginUrl.includes('localhost') || qrLoginUrl.includes('127.0.0.1') ? (
                <p className="guard-qr-warning">Este QR apunta a localhost. Para abrirlo en telefono usa una URL publica o tunel (ngrok/cloudflared).</p>
              ) : null}
              <a className="guard-qr-link" href={qrLoginUrl} target="_blank" rel="noreferrer">Abrir link de acceso</a>
              <button type="button" onClick={closeQrModal} ref={qrCloseButtonRef}>Cerrar</button>
            </section>
          </div>
        ) : null}
      </main>
    </div>
  )
}

export default GuardPage

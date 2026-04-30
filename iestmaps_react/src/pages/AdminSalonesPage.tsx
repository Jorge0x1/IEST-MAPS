// pagina para administrar salones y oficinas del campus
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { AdminSidebar, PageHeader } from '../components'
import { useDialogFocusTrap } from '../hooks'
import {
  createAdminOficina,
  createAdminSalon,
  deleteAdminOficina,
  deleteAdminSalon,
  fetchAdminSalonesOficinas,
  updateAdminOficina,
  updateAdminSalon,
} from '../services/api'
import type { AdminOficina, AdminSalon, AuthUser } from '../types'
import './AdminPages.css'

interface AdminSalonesPageProps {
  user: AuthUser
  onLogout: () => void
}

function AdminSalonesPage({ user, onLogout }: AdminSalonesPageProps) {
  const MODAL_EXIT_MS = 180
  // listas de salones y oficinas
  const [searchText, setSearchText] = useState('')
  const [salones, setSalones] = useState<AdminSalon[]>([])
  const [oficinas, setOficinas] = useState<AdminOficina[]>([])
  // estados de error y exito
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // cual salon u oficina esta siendo editado
  const [creatingSalon, setCreatingSalon] = useState(false)
  const [creatingOficina, setCreatingOficina] = useState(false)
  const [editingSalon, setEditingSalon] = useState<AdminSalon | null>(null)
  const [editingOficina, setEditingOficina] = useState<AdminOficina | null>(null)
  const [closingModal, setClosingModal] = useState<
    'create-salon' | 'create-oficina' | 'edit-salon' | 'edit-oficina' | null
  >(null)
  const [newSalon, setNewSalon] = useState({
    numeroSalon: '',
    edificio: '',
    piso: '',
    uso: '',
  })
  const [newOficina, setNewOficina] = useState({
    idOficina: '',
    edificio: '',
    piso: '',
    lugar: '',
  })
  const modalTriggerRef = useRef<HTMLButtonElement | null>(null)
  const closeTimerRef = useRef<number | null>(null)
  const createSalonModalRef = useRef<HTMLElement | null>(null)
  const createOficinaModalRef = useRef<HTMLElement | null>(null)
  const salonModalRef = useRef<HTMLElement | null>(null)
  const oficinaModalRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current)
      }
    }
  }, [])

  // carga la lista de salones y oficinas
  const loadData = async () => {
    try {
      setErrorMessage('')
      const result = await fetchAdminSalonesOficinas()
      if (!result.ok) {
        setErrorMessage(result.error ?? 'No se pudieron cargar salones y oficinas')
        return
      }

      setSalones(result.salones ?? [])
      setOficinas(result.oficinas ?? [])
    } catch {
      setErrorMessage('No se pudo conectar con la API de administrador')
    }
  }

  useEffect(() => {
    // Initial async fetch updates local state once data arrives.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData()
  }, [])

  const visibleSalones = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    if (!q) return salones
    return salones.filter((s) => `${s.numero_salon}`.includes(q))
  }, [salones, searchText])

  const visibleOficinas = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    if (!q) return oficinas
    return oficinas.filter((o) => o.lugar.toLowerCase().includes(q))
  }, [oficinas, searchText])

  const handleUpdateSalon = async () => {
    if (!editingSalon) return

    const result = await updateAdminSalon(editingSalon.numero_salon, {
      numeroSalon: Number(editingSalon.numero_salon),
      edificio: Number(editingSalon.edificio),
      piso: Number(editingSalon.piso),
      uso: editingSalon.uso,
    })

    if (!result.ok) {
      setErrorMessage(result.error ?? 'No se pudo actualizar el salón')
      return
    }

    setSuccessMessage(result.message ?? 'Salón actualizado')
    setEditingSalon(null)
    loadData()
  }

  const handleUpdateOficina = async () => {
    if (!editingOficina) return

    const result = await updateAdminOficina(editingOficina.ID_oficina, {
      idOficina: Number(editingOficina.ID_oficina),
      edificio: Number(editingOficina.edificio),
      piso: Number(editingOficina.piso),
      lugar: editingOficina.lugar,
    })

    if (!result.ok) {
      setErrorMessage(result.error ?? 'No se pudo actualizar la oficina')
      return
    }

    setSuccessMessage(result.message ?? 'Oficina actualizada')
    setEditingOficina(null)
    loadData()
  }

  const handleDeleteSalon = async (numero: number) => {
    if (!window.confirm('¿Eliminar salón?')) return

    const result = await deleteAdminSalon(numero)
    if (!result.ok) {
      setErrorMessage(result.error ?? 'No se pudo eliminar el salón')
      return
    }

    setSuccessMessage(result.message ?? 'Salón eliminado')
    loadData()
  }

  const handleDeleteOficina = async (id: number) => {
    if (!window.confirm('¿Eliminar oficina?')) return

    const result = await deleteAdminOficina(id)
    if (!result.ok) {
      setErrorMessage(result.error ?? 'No se pudo eliminar la oficina')
      return
    }

    setSuccessMessage(result.message ?? 'Oficina eliminada')
    loadData()
  }

  const handleCreateSalon = async () => {
    setErrorMessage('')
    setSuccessMessage('')

    const result = await createAdminSalon({
      numeroSalon: Number(newSalon.numeroSalon),
      edificio: Number(newSalon.edificio),
      piso: Number(newSalon.piso),
      uso: newSalon.uso,
    })

    if (!result.ok) {
      setErrorMessage(result.error ?? 'No se pudo crear el salón')
      return
    }

    setSuccessMessage(result.message ?? 'Salón creado')
    closeCreateSalonModal()
    setNewSalon({ numeroSalon: '', edificio: '', piso: '', uso: '' })
    loadData()
  }

  const handleCreateOficina = async () => {
    setErrorMessage('')
    setSuccessMessage('')

    const result = await createAdminOficina({
      idOficina: Number(newOficina.idOficina),
      edificio: Number(newOficina.edificio),
      piso: Number(newOficina.piso),
      lugar: newOficina.lugar,
    })

    if (!result.ok) {
      setErrorMessage(result.error ?? 'No se pudo crear la oficina')
      return
    }

    setSuccessMessage(result.message ?? 'Oficina creada')
    closeCreateOficinaModal()
    setNewOficina({ idOficina: '', edificio: '', piso: '', lugar: '' })
    loadData()
  }

  const closeModalWithAnimation = useCallback(
    (
      modal: 'create-salon' | 'create-oficina' | 'edit-salon' | 'edit-oficina',
      onClose: () => void,
    ) => {
      if (closingModal === modal) {
        return
      }

      setClosingModal(modal)
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current)
      }

      closeTimerRef.current = window.setTimeout(() => {
        onClose()
        setClosingModal((current) => (current === modal ? null : current))
        closeTimerRef.current = null
      }, MODAL_EXIT_MS)
    },
    [MODAL_EXIT_MS, closingModal],
  )

  const closeSalonModal = useCallback(() => {
    closeModalWithAnimation('edit-salon', () => {
      setEditingSalon(null)
    })
  }, [closeModalWithAnimation])

  const closeOficinaModal = useCallback(() => {
    closeModalWithAnimation('edit-oficina', () => {
      setEditingOficina(null)
    })
  }, [closeModalWithAnimation])

  const closeCreateSalonModal = useCallback(() => {
    closeModalWithAnimation('create-salon', () => {
      setCreatingSalon(false)
    })
  }, [closeModalWithAnimation])

  const closeCreateOficinaModal = useCallback(() => {
    closeModalWithAnimation('create-oficina', () => {
      setCreatingOficina(false)
    })
  }, [closeModalWithAnimation])

  const handleOpenCreateSalonModal = (event: MouseEvent<HTMLButtonElement>) => {
    setClosingModal(null)
    modalTriggerRef.current = event.currentTarget
    setErrorMessage('')
    setCreatingSalon(true)
  }

  const handleOpenCreateOficinaModal = (event: MouseEvent<HTMLButtonElement>) => {
    setClosingModal(null)
    modalTriggerRef.current = event.currentTarget
    setErrorMessage('')
    setCreatingOficina(true)
  }

  const handleOpenSalonModal = (event: MouseEvent<HTMLButtonElement>, salonItem: AdminSalon) => {
    setClosingModal(null)
    modalTriggerRef.current = event.currentTarget
    setEditingSalon(salonItem)
  }

  const handleOpenOficinaModal = (event: MouseEvent<HTMLButtonElement>, oficinaItem: AdminOficina) => {
    setClosingModal(null)
    modalTriggerRef.current = event.currentTarget
    setEditingOficina(oficinaItem)
  }

  const isCreateSalonModalVisible = creatingSalon || closingModal === 'create-salon'
  const isCreateSalonModalClosing = closingModal === 'create-salon'
  const isCreateOficinaModalVisible = creatingOficina || closingModal === 'create-oficina'
  const isCreateOficinaModalClosing = closingModal === 'create-oficina'
  const isEditSalonModalVisible = Boolean(editingSalon) || closingModal === 'edit-salon'
  const isEditSalonModalClosing = closingModal === 'edit-salon'
  const isEditOficinaModalVisible = Boolean(editingOficina) || closingModal === 'edit-oficina'
  const isEditOficinaModalClosing = closingModal === 'edit-oficina'

  useDialogFocusTrap({
    isOpen: Boolean(creatingSalon),
    containerRef: createSalonModalRef,
    onClose: closeCreateSalonModal,
    returnFocusRef: modalTriggerRef,
  })

  useDialogFocusTrap({
    isOpen: Boolean(creatingOficina),
    containerRef: createOficinaModalRef,
    onClose: closeCreateOficinaModal,
    returnFocusRef: modalTriggerRef,
  })

  useDialogFocusTrap({
    isOpen: Boolean(editingSalon),
    containerRef: salonModalRef,
    onClose: closeSalonModal,
    returnFocusRef: modalTriggerRef,
  })

  useDialogFocusTrap({
    isOpen: Boolean(editingOficina),
    containerRef: oficinaModalRef,
    onClose: closeOficinaModal,
    returnFocusRef: modalTriggerRef,
  })

  return (
    <div className="app-layout">
      <PageHeader title="Salones y Oficinas" actionLabel="Cerrar sesión" actionUser={user.usuario} onAction={onLogout} />

      <main className="admin-content">
        <AdminSidebar />

        <section className="admin-card admin-card-wide" aria-label="Administración de salones y oficinas">
          <div className="admin-actions">
            <button type="button" className="admin-action-link" onClick={handleOpenCreateSalonModal}>
              Agregar Salón
            </button>
            <button type="button" className="admin-action-link" onClick={handleOpenCreateOficinaModal}>
              Agregar Oficina
            </button>
          </div>

          <div className="admin-search">
            <input
              type="text"
              placeholder="Buscar por número de salón o área"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
            <button
              type="button"
              onClick={() => {
                setSearchText('')
              }}
            >
              Ver todos
            </button>
          </div>

          {errorMessage ? (
            <p className="admin-message error" role="alert" aria-live="assertive">
              {errorMessage}
            </p>
          ) : null}
          {successMessage ? (
            <p className="admin-message success" role="status" aria-live="polite">
              {successMessage}
            </p>
          ) : null}

          <div className="admin-table-pair">
            <section className="admin-table-panel" aria-label="Tabla de salones">
              <h3>Salones</h3>
              <div className="admin-table-wrap admin-table-wrap-scroll">
                <table className="admin-table admin-table-salones">
                  <thead>
                    <tr>
                      <th>Número</th>
                      <th>Edificio</th>
                      <th>Piso</th>
                      <th>Uso</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleSalones.map((s) => (
                      <tr key={s.numero_salon}>
                        <td>{s.numero_salon}</td>
                        <td>{s.edificio}</td>
                        <td>{s.piso}</td>
                        <td>{s.uso}</td>
                        <td className="admin-actions-cell">
                          <button type="button" className="admin-btn-edit" onClick={(event) => handleOpenSalonModal(event, s)}>Editar</button>
                          <button type="button" onClick={() => void handleDeleteSalon(s.numero_salon)}>Eliminar</button>
                        </td>
                      </tr>
                    ))}
                    {visibleSalones.length === 0 ? (
                      <tr className="admin-empty-row">
                        <td colSpan={5}>No hay salones registrados.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="admin-table-panel" aria-label="Tabla de oficinas">
              <h3>Oficinas</h3>
              <div className="admin-table-wrap admin-table-wrap-scroll">
                <table className="admin-table admin-table-oficinas">
                  <thead>
                    <tr>
                      <th>ID Oficina</th>
                      <th>Edificio</th>
                      <th>Piso</th>
                      <th>Área</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleOficinas.map((o) => (
                      <tr key={o.ID_oficina}>
                        <td>{o.ID_oficina}</td>
                        <td>{o.edificio}</td>
                        <td>{o.piso}</td>
                        <td>{o.lugar}</td>
                        <td className="admin-actions-cell">
                          <button type="button" className="admin-btn-edit" onClick={(event) => handleOpenOficinaModal(event, o)}>Editar</button>
                          <button type="button" onClick={() => void handleDeleteOficina(o.ID_oficina)}>Eliminar</button>
                        </td>
                      </tr>
                    ))}
                    {visibleOficinas.length === 0 ? (
                      <tr className="admin-empty-row">
                        <td colSpan={5}>No hay oficinas registrados.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </section>
      </main>

      {isCreateSalonModalVisible ? (
        <div
          className={`admin-modal-overlay ${isCreateSalonModalClosing ? 'is-closing' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label="Crear salón"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeCreateSalonModal()
            }
          }}
        >
          <section className="admin-modal-card" ref={createSalonModalRef}>
            <h3>Alta de Salón</h3>
            <label>
              Número de salón
              <input
                type="number"
                value={newSalon.numeroSalon}
                onChange={(e) => setNewSalon((p) => ({ ...p, numeroSalon: e.target.value }))}
              />
            </label>
            <label>
              Edificio
              <input
                type="number"
                value={newSalon.edificio}
                onChange={(e) => setNewSalon((p) => ({ ...p, edificio: e.target.value }))}
              />
            </label>
            <label>
              Piso
              <input
                type="number"
                value={newSalon.piso}
                onChange={(e) => setNewSalon((p) => ({ ...p, piso: e.target.value }))}
              />
            </label>
            <label>
              Uso
              <input
                value={newSalon.uso}
                onChange={(e) => setNewSalon((p) => ({ ...p, uso: e.target.value }))}
              />
            </label>
            <div className="admin-modal-actions">
              <button type="button" className="admin-btn-cancel" onClick={closeCreateSalonModal}>Cancelar</button>
              <button type="button" onClick={() => void handleCreateSalon()}>Crear</button>
            </div>
          </section>
        </div>
      ) : null}

      {isCreateOficinaModalVisible ? (
        <div
          className={`admin-modal-overlay ${isCreateOficinaModalClosing ? 'is-closing' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label="Crear oficina"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeCreateOficinaModal()
            }
          }}
        >
          <section className="admin-modal-card" ref={createOficinaModalRef}>
            <h3>Alta de Oficina</h3>
            <label>
              ID Oficina
              <input
                type="number"
                value={newOficina.idOficina}
                onChange={(e) => setNewOficina((p) => ({ ...p, idOficina: e.target.value }))}
              />
            </label>
            <label>
              Edificio
              <input
                type="number"
                value={newOficina.edificio}
                onChange={(e) => setNewOficina((p) => ({ ...p, edificio: e.target.value }))}
              />
            </label>
            <label>
              Piso
              <input
                type="number"
                value={newOficina.piso}
                onChange={(e) => setNewOficina((p) => ({ ...p, piso: e.target.value }))}
              />
            </label>
            <label>
              Área / Lugar
              <input
                value={newOficina.lugar}
                onChange={(e) => setNewOficina((p) => ({ ...p, lugar: e.target.value }))}
              />
            </label>
            <div className="admin-modal-actions">
              <button type="button" className="admin-btn-cancel" onClick={closeCreateOficinaModal}>Cancelar</button>
              <button type="button" onClick={() => void handleCreateOficina()}>Crear</button>
            </div>
          </section>
        </div>
      ) : null}

      {isEditSalonModalVisible && editingSalon ? (
        <div
          className={`admin-modal-overlay ${isEditSalonModalClosing ? 'is-closing' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label="Editar salón"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeSalonModal()
            }
          }}
        >
          <section className="admin-modal-card" ref={salonModalRef}>
            <h3>Editar Salón</h3>
            <label>
              Número
              <input
                type="number"
                value={editingSalon.numero_salon}
                onChange={(e) => setEditingSalon((p) => (p ? { ...p, numero_salon: Number(e.target.value) } : p))}
              />
            </label>
            <label>
              Edificio
              <input
                type="number"
                value={editingSalon.edificio}
                onChange={(e) => setEditingSalon((p) => (p ? { ...p, edificio: Number(e.target.value) } : p))}
              />
            </label>
            <label>
              Piso
              <input
                type="number"
                value={editingSalon.piso}
                onChange={(e) => setEditingSalon((p) => (p ? { ...p, piso: Number(e.target.value) } : p))}
              />
            </label>
            <label>
              Uso
              <input
                value={editingSalon.uso}
                onChange={(e) => setEditingSalon((p) => (p ? { ...p, uso: e.target.value } : p))}
              />
            </label>
            <div className="admin-modal-actions">
              <button type="button" className="admin-btn-cancel" onClick={closeSalonModal}>Cancelar</button>
              <button type="button" onClick={() => void handleUpdateSalon()}>Actualizar</button>
            </div>
          </section>
        </div>
      ) : null}

      {isEditOficinaModalVisible && editingOficina ? (
        <div
          className={`admin-modal-overlay ${isEditOficinaModalClosing ? 'is-closing' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label="Editar oficina"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeOficinaModal()
            }
          }}
        >
          <section className="admin-modal-card" ref={oficinaModalRef}>
            <h3>Editar Oficina</h3>
            <label>
              ID Oficina
              <input
                type="number"
                value={editingOficina.ID_oficina}
                onChange={(e) =>
                  setEditingOficina((p) =>
                    p
                      ? {
                          ...p,
                          ID_oficina: Number(e.target.value),
                        }
                      : p,
                  )
                }
              />
            </label>
            <label>
              Edificio
              <input
                type="number"
                value={editingOficina.edificio}
                onChange={(e) => setEditingOficina((p) => (p ? { ...p, edificio: Number(e.target.value) } : p))}
              />
            </label>
            <label>
              Piso
              <input
                type="number"
                value={editingOficina.piso}
                onChange={(e) => setEditingOficina((p) => (p ? { ...p, piso: Number(e.target.value) } : p))}
              />
            </label>
            <label>
              Área
              <input
                value={editingOficina.lugar}
                onChange={(e) => setEditingOficina((p) => (p ? { ...p, lugar: e.target.value } : p))}
              />
            </label>
            <div className="admin-modal-actions">
              <button type="button" className="admin-btn-cancel" onClick={closeOficinaModal}>Cancelar</button>
              <button type="button" onClick={() => void handleUpdateOficina()}>Actualizar</button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}

export default AdminSalonesPage

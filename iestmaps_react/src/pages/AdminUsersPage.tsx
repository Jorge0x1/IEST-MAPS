import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { AdminSidebar, PageHeader } from '../components'
import { useDialogFocusTrap } from '../hooks'
import { createAdminUser, deleteAdminUser, fetchAdminUsers, updateAdminUser } from '../services/api'
import type { AdminUsuario, AuthUser } from '../types'
import './AdminPages.css'

interface AdminUsersPageProps {
  user: AuthUser
  onLogout: () => void
}

function AdminUsersPage({ user, onLogout }: AdminUsersPageProps) {
  const MODAL_EXIT_MS = 180
  const [searchText, setSearchText] = useState('')
  const [usuarios, setUsuarios] = useState<AdminUsuario[]>([])
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const [creatingUser, setCreatingUser] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminUsuario | null>(null)
  const [closingModal, setClosingModal] = useState<'create-user' | 'edit-user' | null>(null)
  const [newUser, setNewUser] = useState({
    nombre: '',
    usuario: '',
    rol: '',
    contrasena: '',
  })

  const modalTriggerRef = useRef<HTMLButtonElement | null>(null)
  const closeTimerRef = useRef<number | null>(null)
  const createUserModalRef = useRef<HTMLElement | null>(null)
  const userModalRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current)
      }
    }
  }, [])

  const loadData = async () => {
    try {
      setErrorMessage('')

      const result = await fetchAdminUsers()
      if (!result.ok) {
        setErrorMessage(result.error ?? 'No se pudieron cargar los usuarios')
        return
      }

      setUsuarios(result.usuarios ?? [])
    } catch {
      setErrorMessage('No se pudo conectar con la API de administrador')
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData()
  }, [])

  const visibleUsuarios = useMemo(() => {
    const query = searchText.trim().toLowerCase()
    if (!query) return usuarios

    return usuarios.filter(
      (item) => `${item.ID_IEST}`.includes(query) || item.nombre.toLowerCase().includes(query),
    )
  }, [usuarios, searchText])

  const handleUpdateUser = async () => {
    if (!editingUser) return

    setErrorMessage('')
    setSuccessMessage('')

    const result = await updateAdminUser(editingUser.ID_IEST, {
      idIest: Number(editingUser.ID_IEST),
      nombre: editingUser.nombre,
      usuario: editingUser.usuario,
      rol: editingUser.rol,
      contrasena: editingUser.contrasena,
    })

    if (!result.ok) {
      setErrorMessage(result.error ?? 'No se pudo actualizar el usuario')
      return
    }

    setSuccessMessage(result.message ?? 'Usuario actualizado')
    setEditingUser(null)
    void loadData()
  }

  const handleDeleteUser = async (id: number) => {
    if (!window.confirm('¿Eliminar usuario?')) return

    const result = await deleteAdminUser(id)
    if (!result.ok) {
      setErrorMessage(result.error ?? 'No se pudo eliminar el usuario')
      return
    }

    setSuccessMessage(result.message ?? 'Usuario eliminado')
    void loadData()
  }

  const handleCreateUser = async () => {
    setErrorMessage('')
    setSuccessMessage('')

    const result = await createAdminUser({
      nombre: newUser.nombre,
      usuario: newUser.usuario,
      rol: newUser.rol,
      contrasena: newUser.contrasena,
    })

    if (!result.ok) {
      setErrorMessage(result.error ?? 'No se pudo crear el usuario')
      return
    }

    setSuccessMessage(result.message ?? 'Usuario creado')
    closeCreateUserModal()
    setNewUser({ nombre: '', usuario: '', rol: '', contrasena: '' })
    void loadData()
  }

  const closeModalWithAnimation = useCallback(
    (modal: 'create-user' | 'edit-user', onClose: () => void) => {
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

  const closeUserModal = useCallback(() => {
    closeModalWithAnimation('edit-user', () => {
      setEditingUser(null)
    })
  }, [closeModalWithAnimation])

  const closeCreateUserModal = useCallback(() => {
    closeModalWithAnimation('create-user', () => {
      setCreatingUser(false)
    })
  }, [closeModalWithAnimation])

  const handleOpenCreateUserModal = (event: MouseEvent<HTMLButtonElement>) => {
    setClosingModal(null)
    modalTriggerRef.current = event.currentTarget
    setErrorMessage('')
    setCreatingUser(true)
  }

  const handleOpenUserModal = (event: MouseEvent<HTMLButtonElement>, userItem: AdminUsuario) => {
    setClosingModal(null)
    modalTriggerRef.current = event.currentTarget
    setEditingUser(userItem)
  }

  const isCreateUserModalVisible = creatingUser || closingModal === 'create-user'
  const isCreateUserModalClosing = closingModal === 'create-user'
  const isEditUserModalVisible = Boolean(editingUser) || closingModal === 'edit-user'
  const isEditUserModalClosing = closingModal === 'edit-user'

  useDialogFocusTrap({
    isOpen: Boolean(creatingUser),
    containerRef: createUserModalRef,
    onClose: closeCreateUserModal,
    returnFocusRef: modalTriggerRef,
  })

  useDialogFocusTrap({
    isOpen: Boolean(editingUser),
    containerRef: userModalRef,
    onClose: closeUserModal,
    returnFocusRef: modalTriggerRef,
  })

  return (
    <div className="app-layout">
      <PageHeader title="Usuarios" actionLabel="Cerrar sesión" actionUser={user.usuario} onAction={onLogout} />

      <main className="admin-content">
        <AdminSidebar />

        <section className="admin-card admin-card-wide" aria-label="Administración de usuarios">
          <div className="admin-actions">
            <button type="button" className="admin-action-link" onClick={handleOpenCreateUserModal}>
              Agregar Usuario
            </button>
          </div>

          <div className="admin-search">
            <input
              type="text"
              placeholder="Buscar por ID IEST o nombre"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
            <button
              type="button"
              onClick={() => {
                setSearchText('')
                void loadData()
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

          <section className="admin-table-panel" aria-label="Tabla de usuarios normales">
            <h3>Usuarios Normales</h3>
            <div className="admin-table-wrap admin-table-wrap-scroll">
              <table className="admin-table admin-table-users">
                <thead>
                  <tr>
                    <th>ID IEST</th>
                    <th>Nombre</th>
                    <th>Usuario</th>
                    <th>Rol</th>
                    <th>Contraseña</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleUsuarios.map((u) => (
                    <tr key={u.ID_IEST}>
                      <td>{u.ID_IEST}</td>
                      <td>{u.nombre}</td>
                      <td>{u.usuario}</td>
                      <td>{u.rol}</td>
                      <td>{u.contrasena}</td>
                      <td className="admin-actions-cell">
                        <button type="button" className="admin-btn-edit" onClick={(event) => handleOpenUserModal(event, u)}>Editar</button>
                        <button type="button" onClick={() => void handleDeleteUser(u.ID_IEST)}>Eliminar</button>
                      </td>
                    </tr>
                  ))}
                  {visibleUsuarios.length === 0 ? (
                    <tr className="admin-empty-row">
                      <td colSpan={6}>No hay usuarios normales registrados.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </main>

      {isCreateUserModalVisible ? (
        <div
          className={`admin-modal-overlay ${isCreateUserModalClosing ? 'is-closing' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label="Crear usuario"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeCreateUserModal()
            }
          }}
        >
          <section className="admin-modal-card" ref={createUserModalRef}>
            <h3>Alta de Usuario</h3>
            <label>
              Nombre
              <input
                value={newUser.nombre}
                onChange={(e) => setNewUser((p) => ({ ...p, nombre: e.target.value }))}
              />
            </label>
            <label>
              Usuario
              <input
                value={newUser.usuario}
                onChange={(e) => setNewUser((p) => ({ ...p, usuario: e.target.value }))}
              />
            </label>
            <label>
              Rol
              <select
                value={newUser.rol}
                onChange={(e) => setNewUser((p) => ({ ...p, rol: e.target.value }))}
              >
                <option value="">Seleccione un rol</option>
                <option value="Alumno">Alumno</option>
                <option value="Maestro">Maestro</option>
                <option value="Guardia">Guardia</option>
                <option value="Administrador">Administrador</option>
              </select>
            </label>
            <label>
              Contraseña
              <input
                type="text"
                value={newUser.contrasena}
                onChange={(e) => setNewUser((p) => ({ ...p, contrasena: e.target.value }))}
              />
            </label>
            <div className="admin-modal-actions">
              <button type="button" className="admin-btn-cancel" onClick={closeCreateUserModal}>Cancelar</button>
              <button type="button" onClick={() => void handleCreateUser()}>Crear</button>
            </div>
          </section>
        </div>
      ) : null}

      {isEditUserModalVisible && editingUser ? (
        <div
          className={`admin-modal-overlay ${isEditUserModalClosing ? 'is-closing' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label="Editar usuario"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeUserModal()
            }
          }}
        >
          <section className="admin-modal-card" ref={userModalRef}>
            <h3>Editar Usuario</h3>
            <label>
              ID IEST
              <input
                type="number"
                value={editingUser.ID_IEST}
                onChange={(e) => setEditingUser((p) => (p ? { ...p, ID_IEST: Number(e.target.value) } : p))}
              />
            </label>
            <label>
              Nombre
              <input
                value={editingUser.nombre}
                onChange={(e) => setEditingUser((p) => (p ? { ...p, nombre: e.target.value } : p))}
              />
            </label>
            <label>
              Usuario
              <input
                value={editingUser.usuario}
                onChange={(e) => setEditingUser((p) => (p ? { ...p, usuario: e.target.value } : p))}
              />
            </label>
            <label>
              Rol
              <input
                value={editingUser.rol}
                onChange={(e) => setEditingUser((p) => (p ? { ...p, rol: e.target.value } : p))}
              />
            </label>
            <label>
              Contraseña
              <input
                value={editingUser.contrasena}
                onChange={(e) => setEditingUser((p) => (p ? { ...p, contrasena: e.target.value } : p))}
              />
            </label>
            <div className="admin-modal-actions">
              <button type="button" className="admin-btn-cancel" onClick={closeUserModal}>Cancelar</button>
              <button type="button" onClick={() => void handleUpdateUser()}>Actualizar</button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}

export default AdminUsersPage

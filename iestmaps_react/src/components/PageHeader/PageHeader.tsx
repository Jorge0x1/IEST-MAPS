// encabezado general con titulo, logo, y menu de perfil/logout
import { useEffect, useRef, useState } from 'react'
import './PageHeader.css'

interface PageHeaderProps {
  title: string
  subtitle?: string
  actionLabel?: string
  actionUser?: string
  onAction?: () => void
  secondaryActionLabel?: string
  onSecondaryAction?: () => void
  variant?: 'default' | 'visitor'
}

function PageHeader({
  title,
  subtitle,
  actionLabel,
  actionUser,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  variant = 'default',
}: PageHeaderProps) {
  // estados del menu de perfil (abierto/cerrado)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  // estado del dialogo de confirmacion antes de cerrar sesion
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  // referencias a elementos del DOM para manipular foco
  const profileMenuRef = useRef<HTMLDivElement | null>(null)
  const profileButtonRef = useRef<HTMLButtonElement | null>(null)
  const secondaryMenuItemRef = useRef<HTMLButtonElement | null>(null)
  const primaryMenuItemRef = useRef<HTMLButtonElement | null>(null)
  const logoutCancelRef = useRef<HTMLButtonElement | null>(null)
  const logoutConfirmRef = useRef<HTMLButtonElement | null>(null)

  // cuando abre el menu, mueve el foco al primer item y maneja navegacion
  useEffect(() => {
    // si el menu no esta abierto, no hace nada
    if (!isMenuOpen) {
      return
    }

    // obtiene los items focusables del menu
    const focusableMenuItems = [secondaryMenuItemRef.current, primaryMenuItemRef.current].filter(Boolean) as HTMLElement[]
    // mueve el foco al primer item
    focusableMenuItems[0]?.focus()

    // cierra el menu si se hace click afuera
    const handleOutsideClick = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    // maneja teclas para cerrar el menu o navegar
    const handleEscape = (event: KeyboardEvent) => {
      // escape cierra el menu y devuelve foco al boton
      if (event.key === 'Escape') {
        event.preventDefault()
        setIsMenuOpen(false)
        profileButtonRef.current?.focus()
        return
      }

      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        return
      }

      if (focusableMenuItems.length === 0) {
        return
      }

      const currentIndex = focusableMenuItems.indexOf(document.activeElement as HTMLElement)
      let nextIndex = 0

      if (event.key === 'Home') {
        nextIndex = 0
      } else if (event.key === 'End') {
        nextIndex = focusableMenuItems.length - 1
      } else if (event.key === 'ArrowUp') {
        nextIndex = currentIndex <= 0 ? focusableMenuItems.length - 1 : currentIndex - 1
      } else {
        nextIndex = currentIndex >= focusableMenuItems.length - 1 ? 0 : currentIndex + 1
      }

      event.preventDefault()
      focusableMenuItems[nextIndex].focus()
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isMenuOpen])

  const handleOpenConfirm = () => {
    setIsMenuOpen(false)
    setIsConfirmOpen(true)
  }

  const handleConfirmLogout = () => {
    setIsConfirmOpen(false)
    onAction?.()
  }

  const handleSecondaryAction = () => {
    setIsMenuOpen(false)
    onSecondaryAction?.()
  }

  useEffect(() => {
    if (!isConfirmOpen) {
      return
    }

    const buttonToRestore = profileButtonRef.current
    logoutCancelRef.current?.focus()

    const handleModalKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setIsConfirmOpen(false)
        return
      }

      if (event.key !== 'Tab') {
        return
      }

      const focusable = [logoutCancelRef.current, logoutConfirmRef.current].filter(Boolean) as HTMLElement[]
      if (focusable.length === 0) {
        return
      }

      const currentIndex = focusable.indexOf(document.activeElement as HTMLElement)
      const isShift = event.shiftKey
      let nextIndex = 0

      if (currentIndex >= 0) {
        nextIndex = isShift
          ? (currentIndex - 1 + focusable.length) % focusable.length
          : (currentIndex + 1) % focusable.length
      } else {
        nextIndex = isShift ? focusable.length - 1 : 0
      }

      event.preventDefault()
      focusable[nextIndex].focus()
    }

    document.addEventListener('keydown', handleModalKeydown)
    return () => {
      document.removeEventListener('keydown', handleModalKeydown)
      buttonToRestore?.focus()
    }
  }, [isConfirmOpen])

  return (
    <>
      <header className={`page-header ${variant === 'visitor' ? 'page-header--visitor' : ''}`}>
        <div className="page-header-bar">
        <div />

        <div className="page-header-title">
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>

        <div className="page-header-action-wrap">
          {actionLabel && onAction ? (
            <div className="page-header-profile" ref={profileMenuRef}>
              {actionUser ? <span className="page-header-user">{actionUser}</span> : null}
              <button
                type="button"
                className="page-header-action-circle"
                ref={profileButtonRef}
                onClick={() => setIsMenuOpen((previous) => !previous)}
                title="Perfil"
                aria-label="Abrir menú de perfil"
                aria-expanded={isMenuOpen}
                aria-haspopup="menu"
              />
              {isMenuOpen ? (
                <div className="page-header-menu" role="menu" aria-label="Opciones de sesión">
                  {secondaryActionLabel && onSecondaryAction ? (
                    <button
                      type="button"
                      className="page-header-menu-item"
                      ref={secondaryMenuItemRef}
                      onClick={handleSecondaryAction}
                      role="menuitem"
                    >
                      {secondaryActionLabel}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="page-header-menu-item"
                    ref={primaryMenuItemRef}
                    onClick={handleOpenConfirm}
                    role="menuitem"
                  >
                    {actionLabel}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      </header>

      {isConfirmOpen ? (
        <div className="logout-modal-overlay" role="dialog" aria-modal="true" aria-label="Confirmar cierre de sesión">
          <section className="logout-modal-card">
            <h2>Cerrar sesión</h2>
            <p>
              ¿Deseas cerrar la sesión?
              <br />
              Regresarás a la pestaña de inicio
            </p>
            <div className="logout-modal-actions">
              <button
                type="button"
                className="logout-modal-cancel"
                ref={logoutCancelRef}
                onClick={() => setIsConfirmOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="logout-modal-confirm"
                ref={logoutConfirmRef}
                onClick={handleConfirmLogout}
              >
                Cerrar sesión
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  )
}

export default PageHeader
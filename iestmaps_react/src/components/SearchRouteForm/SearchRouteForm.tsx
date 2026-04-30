import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './SearchRouteForm.css'

interface SearchRouteFormProps {
  origin: string
  destination: string
  hasActiveRoute: boolean
  actionLabel?: string
  actionUser?: string
  onAction?: () => void
  lockInputs?: boolean
  startButtonLabel?: string
  finishButtonLabel?: string
  actionDisabled?: boolean
  onOriginChange: (value: string) => void
  onDestinationChange: (value: string) => void
  onStartRoute: () => void
  onFinishRoute: () => void
}

function SearchRouteForm({
  origin,
  destination,
  hasActiveRoute,
  actionLabel,
  actionUser,
  onAction,
  lockInputs = false,
  startButtonLabel = 'Comenzar ruta',
  finishButtonLabel = 'Finalizar viaje',
  actionDisabled = false,
  onOriginChange,
  onDestinationChange,
  onStartRoute,
  onFinishRoute,
}: SearchRouteFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const searchRootRef = useRef<HTMLDivElement | null>(null)
  const originInputRef = useRef<HTMLInputElement | null>(null)
  const destinationInputRef = useRef<HTMLInputElement | null>(null)
  const actionButtonRef = useRef<HTMLButtonElement | null>(null)
  const profileButtonRef = useRef<HTMLButtonElement | null>(null)
  const profileMenuRef = useRef<HTMLDivElement | null>(null)
  const confirmCancelRef = useRef<HTMLButtonElement | null>(null)
  const confirmActionRef = useRef<HTMLButtonElement | null>(null)

  const inputsAreDisabled = lockInputs || hasActiveRoute
  const canShowProfile = Boolean(actionLabel && onAction)
  const actionAvatar = actionUser ? actionUser.trim().charAt(0).toUpperCase() : 'P'
  const activeDestinationLabel = destination.trim() || 'Sin destino'

  useEffect(() => {
    const handleOutsideInteraction = (event: MouseEvent | PointerEvent) => {
      const target = event.target as Node | null
      if (!target || !searchRootRef.current) {
        return
      }

      if (searchRootRef.current.contains(target)) {
        return
      }

      setIsOpen(false)
      setIsProfileMenuOpen(false)
    }

    document.addEventListener('mousedown', handleOutsideInteraction)
    document.addEventListener('pointerdown', handleOutsideInteraction)

    return () => {
      document.removeEventListener('mousedown', handleOutsideInteraction)
      document.removeEventListener('pointerdown', handleOutsideInteraction)
    }
  }, [])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    if (inputsAreDisabled) {
      actionButtonRef.current?.focus()
    } else {
      originInputRef.current?.focus()
    }

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setIsOpen(false)
        originInputRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleKeydown)
    return () => {
      document.removeEventListener('keydown', handleKeydown)
    }
  }, [inputsAreDisabled, isOpen])

  useEffect(() => {
    if (!isProfileMenuOpen) {
      return
    }

    const handleOutsideClick = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setIsProfileMenuOpen(false)
        profileButtonRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isProfileMenuOpen])

  useEffect(() => {
    if (!isConfirmOpen) {
      return
    }

    confirmCancelRef.current?.focus()

    const handleConfirmKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setIsConfirmOpen(false)
        return
      }

      if (event.key !== 'Tab') {
        return
      }

      const focusable = [confirmCancelRef.current, confirmActionRef.current].filter(Boolean) as HTMLElement[]
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

    document.addEventListener('keydown', handleConfirmKeydown)
    return () => {
      document.removeEventListener('keydown', handleConfirmKeydown)
    }
  }, [isConfirmOpen])

  const openBar = () => {
    if (hasActiveRoute) {
      return
    }

    setIsOpen(true)
    window.requestAnimationFrame(() => {
      if (!inputsAreDisabled) {
        originInputRef.current?.focus()
      }
    })
  }

  const handleActionClick = () => {
    setIsProfileMenuOpen(false)
    setIsConfirmOpen(false)
    setIsOpen(false)

    if (hasActiveRoute) {
      onFinishRoute()
      return
    }

    onStartRoute()
  }

  const handleProfileAction = () => {
    setIsProfileMenuOpen(false)
    setIsConfirmOpen(true)
  }

  const confirmModal =
    isConfirmOpen && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="route-confirm-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Confirmar cierre de sesión"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setIsConfirmOpen(false)
              }
            }}
          >
            <section className="route-confirm-card">
              <h2>Cerrar sesión</h2>
              <p>¿Deseas cerrar la sesión? Regresarás a la pantalla inicial.</p>
              <div className="route-confirm-actions">
                <button
                  type="button"
                  ref={confirmCancelRef}
                  className="route-confirm-cancel"
                  onClick={() => setIsConfirmOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  ref={confirmActionRef}
                  className="route-confirm-action"
                  onClick={() => onAction?.()}
                >
                  Cerrar sesión
                </button>
              </div>
            </section>
          </div>,
          document.body,
        )
      : null

  return (
    <aside ref={searchRootRef} className={`route-search ${isOpen ? 'open' : ''}`} aria-label="Buscador de rutas">
      <div
        className="route-search-bar"
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        onClick={() => {
          if (!hasActiveRoute) {
            openBar()
          }
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            if (!hasActiveRoute) {
              openBar()
            }
          }
        }}
      >
        <div className="route-logo" aria-hidden="true">
          <img src="/favicon.svg" alt="" className="route-logo-image" />
          <span className="route-logo-wordmark">IEST MAPS</span>
        </div>

        {hasActiveRoute ? (
          <div className="route-summary" aria-live="polite">
            <span className="route-summary-label">Destino:</span>
            <span className="route-summary-value">{activeDestinationLabel}</span>
          </div>
        ) : (
          <label className="route-origin-field">
            <span className="sr-only">Punto de partida</span>
            <input
              ref={originInputRef}
              type="text"
              placeholder="Punto de partida"
              value={origin}
              disabled={inputsAreDisabled}
              onFocus={openBar}
              onClick={openBar}
              onChange={(event) => onOriginChange(event.target.value)}
            />
          </label>
        )}

        <div className="route-bar-actions">
          {hasActiveRoute ? (
            <button
              type="button"
              ref={actionButtonRef}
              className="route-bar-action-button"
              onClick={handleActionClick}
              disabled={actionDisabled}
            >
              {finishButtonLabel}
            </button>
          ) : null}

          {canShowProfile ? (
            <div className="route-profile" ref={profileMenuRef}>
              <button
                type="button"
                className="route-profile-button"
                ref={profileButtonRef}
                onClick={(event) => {
                  event.stopPropagation()
                  setIsProfileMenuOpen((previous) => !previous)
                }}
                aria-label="Abrir menú de perfil"
                aria-expanded={isProfileMenuOpen}
                aria-haspopup="menu"
              >
                <span className="route-profile-avatar">{actionAvatar}</span>
              </button>

              {isProfileMenuOpen ? (
                <div className="route-profile-menu" role="menu" aria-label="Opciones de perfil">
                  <button
                    type="button"
                    className="route-profile-menu-item"
                    role="menuitem"
                    onClick={(event) => {
                      event.stopPropagation()
                      handleProfileAction()
                    }}
                  >
                    {actionLabel}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <section className={`route-search-panel ${isOpen && !hasActiveRoute ? 'open' : ''}`} aria-hidden={!isOpen || hasActiveRoute} aria-label="Detalles de ruta">
        <label className="route-destination-field">
          <span className="sr-only">Destino</span>
          <input
            ref={destinationInputRef}
            type="text"
            placeholder="Elegir destino"
            value={destination}
            disabled={inputsAreDisabled}
            onChange={(event) => onDestinationChange(event.target.value)}
          />
        </label>

        <button
          type="button"
          ref={actionButtonRef}
          className="route-action-button"
          onClick={handleActionClick}
          disabled={actionDisabled}
        >
          {hasActiveRoute ? finishButtonLabel : startButtonLabel}
        </button>
      </section>

      {confirmModal}
    </aside>
  )
}

export default SearchRouteForm
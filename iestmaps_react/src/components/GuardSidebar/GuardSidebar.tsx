// menu lateral para guardia: links a registro y historial con navegacion por teclado
import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import './GuardSidebar.css'

function GuardSidebar() {
  // estado de si el menu esta abierto o cerrado
  const [isOpen, setIsOpen] = useState(false)
  const drawerTabRef = useRef<HTMLButtonElement | null>(null)
  const firstLinkRef = useRef<HTMLAnchorElement | null>(null)
  const secondLinkRef = useRef<HTMLAnchorElement | null>(null)

  // cuando abre el menu, mueve foco y agrega navegacion por flechas
  useEffect(() => {
    if (!isOpen) {
      return
    }

    firstLinkRef.current?.focus()

    const handleKeydown = (event: KeyboardEvent) => {
      const links = [firstLinkRef.current, secondLinkRef.current].filter(
        (link): link is HTMLAnchorElement => link !== null,
      )

      if (links.length === 0) {
        return
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        setIsOpen(false)
        drawerTabRef.current?.focus()
        return
      }

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        const index = links.findIndex((link) => link === document.activeElement)
        if (index === -1) {
          return
        }
        event.preventDefault()
        const direction = event.key === 'ArrowDown' ? 1 : -1
        const nextIndex = (index + direction + links.length) % links.length
        links[nextIndex].focus()
      }

      if (event.key === 'Home') {
        event.preventDefault()
        links[0].focus()
      }

      if (event.key === 'End') {
        event.preventDefault()
        links[links.length - 1].focus()
      }
    }

    document.addEventListener('keydown', handleKeydown)

    return () => {
      document.removeEventListener('keydown', handleKeydown)
    }
  }, [isOpen])

  return (
    <aside className={`guard-drawer ${isOpen ? 'open' : ''}`} aria-label="Menú guardia">
      <button
        type="button"
        className="guard-drawer-tab"
        ref={drawerTabRef}
        onClick={() => setIsOpen((previous) => !previous)}
        aria-expanded={isOpen}
        aria-controls="guard-drawer-panel"
        aria-label={isOpen ? 'Cerrar menú guardia' : 'Abrir menú guardia'}
        aria-haspopup="menu"
      >
        <img src="/assets/ui/Flechas.png" alt="" className="guard-drawer-icon" />
      </button>

      <div className="guard-drawer-panel" id="guard-drawer-panel" aria-hidden={!isOpen}>
        <NavLink
          ref={firstLinkRef}
          to="/guardia"
          end
          className={({ isActive }) => `guard-sidebar-link ${isActive ? 'active' : ''}`}
          onClick={() => setIsOpen(false)}
          tabIndex={isOpen ? 0 : -1}
        >
          Registro de visitantes
        </NavLink>

        <NavLink
          ref={secondLinkRef}
          to="/guardia/historial"
          className={({ isActive }) => `guard-sidebar-link ${isActive ? 'active' : ''}`}
          onClick={() => setIsOpen(false)}
          tabIndex={isOpen ? 0 : -1}
        >
          Historial
        </NavLink>
      </div>
    </aside>
  )
}

export default GuardSidebar

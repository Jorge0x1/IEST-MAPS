// menu lateral para admin: links a usuarios, salones, etc con navegacion por teclado
import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import './AdminSidebar.css'

function AdminSidebar() {
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
      // obtiene los links focusables del menu (usuarios, salones, etc)
      const links = [firstLinkRef.current, secondLinkRef.current].filter(
        (link): link is HTMLAnchorElement => link !== null,
      )

      // si no hay links, sale
      if (links.length === 0) {
        return
      }

      // escape cierra el menu y devuelve foco al boton
      if (event.key === 'Escape') {
        event.preventDefault()
        setIsOpen(false)
        drawerTabRef.current?.focus()
        return
      }

      // flechas arriba/abajo navegan entre links
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        // encuentra cual link tiene el foco ahora
        const index = links.findIndex((link) => link === document.activeElement)
        if (index === -1) {
          return
        }
        event.preventDefault()
        // calcula la siguiente posicion (hacia arriba o abajo)
        const direction = event.key === 'ArrowDown' ? 1 : -1
        const nextIndex = (index + direction + links.length) % links.length
        // mueve el foco al siguiente link
        links[nextIndex].focus()
      }

      // Home va al primer link
      if (event.key === 'Home') {
        event.preventDefault()
        links[0].focus()
      }

      // End va al ultimo link
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
    <aside className={`admin-drawer ${isOpen ? 'open' : ''}`} aria-label="Menú administrador">
      <button
        type="button"
        className="admin-drawer-tab"
        ref={drawerTabRef}
        onClick={() => setIsOpen((previous) => !previous)}
        aria-expanded={isOpen}
        aria-controls="admin-drawer-panel"
        aria-label={isOpen ? 'Cerrar menú administrador' : 'Abrir menú administrador'}
        aria-haspopup="menu"
      >
        <img src="/assets/ui/Flechas.png" alt="" className="admin-drawer-icon" />
      </button>

      <div className="admin-drawer-panel" id="admin-drawer-panel" aria-hidden={!isOpen}>
        <NavLink
          ref={firstLinkRef}
          to="/admin/usuarios"
          className={({ isActive }) => `admin-sidebar-link ${isActive ? 'active' : ''}`}
          onClick={() => setIsOpen(false)}
          tabIndex={isOpen ? 0 : -1}
        >
          Usuarios
        </NavLink>

        <NavLink
          ref={secondLinkRef}
          to="/admin/salones"
          className={({ isActive }) => `admin-sidebar-link ${isActive ? 'active' : ''}`}
          onClick={() => setIsOpen(false)}
          tabIndex={isOpen ? 0 : -1}
        >
          Salones y Oficinas
        </NavLink>
      </div>
    </aside>
  )
}

export default AdminSidebar

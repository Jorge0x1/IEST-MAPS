import { useEffect, useRef, type RefObject } from 'react'

// selector que busca todos los elementos que podemos navegar con teclado
// incluye botones, enlaces, campos de texto, etc.
const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

interface UseDialogFocusTrapOptions {
  isOpen: boolean
  containerRef: RefObject<HTMLElement | null>
  onClose: () => void
  initialFocusRef?: RefObject<HTMLElement | null>
  returnFocusRef?: RefObject<HTMLElement | null>
}

// este hook asegura que cuando abres un dialogo:
// 1. el foco se mueve adentro del dialogo
// 2. presionar escape cierra el dialogo
// 3. tab/shift+tab circula entre elementos sin salir del dialogo
// 4. cuando cierras el dialogo, el foco vuelve donde estaba antes
function useDialogFocusTrap({
  isOpen,
  containerRef,
  onClose,
  initialFocusRef,
  returnFocusRef,
}: UseDialogFocusTrapOptions) {
  const wasOpenRef = useRef(isOpen)

  // cuando el dialogo se abre, mueve el foco al primer elemento que se pueda seleccionar
  useEffect(() => {
    if (!isOpen || !containerRef.current) {
      return
    }

    const container = containerRef.current
    const firstFocusable = initialFocusRef?.current ?? container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
    firstFocusable?.focus()

    // maneja las teclas escape y tab
    const handleKeydown = (event: KeyboardEvent) => {
      // si presionas escape, cierra el dialogo
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      // solo nos interesan las teclas tab
      if (event.key !== 'Tab') {
        return
      }

      // encuentra todos los elementos que se pueden seleccionar dentro del dialogo
      const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      if (focusable.length === 0) {
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement as HTMLElement | null

      // si estamos al final y presionas tab, vuelve al principio (circular)
      if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
        return
      }

      // si estamos al principio y presionas shift+tab, va al final (circular)
      if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
        return
      }

      if (!active || !focusable.includes(active)) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeydown)
    return () => {
      document.removeEventListener('keydown', handleKeydown)
    }
  }, [isOpen, containerRef, onClose, initialFocusRef])

  // cuando cierras el dialogo, devuelve el foco al boton que lo abrio
  // esto es importante para usuarios de teclado y lectores de pantalla
  useEffect(() => {
    // si el dialogo estaba abierto y ahora esta cerrado
    if (wasOpenRef.current && !isOpen) {
      // devuelve el foco al elemento que lo abrio
      returnFocusRef?.current?.focus()
    }
    // actualiza si el dialogo esta abierto o no
    wasOpenRef.current = isOpen
  }, [isOpen, returnFocusRef])
}

export default useDialogFocusTrap
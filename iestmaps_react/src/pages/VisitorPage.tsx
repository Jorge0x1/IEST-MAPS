// pagina para visitantes: muestra mapa con ruta asignada
// el visitante entra desde un codigo qr y tiene puntos fijos de origen/destino
// no puede cambiar su origen/destino, solo seguir la ruta y finalizarla
import { useEffect, useMemo, useRef, useState } from 'react'
import { MapGrid, MapIntroSplash, PageHeader, SearchRouteForm } from '../components'
import { useMapRoute } from '../hooks'
import { finalizeVisitorTrip } from '../services/api'
import type { AuthUser } from '../types'

interface VisitorPageProps {
  user: AuthUser
  onLogout: () => void
}

interface VisitorTourStep {
  selector: string
  title: string
  description: string
}

const VISITOR_TOUR_STORAGE_KEY = 'iestmaps_visitor_tour_seen_v1'

function VisitorPage({ user, onLogout }: VisitorPageProps) {
  const [showIntroSplash, setShowIntroSplash] = useState(true)
  // origen y destino vienen asignados del registro qr
  // el visitante NO puede cambiarlos, son fijos para su sesion
  const assignedOrigin = user.visitanteOrigen?.trim() || 'Entrada Principal'
  const assignedDestination = user.visitanteDestino?.trim() || ''
  // representa errores al finalizar el viaje
  const [tripError, setTripError] = useState('')
  // indica si se esta procesando la finalizacion del viaje
  const [isFinalizing, setIsFinalizing] = useState(false)
  // indice del paso del tour (guia inicio sobre como usar el mapa)
  const [tourStepIndex, setTourStepIndex] = useState<number | null>(null)
  // posicion del elemento que se esta senalando en el tour
  const [tourTargetRect, setTourTargetRect] = useState<DOMRect | null>(null)
  // referencias a botones del tour
  const tourSkipButtonRef = useRef<HTMLButtonElement | null>(null)
  const tourNextButtonRef = useRef<HTMLButtonElement | null>(null)

  const tourSteps = useMemo<VisitorTourStep[]>(
    () => [
      {
        selector: '.route-drawer-tab',
        title: 'Menú del mapa',
        description: 'Abre este menú y, cuando llegues a tu destino, presiona "Finalizar viaje" para cerrar la sesión. Para cambiar de piso, haz click en la escalera de la ruta.',
      },
      {
        selector: '.page-header-action-circle',
        title: 'Perfil y cerrar sesión',
        description: 'Desde aquí puedes cerrar sesión si es necesario.',
      },
    ],
    [],
  )

  const {
    formData,
    canStartRoute,
    activeFloor,
    isLoading,
    errorMessage,
    routePath,
    routeStart,
    routeEnd,
    pisosEnRuta,
    setActiveFloor,
    hasActiveRoute,
    startRoute,
  } = useMapRoute({
    initialOrigin: assignedOrigin,
    initialDestination: assignedDestination,
    lockOrigin: true,
    lockDestination: true,
    autoStart: Boolean(assignedDestination),
  })

  const finalizeAndLogout = async () => {
    if (!user.visitanteRegistroId) {
      setTripError('No se encontró el viaje activo del visitante')
      return
    }

    try {
      setIsFinalizing(true)
      setTripError('')

      const result = await finalizeVisitorTrip(user.visitanteRegistroId)
      if (!result.ok) {
        setTripError(result.error ?? 'No se pudo finalizar el viaje')
        return
      }

      onLogout()
    } catch {
      setTripError('No se pudo conectar con la API para finalizar el viaje')
    } finally {
      setIsFinalizing(false)
    }
  }

  useEffect(() => {
    const wasSeen = localStorage.getItem(VISITOR_TOUR_STORAGE_KEY) === '1'
    if (!wasSeen) {
      const timer = window.setTimeout(() => {
        setTourStepIndex(0)
      }, 350)

      return () => window.clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowIntroSplash(false)
    }, 2600)

    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (tourStepIndex === null) {
      return
    }

    const step = tourSteps[tourStepIndex]
    if (!step) {
      return
    }

    const updateTargetRect = () => {
      const target = document.querySelector(step.selector)
      if (!target) {
        return
      }

      setTourTargetRect(target.getBoundingClientRect())
    }

    updateTargetRect()
    window.addEventListener('resize', updateTargetRect)
    window.addEventListener('scroll', updateTargetRect, true)

    return () => {
      window.removeEventListener('resize', updateTargetRect)
      window.removeEventListener('scroll', updateTargetRect, true)
    }
  }, [tourStepIndex, tourSteps])

  const closeTour = () => {
    localStorage.setItem(VISITOR_TOUR_STORAGE_KEY, '1')
    setTourStepIndex(null)
    setTourTargetRect(null)
  }

  const goToNextTourStep = () => {
    if (tourStepIndex === null) {
      return
    }

    if (tourStepIndex >= tourSteps.length - 1) {
      closeTour()
      return
    }

    setTourStepIndex((current) => (current === null ? current : current + 1))
  }

  const currentTourStep = tourStepIndex === null ? null : tourSteps[tourStepIndex]
  const currentTourStepNumber = tourStepIndex === null ? 0 : tourStepIndex + 1

  const tourCardStyle = (() => {
    if (!tourTargetRect) {
      return undefined
    }

    const viewportWidth = document.documentElement.clientWidth
    const viewportPadding = viewportWidth <= 560 ? 24 : viewportWidth <= 1024 ? 28 : 24
    const cardWidth = Math.min(320, viewportWidth - viewportPadding * 2)
    const defaultTop = tourTargetRect.bottom + 14
    const showAbove = defaultTop + 170 > window.innerHeight
    const top = showAbove ? Math.max(viewportPadding, tourTargetRect.top - 184) : defaultTop
    const centeredLeft = tourTargetRect.left + tourTargetRect.width / 2 - cardWidth / 2
    const left = Math.max(
      viewportPadding,
      Math.min(viewportWidth - cardWidth - viewportPadding, centeredLeft),
    )

    return {
      top: `${top}px`,
      left: `${left}px`,
      width: `${cardWidth}px`,
    }
  })()

  const tourSpotlightStyle = tourTargetRect
    ? {
        top: `${tourTargetRect.top - 6}px`,
        left: `${tourTargetRect.left - 6}px`,
        width: `${tourTargetRect.width + 12}px`,
        height: `${tourTargetRect.height + 12}px`,
      }
    : undefined

  useEffect(() => {
    if (!currentTourStep || !tourTargetRect) {
      return
    }

    tourSkipButtonRef.current?.focus()

    const handleTourKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeTour()
        return
      }

      if (event.key !== 'Tab') {
        return
      }

      const focusable = [tourSkipButtonRef.current, tourNextButtonRef.current].filter(Boolean) as HTMLElement[]
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

    document.addEventListener('keydown', handleTourKeydown)
    return () => {
      document.removeEventListener('keydown', handleTourKeydown)
    }
  }, [currentTourStep, tourTargetRect])

  return (
    <div className="app-layout">
      <MapIntroSplash
        isVisible={showIntroSplash}
        title="IEST MAPS"
        subtitle="Abriendo acceso de visitante"
      />
      <PageHeader
        title="IEST MAPS"
        actionLabel="Finalizar viaje"
        actionUser={user.usuario}
        onAction={() => {
          void finalizeAndLogout()
        }}
      />

      <main className="app-content">
        <SearchRouteForm
          origin={formData.origin}
          destination={formData.destination}
          hasActiveRoute={hasActiveRoute}
          lockInputs
          startButtonLabel="Reintentar ruta"
          finishButtonLabel={isFinalizing ? 'Finalizando...' : 'Finalizar viaje'}
          actionDisabled={isFinalizing || (!hasActiveRoute && !canStartRoute)}
          onOriginChange={() => {}}
          onDestinationChange={() => {}}
          onStartRoute={startRoute}
          onFinishRoute={() => {
            void finalizeAndLogout()
          }}
        />

        <section className="map-panel" aria-label="Mapa del campus">
          <MapGrid
            activeFloor={activeFloor}
            routePath={routePath}
            routeStart={routeStart}
            routeEnd={routeEnd}
            pisosEnRuta={pisosEnRuta}
            onFloorChange={setActiveFloor}
          />

          <div className="route-debug" role="status" aria-live="polite" aria-atomic="true">
            {isLoading ? <p>Consultando rutas...</p> : null}
            {!assignedDestination ? <p className="error">No hay destino asignado para este visitante</p> : null}
            {errorMessage ? <p className="error">{errorMessage}</p> : null}
            {tripError ? <p className="error">{tripError}</p> : null}
          </div>
        </section>
      </main>

      {currentTourStep && tourTargetRect ? (
        <div className="tour-overlay" role="dialog" aria-modal="true" aria-label="Recorrido guiado visitante">
          <div className="tour-backdrop" onClick={closeTour} />
          <div className="tour-spotlight" style={tourSpotlightStyle} />
          <section className="tour-card" style={tourCardStyle}>
            <p className="tour-step-label">Paso {currentTourStepNumber} de {tourSteps.length}</p>
            <h3>{currentTourStep.title}</h3>
            <p>{currentTourStep.description}</p>
            <div className="tour-actions">
              <button type="button" className="tour-skip" ref={tourSkipButtonRef} onClick={closeTour}>Omitir</button>
              <button type="button" className="tour-next" ref={tourNextButtonRef} onClick={goToNextTourStep}>
                {currentTourStepNumber >= tourSteps.length ? 'Finalizar' : 'Siguiente'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}

export default VisitorPage

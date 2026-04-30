import { useEffect, useMemo, useRef, useState } from 'react'
import { MapGrid, MapIntroSplash, SearchRouteForm } from '../components'
import { useMapRoute } from '../hooks'
import type { AuthUser } from '../types'

interface MapPageProps {
  user: AuthUser
  onLogout: () => void
}

interface TourStep {
  selector: string
  title: string
  description: string
}

const TOUR_STORAGE_KEY = 'iestmaps_map_tour_seen_v1'

function MapPage({ user, onLogout }: MapPageProps) {
  // determina si es usuario comun (no admin ni guardia)
  const isCommonUserView = user.redirectTo === '/inicio'
  const [showIntroSplash, setShowIntroSplash] = useState(true)

  // importa el hook de navegacion del mapa que maneja estado de rutas y pisos
  const {
    formData,
    activeFloor,
    isLoading,
    errorMessage,
    routePath,
    routeStart,
    routeEnd,
    pisosEnRuta,
    setOrigin,
    setDestination,
    setActiveFloor,
    hasActiveRoute,
    startRoute,
    finishRoute,
  } = useMapRoute()

  // estado para el tutorial que se muestra la primera vez
  const [tourStepIndex, setTourStepIndex] = useState<number | null>(null)
  const [tourTargetRect, setTourTargetRect] = useState<DOMRect | null>(null)
  const tourSkipButtonRef = useRef<HTMLButtonElement | null>(null)
  const tourNextButtonRef = useRef<HTMLButtonElement | null>(null)

  // define los pasos del tutorial con sus descripciones
  // cada paso senala un elemento y explica como usarlo
  const tourSteps = useMemo<TourStep[]>(
    () => [
      {
        selector: '.route-search-bar',
        title: 'Barra de ruta',
        description: 'Aquí escribes el punto de partida y destino. Si tu ruta tiene varios pisos, el sistema te indicará en donde cambiar de piso por medio de una pequeña animación.',
      },
      {
        selector: '.route-profile-button',
        title: 'Perfil',
        description: 'Desde aquí puedes abrir el menú de perfil y cerrar sesión cuando termines.',
      },
    ],
    [],
  )

  // muestra el tutorial automaticamente la primera vez que entra un usuario comun
  // se guarda en storage local para no repetirlo en proximas visitas
  // usa un delay de 350ms para que el CSS se haya aplicado ya
  useEffect(() => {
    // solo mostrar si es usuario comun (no admin, no guardia)
    if (!isCommonUserView) {
      return
    }

    // verifica si el usuario ya vio el tour
    const wasSeen = localStorage.getItem(TOUR_STORAGE_KEY) === '1'
    if (!wasSeen) {
      // atrasa el inicio del tour para que la interfaz este lista
      const timer = window.setTimeout(() => {
        setTourStepIndex(0)
      }, 350)

      return () => window.clearTimeout(timer)
    }
  }, [isCommonUserView])

  // actualiza la posicion del tour cuando el usuario llega a un elemento
  // maneja cambios de tamaño de pantalla y scroll para mantener el tour centrado
  useEffect(() => {
    // si no hay un paso activo, sale
    if (tourStepIndex === null) {
      return
    }

    const step = tourSteps[tourStepIndex]
    if (!step) {
      return
    }

    // encuentra el elemento en el DOM y calcula su posicion
    const updateTargetRect = () => {
      const target = document.querySelector(step.selector)
      if (!target) {
        return
      }

      // obtiene la posicion del elemento en pantalla
      setTourTargetRect(target.getBoundingClientRect())
    }

    // calcula posicion inicial
    updateTargetRect()
    // recalcula si la ventana cambia de tamaño
    window.addEventListener('resize', updateTargetRect)
    // recalcula si se hace scroll (importante para elementos fuera de vista)
    window.addEventListener('scroll', updateTargetRect, true)

    return () => {
      window.removeEventListener('resize', updateTargetRect)
      window.removeEventListener('scroll', updateTargetRect, true)
    }
  }, [tourStepIndex, tourSteps])

  const closeTour = () => {
    localStorage.setItem(TOUR_STORAGE_KEY, '1')
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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowIntroSplash(false)
    }, 2600)

    return () => window.clearTimeout(timer)
  }, [])

  return (
    <div className="app-layout">
      <MapIntroSplash
        isVisible={showIntroSplash}
        title="IEST MAPS"
        subtitle="Abriendo tu mapa"
      />

      <main className="app-content">
        <SearchRouteForm
          origin={formData.origin}
          destination={formData.destination}
          hasActiveRoute={hasActiveRoute}
          actionLabel="Cerrar sesión"
          actionUser={user.usuario}
          onAction={onLogout}
          onOriginChange={setOrigin}
          onDestinationChange={setDestination}
          onStartRoute={startRoute}
          onFinishRoute={finishRoute}
          actionDisabled={isLoading}
          onReplayTutorial={isCommonUserView ? () => {
            try {
              localStorage.removeItem(TOUR_STORAGE_KEY)
            } catch {}
            // small delay to allow menu close animations and layout updates
            window.setTimeout(() => setTourStepIndex(0), 120)
          } : undefined}
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

          {isLoading || errorMessage ? (
            <div className="route-debug" role="status" aria-live="polite" aria-atomic="true">
              {isLoading ? <p>Consultando rutas...</p> : null}
              {errorMessage ? <p className="error">{errorMessage}</p> : null}
            </div>
          ) : null}
        </section>
      </main>

      {currentTourStep && tourTargetRect ? (
        <div className="tour-overlay" role="dialog" aria-modal="true" aria-label="Recorrido guiado del sistema">
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

export default MapPage

// pagina para visitantes: muestra mapa con ruta asignada
// el visitante entra desde un codigo qr y tiene puntos fijos de origen/destino
// no puede cambiar su origen/destino, solo seguir la ruta y finalizarla
import { useEffect, useState } from 'react'
import { MapGrid, MapIntroSplash, SearchRouteForm } from '../components'
import { useMapRoute } from '../hooks'
import { finalizeVisitorTrip } from '../services/api'
import type { AuthUser } from '../types'

interface VisitorPageProps {
  user: AuthUser
  onLogout: () => void
}

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
        subtitle="Abriendo acceso de visitante"
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
          actionLabel="Finalizar viaje"
          actionUser={user.usuario}
          onAction={() => {
            void finalizeAndLogout()
          }}
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
        </section>
      </main>
    </div>
  )
}

export default VisitorPage

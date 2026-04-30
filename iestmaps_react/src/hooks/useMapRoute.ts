// hook central para manejo de rutas en el mapa
// calcula rutas entre nodos, maneja cambios de piso, busca lugares por nombre
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { bfsRoute, dividirRutaPorPiso, getPisosEnRuta } from '../map/pathfinding'
import { buscarNodoPorNombre, getAllNodes, getFloorByNodeId } from '../map/mapData'
import type { RouteFormData, RoutePreview } from '../types'

interface UseMapRouteOptions {
    initialOrigin?: string
    initialDestination?: string
    lockOrigin?: boolean
    lockDestination?: boolean
    autoStart?: boolean
}

function useMapRoute(options?: UseMapRouteOptions) {
  // opciones de configuracion para el hook
  // lockOrigin/lockDestination: impide que el usuario cambie el origen/destino
  // autoStart: comienza automaticamente si destino es valido
  const initialOrigin = options?.initialOrigin ?? ''
  const initialDestination = options?.initialDestination ?? ''
  const lockOrigin = options?.lockOrigin ?? false
  const lockDestination = options?.lockDestination ?? false
  const autoStart = options?.autoStart ?? false
  const autoStartAttempted = useRef(false)

  // datos del formulario: origen y destino (lugares buscables por nombre)
  const [formData, setFormData] = useState<RouteFormData>({
    origin: initialOrigin,
    destination: initialDestination,
  })
  // piso activo para mostrar en el mapa (1 o 2)
  const [activeFloor, setActiveFloor] = useState<1 | 2>(1)
  // indica si hay una ruta calculada actualmente
  const [hasActiveRoute, setHasActiveRoute] = useState(false)
  // indica si se esta calculando la ruta (loading)
  const [isLoading, setIsLoading] = useState(false)
  // mensaje de error si algo falla
  const [errorMessage, setErrorMessage] = useState('')
  // preview de lugares encontrados mientras escribes
  const [preview, setPreview] = useState<RoutePreview | null>(null)
    // lista de IDs de nodos que forman la ruta (para mostrar en el mapa)
    const [routePath, setRoutePath] = useState<string[]>([])
    // ID del nodo donde comienza la ruta
    const [routeStart, setRouteStart] = useState<string | null>(null)
    // ID del nodo donde termina la ruta
    const [routeEnd, setRouteEnd] = useState<string | null>(null)
  // pista sobre que piso va la ruta (por ej: 'sube a piso 2')
    const [floorHint, setFloorHint] = useState('')
    // tramos de ruta separados por piso
    const [routeSegments, setRouteSegments] = useState<Record<string, string[]>>({})
    // pisos por los que pasa la ruta (en orden)
    const [pisosEnRuta, setPisosEnRuta] = useState<string[]>([])

    const canStartRoute = useMemo(() => {
        return formData.origin.trim() !== '' && formData.destination.trim() !== ''
    }, [formData.destination, formData.origin])

    useEffect(() => {
        setFormData((previous) => ({
            origin: lockOrigin ? initialOrigin : previous.origin,
            destination: lockDestination ? initialDestination : previous.destination,
        }))
    }, [initialDestination, initialOrigin, lockDestination, lockOrigin])

    const setOrigin = (value: string) => {
        if (hasActiveRoute || lockOrigin) return
        setFormData((previous: RouteFormData) => ({ ...previous, origin: value }))
    }

    const setDestination = (value: string) => {
        if (hasActiveRoute || lockDestination) return
        setFormData((previous: RouteFormData) => ({ ...previous, destination: value }))
    }

    const startRoute = useCallback(async () => {
        if (!canStartRoute) return

        try {
            setIsLoading(true)
            setErrorMessage('')

            // obtiene el grafo completo de nodos
            const nodosGrafo = getAllNodes()

            // busca el nodo de inicio por nombre o ID
            const originNodeId = buscarNodoPorNombre(formData.origin)
            if (!originNodeId) {
                setErrorMessage('No se encontró el punto de partida')
                setHasActiveRoute(false)
                setIsLoading(false)
                return
            }

            // busca el nodo de destino por nombre o ID
            const destinationNodeId = buscarNodoPorNombre(formData.destination)
            if (!destinationNodeId) {
                setErrorMessage('No se encontró el destino')
                setHasActiveRoute(false)
                setIsLoading(false)
                return
            }

            // calcula la ruta usando BFS en el grafo de nodos
            const route = bfsRoute(nodosGrafo, originNodeId, destinationNodeId)
            if (!route) {
                setErrorMessage('No se encontró una ruta entre los puntos seleccionados')
                setHasActiveRoute(false)
                setIsLoading(false)
                return
            }

            // obtiene los pisos del nodo de inicio y destino
            const originFloor = getFloorByNodeId(originNodeId)
            const destinationFloor = getFloorByNodeId(destinationNodeId)

            // establece el piso activo al piso del origen
            if (originFloor) {
                setActiveFloor(originFloor)
            }

            // si la ruta cruza pisos, muestra una pista
            if (originFloor && destinationFloor && originFloor !== destinationFloor) {
                setFloorHint(`La ruta continúa en el piso ${destinationFloor}`)
            } else {
                setFloorHint('')
            }

            // divide la ruta en tramos por piso
            const segments = dividirRutaPorPiso(route, nodosGrafo)
            const pisos = getPisosEnRuta(route, nodosGrafo)

            setPreview({
                originRouteId: originNodeId,
                destinationRouteId: destinationNodeId,
            })
            setRouteStart(originNodeId)
            setRouteEnd(destinationNodeId)
            setRoutePath(route)
            setRouteSegments(segments)
            setPisosEnRuta(pisos)
            setHasActiveRoute(true)
        } catch {
            setHasActiveRoute(false)
            setErrorMessage('No se pudo conectar con la API de rutas')
        } finally {
            setIsLoading(false)
        }
    }, [canStartRoute, formData.destination, formData.origin])

    const finishRoute = () => {
        setHasActiveRoute(false)
        setPreview(null)
        setErrorMessage('')
        setRoutePath([])
        setRouteStart(null)
        setRouteEnd(null)
        setFloorHint('')
        setRouteSegments({})
        setPisosEnRuta([])
        setFormData({
            origin: lockOrigin ? initialOrigin : '',
            destination: lockDestination ? initialDestination : '',
        })
        autoStartAttempted.current = false
    }

    useEffect(() => {
        if (!autoStart || autoStartAttempted.current || hasActiveRoute || isLoading || !canStartRoute) {
            return
        }

        autoStartAttempted.current = true
        void startRoute()
    }, [autoStart, canStartRoute, hasActiveRoute, isLoading, startRoute])

    return {
        // estado del formulario
        formData,
        origin: formData.origin,
        destination: formData.destination,
        setOrigin,
        setDestination,
        canStartRoute,
        // estado de la ruta
        hasActiveRoute,
        isLoading,
        errorMessage,
        preview,
        activeFloor,
        setActiveFloor,
        floorHint,
        // datos de la ruta
        routePath,
        routeStart,
        routeEnd,
        routeSegments,
        pisosEnRuta,
        // acciones
        startRoute,
        finishRoute,
    }
}

export default useMapRoute
export type { UseMapRouteOptions }
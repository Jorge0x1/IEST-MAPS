// componente que visualiza el mapa con la ruta calculada
import { useCallback, useEffect, useMemo, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './MapGrid.css'
import { getFloorImage, nodos } from '../../map/mapData'

interface MapGridProps {
  activeFloor: 1 | 2
  routePath: string[]
  routeStart: string | null
  routeEnd: string | null
  pisosEnRuta: string[]
  onFloorChange: (floor: 1 | 2) => void
}

type PulseMarker = L.CircleMarker & {
  __pulseCirlceInterval?: number
  __pulseCircle?: L.Circle
}

function MapGrid({ activeFloor, routePath, routeStart, routeEnd, pisosEnRuta, onFloorChange }: MapGridProps) {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const leafletMapRef = useRef<L.Map | null>(null)
  const imageLayerRef = useRef<L.ImageOverlay | null>(null)
  const routeLayerRef = useRef<L.LayerGroup | null>(null)
  const bounds = useMemo(() => [[0, 0], [2000, 2000]] as L.LatLngBoundsExpression, [])

  const currentFloor = activeFloor === 1 ? 'Piso1' : 'Piso2'

  const routeNodesOnFloor = useMemo(() => {
    return routePath
      .map((nodeId) => nodos[nodeId])
      .filter((node): node is (typeof nodos)[keyof typeof nodos] => Boolean(node && node.piso === currentFloor))
  }, [currentFloor, routePath])

  const routeLatLngs = useMemo(() => {
    return routeNodesOnFloor.map((node) => [node.y, node.x] as [number, number])
  }, [routeNodesOnFloor])

  const syncMapBounds = useCallback((map: L.Map, hasRoute: boolean = false) => {
    if (hasRoute) {
      // Con ruta: libertad total de zoom, sin restricciones de minZoom
      map.setMinZoom(-1.5)
      return
    }
    
    // Sin ruta: limitar zoom out para no alejarse demasiado del mapa
    const fittedZoom = map.getBoundsZoom(bounds, true)
    const viewportWidth = window.innerWidth
    const responsiveExtraZoomOut = viewportWidth <= 560 ? 0.8 : 0.5
    const minZoom = fittedZoom - responsiveExtraZoomOut

    map.setMinZoom(minZoom)
    if (map.getZoom() < minZoom) {
      map.setZoom(minZoom)
    }
  }, [bounds])

  const applyInitialEmptyRouteZoom = useCallback((map: L.Map) => {
    if (routeLatLngs.length > 0) {
      return
    }

    const viewportWidth = window.innerWidth
    if (viewportWidth > 768) {
      return
    }

    const extraZoomIn = viewportWidth <= 560 ? 2.0 : 1.6
    map.setZoom(Math.min(map.getMaxZoom(), map.getZoom() + extraZoomIn))
  }, [routeLatLngs.length])

  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) {
      return
    }

    const map = L.map(mapRef.current, {
      crs: L.CRS.Simple,
      minZoom: -2,
      maxZoom: 4,
      maxBounds: bounds,
      maxBoundsViscosity: 1,
      bounceAtZoomLimits: false,
      zoomControl: false,
      scrollWheelZoom: true,
      touchZoom: true,
      dragging: true,
      attributionControl: false,
      preferCanvas: true,
    })

    leafletMapRef.current = map
    imageLayerRef.current = L.imageOverlay(getFloorImage(activeFloor), bounds).addTo(map)
    routeLayerRef.current = L.layerGroup().addTo(map)
    map.setMaxBounds(bounds)
    map.fitBounds(bounds)
    syncMapBounds(map, false)
    applyInitialEmptyRouteZoom(map)

    return () => {
      map.remove()
      leafletMapRef.current = null
      imageLayerRef.current = null
      routeLayerRef.current = null
    }
  }, [activeFloor, applyInitialEmptyRouteZoom, bounds, syncMapBounds])

  useEffect(() => {
    const map = leafletMapRef.current
    const imageLayer = imageLayerRef.current
    if (!map || !imageLayer) {
      return
    }

    const nextImage = getFloorImage(activeFloor)
    const currentImage = (imageLayer as L.ImageOverlay & { _url?: string })._url
    if (currentImage !== nextImage) {
      map.removeLayer(imageLayer)
      imageLayerRef.current = L.imageOverlay(nextImage, bounds).addTo(map)
    }

    map.setMaxBounds(bounds)
    map.invalidateSize()
    map.fitBounds(bounds)
    syncMapBounds(map, false)
    applyInitialEmptyRouteZoom(map)
  }, [activeFloor, applyInitialEmptyRouteZoom, bounds, syncMapBounds])

  useEffect(() => {
    const map = leafletMapRef.current
    const layerGroup = routeLayerRef.current
    if (!map || !layerGroup) {
      return
    }

    layerGroup.clearLayers()

    const markers: PulseMarker[] = []

    if (routeLatLngs.length > 1) {
      // base route line
      L.polyline(routeLatLngs, {
        color: '#1976d2',
        weight: 6,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(layerGroup)

      // animated dots overlay: lightweight dashed stroke with round linecaps
      const animatedLine = L.polyline(routeLatLngs, {
        // same blue as base route so dots match the route color
        color: '#1976d2',
        // thicker stroke so dash segments look like round dots
        weight: 14,
        lineCap: 'round',
        lineJoin: 'round',
        interactive: false,
        className: 'route-animated-dots',
        renderer: L.svg(),
      }).addTo(layerGroup)

      // try to adapt animation duration to the actual path length for smoother speed
      try {
        const pathEl = (animatedLine as L.Polyline & { _path?: SVGPathElement })._path
        if (pathEl && pathEl.getTotalLength) {
          const len = Math.max(1, pathEl.getTotalLength())
          const baseDuration = Math.max(0.8, Math.min(6, len / 150))
          // speed multiplier <1 to make animation faster; lower = faster
          const speedMultiplier = 0.35
          const minDuration = 0.45
          const duration = Math.max(minDuration, baseDuration * speedMultiplier)

          // enforce consistent stroke dash so the animation loops seamlessly
          const dash = 1
          const gap = 30
          pathEl.style.strokeDasharray = `${dash} ${gap}`
          pathEl.style.strokeLinecap = 'round'
          pathEl.style.willChange = 'stroke-dashoffset'
          // set the animation explicitly to avoid layout thrash when updating duration
          pathEl.style.animation = `${duration}s linear infinite route-dots-move`
        }
      } catch {
        // ignore if DOM not ready
      }

      const startNode = routeNodesOnFloor[0]
      const endNode = routeNodesOnFloor[routeNodesOnFloor.length - 1]
      const startLatLng: L.LatLngExpression = [startNode.y, startNode.x]
      const endLatLng: L.LatLngExpression = [endNode.y, endNode.x]
      const zoom = map.getZoom()
      const baseRadius = Math.max(5, 12 - zoom * 1.2)
      const routeNeedsFloorChange = pisosEnRuta.length > 1

      const createMarker = (latLng: L.LatLngExpression, color: string, fillColor: string, radius: number) => {
        const marker = L.circleMarker(latLng, {
          color,
          fillColor,
          fillOpacity: 1,
          weight: 3,
          radius,
        }).addTo(layerGroup)
        markers.push(marker)
        return marker
      }

      createMarker(startLatLng, '#00c853', '#00e676', baseRadius + 4)
      createMarker(endLatLng, '#b71c1c', '#f44336', baseRadius + 4)

      routeNodesOnFloor.forEach((node) => {
        if (node.tipo !== 'escalera' || node.id === routeStart || node.id === routeEnd) {
          return
        }

        const routeIndex = routePath.indexOf(node.id)
        const previousNode = routeIndex > 0 ? nodos[routePath[routeIndex - 1]] : null
        const nextNode = routeIndex >= 0 && routeIndex < routePath.length - 1 ? nodos[routePath[routeIndex + 1]] : null
        const isRealFloorTransition = routeNeedsFloorChange && Boolean(
          (previousNode?.piso && previousNode.piso !== node.piso) ||
          (nextNode?.piso && nextNode.piso !== node.piso),
        )

        if (!isRealFloorTransition) {
          return
        }

        const staircase = L.circleMarker([node.y, node.x], {
          color: '#ffab00',
          fillColor: '#ffd600',
          fillOpacity: 1,
          weight: 3,
          radius: baseRadius,
          className: 'staircase-marker',
        }).addTo(layerGroup)
        const staircaseMarker = staircase as PulseMarker

        // crear círculo pulsante alrededor del marcador
        const pulseCircle = L.circle([node.y, node.x], {
          color: '#ffff99',
          fill: false,
          weight: 2,
          opacity: 0.4,
          radius: 25, // en píxeles del mapa
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(layerGroup)

        // animar círculo con setInterval
        let animationFrame = 0
        const animatePulse = setInterval(() => {
          animationFrame = (animationFrame + 1) % 100
          const progress = Math.abs(Math.sin((animationFrame / 100) * Math.PI))

          pulseCircle.setStyle({
            opacity: 0.1 + progress * 0.6, // parpadea entre 0.1 y 0.7
            weight: 1 + progress * 2, // peso varía entre 1 y 3
          })
          pulseCircle.setRadius(20 + progress * 15) // radio varía entre 20 y 35
        }, 30)

        // guardar intervalo en el marcador para limpiar después
        staircaseMarker.__pulseCirlceInterval = animatePulse
        staircaseMarker.__pulseCircle = pulseCircle

        const handleFloorChange = () => {
          // cambiar de piso cuando se hace click en escalera o en el círculo
          const nextFloor = activeFloor === 1 ? 2 : 1
          onFloorChange(nextFloor)
        }

        staircase.on('click', handleFloorChange)
        pulseCircle.on('click', handleFloorChange)

        staircase.bindTooltip('Haz click para cambiar de piso', { permanent: false })
        pulseCircle.bindTooltip('Haz click para cambiar de piso', { permanent: false })

        markers.push(staircaseMarker)
      })

      const routeBounds = L.polyline(routeLatLngs).getBounds()
      const viewportWidth = window.innerWidth
      const mobilePadding = viewportWidth <= 560 ? [140, 140] as [number, number] : [50, 50] as [number, number]
      map.fitBounds(routeBounds, { padding: mobilePadding })

      syncMapBounds(map, true)

      if (viewportWidth <= 768) {
        const mobileZoomOut = viewportWidth <= 560 ? 0.3 : 0.15
        const currentZoom = map.getZoom()
        const targetZoom = Math.max(map.getMinZoom(), currentZoom - mobileZoomOut)
        map.setZoom(targetZoom)
      }
    } else {
      map.fitBounds(bounds)
      syncMapBounds(map, false)
    }

    const handleZoomEnd = () => {
      const currentZoom = map.getZoom()
      const baseRadius = Math.max(5, 12 - currentZoom * 1.2)
      markers.forEach((marker) => {
        const color = marker.options.color
        if (color === '#00c853' || color === '#b71c1c') {
          marker.setRadius(baseRadius + 4)
        } else if (color === '#ffab00') {
          marker.setRadius(baseRadius)
        }
      })
    }

    map.on('zoomend', handleZoomEnd)
    const handleResize = () => {
      map.invalidateSize()
      syncMapBounds(map, routeLatLngs.length > 1)
    }

    window.addEventListener('resize', handleResize)
    return () => {
      map.off('zoomend', handleZoomEnd)
      window.removeEventListener('resize', handleResize)
      // limpiar intervalos de animación de pulso
      markers.forEach((marker) => {
        const interval = marker.__pulseCirlceInterval
        if (interval) {
          clearInterval(interval)
        }
      })
    }
  }, [activeFloor, bounds, currentFloor, onFloorChange, pisosEnRuta, routeEnd, routeLatLngs, routeNodesOnFloor, routePath, routeStart, syncMapBounds])

  return (
    <div className="map-grid-wrapper">
      <div ref={mapRef} className="map-grid-leaflet" aria-label={`Mapa piso ${activeFloor}`} />
    </div>
  )
}

export default MapGrid

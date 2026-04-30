// algoritmo de busqueda de rutas basado en grafos de nodos
// usa Dijkstra con peso euclidiano entre nodos para aproximar
// la ruta mas corta en distancia real recorrida

import type { MapGraph } from './mapData'

// estructura para representar la ruta encontrada
export interface RouteResult {
  path: string[] // array de IDs de nodos en la ruta (en orden)
  found: boolean // si se encontró una ruta válida
  message?: string // mensaje de error si no se encontró
}

// estructura para representar tramos de ruta por piso
export interface RouteSegment {
  [piso: string]: string[] // piso -> array de IDs de nodos en ese piso
}

// costo de recorrer una arista entre dos nodos (distancia en el plano)
function getEdgeCost(grafo: MapGraph, fromId: string, toId: string): number {
  const from = grafo[fromId]
  const to = grafo[toId]
  if (!from || !to) {
    return Number.POSITIVE_INFINITY
  }

  const dx = to.x - from.x
  const dy = to.y - from.y
  return Math.hypot(dx, dy)
}

// busca la ruta más corta entre dos nodos usando Dijkstra
// entrada: grafo completo de nodos, ID de inicio, ID de destino
// salida: array de IDs de nodos que forman la ruta (o null si no existe)
// se conserva el nombre bfsRoute para compatibilidad con el resto del codigo
export function bfsRoute(grafo: MapGraph, inicioId: string, destinoId: string): string[] | null {
  // valida que ambos nodos existan en el grafo
  if (!grafo[inicioId] || !grafo[destinoId]) {
    return null
  }

  // caso especial: si el inicio y destino son el mismo nodo
  if (inicioId === destinoId) {
    return [inicioId]
  }

  const distances = new Map<string, number>()
  const previous = new Map<string, string>()
  const visited = new Set<string>()
  const frontier = new Set<string>()

  Object.keys(grafo).forEach((nodeId) => {
    distances.set(nodeId, Number.POSITIVE_INFINITY)
  })
  distances.set(inicioId, 0)
  frontier.add(inicioId)

  while (frontier.size > 0) {
    let currentNode: string | null = null
    let currentDistance = Number.POSITIVE_INFINITY

    frontier.forEach((nodeId) => {
      const distance = distances.get(nodeId) ?? Number.POSITIVE_INFINITY
      if (distance < currentDistance) {
        currentDistance = distance
        currentNode = nodeId
      }
    })

    if (!currentNode) {
      break
    }

    frontier.delete(currentNode)
    if (visited.has(currentNode)) {
      continue
    }
    visited.add(currentNode)

    if (currentNode === destinoId) {
      break
    }

    const conexiones = grafo[currentNode]?.conexiones || []
    for (const vecino of conexiones) {
      if (!grafo[vecino] || visited.has(vecino)) {
        continue
      }

      const stepCost = getEdgeCost(grafo, currentNode, vecino)
      if (!Number.isFinite(stepCost)) {
        continue
      }

      const newDistance = currentDistance + stepCost
      const knownDistance = distances.get(vecino) ?? Number.POSITIVE_INFINITY
      if (newDistance < knownDistance) {
        distances.set(vecino, newDistance)
        previous.set(vecino, currentNode)
        frontier.add(vecino)
      }
    }
  }

  if (inicioId !== destinoId && !previous.has(destinoId)) {
    return null
  }

  const path: string[] = []
  let cursor: string | undefined = destinoId
  while (cursor) {
    path.push(cursor)
    if (cursor === inicioId) {
      break
    }
    cursor = previous.get(cursor)
  }

  path.reverse()
  return path[0] === inicioId ? path : null
}

// divide una ruta completa en tramos por piso
// util para mostrar en qué piso está cada segmento de la ruta
export function dividirRutaPorPiso(ruta: string[], grafo: MapGraph): RouteSegment {
  const tramos: RouteSegment = {}

  for (const nodeId of ruta) {
    const nodo = grafo[nodeId]
    if (!nodo) continue

    const piso = nodo.piso
    if (!tramos[piso]) {
      tramos[piso] = []
    }
    tramos[piso].push(nodeId)
  }

  return tramos
}

// obtiene los pisos por los que pasa la ruta (en orden)
export function getPisosEnRuta(ruta: string[], grafo: MapGraph): string[] {
  const pisos: string[] = []
  const vistoPiso = new Set<string>()

  for (const nodeId of ruta) {
    const nodo = grafo[nodeId]
    if (!nodo || vistoPiso.has(nodo.piso)) continue

    vistoPiso.add(nodo.piso)
    pisos.push(nodo.piso)
  }

  return pisos
}

// calcula el largo (número de nodos) de una ruta
export function getLargRuta(ruta: string[]): number {
  return ruta.length
}

/**
 * BFS shortest path between nodes in the graph.
 */

import type { GraphEdge } from '../types'

export interface PathResult {
  nodeIds: string[]
  edgeIds: string[]
}

/** BFS to find shortest path between two nodes (undirected). */
export function findShortestPath(edges: GraphEdge[], startId: string, endId: string): PathResult | null {
  if (startId === endId) return { nodeIds: [startId], edgeIds: [] }

  // Build adjacency list
  const adj = new Map<string, Array<{ neighbor: string; edgeId: string }>>()
  for (const e of edges) {
    if (!adj.has(e.from)) adj.set(e.from, [])
    if (!adj.has(e.to)) adj.set(e.to, [])
    adj.get(e.from)!.push({ neighbor: e.to, edgeId: e.id })
    adj.get(e.to)!.push({ neighbor: e.from, edgeId: e.id })
  }

  if (!adj.has(startId) || !adj.has(endId)) return null

  // BFS
  const visited = new Set<string>([startId])
  const parent = new Map<string, { node: string; edgeId: string }>()
  const queue: string[] = [startId]

  while (queue.length > 0) {
    const current = queue.shift()!
    const neighbors = adj.get(current) || []

    for (const { neighbor, edgeId } of neighbors) {
      if (visited.has(neighbor)) continue
      visited.add(neighbor)
      parent.set(neighbor, { node: current, edgeId })

      if (neighbor === endId) {
        // Reconstruct path
        const nodeIds: string[] = [endId]
        const edgeIds: string[] = []
        let cur = endId
        while (parent.has(cur)) {
          const p = parent.get(cur)!
          edgeIds.push(p.edgeId)
          nodeIds.push(p.node)
          cur = p.node
        }
        nodeIds.reverse()
        edgeIds.reverse()
        return { nodeIds, edgeIds }
      }

      queue.push(neighbor)
    }
  }

  return null // No path found
}

/** Find shortest paths between all pairs of initial entities. */
export function findAllPairPaths(edges: GraphEdge[], initialEntityIds: string[]): PathResult[] {
  const paths: PathResult[] = []

  for (let i = 0; i < initialEntityIds.length; i++) {
    for (let j = i + 1; j < initialEntityIds.length; j++) {
      const path = findShortestPath(edges, initialEntityIds[i], initialEntityIds[j])
      if (path) paths.push(path)
    }
  }

  return paths
}

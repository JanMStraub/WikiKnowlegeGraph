/**
 * Edge consolidation utilities
 * Merges multiple edges between the same nodes into a single edge with combined label
 */

import type { GraphEdge } from '../types'

export interface ConsolidatedEdge extends GraphEdge {
  labels: string[]
  count: number
}

/**
 * Consolidate edges between same source and target nodes
 */
export function consolidateEdges(edges: GraphEdge[]): ConsolidatedEdge[] {
  const edgeMap = new Map<string, ConsolidatedEdge>()

  for (const edge of edges) {
    // Create key from source and target (ignoring direction for bidirectional consolidation)
    const key = `${edge.from}-${edge.to}`

    const existing = edgeMap.get(key)

    if (existing) {
      // Add label to existing edge
      existing.labels.push(edge.label)
      existing.count++
      existing.label = existing.labels.join(', ')
    } else {
      // Create new consolidated edge
      edgeMap.set(key, {
        ...edge,
        labels: [edge.label],
        count: 1,
      })
    }
  }

  return Array.from(edgeMap.values())
}

/**
 * Check if an edge should be hidden based on node visibility
 */
export function shouldHideEdge(
  edge: GraphEdge,
  nodeVisibilityMap: Map<string, boolean>
): boolean {
  const fromVisible = nodeVisibilityMap.get(edge.from) !== false
  const toVisible = nodeVisibilityMap.get(edge.to) !== false

  // Hide edge if either endpoint is hidden
  return !fromVisible || !toVisible
}

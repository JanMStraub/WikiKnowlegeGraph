/**
 * Central state management hook for graph data
 */

import { useState, useCallback } from 'react'
import type { GraphNode, GraphEdge, AppState } from '../types'

export interface SelectedEdgeInfo {
  id: string
  label: string
  category?: string
  fromNode: GraphNode | null
  toNode: GraphNode | null
}

const STORAGE_KEY = 'wikigraph-filters'
const EDGE_CATEGORY_STORAGE_KEY = 'wikigraph-edge-category-filters'

function loadFilters() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.warn('Failed to load filters from localStorage:', e)
  }
  return {
    person: true,
    school: true,
    location: true,
    country: true,
    city: true,
    organization: true,
    company: true,
    concept: true,
  }
}

function saveFilters(filters: AppState['filters']) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters))
  } catch (e) {
    console.warn('Failed to save filters to localStorage:', e)
  }
}

const DEFAULT_EDGE_CATEGORY_FILTERS: Record<string, boolean> = {
  family: true,
  education: true,
  career: true,
  geographic: true,
  membership: true,
  other: true,
}

function loadEdgeCategoryFilters(): Record<string, boolean> {
  try {
    const stored = localStorage.getItem(EDGE_CATEGORY_STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch (e) {
    console.warn('Failed to load edge category filters:', e)
  }
  return { ...DEFAULT_EDGE_CATEGORY_FILTERS }
}

function saveEdgeCategoryFilters(filters: Record<string, boolean>) {
  try {
    localStorage.setItem(EDGE_CATEGORY_STORAGE_KEY, JSON.stringify(filters))
  } catch (e) {
    console.warn('Failed to save edge category filters:', e)
  }
}

export function useGraphState() {
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [progressMessage, setProgressMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFiltersState] = useState<AppState['filters']>(loadFilters())
  const [depth, setDepth] = useState(1)
  const [edgeBundling, setEdgeBundling] = useState(0.5) // 0 = no bundling, 1 = maximum bundling
  const [pruningThreshold, setPruningThreshold] = useState(50) // 0 = show all, 100 = hub only
  const [edgeCategoryFilters, setEdgeCategoryFiltersState] = useState<Record<string, boolean>>(loadEdgeCategoryFilters())
  const [selectedEdge, setSelectedEdge] = useState<SelectedEdgeInfo | null>(null)
  const [isPathMode, setIsPathMode] = useState(false)
  const [highlightedPaths, setHighlightedPaths] = useState<Array<{ nodeIds: string[]; edgeIds: string[] }>>([])
  const [isPhysicsEnabled, setIsPhysicsEnabled] = useState(false)

  const togglePhysics = useCallback(() => {
    setIsPhysicsEnabled((prev) => !prev)
  }, [])

  const setFilters = useCallback((newFilters: AppState['filters']) => {
    setFiltersState(newFilters)
    saveFilters(newFilters)
  }, [])

  const toggleFilter = useCallback(
    (group: keyof AppState['filters']) => {
      const newFilters = { ...filters, [group]: !filters[group] }
      setFilters(newFilters)
    },
    [filters, setFilters]
  )

  const setEdgeCategoryFilters = useCallback((newFilters: Record<string, boolean>) => {
    setEdgeCategoryFiltersState(newFilters)
    saveEdgeCategoryFilters(newFilters)
  }, [])

  const toggleEdgeCategoryFilter = useCallback(
    (category: string) => {
      const newFilters = { ...edgeCategoryFilters, [category]: !edgeCategoryFilters[category] }
      setEdgeCategoryFilters(newFilters)
    },
    [edgeCategoryFilters, setEdgeCategoryFilters]
  )

  const clearGraph = useCallback(() => {
    setNodes([])
    setEdges([])
    setSelectedNode(null)
    setSelectedEdge(null)
    setError(null)
    setIsPathMode(false)
    setHighlightedPaths([])
  }, [])

  const addNodes = useCallback(
    (newNodes: GraphNode[]) => {
      setNodes((prev) => {
        const nodeMap = new Map(prev.map((n) => [n.id, n]))
        newNodes.forEach((node) => {
          nodeMap.set(node.id, node)
        })
        return Array.from(nodeMap.values())
      })
    },
    []
  )

  const addEdges = useCallback(
    (newEdges: GraphEdge[]) => {
      setEdges((prev) => {
        const edgeMap = new Map(prev.map((e) => [e.id, e]))
        newEdges.forEach((edge) => {
          edgeMap.set(edge.id, edge)
        })
        return Array.from(edgeMap.values())
      })
    },
    []
  )

  const removeNode = useCallback(
    (nodeId: string) => {
      setNodes((prev) => prev.filter((n) => n.id !== nodeId))
      setEdges((prev) => prev.filter((e) => e.from !== nodeId && e.to !== nodeId))
      if (selectedNode?.id === nodeId) {
        setSelectedNode(null)
      }
    },
    [selectedNode]
  )

  return {
    // State
    nodes,
    edges,
    selectedNode,
    selectedEdge,
    isLoading,
    progressMessage,
    error,
    filters,
    depth,
    edgeBundling,
    pruningThreshold,
    edgeCategoryFilters,
    isPathMode,
    highlightedPaths,
    isPhysicsEnabled,

    // Setters
    setNodes,
    setEdges,
    setSelectedNode,
    setSelectedEdge,
    setIsLoading,
    setProgressMessage,
    setError,
    setFilters,
    setDepth,
    setEdgeBundling,
    setPruningThreshold,
    setEdgeCategoryFilters,
    setIsPathMode,
    setHighlightedPaths,
    setIsPhysicsEnabled,

    // Actions
    toggleFilter,
    toggleEdgeCategoryFilter,
    clearGraph,
    addNodes,
    addEdges,
    removeNode,
    togglePhysics,
  }
}

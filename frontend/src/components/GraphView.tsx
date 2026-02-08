/**
 * Graph visualization component using vis-network
 *
 * Features:
 * - Zoom-adaptive labels: node labels hidden by default, shown on hover/focus
 * - Edge labels hidden by default, shown on zoom or focus
 * - Click focus: clicking a node dims everything else and highlights connections
 * - Node pruning by degree threshold
 * - Edge category filtering
 * - Shortest path highlighting between initial entities
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { Network, DataSet } from 'vis-network/standalone'
import type { useGraphState } from '../hooks/useGraphState'
import type { GraphEdge, GraphNode } from '../types'
import { findAllPairPaths } from '../lib/shortestPath'
import EmptyState from './EmptyState'
import ExportMenu from './ExportMenu'
import './GraphView.css'

interface GraphViewProps {
  graphState: ReturnType<typeof useGraphState>
}

/** Compute edge importance: edges between high-degree nodes with fewer parallel edges rank higher */
function computeEdgeImportance(edges: { id: string; from: string; to: string }[]): Map<string, number> {
  const pairCount = new Map<string, number>()
  for (const e of edges) {
    const key = [e.from, e.to].sort().join('|')
    pairCount.set(key, (pairCount.get(key) || 0) + 1)
  }

  const degree = new Map<string, number>()
  for (const e of edges) {
    degree.set(e.from, (degree.get(e.from) || 0) + 1)
    degree.set(e.to, (degree.get(e.to) || 0) + 1)
  }

  const importanceMap = new Map<string, number>()
  for (const e of edges) {
    const key = [e.from, e.to].sort().join('|')
    const bundleSize = pairCount.get(key) || 1
    const endpointDegree = Math.max(degree.get(e.from) || 0, degree.get(e.to) || 0)
    importanceMap.set(e.id, endpointDegree / bundleSize)
  }

  return importanceMap
}

/** Compute node degrees from edges */
function computeNodeDegrees(edges: GraphEdge[]): Map<string, number> {
  const degree = new Map<string, number>()
  for (const e of edges) {
    degree.set(e.from, (degree.get(e.from) || 0) + 1)
    degree.set(e.to, (degree.get(e.to) || 0) + 1)
  }
  return degree
}

export default function GraphView({ graphState }: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const networkRef = useRef<Network | null>(null)
  const nodesDataSetRef = useRef<DataSet<any> | null>(null)
  const edgesDataSetRef = useRef<DataSet<any> | null>(null)
  const edgeImportanceRef = useRef<Map<string, number>>(new Map())
  const focusedNodeRef = useRef<string | null>(null)
  const isPathModeRef = useRef(false)
  const prevNodeIdsRef = useRef<Set<string>>(new Set())
  const prevEdgeIdsRef = useRef<Set<string>>(new Set())
  const [isPhysicsEnabled, setIsPhysicsEnabled] = useState(false)

  // Refs for current data so click handler always sees latest
  const nodesRef = useRef<GraphNode[]>([])
  const edgesRef = useRef<GraphEdge[]>([])
  useEffect(() => {
    nodesRef.current = graphState.nodes
  }, [graphState.nodes])
  useEffect(() => {
    edgesRef.current = graphState.edges
  }, [graphState.edges])

  // Keep path mode ref in sync
  useEffect(() => {
    isPathModeRef.current = graphState.isPathMode
  }, [graphState.isPathMode])

  /** Update edge label visibility based on zoom scale */
  const updateEdgeVisibilityForZoom = useCallback(() => {
    if (!edgesDataSetRef.current || !networkRef.current) return
    const importance = edgeImportanceRef.current
    if (importance.size === 0) return

    const scale = networkRef.current.getScale()
    const maxImportance = Math.max(...importance.values(), 1)
    const normalizedZoom = Math.min(1, Math.max(0, (scale - 0.2) / 1.3))
    const threshold = maxImportance * (1 - normalizedZoom)

    const updates: any[] = []
    for (const edge of edgesDataSetRef.current.get()) {
      const imp = importance.get(edge.id) || 0
      const show = imp >= threshold
      updates.push({
        id: edge.id,
        font: { size: show ? 11 : 0 },
        width: show ? 1.2 : 0.3,
      })
    }
    edgesDataSetRef.current.update(updates)
  }, [])

  /** Focus on a node: show its label + neighbors, dim everything else */
  const focusOnNode = useCallback((nodeId: string | null) => {
    if (!nodesDataSetRef.current || !edgesDataSetRef.current) return
    focusedNodeRef.current = nodeId

    if (!nodeId) {
      // Restore: hide labels, reset opacity
      const nodeUpdates = nodesDataSetRef.current.get().map((n: any) => ({
        id: n.id,
        opacity: 1.0,
        font: { size: n._isInitial ? 12 : 0 },
      }))
      nodesDataSetRef.current.update(nodeUpdates)

      const edgeUpdates = edgesDataSetRef.current.get().map((e: any) => ({
        id: e.id,
        color: undefined,
        width: undefined,
        font: undefined,
      }))
      edgesDataSetRef.current.update(edgeUpdates)

      updateEdgeVisibilityForZoom()
      return
    }

    // Find connected
    const connectedEdges = edgesDataSetRef.current.get().filter(
      (e: any) => e.from === nodeId || e.to === nodeId
    )
    const connectedNodeIds = new Set<string>([nodeId])
    for (const e of connectedEdges) {
      connectedNodeIds.add(e.from)
      connectedNodeIds.add(e.to)
    }
    const connectedEdgeIds = new Set(connectedEdges.map((e: any) => e.id))

    // Dim non-connected nodes, show labels on connected ones
    nodesDataSetRef.current.update(
      nodesDataSetRef.current.get().map((n: any) => ({
        id: n.id,
        opacity: connectedNodeIds.has(n.id) ? 1.0 : 0.08,
        font: { size: connectedNodeIds.has(n.id) ? 13 : 0 },
      }))
    )

    // Highlight connected edges, dim the rest
    edgesDataSetRef.current.update(
      edgesDataSetRef.current.get().map((e: any) => {
        if (connectedEdgeIds.has(e.id)) {
          return {
            id: e.id,
            color: { inherit: false, color: '#2563eb', highlight: '#1d4ed8' },
            width: 2.5,
            font: { size: 12 },
          }
        }
        return {
          id: e.id,
          color: { inherit: false, color: 'rgba(180,180,180,0.05)' },
          width: 0.1,
          font: { size: 0 },
        }
      })
    )
  }, [updateEdgeVisibilityForZoom])

  // Initialize vis-network
  useEffect(() => {
    if (!containerRef.current) return

    nodesDataSetRef.current = new DataSet([])
    edgesDataSetRef.current = new DataSet([])

    const computedStyle = getComputedStyle(document.documentElement)
    const textColor = computedStyle.getPropertyValue('--color-text-primary').trim()

    const initialRoundness = graphState.edgeBundling * 0.9

    const options = {
      nodes: {
        shape: 'dot',
        font: {
          color: textColor,
          size: 0, // Hidden by default — shown on hover/focus
          face: 'Inter, sans-serif',
          strokeWidth: 3,
          strokeColor: 'rgba(255,255,255,0.85)',
        },
        borderWidth: 1.5,
        borderWidthSelected: 3,
        scaling: { min: 8, max: 40 },
      },
      edges: {
        arrows: { to: { enabled: true, scaleFactor: 0.4 } },
        smooth: {
          enabled: graphState.edgeBundling > 0,
          type: graphState.edgeBundling > 0 ? 'cubicBezier' : 'continuous',
          roundness: initialRoundness,
        },
        font: {
          color: textColor,
          size: 0,
          align: 'middle',
          strokeWidth: 2,
          strokeColor: 'rgba(255,255,255,0.8)',
        },
        color: {
          color: 'rgba(150,150,150,0.25)',
          highlight: computedStyle.getPropertyValue('--color-primary').trim(),
          hover: computedStyle.getPropertyValue('--color-primary-hover').trim(),
        },
        width: 0.3,
        selectionWidth: 2.5,
        hoverWidth: 1.5,
      },
      physics: {
        enabled: false,
      },
      interaction: {
        hover: true,
        tooltipDelay: 150,
        navigationButtons: false,
        keyboard: { enabled: true },
        zoomView: true,
        dragView: true,
      },
      layout: {
        randomSeed: 42,
        improvedLayout: true,
      },
    }

    const network = new Network(
      containerRef.current,
      { nodes: nodesDataSetRef.current, edges: edgesDataSetRef.current },
      options
    )

    // Hover: show label for hovered node
    network.on('hoverNode', (params) => {
      if (!nodesDataSetRef.current || focusedNodeRef.current) return
      nodesDataSetRef.current.update([{ id: params.node, font: { size: 14 } }])
    })
    network.on('blurNode', (params) => {
      if (!nodesDataSetRef.current || focusedNodeRef.current) return
      // Only hide label again if it's not an initial entity
      const node = nodesDataSetRef.current.get(params.node) as any
      if (node && !node._isInitial) {
        nodesDataSetRef.current.update([{ id: params.node, font: { size: 0 } }])
      }
    })

    // Click: focus on node or edge — use nodesRef to avoid stale closure
    network.on('click', (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0] as string
        const node = nodesRef.current.find((n) => n.id === nodeId)
        if (node) {
          graphState.setSelectedEdge(null)
          graphState.setSelectedNode(node)
          if (!isPathModeRef.current) {
            focusOnNode(nodeId)
          }
        }
      } else if (params.edges.length > 0) {
        const edgeId = params.edges[0] as string
        const edge = edgesRef.current.find((e) => e.id === edgeId)
        if (edge) {
          if (!isPathModeRef.current) {
            focusOnNode(edge.from)
          }
          const fromNode = nodesRef.current.find((n) => n.id === edge.from) || null
          const toNode = nodesRef.current.find((n) => n.id === edge.to) || null
          graphState.setSelectedNode(null)
          graphState.setSelectedEdge({
            id: edge.id,
            label: edge.label,
            category: edge.category,
            fromNode,
            toNode,
          })
        }
      } else {
        graphState.setSelectedNode(null)
        graphState.setSelectedEdge(null)
        if (isPathModeRef.current) {
          graphState.setIsPathMode(false)
          graphState.setHighlightedPaths([])
        }
        focusOnNode(null)
      }
    })

    network.on('doubleClick', (_params) => {
      // Reserved for future expand-on-double-click feature
    })

    // Zoom: update edge label visibility (skip during focus/path mode)
    network.on('zoom', () => {
      if (!focusedNodeRef.current && !isPathModeRef.current) {
        updateEdgeVisibilityForZoom()
      }
    })

    networkRef.current = network

    return () => {
      if (networkRef.current) {
        networkRef.current.destroy()
        networkRef.current = null
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync graph data to DataSets when the graph structure changes
  useEffect(() => {
    if (!nodesDataSetRef.current || !edgesDataSetRef.current) return

    const currNodeIds = new Set(graphState.nodes.map((n) => n.id))
    const currEdgeIds = new Set(graphState.edges.map((e) => e.id))
    const prev = prevNodeIdsRef.current
    const prevEdge = prevEdgeIdsRef.current

    const dataChanged = prev.size !== currNodeIds.size ||
      prevEdge.size !== currEdgeIds.size ||
      [...currNodeIds].some((id) => !prev.has(id)) ||
      [...currEdgeIds].some((id) => !prevEdge.has(id))

    if (!dataChanged) return

    prevNodeIdsRef.current = currNodeIds
    prevEdgeIdsRef.current = currEdgeIds

    nodesDataSetRef.current.clear()
    edgesDataSetRef.current.clear()

    if (graphState.nodes.length === 0) return

    // Add nodes: initial entities get visible labels, others hidden
    nodesDataSetRef.current.add(
      graphState.nodes.map((node) => ({
        ...node,
        font: { size: node.isInitialEntity ? 12 : 0 },
        _isInitial: node.isInitialEntity || false,
      }))
    )
    edgesDataSetRef.current.add(graphState.edges)

    edgeImportanceRef.current = computeEdgeImportance(graphState.edges)
    focusedNodeRef.current = null

    if (networkRef.current) {
      setTimeout(() => {
        networkRef.current?.fit({
          animation: { duration: 400, easingFunction: 'easeInOutQuad' },
        })
        setTimeout(() => updateEdgeVisibilityForZoom(), 450)
      }, 100)
    }
  }, [graphState.nodes, graphState.edges, updateEdgeVisibilityForZoom])

  // Apply all visibility: group filters + pruning threshold + edge category filters
  useEffect(() => {
    if (!nodesDataSetRef.current || !edgesDataSetRef.current) return
    if (graphState.nodes.length === 0) return

    // Only apply pruning based on visible edges (not all edges)
    // First pass: determine group-hidden nodes
    const groupHiddenIds = new Set<string>()
    for (const node of graphState.nodes) {
      if (!graphState.filters[node.group]) {
        groupHiddenIds.add(node.id)
      }
    }

    // Compute degrees from only visible edges (edges between non-group-hidden nodes)
    const visibleEdges = graphState.edges.filter(
      (e) => !groupHiddenIds.has(e.from) && !groupHiddenIds.has(e.to)
    )
    const degrees = computeNodeDegrees(visibleEdges)
    const degreeValues = [...degrees.values()]
    const maxDegree = degreeValues.length > 0 ? Math.max(...degreeValues) : 1
    const threshold = (graphState.pruningThreshold / 100) * maxDegree

    // Second pass: determine final hidden set (group + pruning)
    const hiddenNodeIds = new Set<string>(groupHiddenIds)
    for (const node of graphState.nodes) {
      if (hiddenNodeIds.has(node.id)) continue
      const degree = degrees.get(node.id) || 0
      if (graphState.pruningThreshold > 0 && degree < threshold && !node.isInitialEntity) {
        hiddenNodeIds.add(node.id)
      }
    }

    const nodeUpdates = graphState.nodes.map((node) => ({
      id: node.id,
      hidden: hiddenNodeIds.has(node.id),
    }))
    nodesDataSetRef.current.update(nodeUpdates)

    const edgeUpdates = graphState.edges.map((edge) => {
      const endpointHidden = hiddenNodeIds.has(edge.from) || hiddenNodeIds.has(edge.to)
      const categoryHidden = edge.category
        ? graphState.edgeCategoryFilters[edge.category] === false
        : false
      return { id: edge.id, hidden: endpointHidden || categoryHidden }
    })
    edgesDataSetRef.current.update(edgeUpdates)
  }, [graphState.nodes, graphState.edges, graphState.filters, graphState.pruningThreshold, graphState.edgeCategoryFilters])

  // Path highlighting effect
  useEffect(() => {
    if (!nodesDataSetRef.current || !edgesDataSetRef.current) return

    if (!graphState.isPathMode || graphState.highlightedPaths.length === 0) {
      if (!focusedNodeRef.current) {
        const nodeUpdates = nodesDataSetRef.current.get().map((n: any) => ({
          id: n.id,
          opacity: 1.0,
          font: { size: n._isInitial ? 12 : 0 },
        }))
        nodesDataSetRef.current.update(nodeUpdates)

        const edgeUpdates = edgesDataSetRef.current.get().map((e: any) => ({
          id: e.id,
          color: undefined,
          width: undefined,
          font: undefined,
        }))
        edgesDataSetRef.current.update(edgeUpdates)
        updateEdgeVisibilityForZoom()
      }
      return
    }

    const pathNodeIds = new Set<string>()
    const pathEdgeIds = new Set<string>()
    for (const path of graphState.highlightedPaths) {
      for (const nid of path.nodeIds) pathNodeIds.add(nid)
      for (const eid of path.edgeIds) pathEdgeIds.add(eid)
    }

    nodesDataSetRef.current.update(
      nodesDataSetRef.current.get().map((n: any) => ({
        id: n.id,
        opacity: pathNodeIds.has(n.id) ? 1.0 : 0.06,
        font: { size: pathNodeIds.has(n.id) ? 13 : 0 },
      }))
    )

    edgesDataSetRef.current.update(
      edgesDataSetRef.current.get().map((e: any) => {
        if (pathEdgeIds.has(e.id)) {
          return {
            id: e.id,
            color: { inherit: false, color: '#f59e0b', highlight: '#d97706' },
            width: 4,
            font: { size: 12 },
          }
        }
        return {
          id: e.id,
          color: { inherit: false, color: 'rgba(180,180,180,0.04)' },
          width: 0.1,
          font: { size: 0 },
        }
      })
    )
  }, [graphState.isPathMode, graphState.highlightedPaths, updateEdgeVisibilityForZoom])

  // Apply edge bundling
  useEffect(() => {
    if (!networkRef.current) return

    const roundness = graphState.edgeBundling * 0.9
    networkRef.current.setOptions({
      edges: {
        smooth: {
          enabled: graphState.edgeBundling > 0,
          type: graphState.edgeBundling > 0 ? 'cubicBezier' : 'continuous',
          roundness,
        },
      },
    })
  }, [graphState.edgeBundling])

  const togglePhysics = () => {
    if (networkRef.current) {
      const newState = !isPhysicsEnabled
      networkRef.current.setOptions({ physics: { enabled: newState } })
      setIsPhysicsEnabled(newState)
    }
  }

  const fitNetwork = () => {
    if (networkRef.current) {
      focusOnNode(null)
      networkRef.current.fit({
        animation: { duration: 500, easingFunction: 'easeInOutQuad' },
      })
    }
  }

  const togglePathMode = () => {
    if (graphState.isPathMode) {
      graphState.setIsPathMode(false)
      graphState.setHighlightedPaths([])
      return
    }

    const initialEntityIds = graphState.nodes
      .filter((n) => n.isInitialEntity)
      .map((n) => n.id)

    if (initialEntityIds.length < 2) return

    const paths = findAllPairPaths(graphState.edges, initialEntityIds)
    graphState.setHighlightedPaths(paths)
    graphState.setIsPathMode(true)
  }

  const showEmptyState = graphState.nodes.length === 0 && !graphState.isLoading
  const initialEntityCount = graphState.nodes.filter((n) => n.isInitialEntity).length

  return (
    <div className="graph-view">
      {showEmptyState && (
        <EmptyState
          onQuickStart={async (entities) => {
            graphState.setIsLoading(true)
            try {
              const { generateMap: genMap } = await import('../api')
              const data = await genMap({ names: entities, depth: 1 })
              graphState.setNodes(data.nodes)
              graphState.setEdges(data.edges)
            } catch (err) {
              console.error('Quick start error:', err)
              graphState.setError(err instanceof Error ? err.message : 'Failed to generate graph')
            } finally {
              graphState.setIsLoading(false)
            }
          }}
        />
      )}
      {!showEmptyState && (
        <div className="graph-controls">
          <button
            onClick={togglePhysics}
            className="control-btn"
            title={isPhysicsEnabled ? 'Freeze graph' : 'Unfreeze graph'}
            aria-label={isPhysicsEnabled ? 'Freeze graph layout' : 'Unfreeze graph layout'}
          >
            {isPhysicsEnabled ? '❄️ Freeze' : '🔥 Unfreeze'}
          </button>
          <button onClick={fitNetwork} className="control-btn" title="Fit to screen" aria-label="Fit graph to screen">
            🔍 Fit
          </button>
          {initialEntityCount >= 2 && (
            <button
              onClick={togglePathMode}
              className={`control-btn${graphState.isPathMode ? ' active' : ''}`}
              title={graphState.isPathMode ? 'Exit path mode' : 'Show shortest paths between initial entities'}
            >
              {graphState.isPathMode ? '✕ Paths' : '🛤️ Paths'}
            </button>
          )}
          {networkRef.current && <ExportMenu network={networkRef.current} />}
        </div>
      )}
      <div ref={containerRef} className="graph-container" style={{ display: showEmptyState ? 'none' : 'block' }} />
    </div>
  )
}

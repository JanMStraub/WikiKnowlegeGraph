/**
 * Main application component
 */

import { useEffect, useCallback } from 'react'
import { useGraphState } from './hooks/useGraphState'
import { useDarkMode } from './hooks/useDarkMode'
import { fetchBatchConnections } from './lib/sparql'
import { categorizeEdge } from './lib/edgeCategories'
import Sidebar from './components/Sidebar'
import GraphView from './components/GraphView'
import InfoPanel from './components/InfoPanel'
import EdgeInfoPanel from './components/EdgeInfoPanel'
import LoadingOverlay from './components/LoadingOverlay'
import type { GraphNode, GraphEdge } from './types'
import './styles/app.css'

const PLACEHOLDER_IMG =
  'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png'

function App() {
  const graphState = useGraphState()
  const { theme, toggleTheme } = useDarkMode()

  // URL hash synchronization
  useEffect(() => {
    const handleHashChange = () => {
      try {
        const hash = window.location.hash.slice(1)
        if (hash) {
          const params = new URLSearchParams(hash)
          const entities = params.get('entities')
          const depth = params.get('depth')

          if (entities && depth) {
            // TODO: Auto-populate and generate from URL params
            console.log('Load from URL:', { entities, depth })
          }
        }
      } catch (e) {
        console.error('Failed to parse URL hash:', e)
      }
    }

    window.addEventListener('hashchange', handleHashChange)
    handleHashChange() // Load on mount

    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Enter: Generate (handled in Sidebar)
      // Escape: Close panel / deselect
      if (e.key === 'Escape') {
        graphState.setSelectedNode(null)
        graphState.setSelectedEdge(null)
      }
      // F: Toggle freeze (TODO: implement in GraphView)
      // Delete: Remove selected node
      if (e.key === 'Delete' && graphState.selectedNode) {
        graphState.removeNode(graphState.selectedNode.id)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [graphState])

  const expandNode = useCallback(async (nodeId: string) => {
    graphState.setProgressMessage(`Expanding ${nodeId}...`)
    graphState.setIsLoading(true)
    try {
      const connections = await fetchBatchConnections([nodeId])
      const existingNodeIds = new Set(graphState.nodes.map((n) => n.id))
      const existingEdgeIds = new Set(graphState.edges.map((e) => e.id))

      const newNodes: GraphNode[] = []
      const newEdges: GraphEdge[] = []

      for (const conn of connections) {
        const tgt = conn.target
        if (!existingNodeIds.has(tgt)) {
          const grp = conn.group as GraphNode['group']
          const shape = grp === 'person' ? 'circularImage' : 'dot'
          const size = grp === 'person' ? 30 : grp === 'country' ? 22 : grp === 'city' ? 18 : 15
          newNodes.push({
            id: tgt,
            label: conn.target_label,
            group: grp,
            shape,
            image: conn.image || PLACEHOLDER_IMG,
            size,
            title: `Type: ${conn.type_label}`,
          })
          existingNodeIds.add(tgt)
        }

        const edgeId = `${conn.source}-${tgt}-${conn.label}`
        if (!existingEdgeIds.has(edgeId)) {
          newEdges.push({
            id: edgeId,
            from: conn.source,
            to: tgt,
            label: conn.label,
            arrows: 'to',
            category: categorizeEdge(conn.label),
          })
          existingEdgeIds.add(edgeId)
        }
      }

      if (newNodes.length > 0) graphState.addNodes(newNodes)
      if (newEdges.length > 0) graphState.addEdges(newEdges)
      graphState.setProgressMessage(`Added ${newNodes.length} nodes, ${newEdges.length} edges`)
    } catch (err) {
      console.error('Expand error:', err)
      graphState.setError(err instanceof Error ? err.message : 'Failed to expand node')
    } finally {
      graphState.setIsLoading(false)
      setTimeout(() => graphState.setProgressMessage(null), 2000)
    }
  }, [graphState])

  return (
    <div className="app" data-theme={theme}>
      <Sidebar
        graphState={graphState}
        isDark={theme === 'dark'}
        onToggleTheme={toggleTheme}
      />

      <main className="main-content">
        <GraphView graphState={graphState} />
        {graphState.isLoading && <LoadingOverlay />}
      </main>

      {graphState.selectedNode && (
        <InfoPanel
          node={graphState.selectedNode}
          onClose={() => graphState.setSelectedNode(null)}
          onRemove={(nodeId) => graphState.removeNode(nodeId)}
          onExpand={(nodeId) => {
            graphState.setSelectedNode(null)
            expandNode(nodeId)
          }}
        />
      )}

      {graphState.selectedEdge && !graphState.selectedNode && (
        <EdgeInfoPanel
          edge={graphState.selectedEdge}
          onClose={() => graphState.setSelectedEdge(null)}
          onSelectNode={(nodeId) => {
            const node = graphState.nodes.find((n) => n.id === nodeId)
            if (node) {
              graphState.setSelectedEdge(null)
              graphState.setSelectedNode(node)
            }
          }}
        />
      )}
    </div>
  )
}

export default App

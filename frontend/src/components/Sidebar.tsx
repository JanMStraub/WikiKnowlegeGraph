/**
 * Sidebar component with search, controls, and legend
 */

import { useState, useEffect } from 'react'
import type { useGraphState } from '../hooks/useGraphState'
import SearchInput from './SearchInput'
import Legend from './Legend'
import EdgeCategoryLegend from './EdgeCategoryLegend'
import { generateMap, estimateTime } from '../api'
import './Sidebar.css'

interface SidebarProps {
  graphState: ReturnType<typeof useGraphState>
  isDark: boolean
  onToggleTheme: () => void
}

interface SearchEntity {
  id: string
  name?: string
  qid?: string
}

export default function Sidebar({ graphState, isDark, onToggleTheme }: SidebarProps) {
  const [searchEntities, setSearchEntities] = useState<SearchEntity[]>([
    { id: '1' },
    { id: '2' },
  ])
  const [estimatedTime, setEstimatedTime] = useState<string>('')

  const addSearchInput = () => {
    setSearchEntities([...searchEntities, { id: Date.now().toString() }])
  }

  const removeSearchInput = (id: string) => {
    if (searchEntities.length > 1) {
      setSearchEntities(searchEntities.filter((e) => e.id !== id))
      updateEstimate(graphState.depth)
    }
  }

  const updateEstimate = async (depth: number) => {
    // Collect entities
    const names: string[] = []
    const qids: string[] = []

    searchEntities.forEach((entity) => {
      if (entity.qid) {
        qids.push(entity.qid)
      } else if (entity.name) {
        names.push(entity.name)
      }
    })

    if (names.length === 0 && qids.length === 0) {
      setEstimatedTime('')
      return
    }

    try {
      const estimate = await estimateTime({ names, qids, depth })
      setEstimatedTime(estimate.formatted_time)
    } catch (err) {
      console.error('Failed to estimate time:', err)
      setEstimatedTime('')
    }
  }

  const handleGenerate = async () => {
    graphState.setIsLoading(true)
    graphState.setError(null)

    try {
      // Collect entities
      const names: string[] = []
      const qids: string[] = []

      searchEntities.forEach((entity) => {
        if (entity.name) {
          names.push(entity.name)
        } else if (entity.qid) {
          qids.push(entity.qid)
        }
      })

      // Validate
      if (names.length === 0 && qids.length === 0) {
        graphState.setError('Please select at least one entity')
        graphState.setIsLoading(false)
        return
      }

      graphState.setProgressMessage('Starting...')

      // Call API
      const data = await generateMap(
        {
          names: names.length > 0 ? names : undefined,
          qids: qids.length > 0 ? qids : undefined,
          depth: graphState.depth,
        },
        false,
        (msg) => graphState.setProgressMessage(msg)
      )

      // Update graph
      graphState.setNodes(data.nodes)
      graphState.setEdges(data.edges)

      // Update URL hash for sharing
      const entityStr = [...names, ...qids].join(',')
      window.location.hash = `entities=${encodeURIComponent(entityStr)}&depth=${graphState.depth}`
    } catch (err) {
      console.error('Generate error:', err)
      graphState.setError(err instanceof Error ? err.message : 'Failed to generate graph')
    } finally {
      graphState.setIsLoading(false)
      graphState.setProgressMessage(null)
    }
  }

  // Keyboard shortcut: Ctrl/Cmd + Enter to generate
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        if (!graphState.isLoading) {
          handleGenerate()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [searchEntities, graphState.depth, graphState.isLoading])

  return (
    <aside className="sidebar">
      <header className="sidebar-header">
        <h1>WikiGraph</h1>
        <button
          onClick={onToggleTheme}
          className="theme-toggle"
          aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        >
          {isDark ? '☀️' : '🌙'}
        </button>
      </header>

      <div className="sidebar-content">
        <section className="search-section">
          <h2>Search Entities</h2>
          {searchEntities.map((entity, index) => (
            <div key={entity.id} className="search-input-wrapper">
              <SearchInput
                placeholder={`Entity ${index + 1}`}
                onSelect={(result) => {
                  // Store selected QID
                  setSearchEntities(
                    searchEntities.map((e) =>
                      e.id === entity.id ? { ...e, qid: result.qid, name: result.label } : e
                    )
                  )
                  // Update estimate when entity is selected
                  updateEstimate(graphState.depth)
                }}
              />
              {searchEntities.length > 1 && (
                <button
                  className="remove-btn"
                  onClick={() => removeSearchInput(entity.id)}
                  aria-label="Remove search input"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button className="add-btn" onClick={addSearchInput}>
            + Add Entity
          </button>
        </section>

        <section className="depth-section">
          <label htmlFor="depth-slider">
            Depth: {graphState.depth}
            {graphState.depth > 5 && <span className="warning"> (May take longer)</span>}
            {graphState.depth > 7 && <span className="warning-severe"> (Very slow!)</span>}
          </label>
          <input
            id="depth-slider"
            type="range"
            min="1"
            max="10"
            value={graphState.depth}
            onChange={(e) => {
              const newDepth = Number(e.target.value)
              graphState.setDepth(newDepth)
              // Update estimated time when depth changes
              updateEstimate(newDepth)
            }}
          />
          <div className="depth-labels">
            <span>1</span>
            <span>3</span>
            <span>5</span>
            <span>7</span>
            <span>10</span>
          </div>
          {estimatedTime && (
            <div className="time-estimate">
              ⏱️ Estimated time: <strong>{estimatedTime}</strong>
            </div>
          )}
        </section>

        <section className="bundling-section">
          <label htmlFor="bundling-slider">
            Link Curvature: {Math.round(graphState.edgeBundling * 100)}%
            {graphState.edgeBundling === 0 && <span className="hint-text"> (Straight lines)</span>}
            {graphState.edgeBundling === 1 && <span className="hint-text"> (Maximum curve)</span>}
          </label>
          <input
            id="bundling-slider"
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={graphState.edgeBundling}
            onChange={(e) => graphState.setEdgeBundling(Number(e.target.value))}
          />
          <div className="bundling-labels">
            <span>Straight</span>
            <span>Moderate</span>
            <span>Maximum</span>
          </div>
          <p className="bundling-description">
            Curved links help differentiate parallel connections.
          </p>
        </section>

        <section className="pruning-section">
          <label htmlFor="pruning-slider">
            Node Pruning: {graphState.pruningThreshold}%
            {graphState.pruningThreshold === 0 && <span className="hint-text"> (All nodes)</span>}
            {graphState.pruningThreshold === 100 && <span className="hint-text"> (Hub only)</span>}
          </label>
          <input
            id="pruning-slider"
            type="range"
            min="0"
            max="100"
            step="5"
            value={graphState.pruningThreshold}
            onChange={(e) => graphState.setPruningThreshold(Number(e.target.value))}
          />
          <div className="pruning-labels">
            <span>All</span>
            <span>50%</span>
            <span>Hub only</span>
          </div>
        </section>

        {graphState.error && (
          <div className="error-message" role="alert">
            {graphState.error}
          </div>
        )}

        <button className="generate-btn" onClick={handleGenerate} disabled={graphState.isLoading}>
          {graphState.isLoading ? 'Generating...' : 'Generate Graph'}
        </button>

        {graphState.isLoading && graphState.progressMessage && (
          <div className="progress-status">
            {graphState.progressMessage}
          </div>
        )}

        <div className="keyboard-hint">
          💡 Tip: Press <kbd>Ctrl+Enter</kbd> to generate
        </div>

        <Legend filters={graphState.filters} onToggleFilter={graphState.toggleFilter} />

        <EdgeCategoryLegend
          filters={graphState.edgeCategoryFilters}
          onToggleFilter={graphState.toggleEdgeCategoryFilter}
        />
      </div>
    </aside>
  )
}

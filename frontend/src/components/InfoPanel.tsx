/**
 * Info panel for selected node details
 */

import type { GraphNode } from '../types'
import { useWikiSummary } from '../hooks/useWikiSummary'
import './InfoPanel.css'

interface InfoPanelProps {
  node: GraphNode
  onClose: () => void
  onRemove?: (nodeId: string) => void
  onExpand?: (nodeId: string) => void
}

export default function InfoPanel({ node, onClose, onRemove, onExpand }: InfoPanelProps) {
  const wikipediaUrl = `https://en.wikipedia.org/wiki/Special:GoToLinkedPage/enwiki/${node.id}`
  const wikidataUrl = `https://www.wikidata.org/wiki/${node.id}`
  const { summary, isLoading: summaryLoading } = useWikiSummary(node.id)

  return (
    <aside className="info-panel">
      <header className="info-panel-header">
        <h2>{node.label}</h2>
        <button onClick={onClose} className="close-btn" aria-label="Close panel">
          ✕
        </button>
      </header>

      <div className="info-panel-content">
        {node.image && !node.image.includes('placeholder') && (
          <img
            src={node.image}
            alt={node.label}
            className="node-image"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        )}

        <div className="node-details">
          <p>
            <strong>Type:</strong> {node.title}
          </p>
          <p>
            <strong>Group:</strong> {node.group}
          </p>
          <p>
            <strong>ID:</strong> {node.id}
          </p>
        </div>

        <div className="wiki-summary">
          {summaryLoading && (
            <div className="summary-skeleton">
              <div className="skeleton-thumb" />
              <div className="skeleton-line" />
              <div className="skeleton-line short" />
            </div>
          )}
          {!summaryLoading && summary && (
            <>
              {summary.thumbnail && (
                <img
                  src={summary.thumbnail.source}
                  alt={summary.title}
                  className="summary-thumbnail"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              )}
              {summary.description && (
                <p className="summary-description">{summary.description}</p>
              )}
              {summary.extract && (
                <p className="summary-extract">{summary.extract}</p>
              )}
            </>
          )}
          {!summaryLoading && !summary && (
            <p className="summary-empty">No Wikipedia article available</p>
          )}
        </div>

        <div className="node-actions">
          <a href={wikipediaUrl} target="_blank" rel="noopener noreferrer" className="action-link">
            📖 View on Wikipedia
          </a>
          <a href={wikidataUrl} target="_blank" rel="noopener noreferrer" className="action-link">
            🔗 View on Wikidata
          </a>
        </div>

        <div className="node-controls">
          {onExpand && (
            <button
              onClick={() => {
                onExpand(node.id)
                onClose()
              }}
              className="control-action expand-btn"
              title="Fetch more connections for this node"
            >
              🔍 Expand Node
            </button>
          )}
          {onRemove && (
            <button
              onClick={() => {
                if (confirm(`Remove "${node.label}" and its connections?`)) {
                  onRemove(node.id)
                  onClose()
                }
              }}
              className="control-action remove-btn"
              title="Remove this node from the graph"
            >
              🗑️ Remove Node
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}

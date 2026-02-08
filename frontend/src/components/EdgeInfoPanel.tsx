/**
 * Info panel for selected edge details
 */

import type { SelectedEdgeInfo } from '../hooks/useGraphState'
import { EDGE_CATEGORY_CONFIG, type EdgeCategory } from '../lib/edgeCategories'
import './InfoPanel.css'

interface EdgeInfoPanelProps {
  edge: SelectedEdgeInfo
  onClose: () => void
  onSelectNode?: (nodeId: string) => void
}

export default function EdgeInfoPanel({ edge, onClose, onSelectNode }: EdgeInfoPanelProps) {
  const categoryConfig = edge.category
    ? EDGE_CATEGORY_CONFIG[edge.category as EdgeCategory]
    : null

  return (
    <aside className="info-panel">
      <header className="info-panel-header">
        <h2>{edge.label}</h2>
        <button onClick={onClose} className="close-btn" aria-label="Close panel">
          ✕
        </button>
      </header>

      <div className="info-panel-content">
        <div className="node-details">
          <p>
            <strong>Relationship:</strong> {edge.label}
          </p>
          {categoryConfig && (
            <p>
              <strong>Category:</strong>{' '}
              <span style={{ color: categoryConfig.color }}>
                {categoryConfig.icon} {categoryConfig.label}
              </span>
            </p>
          )}
        </div>

        <div className="edge-endpoints">
          {edge.fromNode && (
            <button
              className="endpoint-btn"
              onClick={() => onSelectNode?.(edge.fromNode!.id)}
            >
              <span className="endpoint-label">From</span>
              <span className="endpoint-name">{edge.fromNode.label}</span>
              <span className="endpoint-group">{edge.fromNode.group}</span>
            </button>
          )}
          <div className="edge-arrow">→</div>
          {edge.toNode && (
            <button
              className="endpoint-btn"
              onClick={() => onSelectNode?.(edge.toNode!.id)}
            >
              <span className="endpoint-label">To</span>
              <span className="endpoint-name">{edge.toNode.label}</span>
              <span className="endpoint-group">{edge.toNode.group}</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}

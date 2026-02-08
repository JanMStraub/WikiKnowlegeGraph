/**
 * Empty state shown when no graph is loaded
 */

import './EmptyState.css'

interface EmptyStateProps {
  onQuickStart?: (entities: string[]) => void
}

export default function EmptyState({ onQuickStart }: EmptyStateProps) {
  const examples = [
    ['Albert Einstein', 'Marie Curie'],
    ['Apple Inc.', 'Microsoft'],
    ['Paris', 'London'],
    ['The Beatles', 'The Rolling Stones'],
    ['Stanford University', 'MIT'],
  ]

  const handleExample = (entities: string[]) => {
    if (onQuickStart) {
      onQuickStart(entities)
    }
  }

  return (
    <div className="empty-state">
      <div className="empty-state-content">
        <div className="logo">🌐</div>
        <h2>Welcome to WikiGraph Pro</h2>
        <p>
          Visualize connections between Wikipedia entities and explore knowledge graphs
          interactively.
        </p>
        <div className="quick-start">
          <h3>Quick Start Examples:</h3>
          <div className="example-buttons">
            {examples.map((entities, index) => (
              <button
                key={index}
                className="example-btn"
                onClick={() => handleExample(entities)}
              >
                {entities.join(' + ')}
              </button>
            ))}
          </div>
        </div>
        <p className="hint">Or enter your own entities in the sidebar →</p>

        <div className="features">
          <div className="feature">
            <span className="feature-icon">🔍</span>
            <span>Smart autocomplete search</span>
          </div>
          <div className="feature">
            <span className="feature-icon">🎨</span>
            <span>Dark mode support</span>
          </div>
          <div className="feature">
            <span className="feature-icon">📊</span>
            <span>Interactive graph visualization</span>
          </div>
        </div>
      </div>
    </div>
  )
}

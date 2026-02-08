/**
 * Loading overlay with progress indicator
 */

import './LoadingOverlay.css'

export default function LoadingOverlay() {
  return (
    <div className="loading-overlay">
      <div className="loading-content">
        <div className="spinner" />
        <p>Generating knowledge graph...</p>
        {/* TODO: Add multi-step progress messages */}
      </div>
    </div>
  )
}

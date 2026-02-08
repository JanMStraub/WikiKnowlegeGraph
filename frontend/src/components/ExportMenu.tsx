/**
 * Export menu for graph export functionality
 */

import { useState } from 'react'
import type { Network } from 'vis-network/standalone'
import './ExportMenu.css'

interface ExportMenuProps {
  network: Network
}

export default function ExportMenu({ network }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  const exportPNG = () => {
    try {
      // Get canvas from vis-network
      const canvas = (network as any).canvas.frame.canvas as HTMLCanvasElement

      // Convert to data URL
      const dataURL = canvas.toDataURL('image/png')

      // Create download link
      const link = document.createElement('a')
      link.download = `wikigraph-${Date.now()}.png`
      link.href = dataURL
      link.click()

      setIsOpen(false)
    } catch (error) {
      console.error('Failed to export PNG:', error)
      alert('Failed to export PNG. Please try again.')
    }
  }

  const exportJSON = () => {
    try {
      // Get data from network
      const data = {
        nodes: (network as any).body.data.nodes.get(),
        edges: (network as any).body.data.edges.get(),
        exported: new Date().toISOString(),
        version: '2.0',
      }

      // Create blob
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      })

      // Create download link
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = `wikigraph-${Date.now()}.json`
      link.href = url
      link.click()

      // Cleanup
      URL.revokeObjectURL(url)

      setIsOpen(false)
    } catch (error) {
      console.error('Failed to export JSON:', error)
      alert('Failed to export JSON. Please try again.')
    }
  }

  return (
    <div className="export-menu">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="control-btn export-btn"
        aria-expanded={isOpen}
        aria-label="Export menu"
      >
        📥 Export
      </button>

      {isOpen && (
        <div className="export-dropdown">
          <button onClick={exportPNG} className="export-option">
            🖼️ Export as PNG
          </button>
          <button onClick={exportJSON} className="export-option">
            📄 Export as JSON
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * Export menu for graph export functionality
 */

import { useState, RefObject } from 'react'
import type { ForceGraphMethods } from 'react-force-graph-2d'
import type { GraphData } from '../types'
import './ExportMenu.css'

interface ExportMenuProps {
  fgRef: RefObject<ForceGraphMethods>
  graphData: GraphData
}

export default function ExportMenu({ fgRef, graphData }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  const exportPNG = () => {
    try {
      if (!fgRef.current) return;

      // react-force-graph exposes the internal canvas ctx via a method hack or we can grab the canvas element
      // For rfg-2d, the DOM structure is usually string predictability
      const canvas = document.querySelector('.graph-view canvas') as HTMLCanvasElement;
      if (!canvas) throw new Error("Canvas not found");

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
      // Get raw data from passed prop since FG doesn't expose internal structured data getters easily like Vis
      const data = {
        nodes: graphData.nodes,
        edges: graphData.edges,
        exported: new Date().toISOString(),
        version: '2.0-webgl',
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

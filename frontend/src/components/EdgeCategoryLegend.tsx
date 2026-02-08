/**
 * Edge category legend / filter component
 */

import { EDGE_CATEGORY_CONFIG, type EdgeCategory } from '../lib/edgeCategories'
import './EdgeCategoryLegend.css'

interface EdgeCategoryLegendProps {
  filters: Record<string, boolean>
  onToggleFilter: (category: string) => void
}

const CATEGORIES = Object.keys(EDGE_CATEGORY_CONFIG) as EdgeCategory[]

export default function EdgeCategoryLegend({ filters, onToggleFilter }: EdgeCategoryLegendProps) {
  const allEnabled = CATEGORIES.every((c) => filters[c] !== false)

  const toggleAll = () => {
    const newValue = !allEnabled
    CATEGORIES.forEach((category) => {
      if ((filters[category] !== false) !== newValue) {
        onToggleFilter(category)
      }
    })
  }

  return (
    <section className="edge-category-legend">
      <div className="legend-header">
        <h2>Edge Types</h2>
        <button onClick={toggleAll} className="toggle-all-btn">
          {allEnabled ? 'Hide All' : 'Show All'}
        </button>
      </div>

      <div className="legend-items">
        {CATEGORIES.map((category) => {
          const config = EDGE_CATEGORY_CONFIG[category]
          return (
            <label key={category} className="legend-item">
              <input
                type="checkbox"
                checked={filters[category] !== false}
                onChange={() => onToggleFilter(category)}
              />
              <span className="legend-swatch" style={{ backgroundColor: config.color }} />
              <span className="legend-label">
                {config.icon} {config.label}
              </span>
            </label>
          )
        })}
      </div>
    </section>
  )
}

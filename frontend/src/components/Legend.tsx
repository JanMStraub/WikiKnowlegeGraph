/**
 * Legend component for entity types
 */

import type { AppState } from '../types'
import './Legend.css'

interface LegendProps {
  filters: AppState['filters']
  onToggleFilter: (group: keyof AppState['filters']) => void
}

const LEGEND_ITEMS = [
  { key: 'person' as const, label: 'People', color: 'var(--graph-person)' },
  { key: 'country' as const, label: 'Countries', color: 'var(--graph-country)' },
  { key: 'city' as const, label: 'Cities', color: 'var(--graph-city)' },
  { key: 'location' as const, label: 'Locations', color: 'var(--graph-location)' },
  { key: 'organization' as const, label: 'Organizations', color: 'var(--graph-organization)' },
  { key: 'company' as const, label: 'Companies', color: 'var(--graph-company)' },
  { key: 'school' as const, label: 'Schools', color: 'var(--graph-school)' },
  { key: 'concept' as const, label: 'Other', color: 'var(--graph-concept)' },
]

export default function Legend({ filters, onToggleFilter }: LegendProps) {
  const allEnabled = Object.values(filters).every((v) => v)
  const allDisabled = Object.values(filters).every((v) => !v)

  const toggleAll = () => {
    const newValue = !allEnabled
    Object.keys(filters).forEach((key) => {
      if (filters[key as keyof AppState['filters']] !== newValue) {
        onToggleFilter(key as keyof AppState['filters'])
      }
    })
  }

  return (
    <section className="legend">
      <div className="legend-header">
        <h2>Legend</h2>
        <button onClick={toggleAll} className="toggle-all-btn" disabled={allDisabled}>
          {allEnabled ? 'Hide All' : 'Show All'}
        </button>
      </div>

      <div className="legend-items">
        {LEGEND_ITEMS.map((item) => (
          <label key={item.key} className="legend-item">
            <input
              type="checkbox"
              checked={filters[item.key]}
              onChange={() => onToggleFilter(item.key)}
            />
            <span className="legend-swatch" style={{ backgroundColor: item.color }} />
            <span className="legend-label">{item.label}</span>
          </label>
        ))}
      </div>
    </section>
  )
}

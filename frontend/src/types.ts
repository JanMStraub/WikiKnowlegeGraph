/**
 * Type definitions for WikiGraph
 */

export interface GraphNode {
  id: string
  label: string
  group: 'person' | 'school' | 'location' | 'country' | 'city' | 'organization' | 'company' | 'concept'
  shape: 'circularImage' | 'dot'
  image?: string
  size: number
  title: string
  hidden?: boolean
  x?: number
  y?: number
  isInitialEntity?: boolean
}

export interface GraphEdge {
  id: string
  from: string
  to: string
  label: string
  arrows: string
  hidden?: boolean
  category?: string
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface SearchEntity {
  name?: string
  qid?: string
}

export interface GenerateMapRequest {
  names?: string[]
  qids?: string[]
  depth: number
}

export interface GenerateMapResponse extends GraphData {}

export interface AutocompleteResult {
  qid: string
  label: string
  description?: string
}

export interface AppState {
  nodes: GraphNode[]
  edges: GraphEdge[]
  selectedNode: GraphNode | null
  isLoading: boolean
  error: string | null
  darkMode: boolean
  filters: {
    person: boolean
    school: boolean
    location: boolean
    country: boolean
    city: boolean
    organization: boolean
    company: boolean
    concept: boolean
  }
  depth: number
  edgeCategoryFilters: Record<string, boolean>
}

export interface CachedResponse<T> {
  data: T
  timestamp: number
}

export type Theme = 'light' | 'dark'

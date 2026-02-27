/**
 * Edge category classification for Wikidata property labels.
 *
 * Maps common Wikidata property labels to semantic categories
 * so edges can be filtered by type.
 */

export type EdgeCategory = 'family' | 'education' | 'career' | 'geographic' | 'membership' | 'other'

const EDGE_CATEGORY_MAP: Record<string, EdgeCategory> = {
  // Family
  'spouse': 'family',
  'father': 'family',
  'mother': 'family',
  'child': 'family',
  'sibling': 'family',
  'relative': 'family',
  'partner': 'family',
  'married name': 'family',
  'family name': 'family',
  'family': 'family',
  'stepfather': 'family',
  'stepmother': 'family',

  // Education
  'educated at': 'education',
  'alma mater': 'education',
  'student of': 'education',
  'doctoral advisor': 'education',
  'doctoral student': 'education',
  'academic degree': 'education',
  'student': 'education',

  // Career
  'employer': 'career',
  'occupation': 'career',
  'position held': 'career',
  'notable work': 'career',
  'field of work': 'career',
  'award received': 'career',
  'nominated for': 'career',
  'military rank': 'career',
  'profession': 'career',
  'work period (start)': 'career',
  'work period (end)': 'career',

  // Geographic
  'country': 'geographic',
  'country of citizenship': 'geographic',
  'place of birth': 'geographic',
  'place of death': 'geographic',
  'place of burial': 'geographic',
  'residence': 'geographic',
  'headquarters location': 'geographic',
  'located in': 'geographic',
  'location': 'geographic',
  'capital': 'geographic',
  'continent': 'geographic',
  'located in the administrative territorial entity': 'geographic',
  'territory claimed by': 'geographic',
  'capital of': 'geographic',
  'country of origin': 'geographic',
  'shares border with': 'geographic',
  'located on terrain feature': 'geographic',

  // Membership & Taxonomy
  'member of': 'membership',
  'member of political party': 'membership',
  'member of sports team': 'membership',
  'part of': 'membership',
  'has part': 'membership',
  'facet of': 'membership',
  'subclass of': 'membership',
  'instance of': 'membership',
  'affiliation': 'membership',
  'religious order': 'membership',
  'religion or worldview': 'membership',
  'political party': 'membership',
  'allegiance': 'membership',
  'founded by': 'career',
  'discoverer or inventor': 'career',
  'developer': 'career',
  'creator': 'career',
  'author': 'career',
  'director': 'career',
}

export function categorizeEdge(label: string): EdgeCategory {
  const lower = label.toLowerCase().trim()
  return EDGE_CATEGORY_MAP[lower] || 'other'
}

export interface EdgeCategoryConfig {
  label: string
  color: string
  icon: string
}

export const EDGE_CATEGORY_CONFIG: Record<EdgeCategory, EdgeCategoryConfig> = {
  family: { label: 'Family', color: '#ef4444', icon: '👨‍👩‍👧' },
  education: { label: 'Education', color: '#3b82f6', icon: '🎓' },
  career: { label: 'Career', color: '#8b5cf6', icon: '💼' },
  geographic: { label: 'Geographic', color: '#10b981', icon: '🌍' },
  membership: { label: 'Membership', color: '#f59e0b', icon: '🏛️' },
  other: { label: 'Other', color: '#6b7280', icon: '🔗' },
}

/**
 * Tests for edge consolidation utility
 */

import { describe, it, expect } from 'vitest'
import { consolidateEdges, shouldHideEdge } from '../utils/consolidateEdges'
import type { GraphEdge } from '../types'

describe('consolidateEdges', () => {
  it('returns empty array for empty input', () => {
    const result = consolidateEdges([])
    expect(result).toEqual([])
  })

  it('returns single edge unchanged', () => {
    const edges: GraphEdge[] = [
      { id: '1', from: 'A', to: 'B', label: 'knows', arrows: 'to' },
    ]
    const result = consolidateEdges(edges)
    expect(result).toHaveLength(1)
    expect(result[0].count).toBe(1)
    expect(result[0].labels).toEqual(['knows'])
  })

  it('merges edges between same nodes', () => {
    const edges: GraphEdge[] = [
      { id: '1', from: 'A', to: 'B', label: 'knows', arrows: 'to' },
      { id: '2', from: 'A', to: 'B', label: 'works with', arrows: 'to' },
    ]
    const result = consolidateEdges(edges)
    expect(result).toHaveLength(1)
    expect(result[0].count).toBe(2)
    expect(result[0].labels).toEqual(['knows', 'works with'])
    expect(result[0].label).toBe('knows, works with')
  })

  it('keeps edges between different nodes separate', () => {
    const edges: GraphEdge[] = [
      { id: '1', from: 'A', to: 'B', label: 'knows', arrows: 'to' },
      { id: '2', from: 'A', to: 'C', label: 'knows', arrows: 'to' },
      { id: '3', from: 'B', to: 'C', label: 'knows', arrows: 'to' },
    ]
    const result = consolidateEdges(edges)
    expect(result).toHaveLength(3)
  })

  it('handles multiple edges with same label', () => {
    const edges: GraphEdge[] = [
      { id: '1', from: 'A', to: 'B', label: 'knows', arrows: 'to' },
      { id: '2', from: 'A', to: 'B', label: 'knows', arrows: 'to' },
      { id: '3', from: 'A', to: 'B', label: 'works with', arrows: 'to' },
    ]
    const result = consolidateEdges(edges)
    expect(result).toHaveLength(1)
    expect(result[0].count).toBe(3)
    expect(result[0].labels).toEqual(['knows', 'knows', 'works with'])
  })

  it('preserves edge properties', () => {
    const edges: GraphEdge[] = [
      { id: '1', from: 'A', to: 'B', label: 'knows', arrows: 'to', hidden: false },
    ]
    const result = consolidateEdges(edges)
    expect(result[0].from).toBe('A')
    expect(result[0].to).toBe('B')
    expect(result[0].arrows).toBe('to')
  })
})

describe('shouldHideEdge', () => {
  it('hides edge if source node is hidden', () => {
    const edge: GraphEdge = { id: '1', from: 'A', to: 'B', label: 'knows', arrows: 'to' }
    const visibility = new Map([
      ['A', false],
      ['B', true],
    ])
    expect(shouldHideEdge(edge, visibility)).toBe(true)
  })

  it('hides edge if target node is hidden', () => {
    const edge: GraphEdge = { id: '1', from: 'A', to: 'B', label: 'knows', arrows: 'to' }
    const visibility = new Map([
      ['A', true],
      ['B', false],
    ])
    expect(shouldHideEdge(edge, visibility)).toBe(true)
  })

  it('hides edge if both nodes are hidden', () => {
    const edge: GraphEdge = { id: '1', from: 'A', to: 'B', label: 'knows', arrows: 'to' }
    const visibility = new Map([
      ['A', false],
      ['B', false],
    ])
    expect(shouldHideEdge(edge, visibility)).toBe(true)
  })

  it('shows edge if both nodes are visible', () => {
    const edge: GraphEdge = { id: '1', from: 'A', to: 'B', label: 'knows', arrows: 'to' }
    const visibility = new Map([
      ['A', true],
      ['B', true],
    ])
    expect(shouldHideEdge(edge, visibility)).toBe(false)
  })

  it('shows edge if visibility map is missing nodes (default visible)', () => {
    const edge: GraphEdge = { id: '1', from: 'A', to: 'B', label: 'knows', arrows: 'to' }
    const visibility = new Map()
    expect(shouldHideEdge(edge, visibility)).toBe(false)
  })
})

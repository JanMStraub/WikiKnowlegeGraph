/**
 * Tests for API client
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { clearAllCache } from '../api'

describe('API Client', () => {
  beforeEach(() => {
    // Clear cache before each test
    clearAllCache()
    // Clear fetch mocks
    vi.clearAllMocks()
  })

  describe('Cache', () => {
    it('caches responses', async () => {
      // Note: Actual cache testing would require mocking fetch
      // This is a placeholder test structure
      expect(clearAllCache).toBeDefined()
    })
  })

  describe('generateMap', () => {
    it('is defined', async () => {
      const { generateMap } = await import('../api')
      expect(generateMap).toBeDefined()
    })
  })

  describe('searchEntities', () => {
    it('is defined', async () => {
      const { searchEntities } = await import('../api')
      expect(searchEntities).toBeDefined()
    })

    it('returns empty array for empty query', async () => {
      const { searchEntities } = await import('../api')
      const result = await searchEntities('')
      expect(result).toEqual([])
    })

    it('returns empty array for short query', async () => {
      const { searchEntities } = await import('../api')
      const result = await searchEntities('a')
      expect(result).toEqual([])
    })
  })

  describe('estimateTime', () => {
    it('is defined', async () => {
      const { estimateTime } = await import('../api')
      expect(estimateTime).toBeDefined()
    })
  })
})

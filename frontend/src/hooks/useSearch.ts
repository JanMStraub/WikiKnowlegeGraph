/**
 * Search hook with per-input debouncing
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { searchEntities } from '../api'
import type { AutocompleteResult } from '../types'

export interface UseSearchOptions {
  debounceMs?: number
  minChars?: number
}

export function useSearch(options: UseSearchOptions = {}) {
  const { debounceMs = 300, minChars = 2 } = options

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<AutocompleteResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Each instance has its own debounce timer
  const debounceTimer = useRef<number | null>(null)
  const abortController = useRef<AbortController | null>(null)

  const search = useCallback(
    async (searchQuery: string) => {
      // Cancel previous request
      if (abortController.current) {
        abortController.current.abort()
      }

      if (!searchQuery || searchQuery.length < minChars) {
        setResults([])
        setIsSearching(false)
        setError(null)
        return
      }

      setIsSearching(true)
      setError(null)

      // Create new abort controller for this request
      abortController.current = new AbortController()
      const currentRequestController = abortController.current

      try {
        const data = await searchEntities(searchQuery)
        setResults(data)
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // Request was cancelled, ignore
          return
        }
        console.error('Search error:', err)
        setError(err instanceof Error ? err.message : 'Search failed')
        setResults([])
      } finally {
        if (abortController.current === currentRequestController) {
          setIsSearching(false)
        }
      }
    },
    [minChars]
  )

  // Debounced search effect
  useEffect(() => {
    // Clear existing timer
    if (debounceTimer.current !== null) {
      window.clearTimeout(debounceTimer.current)
    }

    // Set new timer
    debounceTimer.current = window.setTimeout(() => {
      search(query)
    }, debounceMs)

    // Cleanup
    return () => {
      if (debounceTimer.current !== null) {
        window.clearTimeout(debounceTimer.current)
      }
    }
  }, [query, debounceMs, search])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortController.current) {
        abortController.current.abort()
      }
    }
  }, [])

  const clearResults = useCallback(() => {
    setResults([])
    setError(null)
    setQuery('')
  }, [])

  return {
    query,
    setQuery,
    results,
    isSearching,
    error,
    clearResults,
  }
}

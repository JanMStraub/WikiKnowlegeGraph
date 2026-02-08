/**
 * API client — all graph generation runs client-side via direct SPARQL queries.
 */

import type {
  GenerateMapRequest,
  GenerateMapResponse,
  AutocompleteResult,
  CachedResponse,
} from './types'
import { generateGraph, getDepthConfig } from './lib/graphGenerator'

const CACHE_TTL = 10 * 60 * 1000 // 10 minutes

// In-memory cache for full graph results
const responseCache = new Map<string, CachedResponse<unknown>>()

function isCacheValid<T>(cached: CachedResponse<T> | undefined): boolean {
  if (!cached) return false
  return Date.now() - cached.timestamp < CACHE_TTL
}

async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  skipCache = false
): Promise<T> {
  if (!skipCache) {
    const cached = responseCache.get(key) as CachedResponse<T> | undefined
    if (isCacheValid(cached)) {
      return cached!.data
    }
  }

  const data = await fetcher()
  responseCache.set(key, {
    data,
    timestamp: Date.now(),
  })

  return data
}

/**
 * Clear expired cache entries
 */
export function clearExpiredCache(): void {
  const now = Date.now()
  for (const [key, value] of responseCache.entries()) {
    if (now - value.timestamp >= CACHE_TTL) {
      responseCache.delete(key)
    }
  }
}

/**
 * Clear all cache
 */
export function clearAllCache(): void {
  responseCache.clear()
}

/**
 * Generate knowledge graph — runs entirely client-side
 */
export async function generateMap(
  request: GenerateMapRequest,
  skipCache = false,
  onProgress?: (msg: string) => void
): Promise<GenerateMapResponse> {
  const cacheKey = `generate-${JSON.stringify(request)}`

  return cachedFetch(
    cacheKey,
    () => generateGraph(request, onProgress),
    skipCache
  )
}

/**
 * Search Wikidata entities (autocomplete) — direct Wikidata API call
 */
export async function searchEntities(query: string): Promise<AutocompleteResult[]> {
  if (!query || query.length < 2) {
    return []
  }

  const cacheKey = `search-${query}`

  return cachedFetch(cacheKey, async () => {
    const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(
      query
    )}&language=en&format=json&origin=*&limit=10`

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Autocomplete failed: ${response.status}`)
    }

    const data = await response.json()

    if (!data.search || !Array.isArray(data.search)) {
      return []
    }

    return data.search.map((item: { id: string; label: string; description?: string }) => ({
      qid: item.id,
      label: item.label,
      description: item.description,
    }))
  })
}

/**
 * Estimate processing time — computed locally using depth config
 */
export function estimateTime(request: {
  names?: string[]
  qids?: string[]
  depth: number
}): {
  total_seconds: number
  formatted_time: string
  per_depth: Array<{
    depth: number
    nodes: number
    estimated_new_nodes: number
    time_seconds: number
  }>
  note: string
} {
  const numEntities = (request.names?.length || 0) + (request.qids?.length || 0)
  const depth = request.depth

  const avgQueryTime = 0.8
  const avgBatchTime = 0.6
  const batchRateLimit = 0.5

  const depthEstimates: Array<{
    depth: number
    nodes: number
    estimated_new_nodes: number
    time_seconds: number
  }> = []

  let currentNodes = numEntities

  for (let d = 1; d <= depth; d++) {
    const config = getDepthConfig(d)
    const maxNodes = config.max_nodes_per_layer

    let estimatedNewNodes: number
    if (d === 1) {
      estimatedNewNodes = Math.min(currentNodes * 20, maxNodes * currentNodes)
    } else {
      estimatedNewNodes = Math.min(currentNodes * 10, maxNodes * 5)
    }

    const numBatches = Math.max(1, Math.floor(currentNodes / config.batch_size))
    const queryTime = numBatches * (avgQueryTime + batchRateLimit)
    const processingTime = avgBatchTime
    const depthTime = queryTime + processingTime

    depthEstimates.push({
      depth: d,
      nodes: currentNodes,
      estimated_new_nodes: estimatedNewNodes,
      time_seconds: depthTime,
    })

    currentNodes = Math.min(estimatedNewNodes, maxNodes)
  }

  const totalSeconds = depthEstimates.reduce((sum, d) => sum + d.time_seconds, 0)

  let formatted: string
  if (totalSeconds < 60) {
    formatted = `${Math.floor(totalSeconds)}s`
  } else if (totalSeconds < 3600) {
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = Math.floor(totalSeconds % 60)
    formatted = `${minutes}m ${seconds}s`
  } else {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    formatted = `${hours}h ${minutes}m`
  }

  return {
    total_seconds: totalSeconds,
    formatted_time: formatted,
    per_depth: depthEstimates,
    note: 'Actual time may vary based on network speed and Wikidata load',
  }
}

// Periodically clear expired cache entries (once)
let _cacheInterval: ReturnType<typeof setInterval> | null = null
if (typeof window !== 'undefined' && !_cacheInterval) {
  _cacheInterval = setInterval(clearExpiredCache, 5 * 60 * 1000)
}

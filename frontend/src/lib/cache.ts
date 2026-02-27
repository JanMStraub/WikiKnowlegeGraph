/**
 * localStorage cache with TTL for SPARQL query results.
 */

const QID_CACHE_PREFIX = 'wg_qid_'
const CONN_CACHE_PREFIX = 'wg_conn_v2_'
const QID_TTL = 24 * 60 * 60 * 1000 // 24 hours
const CONN_TTL = 60 * 60 * 1000 // 1 hour

interface CacheEntry<T> {
  data: T
  expires: number
}

function getFromStorage<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null

    const entry: CacheEntry<T> = JSON.parse(raw)
    if (Date.now() > entry.expires) {
      localStorage.removeItem(key)
      return null
    }

    return entry.data
  } catch {
    return null
  }
}

function setInStorage<T>(key: string, data: T, ttl: number): void {
  const entry: CacheEntry<T> = {
    data,
    expires: Date.now() + ttl,
  }

  try {
    localStorage.setItem(key, JSON.stringify(entry))
  } catch {
    // Storage full — evict expired entries and retry
    evictExpired()
    try {
      localStorage.setItem(key, JSON.stringify(entry))
    } catch {
      // Still full — clear all wiki graph cache entries
      clearAllCaches()
      try {
        localStorage.setItem(key, JSON.stringify(entry))
      } catch {
        // Give up silently
      }
    }
  }
}

function evictExpired(): void {
  const now = Date.now()
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i)
    if (!key || (!key.startsWith(QID_CACHE_PREFIX) && !key.startsWith(CONN_CACHE_PREFIX))) {
      continue
    }
    try {
      const entry: CacheEntry<unknown> = JSON.parse(localStorage.getItem(key) || '')
      if (now > entry.expires) {
        localStorage.removeItem(key)
      }
    } catch {
      localStorage.removeItem(key!)
    }
  }
}

export function getCachedQid(name: string): string | null {
  return getFromStorage<string>(QID_CACHE_PREFIX + name)
}

export function setCachedQid(name: string, qid: string | null): void {
  setInStorage(QID_CACHE_PREFIX + name, qid, QID_TTL)
}

export interface ConnectionData {
  source: string
  target: string
  target_label: string
  label: string
  image: string | null
  group: string
  type_label: string
}

export function getCachedConnections(qid: string): ConnectionData[] | null {
  return getFromStorage<ConnectionData[]>(CONN_CACHE_PREFIX + qid)
}

export function setCachedConnections(qid: string, connections: ConnectionData[]): void {
  setInStorage(CONN_CACHE_PREFIX + qid, connections, CONN_TTL)
}

export function clearAllCaches(): void {
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i)
    if (key && (key.startsWith(QID_CACHE_PREFIX) || key.startsWith(CONN_CACHE_PREFIX))) {
      localStorage.removeItem(key)
    }
  }
}

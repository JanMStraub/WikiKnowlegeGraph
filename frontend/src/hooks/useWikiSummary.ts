/**
 * Hook to fetch Wikipedia summary for a Wikidata QID
 *
 * Two-step fetch: QID → Wikipedia title (via Wikidata API) → summary (via Wikipedia REST API)
 * Includes in-memory cache to avoid redundant requests.
 */

import { useState, useEffect, useRef } from 'react'

export interface WikiSummary {
  title: string
  description?: string
  extract?: string
  thumbnail?: { source: string; width: number; height: number }
}

const cache = new Map<string, WikiSummary | null>()

export function useWikiSummary(qid: string | null) {
  const [summary, setSummary] = useState<WikiSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    // Cleanup previous request
    abortRef.current?.abort()
    abortRef.current = null

    if (!qid) {
      setSummary(null)
      setIsLoading(false)
      setError(null)
      return
    }

    // Check cache
    if (cache.has(qid)) {
      setSummary(cache.get(qid)!)
      setIsLoading(false)
      setError(null)
      return
    }

    const controller = new AbortController()
    abortRef.current = controller

    async function fetchSummary() {
      setIsLoading(true)
      setError(null)
      setSummary(null)

      try {
        // Step 1: QID → Wikipedia title via Wikidata API
        const wdUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&props=sitelinks&sitefilter=enwiki&format=json&origin=*`
        const wdRes = await fetch(wdUrl, { signal: controller.signal })
        if (!wdRes.ok) throw new Error('Wikidata request failed')

        const wdData = await wdRes.json()
        const entity = wdData.entities?.[qid!]
        const title = entity?.sitelinks?.enwiki?.title

        if (!title) {
          // No English Wikipedia page — not an error
          cache.set(qid!, null)
          setSummary(null)
          setIsLoading(false)
          return
        }

        // Step 2: Wikipedia title → summary via REST API
        const wpUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
        const wpRes = await fetch(wpUrl, { signal: controller.signal })
        if (!wpRes.ok) throw new Error('Wikipedia request failed')

        const wpData = await wpRes.json()

        // Use extract_text (plain text) over extract (may contain HTML)
        const plainExtract: string | undefined = wpData.extract_text || wpData.extract
        const safeExtract = plainExtract?.replace(/<[^>]*>/g, '') // strip any residual HTML

        const result: WikiSummary = {
          title: wpData.title,
          description: wpData.description?.replace(/<[^>]*>/g, ''),
          extract: safeExtract,
          thumbnail: wpData.thumbnail
            ? { source: wpData.thumbnail.source, width: wpData.thumbnail.width, height: wpData.thumbnail.height }
            : undefined,
        }

        cache.set(qid!, result)
        setSummary(result)
      } catch (err: any) {
        if (err.name === 'AbortError') return
        setError(err.message || 'Failed to fetch summary')
      } finally {
        setIsLoading(false)
      }
    }

    fetchSummary()

    return () => {
      controller.abort()
    }
  }, [qid])

  return { summary, isLoading, error }
}

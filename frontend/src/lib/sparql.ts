/**
 * SPARQL client for direct Wikidata queries from the browser.
 */

import { sanitizeEntityName, isValidQid } from './sanitization'
import {
  getCachedQid,
  setCachedQid,
  getCachedConnections,
  setCachedConnections,
  type ConnectionData,
} from './cache'

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql'
const SPARQL_RESULT_LIMIT = 2000
const USER_AGENT = 'WikiGraph/2.0 (browser; github-pages)'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function querySparql(query: string): Promise<{ results: { bindings: Record<string, { value: string }>[] } }> {
  const response = await fetch(SPARQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Accept': 'application/sparql-results+json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
    body: `query=${encodeURIComponent(query)}`,
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`SPARQL query failed (${response.status}): ${text.slice(0, 200)}`)
  }

  return response.json()
}

export function determineGroup(entityTypeQid: string): string {
  // Q5 = Human
  if (entityTypeQid === 'Q5') return 'person'
  // Q3918 = University, Q737498 = University College, Q3914 = School, Q875538 = Public University, Q38723 = Higher Education Institution
  if (['Q3918', 'Q737498', 'Q3914', 'Q875538', 'Q38723'].includes(entityTypeQid)) return 'school'
  // Q6256 = Country, Q3624078 = Sovereign State, Q1763527 = Dependent Territory
  if (['Q6256', 'Q3624078', 'Q1763527'].includes(entityTypeQid)) return 'country'
  // Q515 = City, Q1549591 = Big City, Q3455524 = Settlement, Q532 = Village, Q5119 = Capital
  if (['Q515', 'Q1549591', 'Q3455524', 'Q532', 'Q5119'].includes(entityTypeQid)) return 'city'
  // Q2221906 = Geographic Location, Q82794 = Geographic Region, Q15642541 = Human Settlement
  if (['Q2221906', 'Q82794', 'Q15642541'].includes(entityTypeQid)) return 'location'
  // Q43229 = Organization, Q163740 = Nonprofit, Q484652 = International Organization, Q2659904 = Government Agency
  if (['Q43229', 'Q163740', 'Q484652', 'Q2659904'].includes(entityTypeQid)) return 'organization'
  // Q4830453 = Business, Q891723 = Public Company, Q6881511 = Enterprise
  if (['Q4830453', 'Q891723', 'Q6881511'].includes(entityTypeQid)) return 'company'
  return 'concept'
}

export async function getWikidataId(name: string): Promise<string | null> {
  // Check cache first
  const cached = getCachedQid(name)
  if (cached !== null) {
    // Cached "null" means we previously found no result
    return cached === 'null' ? null : cached
  }

  let sanitizedName: string
  try {
    sanitizedName = sanitizeEntityName(name)
  } catch {
    return null
  }

  const query = `
    SELECT ?item WHERE {
      ?item rdfs:label "${sanitizedName}"@en.
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    } LIMIT 1
  `

  try {
    const results = await querySparql(query)
    if (results.results.bindings.length > 0) {
      const qid = results.results.bindings[0].item.value.split('/').pop()!
      setCachedQid(name, qid)
      return qid
    } else {
      setCachedQid(name, 'null')
      return null
    }
  } catch (e) {
    console.error(`Error finding QID for "${name}":`, e)
    return null
  }
}

export async function fetchBatchConnections(qids: string[]): Promise<ConnectionData[]> {
  if (qids.length === 0) return []

  // Check cache for each QID
  const uncachedQids: string[] = []
  const cachedConnections: ConnectionData[] = []

  for (const qid of qids) {
    const cached = getCachedConnections(qid)
    if (cached !== null) {
      cachedConnections.push(...cached)
    } else {
      uncachedQids.push(qid)
    }
  }

  if (uncachedQids.length === 0) return cachedConnections

  const valuesStr = uncachedQids.map((qid) => `wd:${qid}`).join(' ')

  const query = `
    SELECT ?source ?propLabel ?target ?targetLabel ?isHuman (SAMPLE(?img) AS ?image) ?typeQID (SAMPLE(?typeLbl) AS ?typeLabel) WHERE {
      VALUES ?source { ${valuesStr} }
      ?source ?p ?target.

      FILTER(ISIRI(?target) && STRSTARTS(STR(?target), "http://www.wikidata.org/entity/Q"))
      FILTER(!ISBLANK(?target))

      BIND(EXISTS{?target wdt:P31 wd:Q5} AS ?isHuman)

      OPTIONAL { ?target wdt:P18 ?img. }

      OPTIONAL {
        ?target wdt:P31 ?type.
        ?type rdfs:label ?typeLbl.
        FILTER(LANG(?typeLbl) = "en")
      }
      BIND(STRAFTER(STR(?type), "http://www.wikidata.org/entity/") AS ?typeQID)

      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      ?prop wikibase:directClaim ?p.
    }
    GROUP BY ?source ?propLabel ?target ?targetLabel ?isHuman ?typeQID
    LIMIT ${SPARQL_RESULT_LIMIT}
  `

  try {
    const results = await querySparql(query)
    const bindings = results.results.bindings

    // Group connections by source QID for caching
    const connectionsBySource: Record<string, ConnectionData[]> = {}
    for (const qid of uncachedQids) {
      connectionsBySource[qid] = []
    }

    const allConnections: ConnectionData[] = []

    for (const res of bindings) {
      const targetId = res.target.value.split('/').pop()!
      if (!isValidQid(targetId)) continue

      const sourceId = res.source.value.split('/').pop()!
      const typeQid = res.typeQID?.value || ''
      const isHuman = res.isHuman?.value === 'true'
      const group = isHuman ? 'person' : determineGroup(typeQid)

      const connection: ConnectionData = {
        source: sourceId,
        target: targetId,
        target_label: res.targetLabel?.value || targetId,
        label: res.propLabel?.value || 'link',
        image: res.image?.value || null,
        group,
        type_label: res.typeLabel?.value || 'Concept',
      }

      allConnections.push(connection)
      if (connectionsBySource[sourceId]) {
        connectionsBySource[sourceId].push(connection)
      }
    }

    // Cache connections for each source QID
    for (const [qid, conns] of Object.entries(connectionsBySource)) {
      setCachedConnections(qid, conns)
    }

    return [...cachedConnections, ...allConnections]
  } catch (e) {
    console.error('SPARQL batch query error:', e)
    return cachedConnections
  }
}

export { sleep }

/**
 * Client-side graph generation — port of backend routes.py generate_map().
 */

import type { GenerateMapRequest, GenerateMapResponse, GraphNode, GraphEdge } from '../types'
import { sanitizeQid, validateDepth, validateEntityList } from './sanitization'
import { getWikidataId, fetchBatchConnections, sleep } from './sparql'
import { categorizeEdge } from './edgeCategories'

const PLACEHOLDER_IMG =
  'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png'

const BATCH_RATE_LIMIT = 500 // ms between batches

const DEPTH_CONFIG: Record<number, { max_nodes_per_layer: number; batch_size: number; result_limit: number }> = {
  1:  { max_nodes_per_layer: 50, batch_size: 50, result_limit: 3000 },
  2:  { max_nodes_per_layer: 40, batch_size: 45, result_limit: 2800 },
  3:  { max_nodes_per_layer: 30, batch_size: 40, result_limit: 2500 },
  4:  { max_nodes_per_layer: 25, batch_size: 35, result_limit: 2200 },
  5:  { max_nodes_per_layer: 20, batch_size: 30, result_limit: 2000 },
  6:  { max_nodes_per_layer: 15, batch_size: 25, result_limit: 1800 },
  7:  { max_nodes_per_layer: 12, batch_size: 20, result_limit: 1500 },
  8:  { max_nodes_per_layer: 10, batch_size: 15, result_limit: 1200 },
  9:  { max_nodes_per_layer: 8,  batch_size: 12, result_limit: 1000 },
  10: { max_nodes_per_layer: 5,  batch_size: 10, result_limit: 800 },
}

function getDepthConfig(depth: number) {
  return DEPTH_CONFIG[depth] || DEPTH_CONFIG[3]
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export async function generateGraph(
  request: GenerateMapRequest,
  onProgress?: (msg: string) => void,
): Promise<GenerateMapResponse> {
  const names = request.names ? validateEntityList([...request.names]) : []
  const rawQids = request.qids ? validateEntityList([...request.qids]) : []
  const depth = validateDepth(request.depth)

  if (names.length === 0 && rawQids.length === 0) {
    throw new Error('Must provide either names or qids')
  }

  // Sanitize QIDs
  const qids = rawQids.map((q) => sanitizeQid(q))

  const nodes: Record<string, GraphNode> = {}
  const edges: GraphEdge[] = []
  const processedIds = new Set<string>()
  const initialEntityIds = new Set<string>()
  const edgeIds = new Set<string>()

  let currentLayerIds: string[] = []

  // Process provided QIDs
  for (const qid of qids) {
    currentLayerIds.push(qid)
    initialEntityIds.add(qid)
    nodes[qid] = {
      id: qid,
      label: qid,
      group: 'concept',
      shape: 'dot',
      image: PLACEHOLDER_IMG,
      size: 40,
      title: 'Loading...',
      isInitialEntity: true,
    }
  }

  // Resolve names to QIDs
  for (const name of names) {
    onProgress?.(`Resolving "${name}"...`)
    const qid = await getWikidataId(name)
    if (qid) {
      if (!(qid in nodes)) {
        initialEntityIds.add(qid)
        nodes[qid] = {
          id: qid,
          label: name,
          group: 'concept',
          shape: 'dot',
          image: PLACEHOLDER_IMG,
          size: 40,
          title: 'Type: Initial Search Entity',
          isInitialEntity: true,
        }
        currentLayerIds.push(qid)
      } else {
        nodes[qid].label = name
      }
    } else {
      console.warn(`Could not resolve entity name to QID: ${name}`)
    }
  }

  if (currentLayerIds.length === 0) {
    throw new Error('Could not resolve any entities')
  }

  // Build graph layer by layer
  for (let currentDepth = 0; currentDepth < depth; currentDepth++) {
    if (currentLayerIds.length === 0) break

    const depthConfig = getDepthConfig(currentDepth + 1)
    const maxNodesForLayer = depthConfig.max_nodes_per_layer
    const batchSizeForLayer = depthConfig.batch_size

    // Filter already-processed nodes
    let toProcess = currentLayerIds.filter((id) => !processedIds.has(id))

    // Limit per layer
    if (toProcess.length > maxNodesForLayer) {
      toProcess = shuffleArray(toProcess).slice(0, maxNodesForLayer)
    }

    if (toProcess.length === 0) break

    onProgress?.(`Processing depth ${currentDepth + 1}/${depth} — ${toProcess.length} nodes`)

    // Batch process
    const allNewConnections: Array<{
      source: string
      target: string
      target_label: string
      label: string
      image: string | null
      group: string
      type_label: string
    }> = []

    for (let i = 0; i < toProcess.length; i += batchSizeForLayer) {
      const batch = toProcess.slice(i, i + batchSizeForLayer)
      const connections = await fetchBatchConnections(batch)
      allNewConnections.push(...connections)

      // Rate limiting between batches
      if (i + batchSizeForLayer < toProcess.length) {
        await sleep(BATCH_RATE_LIMIT)
      }
    }

    // Process connections to build next layer
    const nextLayerIds: string[] = []

    for (const conn of allNewConnections) {
      const src = conn.source
      const tgt = conn.target

      // Add target node if not exists
      if (!(tgt in nodes)) {
        const imgUrl = conn.image || PLACEHOLDER_IMG
        const grp = conn.group as GraphNode['group']
        const shape = grp === 'person' ? 'circularImage' : 'dot'
        const size = grp === 'person' ? 30 : grp === 'country' ? 22 : grp === 'city' ? 18 : 15

        nodes[tgt] = {
          id: tgt,
          label: conn.target_label,
          group: grp,
          shape,
          image: imgUrl,
          size,
          title: `Type: ${conn.type_label}`,
        }
        nextLayerIds.push(tgt)
      }

      // Add edge with deduplication
      const edgeId = `${src}-${tgt}-${conn.label}`
      if (!edgeIds.has(edgeId)) {
        edgeIds.add(edgeId)
        edges.push({
          id: edgeId,
          from: src,
          to: tgt,
          label: conn.label,
          arrows: 'to',
          category: categorizeEdge(conn.label),
        })
      }
    }

    // Mark current layer as processed
    for (const id of toProcess) processedIds.add(id)
    currentLayerIds = nextLayerIds
  }

  onProgress?.(`Done — ${Object.keys(nodes).length} nodes, ${edges.length} edges`)

  return {
    nodes: Object.values(nodes),
    edges,
  }
}

// Exported for estimateTime
export { DEPTH_CONFIG, getDepthConfig }

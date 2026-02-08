/**
 * Input sanitization and validation for SPARQL queries.
 */

export function sanitizeEntityName(name: string): string {
  if (!name || typeof name !== 'string') {
    throw new Error('Entity name must be a non-empty string')
  }

  name = name.trim()

  if (!name) {
    throw new Error('Entity name cannot be empty or whitespace only')
  }

  if (name.length > 200) {
    throw new Error('Entity name is too long (max 200 characters)')
  }

  // Escape special SPARQL characters (backslash first to avoid double-escaping)
  name = name.replace(/\\/g, '\\\\')
  name = name.replace(/"/g, '\\"')
  name = name.replace(/'/g, "\\'")
  name = name.replace(/\n/g, '\\n')
  name = name.replace(/\r/g, '\\r')
  name = name.replace(/\t/g, '\\t')

  return name
}

export function isValidQid(qid: string): boolean {
  if (!qid || typeof qid !== 'string') return false
  return /^Q\d+$/.test(qid)
}

export function sanitizeQid(qid: string): string {
  if (!qid || typeof qid !== 'string') {
    throw new Error('QID must be a non-empty string')
  }

  qid = qid.trim().toUpperCase()

  if (!isValidQid(qid)) {
    throw new Error(`Invalid QID format: ${qid}. Expected format: Q followed by digits (e.g., Q42)`)
  }

  return qid
}

export function validateDepth(depth: number): number {
  if (typeof depth !== 'number' || isNaN(depth)) {
    throw new Error('Depth must be a number')
  }

  depth = Math.floor(depth)

  if (depth < 1) {
    throw new Error('Depth must be at least 1')
  }

  if (depth > 10) {
    throw new Error('Depth cannot exceed 10 (performance limit)')
  }

  return depth
}

export function validateEntityList(entities: string[], maxEntities = 10): string[] {
  if (!Array.isArray(entities)) {
    throw new Error('Entities must be provided as a list')
  }

  if (entities.length === 0) {
    throw new Error('At least one entity must be provided')
  }

  if (entities.length > maxEntities) {
    throw new Error(`Too many entities (max ${maxEntities})`)
  }

  // Remove duplicates while preserving order
  const seen = new Set<string>()
  const unique: string[] = []

  for (const entity of entities) {
    if (typeof entity !== 'string') {
      throw new Error('All entities must be strings')
    }

    const trimmed = entity.trim()
    if (!trimmed) continue

    if (!seen.has(trimmed)) {
      seen.add(trimmed)
      unique.push(trimmed)
    }
  }

  if (unique.length === 0) {
    throw new Error('At least one non-empty entity must be provided')
  }

  return unique
}

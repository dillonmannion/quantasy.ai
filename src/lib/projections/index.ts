export type { PlayerProjection, ProjectionSource } from './types'
export { saveProjections, getProjections } from './storage'
export type { SaveProjectionsResult } from './storage'

export { parseProjectionsCSV } from './csv-parser'
export type { ParsedProjection, CSVParseResult } from './csv-parser'

import bundled2026 from './bundled-2026.json'

export interface BundledProjections {
  metadata: {
    season: string
    source: string
    generatedAt: string
    note?: string
  }
  projections: Record<string, number>
}

export function getBundledProjections(): BundledProjections {
  return bundled2026 as BundledProjections
}

export function getBundledProjectionsMap(): Record<string, number> {
  return bundled2026.projections as Record<string, number>
}

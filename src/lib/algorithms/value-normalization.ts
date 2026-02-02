import type { ExternalPlayerValue, NormalizedValue, ExternalValueSource } from './types'

type SourceStats = { mean: number; stddev: number }

function getPreferredValue(value: ExternalPlayerValue, format: 'dynasty' | 'redraft'): number | null {
  const candidate = format === 'redraft' ? value.redraft_value : value.dynasty_value
  if (typeof candidate !== 'number' || !Number.isFinite(candidate)) {
    return null
  }
  return candidate
}

function calculateMean(values: number[]): number {
  const total = values.reduce((sum, value) => sum + value, 0)
  return total / values.length
}

function calculateStdDev(values: number[], mean: number): number {
  const variance = values.reduce((sum, value) => {
    const delta = value - mean
    return sum + delta * delta
  }, 0) / values.length
  return Math.sqrt(variance)
}

export function calculateZScore(value: number, mean: number, stddev: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(mean) || !Number.isFinite(stddev)) {
    return 0
  }
  if (stddev === 0) return 0
  return (value - mean) / stddev
}

export function normalizeValues(
  values: ExternalPlayerValue[],
  format: 'dynasty' | 'redraft' = 'dynasty'
): Record<string, NormalizedValue[]> {
  if (!values || values.length === 0) {
    return {}
  }

  const valuesBySource: Partial<Record<ExternalValueSource, number[]>> = {}
  const valuesByPlayer: Record<string, ExternalPlayerValue[]> = {}

  for (const value of values) {
    if (!valuesByPlayer[value.playerId]) {
      valuesByPlayer[value.playerId] = []
    }
    valuesByPlayer[value.playerId].push(value)

    const numericValue = getPreferredValue(value, format)
    if (numericValue === null) continue
    if (!valuesBySource[value.source]) {
      valuesBySource[value.source] = []
    }
    valuesBySource[value.source]?.push(numericValue)
  }

  const statsBySource: Partial<Record<ExternalValueSource, SourceStats>> = {}
  Object.entries(valuesBySource).forEach(([source, sourceValues]) => {
    const mean = calculateMean(sourceValues)
    const stddev = calculateStdDev(sourceValues, mean)
    statsBySource[source as ExternalValueSource] = { mean, stddev }
  })

  const normalizedByPlayer: Record<string, NormalizedValue[]> = {}
  Object.entries(valuesByPlayer).forEach(([playerId, playerValues]) => {
    const normalizedValues: NormalizedValue[] = []
    for (const playerValue of playerValues) {
      const numericValue = getPreferredValue(playerValue, format)
      if (numericValue === null) continue
      const stats = statsBySource[playerValue.source] as SourceStats
      const zScore = calculateZScore(numericValue, stats.mean, stats.stddev)
      normalizedValues.push({
        player_id: playerId,
        normalized_value: zScore,
        z_score: zScore,
        source: playerValue.source,
      })
    }
    normalizedByPlayer[playerId] = normalizedValues
  })

  return normalizedByPlayer
}

export function calculateConsensus(normalizedValues: NormalizedValue[]): number | null {
  if (!normalizedValues || normalizedValues.length === 0) {
    return null
  }

  const scores = normalizedValues
    .map(value => value.z_score)
    .filter(score => Number.isFinite(score))

  if (scores.length === 0) {
    return null
  }

  const total = scores.reduce((sum, score) => sum + score, 0)
  return total / scores.length
}

import { describe, it, expect } from 'vitest'
import {
  calculateZScore,
  normalizeValues,
  calculateConsensus,
} from '@/lib/algorithms/value-normalization'
import type { ExternalPlayerValue, NormalizedValue } from '@/lib/algorithms/types'

const UPDATED_AT = '2026-02-02T00:00:00Z'

function createExternalValue(
  playerId: string,
  source: ExternalPlayerValue['source'],
  dynastyValue?: number | null,
  redraftValue?: number | null
): ExternalPlayerValue {
  const base: ExternalPlayerValue = {
    playerId,
    source,
    updated_at: UPDATED_AT,
  }

  if (dynastyValue !== undefined) {
    base.dynasty_value = dynastyValue
  }
  if (redraftValue !== undefined) {
    base.redraft_value = redraftValue
  }

  return base
}

function createNormalizedValue(
  playerId: string,
  source: NormalizedValue['source'],
  score: number
): NormalizedValue {
  return {
    player_id: playerId,
    normalized_value: score,
    z_score: score,
    source,
  }
}

describe('calculateZScore', () => {
  it('calculates standardized values using mean and stddev', () => {
    expect(calculateZScore(300, 200, 50)).toBeCloseTo(2, 6)
  })

  it('returns 0 when standard deviation is 0', () => {
    expect(calculateZScore(10, 10, 0)).toBe(0)
  })

  it('returns 0 for non-finite inputs', () => {
    expect(calculateZScore(Number.NaN, 0, 1)).toBe(0)
  })
})

describe('normalizeValues', () => {
  it('normalizes values across 1000x scale differences per source', () => {
    const values: ExternalPlayerValue[] = [
      createExternalValue('p1', 'DynastyProcess', 100),
      createExternalValue('p2', 'DynastyProcess', 200),
      createExternalValue('p3', 'DynastyProcess', 300),
      createExternalValue('p1', 'FantasyCalc', 100000),
      createExternalValue('p2', 'FantasyCalc', 200000),
      createExternalValue('p3', 'FantasyCalc', 300000),
    ]

    const normalized = normalizeValues(values)
    const p1Values = normalized['p1']
    const p3Values = normalized['p3']

    expect(p1Values).toHaveLength(2)
    expect(p3Values).toHaveLength(2)

    const p1Dynasty = p1Values.find(value => value.source === 'DynastyProcess')
    const p1Fantasy = p1Values.find(value => value.source === 'FantasyCalc')
    const p3Dynasty = p3Values.find(value => value.source === 'DynastyProcess')
    const p3Fantasy = p3Values.find(value => value.source === 'FantasyCalc')

    expect(p1Dynasty?.z_score).toBeCloseTo(p1Fantasy?.z_score ?? 0, 6)
    expect(p3Dynasty?.z_score).toBeCloseTo(p3Fantasy?.z_score ?? 0, 6)
  })

  it('handles missing sources, negative and zero values, and empty player entries', () => {
    const values: ExternalPlayerValue[] = [
      createExternalValue('p1', 'KTC', -10),
      createExternalValue('p2', 'KTC', 0),
      createExternalValue('p3', 'KTC', 10),
      createExternalValue('p1', 'DynastyProcess', 50),
      createExternalValue('p2', 'DynastyProcess', 75),
      createExternalValue('p4', 'FantasyCalc', 200, undefined),
      createExternalValue('p5', 'KTC', null, null),
      createExternalValue('p6', 'KTC', Number.NaN),
    ]

    const normalized = normalizeValues(values)

    expect(normalized['p1']).toHaveLength(2)
    expect(normalized['p2']).toHaveLength(2)
    expect(normalized['p3']).toHaveLength(1)
    expect(normalized['p4']).toHaveLength(1)
    expect(normalized['p5']).toHaveLength(0)
    expect(normalized['p6']).toHaveLength(0)

    const p1Ktc = normalized['p1'].find(value => value.source === 'KTC')
    const p2Ktc = normalized['p2'].find(value => value.source === 'KTC')
    const p3Ktc = normalized['p3'].find(value => value.source === 'KTC')

    expect(p1Ktc?.z_score).toBeLessThan(0)
    expect(p2Ktc?.z_score).toBeCloseTo(0, 6)
    expect(p3Ktc?.z_score).toBeGreaterThan(0)
  })

  it('returns 0 Z-scores when all values are identical', () => {
    const values: ExternalPlayerValue[] = [
      createExternalValue('p1', 'DynastyProcess', 50),
      createExternalValue('p2', 'DynastyProcess', 50),
    ]

    const normalized = normalizeValues(values)
    expect(normalized['p1'][0]?.z_score).toBe(0)
    expect(normalized['p2'][0]?.z_score).toBe(0)
  })

  it('handles a single value in a source', () => {
    const values: ExternalPlayerValue[] = [
      createExternalValue('p1', 'DynastyProcess', 75),
    ]

    const normalized = normalizeValues(values)
    expect(normalized['p1'][0]?.z_score).toBe(0)
  })

  it('returns an empty object when no values are provided', () => {
    expect(normalizeValues([])).toEqual({})
  })

  it('returns an empty object when values are undefined', () => {
    expect(normalizeValues(undefined as unknown as ExternalPlayerValue[])).toEqual({})
  })

  it('skips sources with no numeric values', () => {
    const values: ExternalPlayerValue[] = [
      createExternalValue('p1', 'KTC', null, null),
    ]

    const normalized = normalizeValues(values)
    expect(normalized['p1']).toHaveLength(0)
  })
})

describe('calculateConsensus', () => {
  it('averages Z-scores across available sources', () => {
    const values: NormalizedValue[] = [
      createNormalizedValue('p1', 'DynastyProcess', 1),
      createNormalizedValue('p1', 'FantasyCalc', -1),
      createNormalizedValue('p1', 'KTC', 0.5),
    ]

    expect(calculateConsensus(values)).toBeCloseTo(0.1666667, 6)
  })

  it('returns the single source Z-score when only one is available', () => {
    const values: NormalizedValue[] = [
      createNormalizedValue('p1', 'DynastyProcess', 1.25),
    ]

    expect(calculateConsensus(values)).toBeCloseTo(1.25, 6)
  })

  it('returns null when no sources are available', () => {
    expect(calculateConsensus([])).toBeNull()
  })

  it('returns null when normalized values are undefined', () => {
    expect(calculateConsensus(undefined as unknown as NormalizedValue[])).toBeNull()
  })

  it('returns null when all Z-scores are non-finite', () => {
    const values: NormalizedValue[] = [
      createNormalizedValue('p1', 'DynastyProcess', Number.NaN),
    ]

    expect(calculateConsensus(values)).toBeNull()
  })
})

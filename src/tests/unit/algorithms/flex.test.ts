import { describe, it, expect } from 'vitest'
import { getFlexBaseline } from '@/lib/algorithms/flex'
import type { PositionBaseline } from '@/lib/algorithms/types'

/**
 * Mock baseline factory for testing
 */
function createMockBaseline(
  position: string,
  projectedPoints: number,
  playerId: string = `${position}-baseline`,
  playerName: string = `${position} Baseline Player`
): PositionBaseline {
  return {
    position: position as any,
    playerId,
    playerName,
    team: 'KC',
    projectedPoints,
    baselineRank: 12,
  }
}

describe('getFlexBaseline', () => {
  // Test 1: FLEX with RB, WR, TE baselines → returns minimum
  it('should calculate FLEX baseline as minimum of RB, WR, TE', () => {
    const baselines: Record<string, PositionBaseline> = {
      RB: createMockBaseline('RB', 180),
      WR: createMockBaseline('WR', 150),
      TE: createMockBaseline('TE', 120),
    }

    const result = getFlexBaseline('FLEX', baselines)

    expect(result).not.toBeNull()
    expect(result?.position).toBe('FLEX')
    expect(result?.projectedPoints).toBe(120) // TE is minimum
    expect(result?.playerName).toBe('TE Baseline Player')
  })

  // Test 2: SUPERFLEX with QB, RB, WR, TE → returns minimum
  it('should calculate SUPERFLEX baseline as minimum of QB, RB, WR, TE', () => {
    const baselines: Record<string, PositionBaseline> = {
      QB: createMockBaseline('QB', 340),
      RB: createMockBaseline('RB', 180),
      WR: createMockBaseline('WR', 150),
      TE: createMockBaseline('TE', 120),
    }

    const result = getFlexBaseline('SUPERFLEX', baselines)

    expect(result).not.toBeNull()
    expect(result?.position).toBe('SUPERFLEX')
    expect(result?.projectedPoints).toBe(120) // TE is minimum
  })

  // Test 3: REC_FLEX (WR/TE only) → considers only WR and TE
  it('should calculate REC_FLEX baseline as minimum of WR and TE only', () => {
    const baselines: Record<string, PositionBaseline> = {
      RB: createMockBaseline('RB', 180),
      WR: createMockBaseline('WR', 150),
      TE: createMockBaseline('TE', 120),
    }

    const result = getFlexBaseline('REC_FLEX', baselines)

    expect(result).not.toBeNull()
    expect(result?.position).toBe('REC_FLEX')
    expect(result?.projectedPoints).toBe(120) // TE is minimum of WR/TE
  })

  // Test 4: WRRB_FLEX (WR/RB only) → considers only WR and RB
  it('should calculate WRRB_FLEX baseline as minimum of WR and RB only', () => {
    const baselines: Record<string, PositionBaseline> = {
      RB: createMockBaseline('RB', 180),
      WR: createMockBaseline('WR', 150),
      TE: createMockBaseline('TE', 120),
    }

    const result = getFlexBaseline('WRRB_FLEX', baselines)

    expect(result).not.toBeNull()
    expect(result?.position).toBe('WRRB_FLEX')
    expect(result?.projectedPoints).toBe(150) // WR is minimum of WR/RB
  })

  // Test 5: IDP_FLEX (DL/LB/DB) → minimum of three IDP positions
  it('should calculate IDP_FLEX baseline as minimum of DL, LB, DB', () => {
    const baselines: Record<string, PositionBaseline> = {
      DL: createMockBaseline('DL', 45),
      LB: createMockBaseline('LB', 35),
      DB: createMockBaseline('DB', 25),
    }

    const result = getFlexBaseline('IDP_FLEX', baselines)

    expect(result).not.toBeNull()
    expect(result?.position).toBe('IDP_FLEX')
    expect(result?.projectedPoints).toBe(25) // DB is minimum
  })

  // Test 6: No FLEX slots → return null
  it('should return null when FLEX position has no eligible baselines', () => {
    const baselines: Record<string, PositionBaseline> = {
      QB: createMockBaseline('QB', 340),
      K: createMockBaseline('K', 100),
    }

    const result = getFlexBaseline('FLEX', baselines)

    expect(result).toBeNull()
  })

  // Test 7: Missing one FLEX component → return null
  it('should return null when FLEX is missing one required baseline (RB)', () => {
    const baselines: Record<string, PositionBaseline> = {
      WR: createMockBaseline('WR', 150),
      TE: createMockBaseline('TE', 120),
    }

    const result = getFlexBaseline('FLEX', baselines)

    expect(result).toBeNull()
  })

  // Test 8: SUPERFLEX missing QB → return null
  it('should return null when SUPERFLEX is missing QB baseline', () => {
    const baselines: Record<string, PositionBaseline> = {
      RB: createMockBaseline('RB', 180),
      WR: createMockBaseline('WR', 150),
      TE: createMockBaseline('TE', 120),
    }

    const result = getFlexBaseline('SUPERFLEX', baselines)

    expect(result).toBeNull()
  })

  // Test 9: Empty baselines object → return null
  it('should return null when baselines object is empty', () => {
    const baselines: Record<string, PositionBaseline> = {}

    const result = getFlexBaseline('FLEX', baselines)

    expect(result).toBeNull()
  })

  // Test 10: IDP_FLEX missing one position → return null
  it('should return null when IDP_FLEX is missing one required baseline (LB)', () => {
    const baselines: Record<string, PositionBaseline> = {
      DL: createMockBaseline('DL', 45),
      DB: createMockBaseline('DB', 25),
    }

    const result = getFlexBaseline('IDP_FLEX', baselines)

    expect(result).toBeNull()
  })

  // Test 11: FLEX with equal baselines → returns one of them
  it('should handle FLEX with equal baseline values', () => {
    const baselines: Record<string, PositionBaseline> = {
      RB: createMockBaseline('RB', 150),
      WR: createMockBaseline('WR', 150),
      TE: createMockBaseline('TE', 150),
    }

    const result = getFlexBaseline('FLEX', baselines)

    expect(result).not.toBeNull()
    expect(result?.projectedPoints).toBe(150)
  })

  // Test 12: REC_FLEX with missing WR → return null
  it('should return null when REC_FLEX is missing WR baseline', () => {
    const baselines: Record<string, PositionBaseline> = {
      TE: createMockBaseline('TE', 120),
    }

    const result = getFlexBaseline('REC_FLEX', baselines)

    expect(result).toBeNull()
  })

  // Test 13: WRRB_FLEX with missing RB → return null
  it('should return null when WRRB_FLEX is missing RB baseline', () => {
    const baselines: Record<string, PositionBaseline> = {
      WR: createMockBaseline('WR', 150),
    }

    const result = getFlexBaseline('WRRB_FLEX', baselines)

    expect(result).toBeNull()
  })

  // Test 14: Unknown FLEX variant → return null
  it('should return null for unknown FLEX variant', () => {
    const baselines: Record<string, PositionBaseline> = {
      RB: createMockBaseline('RB', 180),
      WR: createMockBaseline('WR', 150),
      TE: createMockBaseline('TE', 120),
    }

    const result = getFlexBaseline('UNKNOWN_FLEX' as any, baselines)

    expect(result).toBeNull()
  })

  // Test 15: FLEX with very different baseline values
  it('should correctly identify minimum with large point differences', () => {
    const baselines: Record<string, PositionBaseline> = {
      RB: createMockBaseline('RB', 500),
      WR: createMockBaseline('WR', 400),
      TE: createMockBaseline('TE', 50),
    }

    const result = getFlexBaseline('FLEX', baselines)

    expect(result).not.toBeNull()
    expect(result?.projectedPoints).toBe(50)
    expect(result?.playerName).toBe('TE Baseline Player')
  })
})

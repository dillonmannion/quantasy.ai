import { describe, it, expect } from 'vitest'
import { calculateDynastyVBD } from '@/lib/algorithms/dynasty-vbd'
import { getAgeFactor } from '@/lib/algorithms/age-curves'
import type { PlayerRanking, Position } from '@/lib/algorithms/types'

function createMockPlayer(overrides: Partial<PlayerRanking> = {}): PlayerRanking {
  return {
    playerId: '1234',
    fullName: 'Test Player',
    firstName: 'Test',
    lastName: 'Player',
    team: 'KC',
    position: 'RB',
    eligiblePositions: ['RB', 'FLEX'],
    projectedPoints: 200,
    vbdScore: 50,
    overallRank: 10,
    positionRank: 5,
    status: 'Active',
    injuryStatus: null,
    ...overrides,
  }
}

describe('calculateDynastyVBD', () => {
  it('should calculate dynasty VBD for young player', () => {
    const player = createMockPlayer({ position: 'RB', vbdScore: 50 })
    const result = calculateDynastyVBD({ player, age: 23 })

    expect(result.currentVBD).toBe(50)
    expect(result.dynastyVBD).toBeGreaterThan(50)
    expect(result.yearlyBreakdown).toHaveLength(3)
  })

  it('should provide balanced value at peak age', () => {
    const player = createMockPlayer({ position: 'WR', vbdScore: 40 })
    const result = calculateDynastyVBD({ player, age: 27 })

    expect(result.ageFactor).toBe(1.0)
    expect(result.dynastyVBD).toBeGreaterThan(result.currentVBD)
  })

  it('should value younger player higher than aging player', () => {
    const young = createMockPlayer({ position: 'RB', vbdScore: 50 })
    const aging = createMockPlayer({ position: 'RB', vbdScore: 50 })

    const youngResult = calculateDynastyVBD({ player: young, age: 23 })
    const agingResult = calculateDynastyVBD({ player: aging, age: 32 })

    expect(youngResult.dynastyVBD).toBeGreaterThan(agingResult.dynastyVBD)
  })

  it('should apply position-specific decay rates', () => {
    const age = 30
    const vbdScore = 50
    const qb = createMockPlayer({ position: 'QB', vbdScore })
    const rb = createMockPlayer({ position: 'RB', vbdScore })

    const qbResult = calculateDynastyVBD({ player: qb, age })
    const rbResult = calculateDynastyVBD({ player: rb, age })

    expect(qbResult.dynastyVBD).toBeGreaterThan(rbResult.dynastyVBD)
  })

  it('should respect custom projection years and discount rate', () => {
    const player = createMockPlayer({ position: 'WR', vbdScore: 60 })
    const yearsToProject = 5
    const discountRate = 0.1

    const result = calculateDynastyVBD({
      player,
      age: 27,
      yearsToProject,
      discountRate,
    })

    expect(result.yearlyBreakdown).toHaveLength(5)
    const yearTwo = result.yearlyBreakdown[2]
    const currentFactor = getAgeFactor(player.position, 27)
    const futureFactor = getAgeFactor(player.position, 29)
    const relativeDecline = futureFactor / currentFactor
    const expectedDiscounted = Math.round(
      (player.vbdScore * relativeDecline) / Math.pow(1 + discountRate, 2)
    )

    expect(yearTwo).toEqual({
      year: 2,
      age: 29,
      factor: futureFactor,
      discountedVBD: expectedDiscounted,
    })
  })

  it('should handle ages past the cliff', () => {
    const player = createMockPlayer({ position: 'RB', vbdScore: 40 })
    const result = calculateDynastyVBD({ player, age: 30 })
    const cliffFactor = getAgeFactor('RB', 28)

    expect(result.yearlyBreakdown[0].factor).toBe(getAgeFactor('RB', 30))
    expect(result.yearlyBreakdown[0].factor).toBeLessThan(cliffFactor)
  })

  it('should handle negative VBD values', () => {
    const player = createMockPlayer({ position: 'WR', vbdScore: -20 })
    const result = calculateDynastyVBD({ player, age: 27 })

    expect(result.dynastyVBD).toBeLessThan(result.currentVBD)
  })
})

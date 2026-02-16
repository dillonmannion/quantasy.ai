import { describe, it, expect } from 'vitest'
import { calculateCompatibilityScore } from '@/lib/algorithms/roster-strength'
import type { RosterStrength } from '@/lib/algorithms/types'

function createMockRosterStrength(
  overrides?: Partial<RosterStrength>
): RosterStrength {
  return {
    totalVBD: 100,
    byPosition: { QB: 50, RB: 30, WR: 20, TE: 0 },
    surplus: [],
    needs: [],
    ...overrides,
  }
}

describe('calculateCompatibilityScore', () => {
  describe('Perfect Match', () => {
    it('returns high score when my surplus matches their needs', () => {
      const myStrength = createMockRosterStrength({
        surplus: ['QB', 'RB'],
        needs: ['WR', 'TE'],
      })
      const theirStrength = createMockRosterStrength({
        surplus: ['WR', 'TE'],
        needs: ['QB', 'RB'],
      })

      const result = calculateCompatibilityScore(myStrength, theirStrength)

      expect(result.score).toBe(100)
      expect(result.suggestedPositions).toContain('Give QB')
      expect(result.suggestedPositions).toContain('Give RB')
      expect(result.suggestedPositions).toContain('Get WR')
      expect(result.suggestedPositions).toContain('Get TE')
    })

    it('returns 100 for full 4-position complementary match', () => {
      const myStrength = createMockRosterStrength({
        surplus: ['QB', 'RB'],
        needs: ['WR', 'TE'],
      })
      const theirStrength = createMockRosterStrength({
        surplus: ['WR', 'TE'],
        needs: ['QB', 'RB'],
      })

      const result = calculateCompatibilityScore(myStrength, theirStrength)

      expect(result.score).toBe(100)
    })
  })

  describe('Partial Match', () => {
    it('returns 50 for 2-position match', () => {
      const myStrength = createMockRosterStrength({
        surplus: ['QB'],
        needs: ['WR'],
      })
      const theirStrength = createMockRosterStrength({
        surplus: ['WR'],
        needs: ['QB'],
      })

      const result = calculateCompatibilityScore(myStrength, theirStrength)

      expect(result.score).toBe(50)
      expect(result.suggestedPositions).toHaveLength(2)
    })

    it('returns 25 for single position match (give)', () => {
      const myStrength = createMockRosterStrength({
        surplus: ['QB'],
        needs: [],
      })
      const theirStrength = createMockRosterStrength({
        surplus: [],
        needs: ['QB'],
      })

      const result = calculateCompatibilityScore(myStrength, theirStrength)

      expect(result.score).toBe(25)
      expect(result.suggestedPositions).toContain('Give QB')
    })

    it('returns 25 for single position match (get)', () => {
      const myStrength = createMockRosterStrength({
        surplus: [],
        needs: ['RB'],
      })
      const theirStrength = createMockRosterStrength({
        surplus: ['RB'],
        needs: [],
      })

      const result = calculateCompatibilityScore(myStrength, theirStrength)

      expect(result.score).toBe(25)
      expect(result.suggestedPositions).toContain('Get RB')
    })
  })

  describe('No Match', () => {
    it('returns 0 when no overlap', () => {
      const myStrength = createMockRosterStrength({
        surplus: ['QB'],
        needs: ['WR'],
      })
      const theirStrength = createMockRosterStrength({
        surplus: ['RB'],
        needs: ['TE'],
      })

      const result = calculateCompatibilityScore(myStrength, theirStrength)

      expect(result.score).toBe(0)
      expect(result.suggestedPositions).toHaveLength(0)
    })

    it('returns 0 when both have same surplus', () => {
      const myStrength = createMockRosterStrength({
        surplus: ['QB', 'RB'],
        needs: [],
      })
      const theirStrength = createMockRosterStrength({
        surplus: ['QB', 'RB'],
        needs: [],
      })

      const result = calculateCompatibilityScore(myStrength, theirStrength)

      expect(result.score).toBe(0)
    })

    it('returns 0 when both have same needs', () => {
      const myStrength = createMockRosterStrength({
        surplus: [],
        needs: ['QB', 'RB'],
      })
      const theirStrength = createMockRosterStrength({
        surplus: [],
        needs: ['QB', 'RB'],
      })

      const result = calculateCompatibilityScore(myStrength, theirStrength)

      expect(result.score).toBe(0)
    })

    it('returns 0 when both have empty surplus and needs', () => {
      const myStrength = createMockRosterStrength({
        surplus: [],
        needs: [],
      })
      const theirStrength = createMockRosterStrength({
        surplus: [],
        needs: [],
      })

      const result = calculateCompatibilityScore(myStrength, theirStrength)

      expect(result.score).toBe(0)
      expect(result.suggestedPositions).toHaveLength(0)
    })
  })

  describe('Suggested Positions', () => {
    it('correctly labels give positions', () => {
      const myStrength = createMockRosterStrength({
        surplus: ['QB'],
        needs: [],
      })
      const theirStrength = createMockRosterStrength({
        surplus: [],
        needs: ['QB'],
      })

      const result = calculateCompatibilityScore(myStrength, theirStrength)

      expect(result.suggestedPositions).toContain('Give QB')
    })

    it('correctly labels get positions', () => {
      const myStrength = createMockRosterStrength({
        surplus: [],
        needs: ['RB'],
      })
      const theirStrength = createMockRosterStrength({
        surplus: ['RB'],
        needs: [],
      })

      const result = calculateCompatibilityScore(myStrength, theirStrength)

      expect(result.suggestedPositions).toContain('Get RB')
    })

    it('includes all matched positions in suggestions', () => {
      const myStrength = createMockRosterStrength({
        surplus: ['QB', 'WR'],
        needs: ['RB', 'TE'],
      })
      const theirStrength = createMockRosterStrength({
        surplus: ['RB', 'TE'],
        needs: ['QB', 'WR'],
      })

      const result = calculateCompatibilityScore(myStrength, theirStrength)

      expect(result.suggestedPositions).toHaveLength(4)
      expect(result.suggestedPositions).toContain('Give QB')
      expect(result.suggestedPositions).toContain('Give WR')
      expect(result.suggestedPositions).toContain('Get RB')
      expect(result.suggestedPositions).toContain('Get TE')
    })
  })

  describe('Score Calculation', () => {
    it('caps score at 100', () => {
      const myStrength = createMockRosterStrength({
        surplus: ['QB', 'RB', 'WR', 'TE'],
        needs: [],
      })
      const theirStrength = createMockRosterStrength({
        surplus: [],
        needs: ['QB', 'RB', 'WR', 'TE'],
      })

      const result = calculateCompatibilityScore(myStrength, theirStrength)

      expect(result.score).toBe(100)
    })

    it('returns 75 for 3-position match', () => {
      const myStrength = createMockRosterStrength({
        surplus: ['QB', 'RB'],
        needs: ['WR'],
      })
      const theirStrength = createMockRosterStrength({
        surplus: ['WR'],
        needs: ['QB', 'RB'],
      })

      const result = calculateCompatibilityScore(myStrength, theirStrength)

      expect(result.score).toBe(75)
    })
  })

  describe('Edge Cases', () => {
    it('handles duplicate positions in surplus/needs (invalid state)', () => {
      const myStrength = createMockRosterStrength({
        surplus: ['QB', 'QB'],
        needs: [],
      })
      const theirStrength = createMockRosterStrength({
        surplus: [],
        needs: ['QB', 'QB'],
      })

      const result = calculateCompatibilityScore(myStrength, theirStrength)

      expect(result.score).toBe(50)
    })

    it('handles IDP positions if included', () => {
      const myStrength = createMockRosterStrength({
        surplus: ['DL'],
        needs: ['LB'],
      })
      const theirStrength = createMockRosterStrength({
        surplus: ['LB'],
        needs: ['DL'],
      })

      const result = calculateCompatibilityScore(myStrength, theirStrength)

      expect(result.score).toBe(50)
    })
  })
})

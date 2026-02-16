import { describe, it, expect } from 'vitest'
import { calculateRosterStrength } from '@/lib/algorithms/roster-strength'
import type { AlgorithmPlayer, Position, PositionBaseline, RosterSlot } from '@/lib/algorithms/types'

function createMockPlayer(
  playerId: string,
  fullName: string,
  position: Position,
  projectedPoints: number
): AlgorithmPlayer {
  return {
    playerId,
    fullName,
    team: 'KC',
    position,
    eligiblePositions: [position],
    projectedPoints,
    injuryStatus: null,
    status: 'Active',
    byeWeek: null,
  }
}

function createMockBaselines(
  overrides?: Partial<Record<Position, number>>
): Partial<Record<Position, PositionBaseline>> {
  const baseValues: Record<string, number> = {
    QB: 200,
    RB: 150,
    WR: 140,
    TE: 110,
    K: 100,
    DEF: 90,
  }

  const baselines: Partial<Record<Position, PositionBaseline>> = {}
  const merged = { ...baseValues, ...overrides }
  Object.entries(merged).forEach(([position, projectedPoints]) => {
    baselines[position as Position] = {
      position: position as Position,
      playerId: `${position.toLowerCase()}-baseline`,
      playerName: `${position} Baseline`,
      team: null,
      projectedPoints,
      baselineRank: 12,
    }
  })

  return baselines
}

describe('calculateRosterStrength', () => {
  describe('Empty Roster', () => {
    it('returns 0 totalVBD for empty roster', () => {
      const result = calculateRosterStrength([], createMockBaselines())

      expect(result.totalVBD).toBe(0)
      expect(result.byPosition).toEqual({})
      expect(result.surplus).toEqual([])
      expect(result.needs).toEqual([])
    })

    it('returns empty result for null roster', () => {
      const result = calculateRosterStrength(null as unknown as AlgorithmPlayer[], createMockBaselines())

      expect(result.totalVBD).toBe(0)
      expect(result.surplus).toEqual([])
      expect(result.needs).toEqual([])
    })
  })

  describe('Basic VBD Calculation', () => {
    it('calculates correct VBD for single position with full starters', () => {
      const rosterSlots: RosterSlot[] = [
        { slotId: 'qb-1', slotType: 'starter', allowedPositions: ['QB'] },
      ]
      const roster = [createMockPlayer('qb-1', 'Patrick Mahomes', 'QB', 280)]
      const baselines = createMockBaselines({ QB: 200 })

      const result = calculateRosterStrength(roster, baselines, rosterSlots)

      expect(result.byPosition['QB']).toBe(80)
    })

    it('calculates correct VBD for QB below baseline', () => {
      const rosterSlots: RosterSlot[] = [
        { slotId: 'qb-1', slotType: 'starter', allowedPositions: ['QB'] },
      ]
      const roster = [createMockPlayer('qb-1', 'Bad QB', 'QB', 180)]
      const baselines = createMockBaselines({ QB: 200 })

      const result = calculateRosterStrength(roster, baselines, rosterSlots)

      expect(result.byPosition['QB']).toBe(-20)
    })

    it('calculates correct VBD for multiple RBs', () => {
      const rosterSlots: RosterSlot[] = [
        { slotId: 'rb-1', slotType: 'starter', allowedPositions: ['RB'] },
        { slotId: 'rb-2', slotType: 'starter', allowedPositions: ['RB'] },
      ]
      const roster = [
        createMockPlayer('rb-1', 'RB One', 'RB', 200),
        createMockPlayer('rb-2', 'RB Two', 'RB', 180),
        createMockPlayer('rb-3', 'RB Three', 'RB', 140),
      ]
      const baselines = createMockBaselines({ RB: 150 })

      const result = calculateRosterStrength(roster, baselines, rosterSlots)

      expect(result.byPosition['RB']).toBe(80)
    })

    it('sums VBD across all positions', () => {
      const rosterSlots: RosterSlot[] = [
        { slotId: 'qb-1', slotType: 'starter', allowedPositions: ['QB'] },
        { slotId: 'rb-1', slotType: 'starter', allowedPositions: ['RB'] },
        { slotId: 'rb-2', slotType: 'starter', allowedPositions: ['RB'] },
        { slotId: 'wr-1', slotType: 'starter', allowedPositions: ['WR'] },
        { slotId: 'wr-2', slotType: 'starter', allowedPositions: ['WR'] },
        { slotId: 'te-1', slotType: 'starter', allowedPositions: ['TE'] },
      ]
      const roster = [
        createMockPlayer('qb-1', 'QB One', 'QB', 250),
        createMockPlayer('rb-1', 'RB One', 'RB', 180),
        createMockPlayer('rb-2', 'RB Two', 'RB', 160),
        createMockPlayer('wr-1', 'WR One', 'WR', 170),
        createMockPlayer('wr-2', 'WR Two', 'WR', 150),
        createMockPlayer('te-1', 'TE One', 'TE', 130),
      ]
      const baselines = createMockBaselines()

      const result = calculateRosterStrength(roster, baselines, rosterSlots)

      const expectedQB = 250 - 200
      const expectedRB = (180 - 150) + (160 - 150)
      const expectedWR = (170 - 140) + (150 - 140)
      const expectedTE = 130 - 110
      const expectedTotal = expectedQB + expectedRB + expectedWR + expectedTE

      expect(result.totalVBD).toBe(expectedTotal)
    })
  })

  describe('Surplus and Needs Classification', () => {
    it('identifies surplus positions above 1.1x average VBD', () => {
      const rosterSlots: RosterSlot[] = [
        { slotId: 'qb-1', slotType: 'starter', allowedPositions: ['QB'] },
        { slotId: 'rb-1', slotType: 'starter', allowedPositions: ['RB'] },
        { slotId: 'rb-2', slotType: 'starter', allowedPositions: ['RB'] },
        { slotId: 'wr-1', slotType: 'starter', allowedPositions: ['WR'] },
        { slotId: 'wr-2', slotType: 'starter', allowedPositions: ['WR'] },
        { slotId: 'te-1', slotType: 'starter', allowedPositions: ['TE'] },
      ]
      const roster = [
        createMockPlayer('qb-1', 'Elite QB', 'QB', 300),
        createMockPlayer('rb-1', 'RB One', 'RB', 160),
        createMockPlayer('rb-2', 'RB Two', 'RB', 150),
        createMockPlayer('wr-1', 'WR One', 'WR', 145),
        createMockPlayer('wr-2', 'WR Two', 'WR', 140),
        createMockPlayer('te-1', 'TE One', 'TE', 115),
      ]
      const baselines = createMockBaselines()

      const result = calculateRosterStrength(roster, baselines, rosterSlots)

      expect(result.surplus).toContain('QB')
    })

    it('identifies needs positions below 0.9x average VBD', () => {
      const rosterSlots: RosterSlot[] = [
        { slotId: 'qb-1', slotType: 'starter', allowedPositions: ['QB'] },
        { slotId: 'rb-1', slotType: 'starter', allowedPositions: ['RB'] },
        { slotId: 'rb-2', slotType: 'starter', allowedPositions: ['RB'] },
        { slotId: 'wr-1', slotType: 'starter', allowedPositions: ['WR'] },
        { slotId: 'wr-2', slotType: 'starter', allowedPositions: ['WR'] },
        { slotId: 'te-1', slotType: 'starter', allowedPositions: ['TE'] },
      ]
      const roster = [
        createMockPlayer('qb-1', 'QB One', 'QB', 250),
        createMockPlayer('rb-1', 'Bad RB', 'RB', 120),
        createMockPlayer('rb-2', 'Bad RB 2', 'RB', 110),
        createMockPlayer('wr-1', 'WR One', 'WR', 180),
        createMockPlayer('wr-2', 'WR Two', 'WR', 170),
        createMockPlayer('te-1', 'TE One', 'TE', 130),
      ]
      const baselines = createMockBaselines()

      const result = calculateRosterStrength(roster, baselines, rosterSlots)

      expect(result.needs).toContain('RB')
    })

    it('handles balanced roster with similar VBDs', () => {
      const rosterSlots: RosterSlot[] = [
        { slotId: 'qb-1', slotType: 'starter', allowedPositions: ['QB'] },
        { slotId: 'rb-1', slotType: 'starter', allowedPositions: ['RB'] },
      ]
      const roster = [
        createMockPlayer('qb-1', 'QB One', 'QB', 220),
        createMockPlayer('rb-1', 'RB One', 'RB', 170),
      ]
      const baselines = createMockBaselines()

      const result = calculateRosterStrength(roster, baselines, rosterSlots)

      expect(result.surplus.length).toBeLessThanOrEqual(2)
      expect(result.needs.length).toBeLessThanOrEqual(2)
    })
  })

  describe('Missing Baselines', () => {
    it('uses 0 baseline points when baseline missing for position', () => {
      const rosterSlots: RosterSlot[] = [
        { slotId: 'qb-1', slotType: 'starter', allowedPositions: ['QB'] },
      ]
      const roster = [createMockPlayer('qb-1', 'QB One', 'QB', 250)]
      const baselines: Partial<Record<Position, PositionBaseline>> = {}

      const result = calculateRosterStrength(roster, baselines, rosterSlots)

      expect(result.byPosition['QB']).toBe(250)
    })

    it('handles partial baselines', () => {
      const rosterSlots: RosterSlot[] = [
        { slotId: 'qb-1', slotType: 'starter', allowedPositions: ['QB'] },
        { slotId: 'rb-1', slotType: 'starter', allowedPositions: ['RB'] },
      ]
      const roster = [
        createMockPlayer('qb-1', 'QB One', 'QB', 250),
        createMockPlayer('rb-1', 'RB One', 'RB', 180),
      ]
      const baselines = createMockBaselines()
      delete baselines['RB']

      const result = calculateRosterStrength(roster, baselines, rosterSlots)

      expect(result.byPosition['QB']).toBe(50)
      expect(result.byPosition['RB']).toBe(180)
    })
  })

  describe('Roster Slots Configuration', () => {
    it('uses roster slots to determine starter count', () => {
      const roster = [
        createMockPlayer('qb-1', 'QB One', 'QB', 280),
        createMockPlayer('qb-2', 'QB Two', 'QB', 220),
        createMockPlayer('rb-1', 'RB One', 'RB', 180),
      ]
      const baselines = createMockBaselines()

      const rosterSlots: RosterSlot[] = [
        { slotId: 'qb-1', slotType: 'starter', allowedPositions: ['QB'] },
        { slotId: 'qb-2', slotType: 'starter', allowedPositions: ['QB'] },
        { slotId: 'rb-1', slotType: 'starter', allowedPositions: ['RB'] },
      ]

      const result = calculateRosterStrength(roster, baselines, rosterSlots)

      expect(result.byPosition['QB']).toBe(100)
      expect(result.byPosition['RB']).toBe(30)
    })

    it('uses default starters when rosterSlots not provided', () => {
      const roster = [
        createMockPlayer('rb-1', 'RB One', 'RB', 180),
        createMockPlayer('rb-2', 'RB Two', 'RB', 160),
        createMockPlayer('rb-3', 'RB Three', 'RB', 140),
      ]
      const baselines = createMockBaselines()

      const result = calculateRosterStrength(roster, baselines)

      expect(result.byPosition['RB']).toBe(40)
    })

    it('uses default starters when rosterSlots is empty array', () => {
      const roster = [createMockPlayer('qb-1', 'QB One', 'QB', 250)]
      const baselines = createMockBaselines()

      const result = calculateRosterStrength(roster, baselines, [])

      expect(result.byPosition['QB']).toBe(50)
    })

    it('ignores FLEX slots for position-specific starter count', () => {
      const roster = [
        createMockPlayer('rb-1', 'RB One', 'RB', 200),
        createMockPlayer('rb-2', 'RB Two', 'RB', 180),
        createMockPlayer('rb-3', 'RB Three', 'RB', 160),
      ]
      const baselines = createMockBaselines()

      const rosterSlots: RosterSlot[] = [
        { slotId: 'rb-1', slotType: 'starter', allowedPositions: ['RB'] },
        { slotId: 'rb-2', slotType: 'starter', allowedPositions: ['RB'] },
        { slotId: 'flex-1', slotType: 'starter', allowedPositions: ['RB', 'WR', 'TE'] },
      ]

      const result = calculateRosterStrength(roster, baselines, rosterSlots)

      expect(result.byPosition['RB']).toBe(80)
    })
  })

  describe('Starter Selection', () => {
    it('only counts starters for VBD, not bench players', () => {
      const rosterSlots: RosterSlot[] = [
        { slotId: 'rb-1', slotType: 'starter', allowedPositions: ['RB'] },
        { slotId: 'rb-2', slotType: 'starter', allowedPositions: ['RB'] },
      ]
      const roster = [
        createMockPlayer('rb-1', 'RB One', 'RB', 200),
        createMockPlayer('rb-2', 'RB Two', 'RB', 180),
        createMockPlayer('rb-3', 'RB Three', 'RB', 100),
        createMockPlayer('rb-4', 'RB Four', 'RB', 80),
      ]
      const baselines = createMockBaselines()

      const result = calculateRosterStrength(roster, baselines, rosterSlots)

      expect(result.byPosition['RB']).toBe(80)
    })

    it('selects best players as starters (sorted by projected points)', () => {
      const rosterSlots: RosterSlot[] = [
        { slotId: 'rb-1', slotType: 'starter', allowedPositions: ['RB'] },
        { slotId: 'rb-2', slotType: 'starter', allowedPositions: ['RB'] },
      ]
      const roster = [
        createMockPlayer('rb-3', 'RB Three', 'RB', 100),
        createMockPlayer('rb-1', 'RB One', 'RB', 200),
        createMockPlayer('rb-2', 'RB Two', 'RB', 180),
      ]
      const baselines = createMockBaselines()

      const result = calculateRosterStrength(roster, baselines, rosterSlots)

      expect(result.byPosition['RB']).toBe(80)
    })
  })

  describe('Missing Starters', () => {
    it('penalizes for missing starters at position', () => {
      const rosterSlots: RosterSlot[] = [
        { slotId: 'rb-1', slotType: 'starter', allowedPositions: ['RB'] },
        { slotId: 'rb-2', slotType: 'starter', allowedPositions: ['RB'] },
      ]
      const roster = [createMockPlayer('rb-1', 'RB One', 'RB', 200)]
      const baselines = createMockBaselines()

      const result = calculateRosterStrength(roster, baselines, rosterSlots)

      expect(result.byPosition['RB']).toBe(-100)
    })

    it('penalizes for completely missing position', () => {
      const rosterSlots: RosterSlot[] = [
        { slotId: 'qb-1', slotType: 'starter', allowedPositions: ['QB'] },
        { slotId: 'rb-1', slotType: 'starter', allowedPositions: ['RB'] },
        { slotId: 'rb-2', slotType: 'starter', allowedPositions: ['RB'] },
      ]
      const roster = [createMockPlayer('qb-1', 'QB One', 'QB', 250)]
      const baselines = createMockBaselines()

      const result = calculateRosterStrength(roster, baselines, rosterSlots)

      expect(result.byPosition['QB']).toBe(50)
      expect(result.byPosition['RB']).toBe(-300)
    })
  })

  describe('Eligible Positions', () => {
    it('includes players with eligible positions in position group', () => {
      const rosterSlots: RosterSlot[] = [
        { slotId: 'rb-1', slotType: 'starter', allowedPositions: ['RB'] },
      ]
      const flexPlayer = createMockPlayer('rb-1', 'RB/WR', 'RB', 180)
      flexPlayer.eligiblePositions = ['RB', 'WR']

      const roster = [flexPlayer]
      const baselines = createMockBaselines()

      const result = calculateRosterStrength(roster, baselines, rosterSlots)

      expect(result.byPosition['RB']).toBe(30)
    })
  })

  describe('Edge Cases', () => {
    it('handles K/DEF positions with default starters', () => {
      const roster = [
        createMockPlayer('k-1', 'Kicker', 'K', 120),
        createMockPlayer('def-1', 'Defense', 'DEF', 100),
      ]
      const baselines = createMockBaselines()

      const result = calculateRosterStrength(roster, baselines)

      expect(result.byPosition['K']).toBe(20)
      expect(result.byPosition['DEF']).toBe(10)
    })

    it('handles zero projected points', () => {
      const rosterSlots: RosterSlot[] = [
        { slotId: 'qb-1', slotType: 'starter', allowedPositions: ['QB'] },
      ]
      const roster = [createMockPlayer('qb-1', 'Injured QB', 'QB', 0)]
      const baselines = createMockBaselines()

      const result = calculateRosterStrength(roster, baselines, rosterSlots)

      expect(result.byPosition['QB']).toBe(-200)
    })

    it('handles negative VBD correctly', () => {
      const rosterSlots: RosterSlot[] = [
        { slotId: 'qb-1', slotType: 'starter', allowedPositions: ['QB'] },
        { slotId: 'rb-1', slotType: 'starter', allowedPositions: ['RB'] },
        { slotId: 'rb-2', slotType: 'starter', allowedPositions: ['RB'] },
      ]
      const roster = [
        createMockPlayer('qb-1', 'Bad QB', 'QB', 100),
        createMockPlayer('rb-1', 'Bad RB', 'RB', 50),
        createMockPlayer('rb-2', 'Bad RB 2', 'RB', 50),
      ]
      const baselines = createMockBaselines()

      const result = calculateRosterStrength(roster, baselines, rosterSlots)

      expect(result.byPosition['QB']).toBeLessThan(0)
      expect(result.byPosition['RB']).toBeLessThan(0)
      expect(result.totalVBD).toBeLessThan(0)
    })

    it('skips positions with 0 starters', () => {
      const rosterSlots: RosterSlot[] = [
        { slotId: 'qb-1', slotType: 'starter', allowedPositions: ['QB'] },
      ]
      const roster = [
        createMockPlayer('qb-1', 'QB One', 'QB', 250),
        createMockPlayer('dl-1', 'DL One', 'DL', 60),
      ]
      const baselines = createMockBaselines()

      const result = calculateRosterStrength(roster, baselines, rosterSlots)

      expect(result.byPosition['DL']).toBeUndefined()
    })

    it('handles avgVBD being 0 when all positions have 0 starters', () => {
      const rosterSlots: RosterSlot[] = [
        { slotId: 'flex-1', slotType: 'starter', allowedPositions: ['RB', 'WR', 'TE'] },
      ]
      const roster = [
        createMockPlayer('rb-1', 'RB One', 'RB', 160),
      ]
      const baselines = createMockBaselines()

      const result = calculateRosterStrength(roster, baselines, rosterSlots)

      expect(result.byPosition).toEqual({})
      expect(result.surplus).toEqual([])
      expect(result.needs).toEqual([])
    })

    it('handles position not in DEFAULT_STARTERS', () => {
      const roster = [
        createMockPlayer('qb-1', 'QB One', 'QB', 250),
        createMockPlayer('flex-1', 'Flex Player', 'FLEX' as Position, 160),
      ]
      const baselines = createMockBaselines()

      const result = calculateRosterStrength(roster, baselines)

      expect(result.totalVBD).toBeDefined()
    })
  })
})

import { describe, it, expect } from 'vitest'
import { recommendWaivers } from '@/lib/algorithms/waivers'
import type {
  AlgorithmPlayer,
  Position,
  PositionBaseline,
  WaiverInput,
} from '@/lib/algorithms/types'

function createMockAlgorithmPlayer(
  playerId: string,
  fullName: string,
  position: Position,
  projectedPoints: number,
  eligiblePositions: Position[] = [position]
): AlgorithmPlayer {
  return {
    playerId,
    fullName,
    team: 'KC',
    position,
    eligiblePositions,
    projectedPoints,
    injuryStatus: null,
    status: 'Active',
    byeWeek: null,
  }
}

function createMockBaselines(
  overrides?: Partial<Record<Position, number>>
): Partial<Record<Position, PositionBaseline>> {
  const baseValues: Record<Position, number> = {
    QB: 200,
    RB: 150,
    WR: 140,
    TE: 110,
    K: 100,
    DEF: 90,
    DL: 50,
    LB: 45,
    DB: 40,
    FLEX: 150,
    SUPERFLEX: 200,
    REC_FLEX: 140,
    WRRB_FLEX: 140,
    IDP_FLEX: 45,
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

function createMockWaiverInput(partial?: Partial<WaiverInput>): WaiverInput {
  return {
    availablePlayers: [],
    currentRoster: [],
    leagueSettings: {
      baselines: createMockBaselines(),
    },
    week: 1,
    faabBudget: {
      total: 100,
      remaining: 100,
    },
    ...partial,
  }
}

describe('recommendWaivers', () => {
  describe('Basic Priority Ordering', () => {
    it('prioritizes players with highest VBD improvement', () => {
      const highVBD = createMockAlgorithmPlayer('wr-1', 'High VBD WR', 'WR', 180)
      const lowVBD = createMockAlgorithmPlayer('wr-2', 'Low VBD WR', 'WR', 145)

      const input = createMockWaiverInput({
        availablePlayers: [lowVBD, highVBD],
        currentRoster: [],
      })

      const result = recommendWaivers(input)

      expect(result.recommendations).toHaveLength(2)
      expect(result.recommendations[0].player.playerId).toBe('wr-1')
      expect(result.recommendations[0].vbdImprovement).toBeGreaterThan(
        result.recommendations[1].vbdImprovement
      )
    })

    it('calculates VBD improvement correctly', () => {
      const candidate = createMockAlgorithmPlayer('wr-1', 'WR Candidate', 'WR', 180)
      const worstStarter = createMockAlgorithmPlayer('wr-2', 'WR Worst', 'WR', 155)

      const input = createMockWaiverInput({
        availablePlayers: [candidate],
        currentRoster: [worstStarter],
      })

      const result = recommendWaivers(input)

      expect(result.recommendations[0].vbdImprovement).toBe(25)
    })

    it('returns empty recommendations when no available players', () => {
      const input = createMockWaiverInput({
        availablePlayers: [],
        currentRoster: [createMockAlgorithmPlayer('rb-1', 'RB One', 'RB', 160)],
      })

      const result = recommendWaivers(input)

      expect(result.recommendations).toHaveLength(0)
    })
  })

  describe('FAAB Bid Calculation', () => {
    it('calculates FAAB bid range correctly for standard improvement', () => {
      const candidate = createMockAlgorithmPlayer('wr-1', 'WR Candidate', 'WR', 170)

      const input = createMockWaiverInput({
        availablePlayers: [candidate],
        currentRoster: [],
        faabBudget: {
          total: 100,
          remaining: 100,
        },
      })

      const result = recommendWaivers(input)

      expect(result.recommendations[0].suggestedFaabBid).not.toBeNull()
      expect(result.recommendations[0].suggestedFaabBid?.min).toBe(24)
      expect(result.recommendations[0].suggestedFaabBid?.max).toBe(36)
    })

    it('returns null FAAB bid for non-FAAB leagues', () => {
      const candidate = createMockAlgorithmPlayer('wr-1', 'WR Candidate', 'WR', 170)

      const input = createMockWaiverInput({
        availablePlayers: [candidate],
        currentRoster: [],
        faabBudget: undefined,
      })

      const result = recommendWaivers(input)

      expect(result.recommendations[0].suggestedFaabBid).toBeNull()
    })

    it('returns null FAAB bid when budget exhausted', () => {
      const candidate = createMockAlgorithmPlayer('wr-1', 'WR Candidate', 'WR', 170)

      const input = createMockWaiverInput({
        availablePlayers: [candidate],
        currentRoster: [],
        faabBudget: {
          total: 100,
          remaining: 0,
        },
      })

      const result = recommendWaivers(input)

      expect(result.recommendations[0].suggestedFaabBid).toBeNull()
    })

    it('caps FAAB bid at remaining budget', () => {
      const candidate = createMockAlgorithmPlayer('qb-1', 'QB Candidate', 'QB', 280)

      const input = createMockWaiverInput({
        availablePlayers: [candidate],
        currentRoster: [],
        faabBudget: {
          total: 100,
          remaining: 20,
        },
      })

      const result = recommendWaivers(input)

      expect(result.recommendations[0].suggestedFaabBid?.max).toBeLessThanOrEqual(20)
    })

    it('returns null FAAB bid for zero or negative VBD improvement', () => {
      const candidate = createMockAlgorithmPlayer('wr-1', 'WR Candidate', 'WR', 130)

      const input = createMockWaiverInput({
        availablePlayers: [candidate],
        currentRoster: [],
        faabBudget: {
          total: 100,
          remaining: 100,
        },
      })

      const result = recommendWaivers(input)

      expect(result.recommendations[0].suggestedFaabBid).toBeNull()
    })
  })

  describe('Roster Need Multipliers', () => {
    it('applies 1.5x injury replacement multiplier', () => {
      const injured = createMockAlgorithmPlayer('rb-1', 'RB Injured', 'RB', 160)
      injured.injuryStatus = 'Out'

      const candidate = createMockAlgorithmPlayer('rb-2', 'RB Candidate', 'RB', 165)

      const input = createMockWaiverInput({
        availablePlayers: [candidate],
        currentRoster: [injured],
      })

      const result = recommendWaivers(input)

      expect(
        result.recommendations[0].reasons.some((r: string) =>
          /[Ii]njury replacement/.test(r)
        )
      ).toBe(true)
    })

    it('applies 1.3x starter upgrade multiplier', () => {
      const worstStarter = createMockAlgorithmPlayer('wr-1', 'WR Worst', 'WR', 150)
      const candidate = createMockAlgorithmPlayer('wr-2', 'WR Candidate', 'WR', 165)

      const input = createMockWaiverInput({
        availablePlayers: [candidate],
        currentRoster: [worstStarter],
      })

      const result = recommendWaivers(input)

      expect(
        result.recommendations[0].reasons.some((r: string) =>
          /[Ss]tarter upgrade/.test(r)
        )
      ).toBe(true)
    })

    it('applies 0.8x depth multiplier when roster slots filled', () => {
      const starter1 = createMockAlgorithmPlayer('wr-1', 'WR One', 'WR', 170)
      const starter2 = createMockAlgorithmPlayer('wr-2', 'WR Two', 'WR', 160)
      const candidate = createMockAlgorithmPlayer('wr-3', 'WR Candidate', 'WR', 155)

      const input = createMockWaiverInput({
        availablePlayers: [candidate],
        currentRoster: [starter1, starter2],
      })

      const result = recommendWaivers(input)

      expect(
        result.recommendations[0].reasons.some((r: string) => /[Dd]epth/.test(r))
      ).toBe(true)
    })

    it('applies 1.0x default multiplier for filling roster gap', () => {
      const candidate = createMockAlgorithmPlayer('rb-1', 'RB Candidate', 'RB', 165)

      const input = createMockWaiverInput({
        availablePlayers: [candidate],
        currentRoster: [],
      })

      const result = recommendWaivers(input)

      expect(
        result.recommendations[0].reasons.some((r: string) =>
          /[Ff]illing roster gap/.test(r)
        )
      ).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('handles empty roster', () => {
      const candidate = createMockAlgorithmPlayer('qb-1', 'QB Candidate', 'QB', 220)

      const input = createMockWaiverInput({
        availablePlayers: [candidate],
        currentRoster: [],
      })

      const result = recommendWaivers(input)

      expect(result.recommendations).toHaveLength(1)
      expect(result.recommendations[0].player.playerId).toBe('qb-1')
    })

    it('handles full roster with no droppable players', () => {
      const roster = [
        createMockAlgorithmPlayer('qb-1', 'QB One', 'QB', 250),
        createMockAlgorithmPlayer('rb-1', 'RB One', 'RB', 180),
        createMockAlgorithmPlayer('rb-2', 'RB Two', 'RB', 170),
        createMockAlgorithmPlayer('wr-1', 'WR One', 'WR', 175),
        createMockAlgorithmPlayer('wr-2', 'WR Two', 'WR', 165),
        createMockAlgorithmPlayer('te-1', 'TE One', 'TE', 130),
      ]

      const candidate = createMockAlgorithmPlayer('k-1', 'K Candidate', 'K', 110)

      const input = createMockWaiverInput({
        availablePlayers: [candidate],
        currentRoster: roster,
      })

      const result = recommendWaivers(input)

      expect(result.droppable).toHaveLength(0)
    })

    it('handles $0 FAAB remaining', () => {
      const candidate = createMockAlgorithmPlayer('wr-1', 'WR Candidate', 'WR', 170)

      const input = createMockWaiverInput({
        availablePlayers: [candidate],
        currentRoster: [],
        faabBudget: {
          total: 100,
          remaining: 0,
        },
      })

      const result = recommendWaivers(input)

      expect(result.recommendations[0].suggestedFaabBid).toBeNull()
    })

    it('handles missing baselines for positions with 0 starters', () => {
      const baselines = createMockBaselines()
      delete baselines.K

      const candidate = createMockAlgorithmPlayer('k-1', 'K Candidate', 'K', 110)

      const input = createMockWaiverInput({
        availablePlayers: [candidate],
        currentRoster: [],
        leagueSettings: {
          baselines,
        },
      })

      const result = recommendWaivers(input)

      expect(result.recommendations).toHaveLength(0)
    })
  })

  describe('IDP League Handling', () => {
    it('handles IDP positions (DL, LB, DB)', () => {
      const dlCandidate = createMockAlgorithmPlayer('dl-1', 'DL Candidate', 'DL', 60)
      const lbCandidate = createMockAlgorithmPlayer('lb-1', 'LB Candidate', 'LB', 55)
      const dbCandidate = createMockAlgorithmPlayer('db-1', 'DB Candidate', 'DB', 50)

      const input = createMockWaiverInput({
        availablePlayers: [dlCandidate, lbCandidate, dbCandidate],
        currentRoster: [],
      })

      const result = recommendWaivers(input)

      expect(result.recommendations).toHaveLength(3)
      expect(result.recommendations[0].player.position).toBe('DL')
    })

    it('prioritizes IDP candidates by VBD improvement', () => {
      const dlCandidate = createMockAlgorithmPlayer('dl-1', 'DL Candidate', 'DL', 65)
      const dbCandidate = createMockAlgorithmPlayer('db-1', 'DB Candidate', 'DB', 48)

      const input = createMockWaiverInput({
        availablePlayers: [dbCandidate, dlCandidate],
        currentRoster: [],
      })

      const result = recommendWaivers(input)

      expect(result.recommendations[0].player.position).toBe('DL')
      expect(result.recommendations[0].vbdImprovement).toBeGreaterThan(
        result.recommendations[1].vbdImprovement
      )
    })
  })

  describe('Non-FAAB League', () => {
    it('returns null FAAB bid when faabBudget omitted', () => {
      const candidate = createMockAlgorithmPlayer('wr-1', 'WR Candidate', 'WR', 170)

      const input = createMockWaiverInput({
        availablePlayers: [candidate],
        currentRoster: [],
        faabBudget: undefined,
      })

      const result = recommendWaivers(input)

      expect(result.recommendations[0].suggestedFaabBid).toBeNull()
    })

    it('still provides priority scores for non-FAAB leagues', () => {
      const candidate = createMockAlgorithmPlayer('wr-1', 'WR Candidate', 'WR', 170)

      const input = createMockWaiverInput({
        availablePlayers: [candidate],
        currentRoster: [],
        faabBudget: undefined,
      })

      const result = recommendWaivers(input)

      expect(result.recommendations[0].priorityScore).toBeGreaterThan(0)
    })
  })

  describe('Droppable Players', () => {
    it('identifies droppable players from roster', () => {
      const keeper = createMockAlgorithmPlayer('qb-1', 'QB One', 'QB', 250)
      const droppable = createMockAlgorithmPlayer('k-1', 'K One', 'K', 95)

      const input = createMockWaiverInput({
        availablePlayers: [],
        currentRoster: [keeper, droppable],
      })

      const result = recommendWaivers(input)

      expect(result.droppable).toEqual(
        expect.arrayContaining([expect.objectContaining({ playerId: 'k-1' })])
      )
    })

    it('returns empty droppable list when roster empty', () => {
      const input = createMockWaiverInput({
        availablePlayers: [],
        currentRoster: [],
      })

      const result = recommendWaivers(input)

      expect(result.droppable).toHaveLength(0)
    })
  })

  describe('Explanation Output', () => {
    it('includes algorithm version identifier', () => {
      const candidate = createMockAlgorithmPlayer('wr-1', 'WR Candidate', 'WR', 170)

      const input = createMockWaiverInput({
        availablePlayers: [candidate],
        currentRoster: [],
      })

      const result = recommendWaivers(input)

      expect(result.explanation.algorithm).toBe('waiver_v1')
    })

    it('includes ISO timestamp', () => {
      const candidate = createMockAlgorithmPlayer('wr-1', 'WR Candidate', 'WR', 170)

      const input = createMockWaiverInput({
        availablePlayers: [candidate],
        currentRoster: [],
      })

      const result = recommendWaivers(input)

      expect(result.explanation.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })

    it('includes methodology markdown', () => {
      const candidate = createMockAlgorithmPlayer('wr-1', 'WR Candidate', 'WR', 170)

      const input = createMockWaiverInput({
        availablePlayers: [candidate],
        currentRoster: [],
      })

      const result = recommendWaivers(input)

      expect(result.explanation.methodology).toBeTruthy()
      expect(result.explanation.methodology.length).toBeGreaterThan(0)
    })

    it('includes priority factors array', () => {
      const candidate = createMockAlgorithmPlayer('wr-1', 'WR Candidate', 'WR', 170)

      const input = createMockWaiverInput({
        availablePlayers: [candidate],
        currentRoster: [],
      })

      const result = recommendWaivers(input)

      expect(result.explanation.priorityFactors).toBeInstanceOf(Array)
      expect(result.explanation.priorityFactors.length).toBeGreaterThan(0)
    })

    it('includes caveats array', () => {
      const candidate = createMockAlgorithmPlayer('wr-1', 'WR Candidate', 'WR', 170)

      const input = createMockWaiverInput({
        availablePlayers: [candidate],
        currentRoster: [],
      })

      const result = recommendWaivers(input)

      expect(result.explanation.caveats).toBeInstanceOf(Array)
    })
  })

  describe('Multiple Candidates', () => {
    it('ranks multiple candidates by priority score', () => {
      const candidate1 = createMockAlgorithmPlayer('wr-1', 'WR One', 'WR', 180)
      const candidate2 = createMockAlgorithmPlayer('wr-2', 'WR Two', 'WR', 160)
      const candidate3 = createMockAlgorithmPlayer('wr-3', 'WR Three', 'WR', 150)

      const input = createMockWaiverInput({
        availablePlayers: [candidate3, candidate1, candidate2],
        currentRoster: [],
      })

      const result = recommendWaivers(input)

      expect(result.recommendations).toHaveLength(3)
      expect(result.recommendations[0].player.playerId).toBe('wr-1')
      expect(result.recommendations[1].player.playerId).toBe('wr-2')
      expect(result.recommendations[2].player.playerId).toBe('wr-3')
    })

    it('handles mixed position candidates', () => {
      // VBD: WR = 170-140 = 30, QB = 220-200 = 20, RB = 165-150 = 15
      const qb = createMockAlgorithmPlayer('qb-1', 'QB Candidate', 'QB', 220)
      const rb = createMockAlgorithmPlayer('rb-1', 'RB Candidate', 'RB', 165)
      const wr = createMockAlgorithmPlayer('wr-1', 'WR Candidate', 'WR', 170)

      const input = createMockWaiverInput({
        availablePlayers: [rb, qb, wr],
        currentRoster: [],
      })

      const result = recommendWaivers(input)

      expect(result.recommendations).toHaveLength(3)
      // WR has highest VBD improvement (30), so should be first
      expect(result.recommendations[0].player.position).toBe('WR')
    })
  })

  describe('Injury Status Handling', () => {
    it('recognizes Out status as injury', () => {
      const injured = createMockAlgorithmPlayer('rb-1', 'RB Injured', 'RB', 160)
      injured.injuryStatus = 'Out'

      const candidate = createMockAlgorithmPlayer('rb-2', 'RB Candidate', 'RB', 165)

      const input = createMockWaiverInput({
        availablePlayers: [candidate],
        currentRoster: [injured],
      })

      const result = recommendWaivers(input)

      expect(
        result.recommendations[0].reasons.some((r: string) => /[Ii]njury/.test(r))
      ).toBe(true)
    })

    it('recognizes IR status as injury', () => {
      const injured = createMockAlgorithmPlayer('wr-1', 'WR Injured', 'WR', 160)
      injured.injuryStatus = 'IR'

      const candidate = createMockAlgorithmPlayer('wr-2', 'WR Candidate', 'WR', 165)

      const input = createMockWaiverInput({
        availablePlayers: [candidate],
        currentRoster: [injured],
      })

      const result = recommendWaivers(input)

      expect(
        result.recommendations[0].reasons.some((r: string) => /[Ii]njury/.test(r))
      ).toBe(true)
    })

    it('recognizes Doubtful status as injury', () => {
      const injured = createMockAlgorithmPlayer('te-1', 'TE Injured', 'TE', 120)
      injured.injuryStatus = 'Doubtful'

      const candidate = createMockAlgorithmPlayer('te-2', 'TE Candidate', 'TE', 125)

      const input = createMockWaiverInput({
        availablePlayers: [candidate],
        currentRoster: [injured],
      })

      const result = recommendWaivers(input)

      expect(
        result.recommendations[0].reasons.some((r: string) => /[Ii]njury/.test(r))
      ).toBe(true)
    })

    it('does not apply injury multiplier for Questionable status', () => {
      const questionable = createMockAlgorithmPlayer('wr-1', 'WR Questionable', 'WR', 160)
      questionable.injuryStatus = 'Questionable'

      const candidate = createMockAlgorithmPlayer('wr-2', 'WR Candidate', 'WR', 165)

      const input = createMockWaiverInput({
        availablePlayers: [candidate],
        currentRoster: [questionable],
      })

      const result = recommendWaivers(input)

      expect(
        result.recommendations[0].reasons.some((r: string) =>
          /[Ii]njury replacement/.test(r)
        )
      ).toBe(false)
    })
  })
})

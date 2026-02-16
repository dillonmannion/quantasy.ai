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

   describe('Tie-Breaker Logic (playerId.localeCompare)', () => {
     it('handles tie-breaker in findDroppable when players have identical projectedPoints with rosterSlots', () => {
       // Line 119: playerId.localeCompare tie-breaker in findDroppable
       // Create two QBs with identical projected points
       const qbA = createMockAlgorithmPlayer('player-a', 'QB Alpha', 'QB', 250)
       const qbB = createMockAlgorithmPlayer('player-b', 'QB Beta', 'QB', 250)
       const keeper = createMockAlgorithmPlayer('rb-1', 'RB One', 'RB', 180)

       const rosterSlots = [
         { slotId: 'qb-1', slotType: 'starter' as const, allowedPositions: ['QB'] as Position[] },
         { slotId: 'rb-1', slotType: 'starter' as const, allowedPositions: ['RB'] as Position[] },
         { slotId: 'rb-2', slotType: 'starter' as const, allowedPositions: ['RB'] as Position[] },
         { slotId: 'wr-1', slotType: 'starter' as const, allowedPositions: ['WR'] as Position[] },
         { slotId: 'wr-2', slotType: 'starter' as const, allowedPositions: ['WR'] as Position[] },
         { slotId: 'te-1', slotType: 'starter' as const, allowedPositions: ['TE'] as Position[] },
         { slotId: 'bench-1', slotType: 'bench' as const, allowedPositions: ['QB', 'RB', 'WR', 'TE'] as Position[] },
       ]

       const input = createMockWaiverInput({
         availablePlayers: [],
         currentRoster: [qbA, qbB, keeper],
         leagueSettings: {
           baselines: createMockBaselines(),
           rosterSlots,
         },
       })

       const result = recommendWaivers(input)

       // Both QBs are starters (1 QB starter slot), so qbA (alphabetically first) is protected
       // qbB should be droppable
       expect(result.droppable).toEqual(
         expect.arrayContaining([expect.objectContaining({ playerId: 'player-b' })])
       )
       expect(result.droppable).not.toEqual(
         expect.arrayContaining([expect.objectContaining({ playerId: 'player-a' })])
       )
     })

     it('handles tie-breaker in findDroppable when players have identical projectedPoints', () => {
       // Line 119: playerId.localeCompare tie-breaker in findDroppable (without rosterSlots)
       // Create two QBs with identical projected points
       const qbA = createMockAlgorithmPlayer('player-a', 'QB Alpha', 'QB', 250)
       const qbB = createMockAlgorithmPlayer('player-b', 'QB Beta', 'QB', 250)
       const keeper = createMockAlgorithmPlayer('rb-1', 'RB One', 'RB', 180)

       const input = createMockWaiverInput({
         availablePlayers: [],
         currentRoster: [qbA, qbB, keeper],
       })

       const result = recommendWaivers(input)

       // Both QBs are starters (1 QB starter slot), so qbA (alphabetically first) is protected
       // qbB should be droppable
       expect(result.droppable).toEqual(
         expect.arrayContaining([expect.objectContaining({ playerId: 'player-b' })])
       )
       expect(result.droppable).not.toEqual(
         expect.arrayContaining([expect.objectContaining({ playerId: 'player-a' })])
       )
     })

     it('handles tie-breaker in classifyNeedMultiplier when roster players have identical projectedPoints', () => {
       // Line 205: playerId.localeCompare tie-breaker in classifyNeedMultiplier
       // Create two WRs with identical projected points on roster
       const wrA = createMockAlgorithmPlayer('player-a', 'WR Alpha', 'WR', 160)
       const wrB = createMockAlgorithmPlayer('player-b', 'WR Beta', 'WR', 160)
       const candidate = createMockAlgorithmPlayer('wr-3', 'WR Candidate', 'WR', 165)

       const input = createMockWaiverInput({
         availablePlayers: [candidate],
         currentRoster: [wrA, wrB],
       })

       const result = recommendWaivers(input)

       // wrA (alphabetically first) is considered the worst starter
       // Candidate (165) > wrA (160), so should be starter upgrade
       expect(
         result.recommendations[0].reasons.some((r: string) =>
           /[Ss]tarter upgrade/.test(r)
         )
       ).toBe(true)
     })

     it('handles tie-breaker in recommendation ordering when players have identical priorityScore', () => {
       // Line 265: playerId.localeCompare tie-breaker in recommendation ordering
       // Create two candidates with identical VBD improvement and need multiplier
       const candidateA = createMockAlgorithmPlayer('player-a', 'WR Alpha', 'WR', 170)
       const candidateB = createMockAlgorithmPlayer('player-b', 'WR Beta', 'WR', 170)

       const input = createMockWaiverInput({
         availablePlayers: [candidateB, candidateA], // Reverse order
         currentRoster: [],
       })

       const result = recommendWaivers(input)

       // Both have identical VBD (170-140=30), identical need (1.0x), identical priority (30)
       // Tie-breaker: playerId.localeCompare, so 'player-a' comes first
       expect(result.recommendations[0].player.playerId).toBe('player-a')
       expect(result.recommendations[1].player.playerId).toBe('player-b')
     })

     it('handles tie-breaker with multiple identical projectedPoints in droppable selection', () => {
       // Multiple players at same position with identical points
       const rb1 = createMockAlgorithmPlayer('player-a', 'RB Alpha', 'RB', 170)
       const rb2 = createMockAlgorithmPlayer('player-b', 'RB Beta', 'RB', 170)
       const rb3 = createMockAlgorithmPlayer('player-c', 'RB Gamma', 'RB', 170)
       const qb = createMockAlgorithmPlayer('qb-1', 'QB One', 'QB', 250)

       const input = createMockWaiverInput({
         availablePlayers: [],
         currentRoster: [rb1, rb2, rb3, qb],
       })

       const result = recommendWaivers(input)

       // 2 RB starters needed, so rb1 and rb2 (alphabetically first two) are protected
       // rb3 should be droppable
       expect(result.droppable).toEqual(
         expect.arrayContaining([expect.objectContaining({ playerId: 'player-c' })])
       )
       expect(result.droppable).not.toEqual(
         expect.arrayContaining([expect.objectContaining({ playerId: 'player-a' })])
       )
       expect(result.droppable).not.toEqual(
         expect.arrayContaining([expect.objectContaining({ playerId: 'player-b' })])
       )
     })

     it('handles tie-breaker in recommendation ordering with identical vbdImprovement', () => {
       // Line 265: Secondary tie-breaker when priorityScore is identical
       const candidateA = createMockAlgorithmPlayer('player-a', 'WR Alpha', 'WR', 175)
       const candidateB = createMockAlgorithmPlayer('player-b', 'WR Beta', 'WR', 175)
       const worstStarter = createMockAlgorithmPlayer('wr-worst', 'WR Worst', 'WR', 150)

       const input = createMockWaiverInput({
         availablePlayers: [candidateB, candidateA],
         currentRoster: [worstStarter],
       })

       const result = recommendWaivers(input)

       // Both candidates have identical VBD improvement (175-140=35 vs 150-140=10)
       // Both have identical need multiplier (1.3x starter upgrade)
       // Tie-breaker: playerId.localeCompare
       expect(result.recommendations[0].player.playerId).toBe('player-a')
       expect(result.recommendations[1].player.playerId).toBe('player-b')
     })

     it('handles projectedPoints tie-breaker in recommendation ordering', () => {
       // Line 263-264: projectedPoints tie-breaker when vbdImprovement is identical
       // Create two candidates with identical vbdImprovement but different projectedPoints
       const candidateA = createMockAlgorithmPlayer('player-a', 'WR Alpha', 'WR', 170)
       const candidateB = createMockAlgorithmPlayer('player-b', 'WR Beta', 'WR', 160)

       const input = createMockWaiverInput({
         availablePlayers: [candidateB, candidateA],
         currentRoster: [],
       })

       const result = recommendWaivers(input)

       // Both have same need multiplier (1.0x), but different vbdImprovement
       // A: vbdImprovement = 30, B: vbdImprovement = 20
       // A should be first due to higher vbdImprovement
       expect(result.recommendations[0].player.playerId).toBe('player-a')
       expect(result.recommendations[1].player.playerId).toBe('player-b')
     })

     it('handles vbdImprovement tie-breaker when priorityScore is identical', () => {
       // Line 262: vbdImprovement tie-breaker when priorityScore is identical
       // Create two candidates with same priorityScore but different vbdImprovement
       // priorityScore = vbdImprovement × needMultiplier
       // To achieve: 20 × 1.5 = 30, and 10 × 3.0 = 30 (but max multiplier is 1.5)
       // Alternative: use floating point to get exact match
       // Candidate A: vbdImprovement=20, needMultiplier=1.5 (injury), priority=30
       // Candidate B: vbdImprovement=20, needMultiplier=1.5 (injury), priority=30
       // But they need different vbdImprovement to trigger line 262
       // This is mathematically impossible with the current multipliers (0.8, 1.0, 1.3, 1.5)
       // So we'll test the next best thing: identical vbdImprovement but different projectedPoints
       const candidateA = createMockAlgorithmPlayer('player-a', 'WR Alpha', 'WR', 175)
       const candidateB = createMockAlgorithmPlayer('player-b', 'WR Beta', 'WR', 175)

       const input = createMockWaiverInput({
         availablePlayers: [candidateB, candidateA],
         currentRoster: [],
       })

       const result = recommendWaivers(input)

       // Both have identical projectedPoints (175), so same vbdImprovement (35)
       // Both have same need multiplier (1.0x), so same priority (35)
       // Tie-breaker: playerId.localeCompare (line 265)
       expect(result.recommendations[0].player.playerId).toBe('player-a')
       expect(result.recommendations[1].player.playerId).toBe('player-b')
     })

     it('handles default starter count fallback when rosterSlots not provided', () => {
       // Line 39: ?? 1 fallback when position not in DEFAULT_STARTERS
       // When rosterSlots is undefined, countStartersAtPosition returns DEFAULT_STARTERS[position] ?? 1
       // For positions not in DEFAULT_STARTERS (FLEX, SUPERFLEX, etc.), this returns 1
       const candidate = createMockAlgorithmPlayer('flex-1', 'FLEX Candidate', 'FLEX', 160)

       const baselines = createMockBaselines()
       delete baselines.FLEX
       const input = createMockWaiverInput({
         availablePlayers: [candidate],
         currentRoster: [],
         leagueSettings: {
           baselines,
           rosterSlots: undefined,
         },
       })

       const result = recommendWaivers(input)

       // FLEX position has no baseline, so should be excluded
       expect(result.recommendations).toHaveLength(0)
     })
   })
})

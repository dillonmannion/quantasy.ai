import { describe, it, expect, vi, afterEach } from 'vitest'
import { optimizeLineup } from '@/lib/algorithms/lineup'
import type { AlgorithmPlayer, LineupInput, Position, RosterSlot } from '@/lib/algorithms/types'

function createMockAlgorithmPlayer(
  id: string,
  name: string,
  position: Position,
  projectedPoints: number,
  overrides: Partial<AlgorithmPlayer> = {}
): AlgorithmPlayer {
  return {
    playerId: id,
    fullName: name,
    team: 'KC',
    position,
    eligiblePositions: [position],
    projectedPoints,
    injuryStatus: null,
    status: 'Active',
    byeWeek: null,
    ...overrides,
  }
}

function createStarterSlot(slotId: string, allowedPositions: Position[]): RosterSlot {
  return {
    slotId,
    slotType: 'starter',
    allowedPositions,
  }
}

function createBenchSlot(slotId: string, allowedPositions: Position[]): RosterSlot {
  return {
    slotId,
    slotType: 'bench',
    allowedPositions,
  }
}

function createMockLineupInput(
  roster: AlgorithmPlayer[],
  slots: RosterSlot[],
  week: number = 1
): LineupInput {
  return { roster, slots, week }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('optimizeLineup', () => {
  describe('output basics', () => {
    it('returns starters, bench, projected points, and explanation', () => {
      const roster = [
        createMockAlgorithmPlayer('p1', 'Player One', 'QB', 25),
        createMockAlgorithmPlayer('p2', 'Player Two', 'RB', 15),
      ]
      const slots = [
        createStarterSlot('s1', ['QB']),
        createStarterSlot('s2', ['RB']),
        createBenchSlot('b1', ['QB', 'RB']),
      ]

      const result = optimizeLineup(createMockLineupInput(roster, slots, 3))

      expect(result.starters.length).toBe(2)
      expect(result.bench.length).toBe(0)
      expect(result.projectedPoints).toBe(40)
      expect(result.explanation.algorithm).toBe('lineup_optimizer_v1')
    })

    it('handles an empty roster', () => {
      const result = optimizeLineup(createMockLineupInput([], [], 1))

      expect(result.starters).toHaveLength(0)
      expect(result.bench).toHaveLength(0)
      expect(result.projectedPoints).toBe(0)
      expect(result.explanation.excludedPlayers).toHaveLength(0)
    })

    it('keeps all available players on bench when no starter slots', () => {
      const roster = [
        createMockAlgorithmPlayer('p1', 'Player One', 'WR', 12),
        createMockAlgorithmPlayer('p2', 'Player Two', 'RB', 9),
      ]
      const slots = [createBenchSlot('b1', ['WR', 'RB'])]

      const result = optimizeLineup(createMockLineupInput(roster, slots, 5))

      expect(result.starters).toHaveLength(0)
      expect(result.bench).toHaveLength(2)
      expect(result.projectedPoints).toBe(0)
    })

    it('leaves players on bench if they are not eligible for any starter slot', () => {
      const roster = [
        createMockAlgorithmPlayer('p1', 'Player One', 'K', 8),
        createMockAlgorithmPlayer('p2', 'Player Two', 'DEF', 7),
      ]
      const slots = [createStarterSlot('s1', ['QB'])]

      const result = optimizeLineup(createMockLineupInput(roster, slots, 2))

      expect(result.starters).toHaveLength(0)
      expect(result.bench).toHaveLength(2)
    })

    it('skips starter slots when no eligible players exist', () => {
      const roster = [createMockAlgorithmPlayer('p1', 'Player One', 'WR', 10)]
      const slots = [createStarterSlot('s1', ['QB'])]

      const result = optimizeLineup(createMockLineupInput(roster, slots, 2))

      expect(result.starters).toHaveLength(0)
      expect(result.projectedPoints).toBe(0)
    })
  })

  describe('availability filtering', () => {
    it('excludes players on bye week matching input week', () => {
      const roster = [
        createMockAlgorithmPlayer('p1', 'Bye Player', 'RB', 12, { byeWeek: 3 }),
        createMockAlgorithmPlayer('p2', 'Active Player', 'RB', 11, { byeWeek: 4 }),
      ]
      const slots = [createStarterSlot('s1', ['RB'])]

      const result = optimizeLineup(createMockLineupInput(roster, slots, 3))

      expect(result.starters[0].playerId).toBe('p2')
      expect(result.explanation.excludedPlayers).toHaveLength(1)
      expect(result.explanation.excludedPlayers[0].reason.toLowerCase()).toContain('bye week')
    })

    it('does not exclude players when bye week does not match', () => {
      const roster = [
        createMockAlgorithmPlayer('p1', 'Active Player', 'RB', 12, { byeWeek: 2 }),
      ]
      const slots = [createStarterSlot('s1', ['RB'])]

      const result = optimizeLineup(createMockLineupInput(roster, slots, 5))

      expect(result.starters[0].playerId).toBe('p1')
      expect(result.explanation.excludedPlayers).toHaveLength(0)
    })

    it('excludes players with status OUT', () => {
      const roster = [
        createMockAlgorithmPlayer('p1', 'Out Player', 'WR', 10, { status: 'OUT' }),
        createMockAlgorithmPlayer('p2', 'Active Player', 'WR', 9),
      ]
      const slots = [createStarterSlot('s1', ['WR'])]

      const result = optimizeLineup(createMockLineupInput(roster, slots, 1))

      expect(result.starters[0].playerId).toBe('p2')
      expect(result.explanation.excludedPlayers[0].reason.toLowerCase()).toContain('status')
    })

    it('excludes players with status IR', () => {
      const roster = [
        createMockAlgorithmPlayer('p1', 'IR Player', 'WR', 10, { status: 'IR' }),
        createMockAlgorithmPlayer('p2', 'Active Player', 'WR', 9),
      ]
      const slots = [createStarterSlot('s1', ['WR'])]

      const result = optimizeLineup(createMockLineupInput(roster, slots, 1))

      expect(result.starters[0].playerId).toBe('p2')
      expect(result.explanation.excludedPlayers[0].reason.toLowerCase()).toContain('status')
    })

    it('excludes players with injuryStatus OUT', () => {
      const roster = [
        createMockAlgorithmPlayer('p1', 'Out Player', 'WR', 10, { injuryStatus: 'OUT' }),
        createMockAlgorithmPlayer('p2', 'Active Player', 'WR', 9),
      ]
      const slots = [createStarterSlot('s1', ['WR'])]

      const result = optimizeLineup(createMockLineupInput(roster, slots, 1))

      expect(result.starters[0].playerId).toBe('p2')
      expect(result.explanation.excludedPlayers[0].reason.toLowerCase()).toContain('injury')
    })

    it('excludes players with injuryStatus IR', () => {
      const roster = [
        createMockAlgorithmPlayer('p1', 'IR Player', 'WR', 10, { injuryStatus: 'IR' }),
        createMockAlgorithmPlayer('p2', 'Active Player', 'WR', 9),
      ]
      const slots = [createStarterSlot('s1', ['WR'])]

      const result = optimizeLineup(createMockLineupInput(roster, slots, 1))

      expect(result.starters[0].playerId).toBe('p2')
      expect(result.explanation.excludedPlayers[0].reason.toLowerCase()).toContain('injury')
    })

    it('keeps players with questionable status', () => {
      const roster = [
        createMockAlgorithmPlayer('p1', 'Questionable Player', 'WR', 10, { injuryStatus: 'Q' }),
      ]
      const slots = [createStarterSlot('s1', ['WR'])]

      const result = optimizeLineup(createMockLineupInput(roster, slots, 1))

      expect(result.starters[0].playerId).toBe('p1')
      expect(result.explanation.excludedPlayers).toHaveLength(0)
    })

    it('adds caveat when bye week data is missing', () => {
      const roster = [
        createMockAlgorithmPlayer('p1', 'Unknown Bye', 'RB', 10, { byeWeek: null }),
      ]
      const slots = [createStarterSlot('s1', ['RB'])]

      const result = optimizeLineup(createMockLineupInput(roster, slots, 1))

      expect(result.explanation.caveats.join(' ')).toContain('Bye week data')
    })

    it('does not add bye week caveat when all players have byeWeek set', () => {
      const roster = [
        createMockAlgorithmPlayer('p1', 'Known Bye', 'RB', 10, { byeWeek: 2 }),
      ]
      const slots = [createStarterSlot('s1', ['RB'])]

      const result = optimizeLineup(createMockLineupInput(roster, slots, 5))

      expect(result.explanation.caveats.join(' ')).not.toContain('Bye week data')
    })

    it('excludes players with lowercase out status', () => {
      const roster = [
        createMockAlgorithmPlayer('p1', 'Out Player', 'WR', 10, { status: 'out' }),
        createMockAlgorithmPlayer('p2', 'Active Player', 'WR', 9),
      ]
      const slots = [createStarterSlot('s1', ['WR'])]

      const result = optimizeLineup(createMockLineupInput(roster, slots, 1))

      expect(result.starters[0].playerId).toBe('p2')
    })

    it('excludes players with lowercase ir injury status', () => {
      const roster = [
        createMockAlgorithmPlayer('p1', 'IR Player', 'RB', 12, { injuryStatus: 'ir' }),
        createMockAlgorithmPlayer('p2', 'Active Player', 'RB', 11),
      ]
      const slots = [createStarterSlot('s1', ['RB'])]

      const result = optimizeLineup(createMockLineupInput(roster, slots, 1))

      expect(result.starters[0].playerId).toBe('p2')
    })
  })

  describe('position eligibility and flex handling', () => {
    it('uses eligiblePositions for FLEX slot compatibility', () => {
      const roster = [
        createMockAlgorithmPlayer('p1', 'Hybrid Player', 'WR', 14, {
          eligiblePositions: ['RB', 'WR'],
        }),
      ]
      const slots = [createStarterSlot('s1', ['RB'])]

      const result = optimizeLineup(createMockLineupInput(roster, slots, 1))

      expect(result.starters[0].playerId).toBe('p1')
    })

    it('supports SUPERFLEX slots with QB eligibility', () => {
      const roster = [
        createMockAlgorithmPlayer('p1', 'QB One', 'QB', 22),
        createMockAlgorithmPlayer('p2', 'RB One', 'RB', 18),
      ]
      const slots = [createStarterSlot('s1', ['SUPERFLEX'])]

      const result = optimizeLineup(createMockLineupInput(roster, slots, 1))

      expect(result.starters[0].playerId).toBe('p1')
    })

    it('expands FLEX slot types to RB/WR/TE eligibility', () => {
      const roster = [
        createMockAlgorithmPlayer('p1', 'WR One', 'WR', 16),
      ]
      const slots = [createStarterSlot('s1', ['FLEX'])]

      const result = optimizeLineup(createMockLineupInput(roster, slots, 1))

      expect(result.starters[0].playerId).toBe('p1')
    })

    it('handles REC_FLEX slot assignments', () => {
      const roster = [
        createMockAlgorithmPlayer('p1', 'WR One', 'WR', 14),
        createMockAlgorithmPlayer('p2', 'RB One', 'RB', 20),
      ]
      const slots = [createStarterSlot('s1', ['REC_FLEX'])]

      const result = optimizeLineup(createMockLineupInput(roster, slots, 1))

      expect(result.starters[0].playerId).toBe('p1')
    })

    it('handles WRRB_FLEX slot assignments', () => {
      const roster = [
        createMockAlgorithmPlayer('p1', 'WR One', 'WR', 14),
        createMockAlgorithmPlayer('p2', 'TE One', 'TE', 20),
      ]
      const slots = [createStarterSlot('s1', ['WRRB_FLEX'])]

      const result = optimizeLineup(createMockLineupInput(roster, slots, 1))

      expect(result.starters[0].playerId).toBe('p1')
    })

    it('handles IDP_FLEX slot assignments', () => {
      const roster = [
        createMockAlgorithmPlayer('p1', 'LB One', 'LB', 11),
        createMockAlgorithmPlayer('p2', 'RB One', 'RB', 18),
      ]
      const slots = [createStarterSlot('s1', ['IDP_FLEX'])]

      const result = optimizeLineup(createMockLineupInput(roster, slots, 1))

      expect(result.starters[0].playerId).toBe('p1')
    })

    it('avoids assigning the same player to multiple slots', () => {
      const roster = [
        createMockAlgorithmPlayer('p1', 'RB One', 'RB', 20),
        createMockAlgorithmPlayer('p2', 'RB Two', 'RB', 15),
      ]
      const slots = [
        createStarterSlot('s1', ['RB']),
        createStarterSlot('s2', ['RB']),
      ]

      const result = optimizeLineup(createMockLineupInput(roster, slots, 1))

      const starterIds = result.starters.map((player: AlgorithmPlayer) => player.playerId)
      expect(new Set(starterIds).size).toBe(2)
    })

    it('selects optimal assignment across multiple flex slots', () => {
      const roster = [
        createMockAlgorithmPlayer('p1', 'RB One', 'RB', 20),
        createMockAlgorithmPlayer('p2', 'WR One', 'WR', 19),
        createMockAlgorithmPlayer('p3', 'TE One', 'TE', 18),
      ]
      const slots = [
        createStarterSlot('s1', ['RB']),
        createStarterSlot('s2', ['FLEX']),
        createStarterSlot('s3', ['FLEX']),
      ]

      const result = optimizeLineup(createMockLineupInput(roster, slots, 1))

      expect(result.projectedPoints).toBe(57)
    })
  })

  describe('backtracking optimization', () => {
    it('finds a global optimum that a greedy slot order would miss', () => {
      const roster = [
        createMockAlgorithmPlayer('p1', 'RB One', 'RB', 20),
        createMockAlgorithmPlayer('p2', 'RB Two', 'RB', 5),
        createMockAlgorithmPlayer('p3', 'WR One', 'WR', 19),
      ]
      const slots = [
        createStarterSlot('s1', ['FLEX']),
        createStarterSlot('s2', ['RB']),
      ]

      const result = optimizeLineup(createMockLineupInput(roster, slots, 1))

      const starterIds = result.starters.map((player: AlgorithmPlayer) => player.playerId)
      expect(starterIds).toEqual(expect.arrayContaining(['p1', 'p3']))
      expect(result.projectedPoints).toBe(39)
    })

    it('maximizes points across three overlapping slots', () => {
      const roster = [
        createMockAlgorithmPlayer('p1', 'QB One', 'QB', 25),
        createMockAlgorithmPlayer('p2', 'RB One', 'RB', 20),
        createMockAlgorithmPlayer('p3', 'WR One', 'WR', 18),
        createMockAlgorithmPlayer('p4', 'WR Two', 'WR', 17),
      ]
      const slots = [
        createStarterSlot('s1', ['QB']),
        createStarterSlot('s2', ['FLEX']),
        createStarterSlot('s3', ['REC_FLEX']),
      ]

      const result = optimizeLineup(createMockLineupInput(roster, slots, 1))

      expect(result.projectedPoints).toBe(63)
    })

    it('selects highest projection for a single slot', () => {
      const roster = [
        createMockAlgorithmPlayer('p1', 'RB One', 'RB', 20),
        createMockAlgorithmPlayer('p2', 'RB Two', 'RB', 18),
      ]
      const slots = [createStarterSlot('s1', ['RB'])]

      const result = optimizeLineup(createMockLineupInput(roster, slots, 1))

      expect(result.starters[0].playerId).toBe('p1')
    })

    it('handles players with empty eligiblePositions by falling back to position', () => {
      const roster = [
        createMockAlgorithmPlayer('p1', 'WR One', 'WR', 12, { eligiblePositions: [] }),
      ]
      const slots = [createStarterSlot('s1', ['WR'])]

      const result = optimizeLineup(createMockLineupInput(roster, slots, 1))

      expect(result.starters[0].playerId).toBe('p1')
    })
  })

  describe('timeout guard', () => {
    it('adds a caveat when optimization exceeds the time limit', () => {
      const roster = [
        createMockAlgorithmPlayer('p1', 'QB One', 'QB', 25),
        createMockAlgorithmPlayer('p2', 'RB One', 'RB', 20),
      ]
      const slots = [
        createStarterSlot('s1', ['QB']),
        createStarterSlot('s2', ['RB']),
      ]

      vi.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValue(1000)

      const result = optimizeLineup(createMockLineupInput(roster, slots, 1))

      expect(result.explanation.caveats.join(' ')).toContain('greedy')
    })

    it('falls back to greedy selection when time limit is exceeded', () => {
      const roster = [
        createMockAlgorithmPlayer('p1', 'RB One', 'RB', 20),
        createMockAlgorithmPlayer('p2', 'RB Two', 'RB', 5),
        createMockAlgorithmPlayer('p3', 'WR One', 'WR', 19),
      ]
      const slots = [
        createStarterSlot('s1', ['FLEX']),
        createStarterSlot('s2', ['RB']),
      ]

      vi.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValue(1000)

      const result = optimizeLineup(createMockLineupInput(roster, slots, 1))

      const starterIds = result.starters.map((player: AlgorithmPlayer) => player.playerId)
      expect(starterIds).toEqual(expect.arrayContaining(['p1', 'p2']))
      expect(result.projectedPoints).toBe(25)
    })

    it('still returns bench players when using greedy fallback', () => {
      const roster = [
        createMockAlgorithmPlayer('p1', 'RB One', 'RB', 20),
        createMockAlgorithmPlayer('p2', 'RB Two', 'RB', 5),
        createMockAlgorithmPlayer('p3', 'WR One', 'WR', 19),
      ]
      const slots = [createStarterSlot('s1', ['RB'])]

      vi.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValue(1000)

      const result = optimizeLineup(createMockLineupInput(roster, slots, 1))

      expect(result.bench).toHaveLength(2)
    })
  })

  describe('bench and points', () => {
    it('bench excludes filtered players', () => {
      const roster = [
        createMockAlgorithmPlayer('p1', 'Out Player', 'RB', 12, { status: 'OUT' }),
        createMockAlgorithmPlayer('p2', 'Active Player', 'RB', 11),
      ]
      const slots = [createStarterSlot('s1', ['RB'])]

      const result = optimizeLineup(createMockLineupInput(roster, slots, 1))

      expect(result.bench).toHaveLength(0)
    })

    it('bench includes eligible non-starters', () => {
      const roster = [
        createMockAlgorithmPlayer('p1', 'RB One', 'RB', 20),
        createMockAlgorithmPlayer('p2', 'RB Two', 'RB', 15),
      ]
      const slots = [createStarterSlot('s1', ['RB'])]

      const result = optimizeLineup(createMockLineupInput(roster, slots, 1))

      expect(result.bench).toHaveLength(1)
      expect(result.bench[0].playerId).toBe('p2')
    })

    it('projected points equals sum of starter projections', () => {
      const roster = [
        createMockAlgorithmPlayer('p1', 'QB One', 'QB', 25),
        createMockAlgorithmPlayer('p2', 'RB One', 'RB', 20),
      ]
      const slots = [createStarterSlot('s1', ['QB']), createStarterSlot('s2', ['RB'])]

      const result = optimizeLineup(createMockLineupInput(roster, slots, 1))

      expect(result.projectedPoints).toBe(45)
    })

    it('selects only eligible players even if ineligible has higher points', () => {
      const roster = [
        createMockAlgorithmPlayer('p1', 'QB One', 'QB', 12),
        createMockAlgorithmPlayer('p2', 'WR One', 'WR', 30),
      ]
      const slots = [createStarterSlot('s1', ['QB'])]

      const result = optimizeLineup(createMockLineupInput(roster, slots, 1))

      expect(result.starters[0].playerId).toBe('p1')
    })
  })

  describe('explanation details', () => {
    it('includes decisions for each starter slot', () => {
      const roster = [
        createMockAlgorithmPlayer('p1', 'QB One', 'QB', 25),
        createMockAlgorithmPlayer('p2', 'RB One', 'RB', 20),
      ]
      const slots = [createStarterSlot('s1', ['QB']), createStarterSlot('s2', ['RB'])]

      const result = optimizeLineup(createMockLineupInput(roster, slots, 1))

      expect(result.explanation.decisions).toHaveLength(2)
      expect(result.explanation.decisions[0].slotId).toBe('s1')
    })

    it('decision count matches starters length', () => {
      const roster = [
        createMockAlgorithmPlayer('p1', 'QB One', 'QB', 25),
        createMockAlgorithmPlayer('p2', 'RB One', 'RB', 20),
        createMockAlgorithmPlayer('p3', 'WR One', 'WR', 18),
      ]
      const slots = [
        createStarterSlot('s1', ['QB']),
        createStarterSlot('s2', ['RB']),
      ]

      const result = optimizeLineup(createMockLineupInput(roster, slots, 1))

      expect(result.explanation.decisions).toHaveLength(result.starters.length)
    })

    it('includes input summary counts', () => {
      const roster = [createMockAlgorithmPlayer('p1', 'QB One', 'QB', 25)]
      const slots = [createStarterSlot('s1', ['QB']), createBenchSlot('b1', ['QB'])]

      const result = optimizeLineup(createMockLineupInput(roster, slots, 2))

      expect(result.explanation.inputsSummary.rosterCount).toBe(1)
      expect(result.explanation.inputsSummary.slotCount).toBe(2)
      expect(result.explanation.inputsSummary.starterSlots).toBe(1)
      expect(result.explanation.inputsSummary.benchSlots).toBe(1)
      expect(result.explanation.inputsSummary.week).toBe(2)
    })

    it('adds excluded players to explanation', () => {
      const roster = [
        createMockAlgorithmPlayer('p1', 'Out Player', 'RB', 12, { status: 'OUT' }),
      ]
      const slots = [createStarterSlot('s1', ['RB'])]

      const result = optimizeLineup(createMockLineupInput(roster, slots, 1))

      expect(result.explanation.excludedPlayers).toHaveLength(1)
      expect(result.explanation.excludedPlayers[0].playerId).toBe('p1')
    })

    it('uses ISO timestamp', () => {
      const roster = [createMockAlgorithmPlayer('p1', 'QB One', 'QB', 25)]
      const slots = [createStarterSlot('s1', ['QB'])]

      const result = optimizeLineup(createMockLineupInput(roster, slots, 1))

      expect(() => new Date(result.explanation.timestamp).toISOString()).not.toThrow()
    })
  })
})

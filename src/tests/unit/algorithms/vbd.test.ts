import { describe, it, expect } from 'vitest'
import { calculateVBD } from '@/lib/algorithms/vbd'
import type { VBDInput, Position } from '@/lib/algorithms/types'
import type { SleeperPlayer } from '@/lib/sleeper/types'

function createMockPlayer(
  id: string,
  name: string,
  position: Position,
  team: string | null = 'KC',
  fantasyPositions?: Position[],
  status: string | null = 'Active',
  injuryStatus: string | null = null
): SleeperPlayer {
  const [firstName, lastName] = name.split(' ')
  return {
    player_id: id,
    first_name: firstName,
    last_name: lastName || '',
    full_name: name,
    position,
    fantasy_positions: fantasyPositions || [position],
    team,
    injury_status: injuryStatus,
    status,
    years_exp: 1,
    age: 25,
    number: 0,
    college: 'Test University',
    height: '6-0',
    weight: '200',
  } as SleeperPlayer
}

/**
 * Create mock VBD input with standard 12-team PPR settings
 */
function createMockVBDInput(
  players: SleeperPlayer[],
  projections: Record<string, number>,
  rosterPositions: Position[] = ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DEF'],
  teams: number = 12
): VBDInput {
  return {
    players,
    projections,
    leagueSettings: {
      teams,
      rosterPositions,
      scoringSettings: {
        pass_td: 4,
        pass_int: -2,
        rush_yd: 0.1,
        rush_td: 6,
        rec_yd: 0.1,
        rec_td: 6,
        rec: 1,
      },
    },
    scoringFormat: 'ppr',
    projectionSource: 'test',
  }
}

describe('calculateVBD', () => {
  describe('Standard 12-team PPR league', () => {
    it('should calculate VBD rankings for standard league with all positions', () => {
      const qbs = Array.from({ length: 20 }, (_, i) =>
        createMockPlayer(`qb-${i}`, `QB${i}`, 'QB')
      )
      const rbs = Array.from({ length: 30 }, (_, i) =>
        createMockPlayer(`rb-${i}`, `RB${i}`, 'RB')
      )
      const wrs = Array.from({ length: 40 }, (_, i) =>
        createMockPlayer(`wr-${i}`, `WR${i}`, 'WR')
      )
      const tes = Array.from({ length: 20 }, (_, i) =>
        createMockPlayer(`te-${i}`, `TE${i}`, 'TE')
      )
      const ks = Array.from({ length: 15 }, (_, i) =>
        createMockPlayer(`k-${i}`, `K${i}`, 'K')
      )
      const defs = Array.from({ length: 32 }, (_, i) =>
        createMockPlayer(`def-${i}`, `DEF${i}`, 'DEF')
      )

      const players = [...qbs, ...rbs, ...wrs, ...tes, ...ks, ...defs]
      const projections: Record<string, number> = {}

      // QB: 300 down to 280
      qbs.forEach((p, i) => {
        projections[p.player_id] = 300 - i * 1
      })
      // RB: 250 down to 220
      rbs.forEach((p, i) => {
        projections[p.player_id] = 250 - i * 1
      })
      // WR: 240 down to 200
      wrs.forEach((p, i) => {
        projections[p.player_id] = 240 - i * 1
      })
      // TE: 180 down to 160
      tes.forEach((p, i) => {
        projections[p.player_id] = 180 - i * 1
      })
      // K: 150 down to 135
      ks.forEach((p, i) => {
        projections[p.player_id] = 150 - i * 1
      })
      // DEF: 100 down to 68
      defs.forEach((p, i) => {
        projections[p.player_id] = 100 - i * 1
      })

      const input = createMockVBDInput(players, projections)
      const result = calculateVBD(input)

      // Verify output structure
      expect(result.rankings).toBeDefined()
      expect(result.baselines).toBeDefined()
      expect(result.metadata).toBeDefined()

      // Verify metadata
      expect(result.metadata.playerCount).toBe(players.length)
      expect(result.metadata.leagueSize).toBe(12)
      expect(result.metadata.scoringFormat).toBe('ppr')
      expect(result.metadata.projectionSource).toBe('test')

      // Verify baselines exist for all positions
      expect(result.baselines['QB']).toBeDefined()
      expect(result.baselines['RB']).toBeDefined()
      expect(result.baselines['WR']).toBeDefined()
      expect(result.baselines['TE']).toBeDefined()
      expect(result.baselines['K']).toBeDefined()
      expect(result.baselines['DEF']).toBeDefined()
      expect(result.baselines['FLEX']).toBeDefined()

      // Verify rankings are sorted by VBD score (descending)
      for (let i = 0; i < result.rankings.length - 1; i++) {
        const current = result.rankings[i]
        const next = result.rankings[i + 1]
        expect(current.vbdScore).toBeGreaterThanOrEqual(next.vbdScore)
      }

      // Verify overall ranks are sequential
      result.rankings.forEach((player, index) => {
        expect(player.overallRank).toBe(index + 1)
      })

      // Verify position ranks are sequential within position
      const positionRanks: Record<string, number> = {}
      result.rankings.forEach(player => {
        const expectedRank = (positionRanks[player.position] || 0) + 1
        expect(player.positionRank).toBe(expectedRank)
        positionRanks[player.position] = expectedRank
      })
    })

    it('should calculate correct VBD scores relative to baselines', () => {
      const qbs = Array.from({ length: 15 }, (_, i) =>
        createMockPlayer(`qb-${i}`, `QB${i}`, 'QB')
      )
      const rbs = Array.from({ length: 25 }, (_, i) =>
        createMockPlayer(`rb-${i}`, `RB${i}`, 'RB')
      )
      const wrs = Array.from({ length: 25 }, (_, i) =>
        createMockPlayer(`wr-${i}`, `WR${i}`, 'WR')
      )
      const tes = Array.from({ length: 15 }, (_, i) =>
        createMockPlayer(`te-${i}`, `TE${i}`, 'TE')
      )

      const players = [...qbs, ...rbs, ...wrs, ...tes]
      const projections: Record<string, number> = {}

      qbs.forEach((p, i) => {
        projections[p.player_id] = 300 - i * 5
      })
      rbs.forEach((p, i) => {
        projections[p.player_id] = 250 - i * 5
      })
      wrs.forEach((p, i) => {
        projections[p.player_id] = 240 - i * 5
      })
      tes.forEach((p, i) => {
        projections[p.player_id] = 180 - i * 5
      })

      const input = createMockVBDInput(players, projections)
      const result = calculateVBD(input)

      // QB baseline should be QB12 (index 11)
      const qb12 = result.baselines['QB']
      expect(qb12).toBeDefined()
      expect(qb12.baselineRank).toBe(12)

      // Find QB1 in rankings
      const qb1 = result.rankings.find(p => p.playerId === 'qb-0')
      expect(qb1).toBeDefined()
      if (qb1) {
        const expectedVBD = projections['qb-0'] - qb12.projectedPoints
        expect(qb1.vbdScore).toBe(expectedVBD)
      }
    })

    it('should handle FLEX position correctly', () => {
      const rbs = Array.from({ length: 25 }, (_, i) =>
        createMockPlayer(`rb-${i}`, `RB${i}`, 'RB')
      )
      const wrs = Array.from({ length: 25 }, (_, i) =>
        createMockPlayer(`wr-${i}`, `WR${i}`, 'WR')
      )
      const tes = Array.from({ length: 15 }, (_, i) =>
        createMockPlayer(`te-${i}`, `TE${i}`, 'TE')
      )

      const players = [...rbs, ...wrs, ...tes]
      const projections: Record<string, number> = {}

      rbs.forEach((p, i) => {
        projections[p.player_id] = 250 - i * 5
      })
      wrs.forEach((p, i) => {
        projections[p.player_id] = 240 - i * 5
      })
      tes.forEach((p, i) => {
        projections[p.player_id] = 180 - i * 5
      })

      const input = createMockVBDInput(players, projections)
      const result = calculateVBD(input)

      // FLEX baseline should exist
      expect(result.baselines['FLEX']).toBeDefined()

      // FLEX baseline should be minimum of RB, WR, TE baselines
      const rbBaseline = result.baselines['RB'].projectedPoints
      const wrBaseline = result.baselines['WR'].projectedPoints
      const teBaseline = result.baselines['TE'].projectedPoints
      const flexBaseline = result.baselines['FLEX'].projectedPoints

      expect(flexBaseline).toBe(Math.min(rbBaseline, wrBaseline, teBaseline))
    })
  })

  describe('SUPERFLEX league', () => {
    it('should increase QB values in SUPERFLEX league', () => {
      const qbs = Array.from({ length: 20 }, (_, i) =>
        createMockPlayer(`qb-${i}`, `QB${i}`, 'QB')
      )
      const rbs = Array.from({ length: 25 }, (_, i) =>
        createMockPlayer(`rb-${i}`, `RB${i}`, 'RB')
      )
      const wrs = Array.from({ length: 25 }, (_, i) =>
        createMockPlayer(`wr-${i}`, `WR${i}`, 'WR')
      )
      const tes = Array.from({ length: 15 }, (_, i) =>
        createMockPlayer(`te-${i}`, `TE${i}`, 'TE')
      )

      const players = [...qbs, ...rbs, ...wrs, ...tes]
      const projections: Record<string, number> = {}

      qbs.forEach((p, i) => {
        projections[p.player_id] = 300 - i * 5
      })
      rbs.forEach((p, i) => {
        projections[p.player_id] = 250 - i * 5
      })
      wrs.forEach((p, i) => {
        projections[p.player_id] = 240 - i * 5
      })
      tes.forEach((p, i) => {
        projections[p.player_id] = 180 - i * 5
      })

      // SUPERFLEX roster: QB, RB, RB, WR, WR, TE, SUPERFLEX, K, DEF
      const rosterPositions: Position[] = ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'SUPERFLEX', 'K', 'DEF']
      const input = createMockVBDInput(players, projections, rosterPositions)
      const result = calculateVBD(input)

      // SUPERFLEX baseline should exist
      expect(result.baselines['SUPERFLEX']).toBeDefined()

      // SUPERFLEX baseline should be minimum of QB, RB, WR, TE
      const qbBaseline = result.baselines['QB'].projectedPoints
      const rbBaseline = result.baselines['RB'].projectedPoints
      const wrBaseline = result.baselines['WR'].projectedPoints
      const teBaseline = result.baselines['TE'].projectedPoints
      const superflexBaseline = result.baselines['SUPERFLEX'].projectedPoints

      expect(superflexBaseline).toBe(Math.min(qbBaseline, rbBaseline, wrBaseline, teBaseline))

      // QBs should have higher VBD in SUPERFLEX (compared to standard league)
      // because they can be used in SUPERFLEX slot
      const qb1 = result.rankings.find(p => p.playerId === 'qb-0')
      expect(qb1).toBeDefined()
      if (qb1) {
        // QB1 VBD should be max of (QB baseline, SUPERFLEX baseline)
        const expectedVBD = Math.max(
          projections['qb-0'] - qbBaseline,
          projections['qb-0'] - superflexBaseline
        )
        expect(qb1.vbdScore).toBe(expectedVBD)
      }
    })
  })

  describe('IDP league', () => {
    it('should apply IDP scarcity multiplier to defensive positions', () => {
      const qbs = Array.from({ length: 15 }, (_, i) =>
        createMockPlayer(`qb-${i}`, `QB${i}`, 'QB')
      )
      const rbs = Array.from({ length: 25 }, (_, i) =>
        createMockPlayer(`rb-${i}`, `RB${i}`, 'RB')
      )
      const wrs = Array.from({ length: 25 }, (_, i) =>
        createMockPlayer(`wr-${i}`, `WR${i}`, 'WR')
      )
      const tes = Array.from({ length: 15 }, (_, i) =>
        createMockPlayer(`te-${i}`, `TE${i}`, 'TE')
      )
      const dls = Array.from({ length: 50 }, (_, i) =>
        createMockPlayer(`dl-${i}`, `DL${i}`, 'DL')
      )
      const lbs = Array.from({ length: 50 }, (_, i) =>
        createMockPlayer(`lb-${i}`, `LB${i}`, 'LB')
      )
      const dbs = Array.from({ length: 50 }, (_, i) =>
        createMockPlayer(`db-${i}`, `DB${i}`, 'DB')
      )

      const players = [...qbs, ...rbs, ...wrs, ...tes, ...dls, ...lbs, ...dbs]
      const projections: Record<string, number> = {}

      qbs.forEach((p, i) => {
        projections[p.player_id] = 300 - i * 5
      })
      rbs.forEach((p, i) => {
        projections[p.player_id] = 250 - i * 5
      })
      wrs.forEach((p, i) => {
        projections[p.player_id] = 240 - i * 5
      })
      tes.forEach((p, i) => {
        projections[p.player_id] = 180 - i * 5
      })
      dls.forEach((p, i) => {
        projections[p.player_id] = 50 - i * 0.5
      })
      lbs.forEach((p, i) => {
        projections[p.player_id] = 45 - i * 0.5
      })
      dbs.forEach((p, i) => {
        projections[p.player_id] = 40 - i * 0.5
      })

      // IDP roster: QB, RB, RB, WR, WR, TE, DL, LB, DB
      const rosterPositions: Position[] = ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'DL', 'LB', 'DB']
      const input = createMockVBDInput(players, projections, rosterPositions)
      const result = calculateVBD(input)

      // IDP baselines should exist
      expect(result.baselines['DL']).toBeDefined()
      expect(result.baselines['LB']).toBeDefined()
      expect(result.baselines['DB']).toBeDefined()

      // IDP players should have VBD scores (multiplied by scarcity factor)
      const dl1 = result.rankings.find(p => p.playerId === 'dl-0')
      expect(dl1).toBeDefined()
      expect(dl1?.vbdScore).toBeGreaterThan(0)
    })
  })

  describe('Dynasty startup', () => {
    it('should rank all players regardless of experience level', () => {
      const qbs = Array.from({ length: 20 }, (_, i) =>
        createMockPlayer(`qb-${i}`, `QB${i}`, 'QB')
      )
      const rbs = Array.from({ length: 30 }, (_, i) =>
        createMockPlayer(`rb-${i}`, `RB${i}`, 'RB')
      )
      const wrs = Array.from({ length: 40 }, (_, i) =>
        createMockPlayer(`wr-${i}`, `WR${i}`, 'WR')
      )
      const tes = Array.from({ length: 20 }, (_, i) =>
        createMockPlayer(`te-${i}`, `TE${i}`, 'TE')
      )

      const players = [...qbs, ...rbs, ...wrs, ...tes]
      const projections: Record<string, number> = {}

      qbs.forEach((p, i) => {
        projections[p.player_id] = 300 - i * 5
      })
      rbs.forEach((p, i) => {
        projections[p.player_id] = 250 - i * 5
      })
      wrs.forEach((p, i) => {
        projections[p.player_id] = 240 - i * 5
      })
      tes.forEach((p, i) => {
        projections[p.player_id] = 180 - i * 5
      })

      const input = createMockVBDInput(players, projections)
      const result = calculateVBD(input)

      // All players with projections should be ranked
      expect(result.rankings.length).toBe(players.length)
    })
  })

  describe('Rookie draft', () => {
    it('should only rank players with projections', () => {
      const rookieQBs = Array.from({ length: 10 }, (_, i) =>
        createMockPlayer(`rookie-qb-${i}`, `RookieQB${i}`, 'QB')
      )
      const rookieRBs = Array.from({ length: 15 }, (_, i) =>
        createMockPlayer(`rookie-rb-${i}`, `RookieRB${i}`, 'RB')
      )
      const rookieWRs = Array.from({ length: 20 }, (_, i) =>
        createMockPlayer(`rookie-wr-${i}`, `RookieWR${i}`, 'WR')
      )
      const rookieTEs = Array.from({ length: 10 }, (_, i) =>
        createMockPlayer(`rookie-te-${i}`, `RookieTE${i}`, 'TE')
      )

      const players = [...rookieQBs, ...rookieRBs, ...rookieWRs, ...rookieTEs]
      const projections: Record<string, number> = {}

      // Only project top rookies
      rookieQBs.slice(0, 5).forEach((p, i) => {
        projections[p.player_id] = 250 - i * 10
      })
      rookieRBs.slice(0, 10).forEach((p, i) => {
        projections[p.player_id] = 200 - i * 10
      })
      rookieWRs.slice(0, 15).forEach((p, i) => {
        projections[p.player_id] = 190 - i * 10
      })
      rookieTEs.slice(0, 5).forEach((p, i) => {
        projections[p.player_id] = 140 - i * 10
      })

      const input = createMockVBDInput(players, projections)
      const result = calculateVBD(input)

      // Only projected players should be ranked
      expect(result.rankings.length).toBe(35) // 5 + 10 + 15 + 5
    })
  })

  describe('Edge cases', () => {
    it('should handle empty players array', () => {
      const input = createMockVBDInput([], {})
      const result = calculateVBD(input)

      expect(result.rankings).toEqual([])
      expect(result.metadata.playerCount).toBe(0)
    })

    it('should exclude players with missing projections', () => {
      const qbs = Array.from({ length: 15 }, (_, i) =>
        createMockPlayer(`qb-${i}`, `QB${i}`, 'QB')
      )
      const rbs = Array.from({ length: 25 }, (_, i) =>
        createMockPlayer(`rb-${i}`, `RB${i}`, 'RB')
      )

      const players = [...qbs, ...rbs]
      const projections: Record<string, number> = {}

      // Only project QBs
      qbs.forEach((p, i) => {
        projections[p.player_id] = 300 - i * 5
      })

      const input = createMockVBDInput(players, projections)
      const result = calculateVBD(input)

      // Only QBs should be ranked
      expect(result.rankings.every(p => p.position === 'QB')).toBe(true)
      expect(result.rankings.length).toBe(qbs.length)
    })

    it('should exclude players with zero or negative projections', () => {
      const qbs = Array.from({ length: 15 }, (_, i) =>
        createMockPlayer(`qb-${i}`, `QB${i}`, 'QB')
      )
      const rbs = Array.from({ length: 25 }, (_, i) =>
        createMockPlayer(`rb-${i}`, `RB${i}`, 'RB')
      )

      const players = [...qbs, ...rbs]
      const projections: Record<string, number> = {}

      qbs.forEach((p, i) => {
        projections[p.player_id] = 300 - i * 5
      })
      rbs.forEach((p, i) => {
        projections[p.player_id] = i < 10 ? 250 - i * 5 : 0 // Last 15 RBs have 0 projection
      })

      const input = createMockVBDInput(players, projections)
      const result = calculateVBD(input)

      // Only QBs and first 10 RBs should be ranked
      expect(result.rankings.length).toBe(qbs.length + 10)
    })

    it('should handle position with no players', () => {
      const qbs = Array.from({ length: 15 }, (_, i) =>
        createMockPlayer(`qb-${i}`, `QB${i}`, 'QB')
      )
      const rbs = Array.from({ length: 25 }, (_, i) =>
        createMockPlayer(`rb-${i}`, `RB${i}`, 'RB')
      )

      const players = [...qbs, ...rbs]
      const projections: Record<string, number> = {}

      qbs.forEach((p, i) => {
        projections[p.player_id] = 300 - i * 5
      })
      rbs.forEach((p, i) => {
        projections[p.player_id] = 250 - i * 5
      })

      // Roster includes WR but no WR players
      const rosterPositions: Position[] = ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DEF']
      const input = createMockVBDInput(players, projections, rosterPositions)
      const result = calculateVBD(input)

      // WR baseline should not exist
      expect(result.baselines['WR']).toBeUndefined()
      // FLEX baseline should not exist (no WR or TE)
      expect(result.baselines['FLEX']).toBeUndefined()
    })

    it('should handle players with multiple eligible positions', () => {
      const qbs = Array.from({ length: 15 }, (_, i) =>
        createMockPlayer(`qb-${i}`, `QB${i}`, 'QB')
      )
      const rbs = Array.from({ length: 25 }, (_, i) =>
        createMockPlayer(`rb-${i}`, `RB${i}`, 'RB')
      )
      const wrs = Array.from({ length: 25 }, (_, i) =>
        createMockPlayer(`wr-${i}`, `WR${i}`, 'WR')
      )
      const flexPlayers = Array.from({ length: 5 }, (_, i) =>
        createMockPlayer(`flex-${i}`, `FLEX${i}`, 'RB', 'KC', ['RB', 'WR'])
      )

      const players = [...qbs, ...rbs, ...wrs, ...flexPlayers]
      const projections: Record<string, number> = {}

      qbs.forEach((p, i) => {
        projections[p.player_id] = 300 - i * 5
      })
      rbs.forEach((p, i) => {
        projections[p.player_id] = 250 - i * 5
      })
      wrs.forEach((p, i) => {
        projections[p.player_id] = 240 - i * 5
      })
      flexPlayers.forEach((p, i) => {
        projections[p.player_id] = 200 - i * 5
      })

      const input = createMockVBDInput(players, projections)
      const result = calculateVBD(input)

      // FLEX players should be ranked
      const flexRanked = result.rankings.filter(p => p.playerId.startsWith('flex-'))
      expect(flexRanked.length).toBe(5)

      // FLEX players should have eligiblePositions set
      flexRanked.forEach(p => {
        expect(p.eligiblePositions).toContain('RB')
        expect(p.eligiblePositions).toContain('WR')
      })
    })

    it('should handle players with injury status', () => {
      const qbs = Array.from({ length: 15 }, (_, i) =>
        createMockPlayer(
          `qb-${i}`,
          `QB${i}`,
          'QB',
          'KC',
          undefined,
          'Active',
          i === 0 ? 'Out' : null
        )
      )
      const rbs = Array.from({ length: 25 }, (_, i) =>
        createMockPlayer(`rb-${i}`, `RB${i}`, 'RB')
      )

      const players = [...qbs, ...rbs]
      const projections: Record<string, number> = {}

      qbs.forEach((p, i) => {
        projections[p.player_id] = 300 - i * 5
      })
      rbs.forEach((p, i) => {
        projections[p.player_id] = 250 - i * 5
      })

      const input = createMockVBDInput(players, projections)
      const result = calculateVBD(input)

      // Injured player should still be ranked if they have projections
      const injuredQB = result.rankings.find(p => p.playerId === 'qb-0')
      expect(injuredQB).toBeDefined()
      expect(injuredQB?.injuryStatus).toBe('Out')
    })

    it('should sort by VBD score then by projected points as tiebreaker', () => {
      const qbs = [
        createMockPlayer('qb-1', 'QB1', 'QB'),
        createMockPlayer('qb-2', 'QB2', 'QB'),
        createMockPlayer('qb-3', 'QB3', 'QB'),
      ]
      const rbs = [
        createMockPlayer('rb-1', 'RB1', 'RB'),
        createMockPlayer('rb-2', 'RB2', 'RB'),
        createMockPlayer('rb-3', 'RB3', 'RB'),
      ]

      const players = [...qbs, ...rbs]
      const projections: Record<string, number> = {
        'qb-1': 300,
        'qb-2': 290,
        'qb-3': 280,
        'rb-1': 250,
        'rb-2': 240,
        'rb-3': 230,
      }

      const input = createMockVBDInput(players, projections)
      const result = calculateVBD(input)

      // Verify sorting: higher VBD first, then higher projected points
      for (let i = 0; i < result.rankings.length - 1; i++) {
        const current = result.rankings[i]
        const next = result.rankings[i + 1]

        if (current.vbdScore === next.vbdScore) {
          expect(current.projectedPoints).toBeGreaterThanOrEqual(next.projectedPoints)
        } else {
          expect(current.vbdScore).toBeGreaterThan(next.vbdScore)
        }
      }
    })

    it('should calculate position ranks correctly', () => {
      const qbs = Array.from({ length: 15 }, (_, i) =>
        createMockPlayer(`qb-${i}`, `QB${i}`, 'QB')
      )
      const rbs = Array.from({ length: 25 }, (_, i) =>
        createMockPlayer(`rb-${i}`, `RB${i}`, 'RB')
      )

      const players = [...qbs, ...rbs]
      const projections: Record<string, number> = {}

      qbs.forEach((p, i) => {
        projections[p.player_id] = 300 - i * 5
      })
      rbs.forEach((p, i) => {
        projections[p.player_id] = 250 - i * 5
      })

      const input = createMockVBDInput(players, projections)
      const result = calculateVBD(input)

      // Verify position ranks are sequential within each position
      const positionRanks: Record<string, number> = {}
      result.rankings.forEach(player => {
        const expectedRank = (positionRanks[player.position] || 0) + 1
        expect(player.positionRank).toBe(expectedRank)
        positionRanks[player.position] = expectedRank
      })

      // Verify QB ranks go from 1 to 15
      const qbRanks = result.rankings
        .filter(p => p.position === 'QB')
        .map(p => p.positionRank)
        .sort((a, b) => a - b)
      expect(qbRanks).toEqual(Array.from({ length: 15 }, (_, i) => i + 1))
    })

    it('should include metadata with correct timestamp format', () => {
      const qbs = Array.from({ length: 15 }, (_, i) =>
        createMockPlayer(`qb-${i}`, `QB${i}`, 'QB')
      )
      const rbs = Array.from({ length: 25 }, (_, i) =>
        createMockPlayer(`rb-${i}`, `RB${i}`, 'RB')
      )

      const players = [...qbs, ...rbs]
      const projections: Record<string, number> = {}

      qbs.forEach((p, i) => {
        projections[p.player_id] = 300 - i * 5
      })
      rbs.forEach((p, i) => {
        projections[p.player_id] = 250 - i * 5
      })

      const input = createMockVBDInput(players, projections)
      const result = calculateVBD(input)

      // Verify metadata
      expect(result.metadata.calculatedAt).toBeDefined()
      expect(new Date(result.metadata.calculatedAt)).toBeInstanceOf(Date)
      expect(result.metadata.playerCount).toBe(40)
      expect(result.metadata.leagueSize).toBe(12)
      expect(result.metadata.scoringFormat).toBe('ppr')
      expect(result.metadata.projectionSource).toBe('test')
    })
  })

  describe('Complex scenarios', () => {
    it('should handle large league with many positions', () => {
      const qbs = Array.from({ length: 30 }, (_, i) =>
        createMockPlayer(`qb-${i}`, `QB${i}`, 'QB')
      )
      const rbs = Array.from({ length: 50 }, (_, i) =>
        createMockPlayer(`rb-${i}`, `RB${i}`, 'RB')
      )
      const wrs = Array.from({ length: 60 }, (_, i) =>
        createMockPlayer(`wr-${i}`, `WR${i}`, 'WR')
      )
      const tes = Array.from({ length: 30 }, (_, i) =>
        createMockPlayer(`te-${i}`, `TE${i}`, 'TE')
      )

      const players = [...qbs, ...rbs, ...wrs, ...tes]
      const projections: Record<string, number> = {}

      qbs.forEach((p, i) => {
        projections[p.player_id] = 300 - i * 2
      })
      rbs.forEach((p, i) => {
        projections[p.player_id] = 250 - i * 2
      })
      wrs.forEach((p, i) => {
        projections[p.player_id] = 240 - i * 2
      })
      tes.forEach((p, i) => {
        projections[p.player_id] = 180 - i * 2
      })

      // 32-team league
      const rosterPositions: Position[] = ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DEF']
      const input = createMockVBDInput(players, projections, rosterPositions, 32)
      const result = calculateVBD(input)

      expect(result.rankings.length).toBe(players.length)
      expect(result.metadata.leagueSize).toBe(32)

      // Verify baselines exist for all positions
      expect(result.baselines['QB']).toBeDefined()
      expect(result.baselines['RB']).toBeDefined()
      expect(result.baselines['WR']).toBeDefined()
      expect(result.baselines['TE']).toBeDefined()
    })

    it('should handle mixed scoring formats', () => {
      const qbs = Array.from({ length: 15 }, (_, i) =>
        createMockPlayer(`qb-${i}`, `QB${i}`, 'QB')
      )
      const rbs = Array.from({ length: 25 }, (_, i) =>
        createMockPlayer(`rb-${i}`, `RB${i}`, 'RB')
      )

      const players = [...qbs, ...rbs]
      const projections: Record<string, number> = {}

      qbs.forEach((p, i) => {
        projections[p.player_id] = 300 - i * 5
      })
      rbs.forEach((p, i) => {
        projections[p.player_id] = 250 - i * 5
      })

      const input = createMockVBDInput(players, projections)
      input.scoringFormat = 'half_ppr'

      const result = calculateVBD(input)

      expect(result.metadata.scoringFormat).toBe('half_ppr')
      expect(result.rankings.length).toBe(players.length)
    })

    it('should handle players without fantasy_positions array', () => {
      const qbs = Array.from({ length: 15 }, (_, i) => {
        const player = createMockPlayer(`qb-${i}`, `QB${i}`, 'QB')
        player.fantasy_positions = null
        return player
      })
      const rbs = Array.from({ length: 25 }, (_, i) =>
        createMockPlayer(`rb-${i}`, `RB${i}`, 'RB')
      )

      const players = [...qbs, ...rbs]
      const projections: Record<string, number> = {}

      qbs.forEach((p, i) => {
        projections[p.player_id] = 300 - i * 5
      })
      rbs.forEach((p, i) => {
        projections[p.player_id] = 250 - i * 5
      })

      const input = createMockVBDInput(players, projections)
      const result = calculateVBD(input)

      const qb1 = result.rankings.find(p => p.playerId === 'qb-0')
      expect(qb1).toBeDefined()
      if (qb1) {
        expect(qb1.eligiblePositions).toEqual(['QB'])
      }
    })

    it('should handle players with non-string status', () => {
      const qbs = Array.from({ length: 15 }, (_, i) => {
        const player = createMockPlayer(`qb-${i}`, `QB${i}`, 'QB')
        player.status = null as any
        return player
      })
      const rbs = Array.from({ length: 25 }, (_, i) =>
        createMockPlayer(`rb-${i}`, `RB${i}`, 'RB')
      )

      const players = [...qbs, ...rbs]
      const projections: Record<string, number> = {}

      qbs.forEach((p, i) => {
        projections[p.player_id] = 300 - i * 5
      })
      rbs.forEach((p, i) => {
        projections[p.player_id] = 250 - i * 5
      })

      const input = createMockVBDInput(players, projections)
      const result = calculateVBD(input)

      const qb1 = result.rankings.find(p => p.playerId === 'qb-0')
      expect(qb1).toBeDefined()
      if (qb1) {
        expect(qb1.status).toBeNull()
      }
    })

    it('should handle FLEX position when only some positions have baselines', () => {
      const rbs = Array.from({ length: 25 }, (_, i) =>
        createMockPlayer(`rb-${i}`, `RB${i}`, 'RB')
      )
      const wrs = Array.from({ length: 25 }, (_, i) =>
        createMockPlayer(`wr-${i}`, `WR${i}`, 'WR')
      )
      const tes = Array.from({ length: 15 }, (_, i) =>
        createMockPlayer(`te-${i}`, `TE${i}`, 'TE')
      )

      const players = [...rbs, ...wrs, ...tes]
      const projections: Record<string, number> = {}

      rbs.forEach((p, i) => {
        projections[p.player_id] = 250 - i * 5
      })
      wrs.forEach((p, i) => {
        projections[p.player_id] = 240 - i * 5
      })
      tes.forEach((p, i) => {
        projections[p.player_id] = 180 - i * 5
      })

      const input = createMockVBDInput(players, projections)
      const result = calculateVBD(input)

      expect(result.baselines['FLEX']).toBeDefined()
      expect(result.baselines['K']).toBeUndefined()
    })

    it('should handle RB/WR/TE with FLEX baseline correctly', () => {
      const rbs = Array.from({ length: 25 }, (_, i) =>
        createMockPlayer(`rb-${i}`, `RB${i}`, 'RB')
      )
      const wrs = Array.from({ length: 25 }, (_, i) =>
        createMockPlayer(`wr-${i}`, `WR${i}`, 'WR')
      )
      const tes = Array.from({ length: 15 }, (_, i) =>
        createMockPlayer(`te-${i}`, `TE${i}`, 'TE')
      )

      const players = [...rbs, ...wrs, ...tes]
      const projections: Record<string, number> = {}

      rbs.forEach((p, i) => {
        projections[p.player_id] = 250 - i * 5
      })
      wrs.forEach((p, i) => {
        projections[p.player_id] = 240 - i * 5
      })
      tes.forEach((p, i) => {
        projections[p.player_id] = 180 - i * 5
      })

      const input = createMockVBDInput(players, projections)
      const result = calculateVBD(input)

      const rb1 = result.rankings.find(p => p.playerId === 'rb-0')
      expect(rb1).toBeDefined()
      if (rb1) {
        const rbBaseline = result.baselines['RB'].projectedPoints
        const flexBaseline = result.baselines['FLEX'].projectedPoints
        const expectedVBD = Math.max(
          projections['rb-0'] - rbBaseline,
          projections['rb-0'] - flexBaseline
        )
        expect(rb1.vbdScore).toBe(expectedVBD)
      }
    })

    it('should handle QB/RB/WR/TE with SUPERFLEX baseline correctly', () => {
      const qbs = Array.from({ length: 20 }, (_, i) =>
        createMockPlayer(`qb-${i}`, `QB${i}`, 'QB')
      )
      const rbs = Array.from({ length: 25 }, (_, i) =>
        createMockPlayer(`rb-${i}`, `RB${i}`, 'RB')
      )
      const wrs = Array.from({ length: 25 }, (_, i) =>
        createMockPlayer(`wr-${i}`, `WR${i}`, 'WR')
      )
      const tes = Array.from({ length: 15 }, (_, i) =>
        createMockPlayer(`te-${i}`, `TE${i}`, 'TE')
      )

      const players = [...qbs, ...rbs, ...wrs, ...tes]
      const projections: Record<string, number> = {}

      qbs.forEach((p, i) => {
        projections[p.player_id] = 300 - i * 5
      })
      rbs.forEach((p, i) => {
        projections[p.player_id] = 250 - i * 5
      })
      wrs.forEach((p, i) => {
        projections[p.player_id] = 240 - i * 5
      })
      tes.forEach((p, i) => {
        projections[p.player_id] = 180 - i * 5
      })

      const rosterPositions: Position[] = ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'SUPERFLEX', 'K', 'DEF']
      const input = createMockVBDInput(players, projections, rosterPositions)
      const result = calculateVBD(input)

      const rb1 = result.rankings.find(p => p.playerId === 'rb-0')
      expect(rb1).toBeDefined()
      if (rb1) {
        const rbBaseline = result.baselines['RB'].projectedPoints
        const superflexBaseline = result.baselines['SUPERFLEX'].projectedPoints
        const expectedVBD = Math.max(
          projections['rb-0'] - rbBaseline,
          projections['rb-0'] - superflexBaseline
        )
        expect(rb1.vbdScore).toBe(expectedVBD)
      }
    })

    it('should exclude players when position baseline does not exist', () => {
      const qbs = Array.from({ length: 15 }, (_, i) =>
        createMockPlayer(`qb-${i}`, `QB${i}`, 'QB')
      )
      const rbs = Array.from({ length: 25 }, (_, i) =>
        createMockPlayer(`rb-${i}`, `RB${i}`, 'RB')
      )
      const wrs = Array.from({ length: 25 }, (_, i) =>
        createMockPlayer(`wr-${i}`, `WR${i}`, 'WR')
      )

      const players = [...qbs, ...rbs, ...wrs]
      const projections: Record<string, number> = {}

      qbs.forEach((p, i) => {
        projections[p.player_id] = 300 - i * 5
      })
      rbs.forEach((p, i) => {
        projections[p.player_id] = 250 - i * 5
      })
      wrs.forEach((p, i) => {
        projections[p.player_id] = 240 - i * 5
      })

      const rosterPositions: Position[] = ['QB', 'RB', 'RB', 'K', 'DEF']
      const input = createMockVBDInput(players, projections, rosterPositions)
      const result = calculateVBD(input)

      expect(result.baselines['WR']).toBeUndefined()
      expect(result.rankings.every(p => p.position !== 'WR')).toBe(true)
    })

    it('should handle position with starters but no players (baseline returns null)', () => {
      const qbs = Array.from({ length: 15 }, (_, i) =>
        createMockPlayer(`qb-${i}`, `QB${i}`, 'QB')
      )
      const rbs = Array.from({ length: 25 }, (_, i) =>
        createMockPlayer(`rb-${i}`, `RB${i}`, 'RB')
      )

      const players = [...qbs, ...rbs]
      const projections: Record<string, number> = {}

      qbs.forEach((p, i) => {
        projections[p.player_id] = 300 - i * 5
      })
      rbs.forEach((p, i) => {
        projections[p.player_id] = 250 - i * 5
      })

      const rosterPositions: Position[] = ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DEF']
      const input = createMockVBDInput(players, projections, rosterPositions)
      const result = calculateVBD(input)

      expect(result.baselines['WR']).toBeUndefined()
      expect(result.baselines['TE']).toBeUndefined()
      expect(result.baselines['FLEX']).toBeUndefined()
      expect(result.rankings.every(p => p.position !== 'WR' && p.position !== 'TE')).toBe(true)
    })

    it('should skip FLEX positions in baseline calculation loop', () => {
      const qbs = Array.from({ length: 15 }, (_, i) =>
        createMockPlayer(`qb-${i}`, `QB${i}`, 'QB')
      )
      const rbs = Array.from({ length: 25 }, (_, i) =>
        createMockPlayer(`rb-${i}`, `RB${i}`, 'RB')
      )
      const wrs = Array.from({ length: 25 }, (_, i) =>
        createMockPlayer(`wr-${i}`, `WR${i}`, 'WR')
      )
      const tes = Array.from({ length: 15 }, (_, i) =>
        createMockPlayer(`te-${i}`, `TE${i}`, 'TE')
      )

      const players = [...qbs, ...rbs, ...wrs, ...tes]
      const projections: Record<string, number> = {}

      qbs.forEach((p, i) => {
        projections[p.player_id] = 300 - i * 5
      })
      rbs.forEach((p, i) => {
        projections[p.player_id] = 250 - i * 5
      })
      wrs.forEach((p, i) => {
        projections[p.player_id] = 240 - i * 5
      })
      tes.forEach((p, i) => {
        projections[p.player_id] = 180 - i * 5
      })

      const rosterPositions: Position[] = ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'SUPERFLEX', 'K', 'DEF']
      const input = createMockVBDInput(players, projections, rosterPositions)
      const result = calculateVBD(input)

      expect(result.baselines['FLEX']).toBeDefined()
      expect(result.baselines['SUPERFLEX']).toBeDefined()
      expect(result.baselines['QB']).toBeDefined()
      expect(result.baselines['RB']).toBeDefined()
      expect(result.baselines['WR']).toBeDefined()
      expect(result.baselines['TE']).toBeDefined()
    })

    it('should handle position with 0 starters', () => {
      const qbs = Array.from({ length: 15 }, (_, i) =>
        createMockPlayer(`qb-${i}`, `QB${i}`, 'QB')
      )
      const rbs = Array.from({ length: 25 }, (_, i) =>
        createMockPlayer(`rb-${i}`, `RB${i}`, 'RB')
      )

      const players = [...qbs, ...rbs]
      const projections: Record<string, number> = {}

      qbs.forEach((p, i) => {
        projections[p.player_id] = 300 - i * 5
      })
      rbs.forEach((p, i) => {
        projections[p.player_id] = 250 - i * 5
      })

      const rosterPositions: Position[] = ['QB', 'RB', 'RB']
      const input = createMockVBDInput(players, projections, rosterPositions)
      const result = calculateVBD(input)

      expect(result.baselines['QB']).toBeDefined()
      expect(result.baselines['RB']).toBeDefined()
      expect(result.rankings.length).toBeGreaterThan(0)
    })

    it('should handle players with all zero projections for a position', () => {
      const qbs = Array.from({ length: 15 }, (_, i) =>
        createMockPlayer(`qb-${i}`, `QB${i}`, 'QB')
      )
      const rbs = Array.from({ length: 25 }, (_, i) =>
        createMockPlayer(`rb-${i}`, `RB${i}`, 'RB')
      )
      const wrs = Array.from({ length: 25 }, (_, i) =>
        createMockPlayer(`wr-${i}`, `WR${i}`, 'WR')
      )

      const players = [...qbs, ...rbs, ...wrs]
      const projections: Record<string, number> = {}

      qbs.forEach((p, i) => {
        projections[p.player_id] = 300 - i * 5
      })
      rbs.forEach((p, i) => {
        projections[p.player_id] = 250 - i * 5
      })
      wrs.forEach((p) => {
        projections[p.player_id] = 0
      })

      const input = createMockVBDInput(players, projections)
      const result = calculateVBD(input)

      expect(result.baselines['WR']).toBeUndefined()
      expect(result.rankings.every(p => p.position !== 'WR')).toBe(true)
    })

    it('should handle FLEX when not all eligible positions have baselines', () => {
      const qbs = Array.from({ length: 15 }, (_, i) =>
        createMockPlayer(`qb-${i}`, `QB${i}`, 'QB')
      )
      const rbs = Array.from({ length: 25 }, (_, i) =>
        createMockPlayer(`rb-${i}`, `RB${i}`, 'RB')
      )

      const players = [...qbs, ...rbs]
      const projections: Record<string, number> = {}

      qbs.forEach((p, i) => {
        projections[p.player_id] = 300 - i * 5
      })
      rbs.forEach((p, i) => {
        projections[p.player_id] = 250 - i * 5
      })

      const rosterPositions: Position[] = ['QB', 'RB', 'RB', 'FLEX', 'K', 'DEF']
      const input = createMockVBDInput(players, projections, rosterPositions)
      const result = calculateVBD(input)

      expect(result.baselines['FLEX']).toBeUndefined()
    })
  })
})

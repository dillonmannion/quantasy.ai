import { describe, it, expect } from 'vitest'
import { calculateBaseline } from '@/lib/algorithms/baselines'
import type { Position } from '@/lib/algorithms/types'

/**
 * Mock player factory for testing
 */
function createMockPlayer(
  id: string,
  name: string,
  position: Position,
  projectedPoints: number,
  team: string | null = 'KC'
) {
  return {
    player_id: id,
    first_name: name.split(' ')[0],
    last_name: name.split(' ')[1] || '',
    full_name: name,
    position,
    positions: [position],
    nfl_team: team,
    injury_status: null,
    status: 'Active',
    years_exp: 1,
    college: 'Test University',
    height: '6-0',
    weight: 200,
    birth_date: '1990-01-01',
    search_rank: 1,
    search_full_name: name.toLowerCase(),
    metadata: {
      projected_points: projectedPoints,
    },
  }
}

describe('calculateBaseline', () => {
  // Test 1: 12-team, 1 QB, 20 QBs → baseline = QB at index 11 (QB12)
  it('should calculate QB baseline for 12-team league with 1 QB starter', () => {
    const qbs = Array.from({ length: 20 }, (_, i) => {
      const points = 300 - i * 5 // Descending points
      return createMockPlayer(`qb-${i}`, `QB${i}`, 'QB', points)
    })

    const result = calculateBaseline({
      position: 'QB',
      leagueSize: 12,
      starters: 1,
      players: qbs,
    })

    expect(result).not.toBeNull()
    expect(result?.position).toBe('QB')
    expect(result?.baselineRank).toBe(12)
    expect(result?.playerId).toBe('qb-11') // Index 11 = QB12
    expect(result?.playerName).toBe('QB11')
  })

  // Test 2: 12-team, 2 RB, 30 RBs → baseline = RB at index 23 (RB24)
  it('should calculate RB baseline for 12-team league with 2 RB starters', () => {
    const rbs = Array.from({ length: 30 }, (_, i) => {
      const points = 250 - i * 3
      return createMockPlayer(`rb-${i}`, `RB${i}`, 'RB', points)
    })

    const result = calculateBaseline({
      position: 'RB',
      leagueSize: 12,
      starters: 2,
      players: rbs,
    })

    expect(result).not.toBeNull()
    expect(result?.position).toBe('RB')
    expect(result?.baselineRank).toBe(24)
    expect(result?.playerId).toBe('rb-23') // Index 23 = RB24
    expect(result?.playerName).toBe('RB23')
  })

  // Test 3: 10-team, 3 WR, 50 WRs → baseline = WR at index 29 (WR30)
  it('should calculate WR baseline for 10-team league with 3 WR starters', () => {
    const wrs = Array.from({ length: 50 }, (_, i) => {
      const points = 200 - i * 2
      return createMockPlayer(`wr-${i}`, `WR${i}`, 'WR', points)
    })

    const result = calculateBaseline({
      position: 'WR',
      leagueSize: 10,
      starters: 3,
      players: wrs,
    })

    expect(result).not.toBeNull()
    expect(result?.position).toBe('WR')
    expect(result?.baselineRank).toBe(30)
    expect(result?.playerId).toBe('wr-29') // Index 29 = WR30
    expect(result?.playerName).toBe('WR29')
  })

  // Test 4: 12-team, 2 LB, 30 LBs → baseline = LB at index 23
  it('should calculate LB baseline for 12-team league with 2 LB starters', () => {
    const lbs = Array.from({ length: 30 }, (_, i) => {
      const points = 150 - i * 2
      return createMockPlayer(`lb-${i}`, `LB${i}`, 'LB', points)
    })

    const result = calculateBaseline({
      position: 'LB',
      leagueSize: 12,
      starters: 2,
      players: lbs,
    })

    expect(result).not.toBeNull()
    expect(result?.position).toBe('LB')
    expect(result?.baselineRank).toBe(24)
    expect(result?.playerId).toBe('lb-23')
    expect(result?.playerName).toBe('LB23')
  })

  // Test 5: 12-team, 1 DEF, 32 DEFs → baseline = DEF at index 11
  it('should calculate DEF baseline for 12-team league with 1 DEF starter', () => {
    const defs = Array.from({ length: 32 }, (_, i) => {
      const points = 100 - i
      return createMockPlayer(`def-${i}`, `DEF${i}`, 'DEF', points)
    })

    const result = calculateBaseline({
      position: 'DEF',
      leagueSize: 12,
      starters: 1,
      players: defs,
    })

    expect(result).not.toBeNull()
    expect(result?.position).toBe('DEF')
    expect(result?.baselineRank).toBe(12)
    expect(result?.playerId).toBe('def-11')
    expect(result?.playerName).toBe('DEF11')
  })

  // Test 6: Edge case - 0 starters → return null (position not used)
  it('should return null when starters is 0', () => {
    const qbs = Array.from({ length: 20 }, (_, i) =>
      createMockPlayer(`qb-${i}`, `QB${i}`, 'QB', 300 - i * 5)
    )

    const result = calculateBaseline({
      position: 'QB',
      leagueSize: 12,
      starters: 0,
      players: qbs,
    })

    expect(result).toBeNull()
  })

  // Test 7: Edge case - Not enough players in array → use last available player
  it('should use last available player when array is smaller than baseline index', () => {
    const qbs = Array.from({ length: 5 }, (_, i) =>
      createMockPlayer(`qb-${i}`, `QB${i}`, 'QB', 300 - i * 10)
    )

    const result = calculateBaseline({
      position: 'QB',
      leagueSize: 12,
      starters: 1,
      players: qbs,
    })

    expect(result).not.toBeNull()
    expect(result?.playerId).toBe('qb-4') // Last available
    expect(result?.baselineRank).toBe(12) // Still reports intended rank
  })

  // Test 8: Edge case - Empty array → return null
  it('should return null when player array is empty', () => {
    const result = calculateBaseline({
      position: 'QB',
      leagueSize: 12,
      starters: 1,
      players: [],
    })

    expect(result).toBeNull()
  })

  // Test 9: Tie handling - alphabetical name as tiebreaker
  it('should use alphabetical name as tiebreaker for tied projected points', () => {
    const qbs = [
      createMockPlayer('qb-1', 'Alice QB', 'QB', 300),
      createMockPlayer('qb-2', 'Zoe QB', 'QB', 300), // Same points, different name
      createMockPlayer('qb-3', 'Bob QB', 'QB', 295),
      createMockPlayer('qb-4', 'Charlie QB', 'QB', 290),
      createMockPlayer('qb-5', 'David QB', 'QB', 285),
      createMockPlayer('qb-6', 'Eve QB', 'QB', 280),
      createMockPlayer('qb-7', 'Frank QB', 'QB', 275),
      createMockPlayer('qb-8', 'Grace QB', 'QB', 270),
      createMockPlayer('qb-9', 'Henry QB', 'QB', 265),
      createMockPlayer('qb-10', 'Ivy QB', 'QB', 260),
      createMockPlayer('qb-11', 'Jack QB', 'QB', 255),
      createMockPlayer('qb-12', 'Kate QB', 'QB', 250),
    ]

    const result = calculateBaseline({
      position: 'QB',
      leagueSize: 12,
      starters: 1,
      players: qbs,
    })

    expect(result).not.toBeNull()
    expect(result?.baselineRank).toBe(12)
    // Should be Kate QB (last in alphabetical order at baseline index)
    expect(result?.playerName).toBe('Kate QB')
  })

  // Test 10: TE baseline calculation
  it('should calculate TE baseline correctly', () => {
    const tes = Array.from({ length: 25 }, (_, i) => {
      const points = 180 - i * 3
      return createMockPlayer(`te-${i}`, `TE${i}`, 'TE', points)
    })

    const result = calculateBaseline({
      position: 'TE',
      leagueSize: 12,
      starters: 1,
      players: tes,
    })

    expect(result).not.toBeNull()
    expect(result?.position).toBe('TE')
    expect(result?.baselineRank).toBe(12)
    expect(result?.playerId).toBe('te-11')
  })
})

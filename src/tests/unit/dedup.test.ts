import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/sleeper/client', () => ({
  getAllPlayers: vi.fn(async () => ({
    '4046': {
      player_id: '4046',
      first_name: 'Patrick',
      last_name: 'Mahomes',
      position: 'QB',
      team: 'KC',
    },
  })),
}))

vi.mock('@/lib/sleeper/cache', () => ({
  getCachedLeague: vi.fn(async (leagueId: string) => ({
    league_id: leagueId,
    name: 'Test League',
    season: '2025',
    status: 'in_season',
    total_rosters: 12,
    settings: {},
    scoring_settings: {},
    roster_positions: [],
  })),
  getCachedRosters: vi.fn(async (leagueId: string) => [
    {
      roster_id: 1,
      owner_id: 'user123',
      league_id: leagueId,
      players: ['4046'],
      starters: ['4046'],
      settings: {},
    },
  ]),
}))

describe('Sleeper Deduplication Layer', () => {

  describe('getDedupedPlayers', () => {
    it('should exist and be callable', async () => {
      const { getDedupedPlayers } = await import('@/lib/sleeper/dedup')
      expect(getDedupedPlayers).toBeDefined()
      expect(typeof getDedupedPlayers).toBe('function')
    })

    it('should return player data with correct type', async () => {
      const { getDedupedPlayers } = await import('@/lib/sleeper/dedup')
      const result = await getDedupedPlayers()
      
      expect(result).toBeDefined()
      expect(typeof result).toBe('object')
      expect(result['4046']).toBeDefined()
      expect(result['4046'].player_id).toBe('4046')
      expect(result['4046'].position).toBe('QB')
    })
  })

  describe('getDedupedLeague', () => {
    it('should exist and be callable', async () => {
      const { getDedupedLeague } = await import('@/lib/sleeper/dedup')
      expect(getDedupedLeague).toBeDefined()
      expect(typeof getDedupedLeague).toBe('function')
    })

    it('should return league data with correct type', async () => {
      const { getDedupedLeague } = await import('@/lib/sleeper/dedup')
      const result = await getDedupedLeague('test-league-123')
      
      expect(result).toBeDefined()
      expect(result.league_id).toBe('test-league-123')
      expect(result.name).toBe('Test League')
      expect(result.season).toBe('2025')
      expect(result.total_rosters).toBe(12)
    })
  })

  describe('getDedupedRosters', () => {
    it('should exist and be callable', async () => {
      const { getDedupedRosters } = await import('@/lib/sleeper/dedup')
      expect(getDedupedRosters).toBeDefined()
      expect(typeof getDedupedRosters).toBe('function')
    })

    it('should return roster array with correct type', async () => {
      const { getDedupedRosters } = await import('@/lib/sleeper/dedup')
      const result = await getDedupedRosters('test-league-456')
      
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
      expect(result[0].roster_id).toBe(1)
      expect(result[0].league_id).toBe('test-league-456')
      expect(result[0].players).toContain('4046')
    })
  })
})

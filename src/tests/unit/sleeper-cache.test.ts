import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { SleeperLeague, SleeperRoster, SleeperMatchup, SleeperPlayer } from '@/lib/sleeper/types'

const mockSupabaseClient = {
  from: vi.fn(),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}))

vi.mock('@/lib/sleeper/client', () => ({
  getLeague: vi.fn(),
  getLeagueRosters: vi.fn(),
  getMatchups: vi.fn(),
  getAllPlayers: vi.fn(),
}))

import {
  getCachedLeague,
  getCachedRosters,
  getCachedMatchups,
  syncAllPlayers,
  shouldSyncPlayers,
  invalidateLeagueCache,
  purgeLeagueCache,
} from '@/lib/sleeper/cache'
import * as SleeperAPI from '@/lib/sleeper/client'

const TTL = {
  PLAYERS: 24 * 60 * 60 * 1000,
  LEAGUE: 60 * 60 * 1000,
  ROSTERS: 15 * 60 * 1000,
  MATCHUPS: 5 * 60 * 1000,
}

function createMockLeagueRow(overrides: Partial<{
  id: string
  name: string
  season: string
  status: string
  settings: Record<string, unknown>
  scoring_settings: Record<string, unknown>
  roster_positions: Record<string, unknown>
  total_rosters: number
  cached_at: string
}> = {}) {
  return {
    id: 'league-123',
    name: 'Test League',
    season: '2025',
    status: 'in_season',
    settings: { num_teams: 12 },
    scoring_settings: { pass_td: 4 },
    roster_positions: { '0': 'QB', '1': 'RB', '2': 'WR' },
    total_rosters: 12,
    cached_at: new Date().toISOString(),
    ...overrides,
  }
}

function createMockSleeperLeague(overrides: Partial<SleeperLeague> = {}): SleeperLeague {
  return {
    league_id: 'league-123',
    name: 'Test League',
    season: '2025',
    status: 'in_season',
    sport: 'nfl',
    settings: { playoff_week_start: 15, num_teams: 12, playoff_teams: 6, leg: 1 },
    scoring_settings: { pass_td: 4 },
    roster_positions: ['QB', 'RB', 'WR'],
    total_rosters: 12,
    previous_league_id: null,
    draft_id: 'draft-123',
    ...overrides,
  }
}

function createMockRosterRow(overrides: Partial<{
  id: number
  league_id: string
  roster_id: number
  owner_id: string | null
  players: string[] | null
  starters: string[] | null
  reserve: string[] | null
  settings: Record<string, unknown>
  cached_at: string
}> = {}) {
  return {
    id: 1,
    league_id: 'league-123',
    roster_id: 1,
    owner_id: 'user-123',
    players: ['player-1', 'player-2'],
    starters: ['player-1'],
    reserve: null,
    settings: { wins: 5, losses: 3, ties: 0, fpts: 1200 },
    cached_at: new Date().toISOString(),
    ...overrides,
  }
}

function createMockSleeperRoster(overrides: Partial<SleeperRoster> = {}): SleeperRoster {
  return {
    roster_id: 1,
    owner_id: 'user-123',
    league_id: 'league-123',
    players: ['player-1', 'player-2'],
    starters: ['player-1'],
    reserve: null,
    taxi: null,
    keepers: null,
    co_owners: null,
    settings: { wins: 5, losses: 3, ties: 0, fpts: 1200 },
    metadata: null,
    ...overrides,
  }
}

function createMockMatchupRow(overrides: Partial<{
  id: number
  league_id: string
  week: number
  matchup_id: number
  roster_id: number
  points: number | null
  starters: string[] | null
  starters_points: number[] | null
  players: string[] | null
  players_points: Record<string, unknown> | null
  cached_at: string
}> = {}) {
  return {
    id: 1,
    league_id: 'league-123',
    week: 1,
    matchup_id: 1,
    roster_id: 1,
    points: 120.5,
    starters: ['player-1'],
    starters_points: [20.5],
    players: ['player-1', 'player-2'],
    players_points: { 'player-1': 20.5, 'player-2': 10.0 },
    cached_at: new Date().toISOString(),
    ...overrides,
  }
}

function createMockSleeperMatchup(overrides: Partial<SleeperMatchup> = {}): SleeperMatchup {
  return {
    roster_id: 1,
    matchup_id: 1,
    points: 120.5,
    custom_points: null,
    starters: ['player-1'],
    starters_points: [20.5],
    players: ['player-1', 'player-2'],
    players_points: { 'player-1': 20.5, 'player-2': 10.0 },
    ...overrides,
  }
}

function createMockSleeperPlayer(overrides: Partial<SleeperPlayer> = {}): SleeperPlayer {
  return {
    player_id: 'player-1',
    full_name: 'Test Player',
    first_name: 'Test',
    last_name: 'Player',
    team: 'KC',
    position: 'QB',
    age: 28,
    years_exp: 5,
    status: 'Active',
    injury_status: null,
    number: 15,
    height: '6\'3"',
    weight: '230',
    college: 'Texas Tech',
    fantasy_positions: ['QB'],
    ...overrides,
  }
}

function getFreshTimestamp(ttl: number): string {
  return new Date(Date.now() - ttl / 2).toISOString()
}

function getStaleTimestamp(ttl: number): string {
  return new Date(Date.now() - ttl - 1000).toISOString()
}

describe('Sleeper Cache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('getCachedLeague', () => {
    it('returns cached data when fresh', async () => {
      const freshRow = createMockLeagueRow({
        cached_at: getFreshTimestamp(TTL.LEAGUE),
      })

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: freshRow, error: null }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }
      mockSupabaseClient.from.mockReturnValue(mockChain)

      const result = await getCachedLeague('league-123')

      expect(result.league_id).toBe('league-123')
      expect(result.name).toBe('Test League')
      expect(SleeperAPI.getLeague).not.toHaveBeenCalled()
    })

    it('fetches fresh data when cache is stale', async () => {
      const staleRow = createMockLeagueRow({
        cached_at: getStaleTimestamp(TTL.LEAGUE),
      })
      const freshLeague = createMockSleeperLeague({ name: 'Fresh League' })

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: staleRow, error: null }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }
      mockSupabaseClient.from.mockReturnValue(mockChain)
      vi.mocked(SleeperAPI.getLeague).mockResolvedValue(freshLeague)

      const result = await getCachedLeague('league-123')

      expect(result.name).toBe('Fresh League')
      expect(SleeperAPI.getLeague).toHaveBeenCalledWith('league-123')
      expect(mockChain.upsert).toHaveBeenCalled()
    })

    it('fetches fresh data when cache is missing', async () => {
      const freshLeague = createMockSleeperLeague()

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'Not found' } }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }
      mockSupabaseClient.from.mockReturnValue(mockChain)
      vi.mocked(SleeperAPI.getLeague).mockResolvedValue(freshLeague)

      const result = await getCachedLeague('league-123')

      expect(result.league_id).toBe('league-123')
      expect(SleeperAPI.getLeague).toHaveBeenCalledWith('league-123')
    })

    it('handles Supabase errors gracefully', async () => {
      const freshLeague = createMockSleeperLeague()

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'UNKNOWN', message: 'DB Error' } }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }
      mockSupabaseClient.from.mockReturnValue(mockChain)
      vi.mocked(SleeperAPI.getLeague).mockResolvedValue(freshLeague)

      const result = await getCachedLeague('league-123')

      expect(result.league_id).toBe('league-123')
      expect(SleeperAPI.getLeague).toHaveBeenCalled()
    })

    it('returns fresh data even when cache update fails', async () => {
      const freshLeague = createMockSleeperLeague()

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'Not found' } }),
        upsert: vi.fn().mockResolvedValue({ error: { message: 'Upsert failed' } }),
      }
      mockSupabaseClient.from.mockReturnValue(mockChain)
      vi.mocked(SleeperAPI.getLeague).mockResolvedValue(freshLeague)

      const result = await getCachedLeague('league-123')
      expect(result.league_id).toBe('league-123')
    })

    it('transforms database row to Sleeper type correctly', async () => {
      const row = createMockLeagueRow({
        id: 'test-id',
        name: 'Transform Test',
        season: '2024',
        status: 'complete',
        settings: { num_teams: 10, playoff_week_start: 14 },
        scoring_settings: { pass_td: 6, rush_td: 6 },
        roster_positions: { '0': 'QB', '1': 'RB', '2': 'RB', '3': 'WR', '4': 'WR' },
        total_rosters: 10,
        cached_at: getFreshTimestamp(TTL.LEAGUE),
      })

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: row, error: null }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }
      mockSupabaseClient.from.mockReturnValue(mockChain)

      const result = await getCachedLeague('test-id')

      expect(result.league_id).toBe('test-id')
      expect(result.name).toBe('Transform Test')
      expect(result.season).toBe('2024')
      expect(result.status).toBe('complete')
      expect(result.sport).toBe('nfl')
      expect(result.total_rosters).toBe(10)
    })
  })

  describe('getCachedRosters', () => {
    it('returns cached data when fresh', async () => {
      const freshRows = [
        createMockRosterRow({ roster_id: 1, cached_at: getFreshTimestamp(TTL.ROSTERS) }),
        createMockRosterRow({ roster_id: 2, cached_at: getFreshTimestamp(TTL.ROSTERS) }),
      ]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: freshRows, error: null }),
        delete: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ error: null }),
      }
      mockSupabaseClient.from.mockReturnValue(mockChain)

      const result = await getCachedRosters('league-123')

      expect(result).toHaveLength(2)
      expect(result[0].roster_id).toBe(1)
      expect(SleeperAPI.getLeagueRosters).not.toHaveBeenCalled()
    })

    it('fetches fresh data when cache is stale', async () => {
      const staleRows = [
        createMockRosterRow({ cached_at: getStaleTimestamp(TTL.ROSTERS) }),
      ]
      const freshRosters = [
        createMockSleeperRoster({ roster_id: 1 }),
        createMockSleeperRoster({ roster_id: 2 }),
      ]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: staleRows, error: null }),
        delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      }
      mockSupabaseClient.from.mockReturnValue(mockChain)
      vi.mocked(SleeperAPI.getLeagueRosters).mockResolvedValue(freshRosters)

      const result = await getCachedRosters('league-123')

      expect(result).toHaveLength(2)
      expect(SleeperAPI.getLeagueRosters).toHaveBeenCalledWith('league-123')
    })

    it('fetches fresh data when cache is empty', async () => {
      const freshRosters = [createMockSleeperRoster()]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
        delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      }
      mockSupabaseClient.from.mockReturnValue(mockChain)
      vi.mocked(SleeperAPI.getLeagueRosters).mockResolvedValue(freshRosters)

      const result = await getCachedRosters('league-123')

      expect(result).toHaveLength(1)
      expect(SleeperAPI.getLeagueRosters).toHaveBeenCalled()
    })

    it('handles empty roster response from API', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: null }),
        delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      }
      mockSupabaseClient.from.mockReturnValue(mockChain)
      vi.mocked(SleeperAPI.getLeagueRosters).mockResolvedValue([])

      const result = await getCachedRosters('league-123')

      expect(result).toEqual([])
      expect(mockChain.insert).not.toHaveBeenCalled()
    })

    it('transforms roster row to Sleeper type correctly', async () => {
      const row = createMockRosterRow({
        roster_id: 5,
        owner_id: 'owner-abc',
        players: ['p1', 'p2', 'p3'],
        starters: ['p1', 'p2'],
        reserve: ['p3'],
        settings: { wins: 8, losses: 2, ties: 1, fpts: 1500, fpts_decimal: 50 },
        cached_at: getFreshTimestamp(TTL.ROSTERS),
      })

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [row], error: null }),
        delete: vi.fn().mockResolvedValue({ error: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      }
      mockSupabaseClient.from.mockReturnValue(mockChain)

      const result = await getCachedRosters('league-123')

      expect(result[0].roster_id).toBe(5)
      expect(result[0].owner_id).toBe('owner-abc')
      expect(result[0].players).toEqual(['p1', 'p2', 'p3'])
      expect(result[0].starters).toEqual(['p1', 'p2'])
      expect(result[0].reserve).toEqual(['p3'])
      expect(result[0].settings.wins).toBe(8)
      expect(result[0].settings.fpts_decimal).toBe(50)
    })
  })

  describe('getCachedMatchups', () => {
    it('returns cached data when fresh', async () => {
      const freshRows = [
        createMockMatchupRow({ matchup_id: 1, cached_at: getFreshTimestamp(TTL.MATCHUPS) }),
        createMockMatchupRow({ matchup_id: 1, roster_id: 2, cached_at: getFreshTimestamp(TTL.MATCHUPS) }),
      ]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: freshRows, error: null }),
        delete: vi.fn().mockResolvedValue({ error: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      }
      mockSupabaseClient.from.mockReturnValue(mockChain)

      const result = await getCachedMatchups('league-123', 1)

      expect(result).toHaveLength(2)
      expect(SleeperAPI.getMatchups).not.toHaveBeenCalled()
    })

    it('fetches fresh data when cache is stale', async () => {
      const staleRows = [
        createMockMatchupRow({ cached_at: getStaleTimestamp(TTL.MATCHUPS) }),
      ]
      const freshMatchups = [
        createMockSleeperMatchup({ matchup_id: 1, roster_id: 1 }),
        createMockSleeperMatchup({ matchup_id: 1, roster_id: 2 }),
      ]

      const deleteEqMock = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: staleRows, error: null }),
        delete: vi.fn().mockReturnValue({ eq: deleteEqMock }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      }
      mockSupabaseClient.from.mockReturnValue(mockChain)
      vi.mocked(SleeperAPI.getMatchups).mockResolvedValue(freshMatchups)

      const result = await getCachedMatchups('league-123', 5)

      expect(result).toHaveLength(2)
      expect(SleeperAPI.getMatchups).toHaveBeenCalledWith('league-123', 5)
    })

    it('handles empty matchups response from API', async () => {
      const deleteEqMock = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: null }),
        delete: vi.fn().mockReturnValue({ eq: deleteEqMock }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      }
      mockSupabaseClient.from.mockReturnValue(mockChain)
      vi.mocked(SleeperAPI.getMatchups).mockResolvedValue([])

      const result = await getCachedMatchups('league-123', 1)

      expect(result).toEqual([])
      expect(mockChain.insert).not.toHaveBeenCalled()
    })

    it('transforms matchup row to Sleeper type correctly', async () => {
      const row = createMockMatchupRow({
        roster_id: 3,
        matchup_id: 2,
        points: 145.75,
        starters: ['p1', 'p2'],
        starters_points: [25.5, 18.25],
        players: ['p1', 'p2', 'p3'],
        players_points: { p1: 25.5, p2: 18.25, p3: 0 },
        cached_at: getFreshTimestamp(TTL.MATCHUPS),
      })

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [row], error: null }),
        delete: vi.fn().mockResolvedValue({ error: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      }
      mockSupabaseClient.from.mockReturnValue(mockChain)

      const result = await getCachedMatchups('league-123', 1)

      expect(result[0].roster_id).toBe(3)
      expect(result[0].matchup_id).toBe(2)
      expect(result[0].points).toBe(145.75)
      expect(result[0].starters_points).toEqual([25.5, 18.25])
      expect(result[0].custom_points).toBeNull()
    })
  })

  describe('syncAllPlayers', () => {
    it('syncs players from Sleeper API to database', async () => {
      const players: Record<string, SleeperPlayer> = {
        'player-1': createMockSleeperPlayer({ player_id: 'player-1', team: 'KC' }),
        'player-2': createMockSleeperPlayer({ player_id: 'player-2', team: 'SF' }),
      }

      const mockChain = {
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }
      mockSupabaseClient.from.mockReturnValue(mockChain)
      vi.mocked(SleeperAPI.getAllPlayers).mockResolvedValue(players)

      const count = await syncAllPlayers()

      expect(count).toBe(2)
      expect(SleeperAPI.getAllPlayers).toHaveBeenCalled()
      expect(mockChain.upsert).toHaveBeenCalled()
    })

    it('filters out retired players with no team and high experience', async () => {
      const players: Record<string, SleeperPlayer> = {
        'active': createMockSleeperPlayer({ player_id: 'active', team: 'KC', status: 'Active' }),
        'retired': createMockSleeperPlayer({ player_id: 'retired', team: null, status: 'Inactive', years_exp: 20 }),
        'rookie': createMockSleeperPlayer({ player_id: 'rookie', team: null, status: 'Inactive', years_exp: 0 }),
      }

      const mockChain = {
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }
      mockSupabaseClient.from.mockReturnValue(mockChain)
      vi.mocked(SleeperAPI.getAllPlayers).mockResolvedValue(players)

      const count = await syncAllPlayers()

      expect(count).toBe(2)
    })

    it('throws error when upsert fails', async () => {
      const players: Record<string, SleeperPlayer> = {
        'player-1': createMockSleeperPlayer(),
      }

      const mockChain = {
        upsert: vi.fn().mockResolvedValue({ error: { message: 'DB Error' } }),
      }
      mockSupabaseClient.from.mockReturnValue(mockChain)
      vi.mocked(SleeperAPI.getAllPlayers).mockResolvedValue(players)

      await expect(syncAllPlayers()).rejects.toThrow()
    })
  })

  describe('shouldSyncPlayers', () => {
    it('returns true when no players exist', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      }
      mockSupabaseClient.from.mockReturnValue(mockChain)

      const result = await shouldSyncPlayers()

      expect(result).toBe(true)
    })

    it('returns true when players are stale', async () => {
      const staleData = {
        updated_at: getStaleTimestamp(TTL.PLAYERS),
      }

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: staleData, error: null }),
      }
      mockSupabaseClient.from.mockReturnValue(mockChain)

      const result = await shouldSyncPlayers()

      expect(result).toBe(true)
    })

    it('returns false when players are fresh', async () => {
      const freshData = {
        updated_at: getFreshTimestamp(TTL.PLAYERS),
      }

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: freshData, error: null }),
      }
      mockSupabaseClient.from.mockReturnValue(mockChain)

      const result = await shouldSyncPlayers()

      expect(result).toBe(false)
    })
  })

  describe('invalidateLeagueCache', () => {
    it('sets cached_at to epoch for leagues, rosters, and matchups tables', async () => {
      const updateMock = vi.fn().mockReturnThis()
      const eqMock = vi.fn().mockResolvedValue({ error: null })

      const mockChain = {
        update: updateMock,
        eq: eqMock,
      }
      mockSupabaseClient.from.mockReturnValue(mockChain)

      await invalidateLeagueCache('league-123')

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('leagues')
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('rosters')
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('matchups')
      expect(updateMock).toHaveBeenCalledTimes(3)
    })

    it('uses epoch timestamp (1970-01-01) for invalidation', async () => {
      const updateMock = vi.fn().mockReturnThis()
      const eqMock = vi.fn().mockResolvedValue({ error: null })

      const mockChain = {
        update: updateMock,
        eq: eqMock,
      }
      mockSupabaseClient.from.mockReturnValue(mockChain)

      await invalidateLeagueCache('league-123')

      const epochTime = new Date(0).toISOString()
      expect(updateMock).toHaveBeenCalledWith({ cached_at: epochTime })
    })
  })

  describe('purgeLeagueCache', () => {
    it('deletes from matchups, rosters, user_leagues, and leagues tables', async () => {
      const deleteMock = vi.fn().mockReturnThis()
      const eqMock = vi.fn().mockResolvedValue({ error: null })

      const mockChain = {
        delete: deleteMock,
        eq: eqMock,
      }
      mockSupabaseClient.from.mockReturnValue(mockChain)

      await purgeLeagueCache('league-123')

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('matchups')
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('rosters')
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_leagues')
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('leagues')
      expect(deleteMock).toHaveBeenCalledTimes(4)
    })

    it('deletes in correct order for referential integrity', async () => {
      const callOrder: string[] = []
      
      mockSupabaseClient.from.mockImplementation((table: string) => {
        callOrder.push(table)
        return {
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ error: null }),
        }
      })

      await purgeLeagueCache('league-123')

      expect(callOrder).toEqual(['matchups', 'rosters', 'user_leagues', 'leagues'])
    })
  })

  describe('TTL boundary conditions', () => {
    it('treats cache exactly at TTL boundary as fresh (age === TTL)', async () => {
      const exactTTLRow = createMockLeagueRow({
        cached_at: new Date(Date.now() - TTL.LEAGUE).toISOString(),
      })
      const freshLeague = createMockSleeperLeague({ name: 'Fresh' })

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: exactTTLRow, error: null }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }
      mockSupabaseClient.from.mockReturnValue(mockChain)
      vi.mocked(SleeperAPI.getLeague).mockResolvedValue(freshLeague)

      const result = await getCachedLeague('league-123')

      expect(result.name).toBe('Test League')
    })

    it('treats cache 1ms past TTL as stale', async () => {
      const staleRow = createMockLeagueRow({
        cached_at: new Date(Date.now() - TTL.LEAGUE - 1).toISOString(),
      })
      const freshLeague = createMockSleeperLeague({ name: 'Fresh' })

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: staleRow, error: null }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }
      mockSupabaseClient.from.mockReturnValue(mockChain)
      vi.mocked(SleeperAPI.getLeague).mockResolvedValue(freshLeague)

      const result = await getCachedLeague('league-123')

      expect(result.name).toBe('Fresh')
      expect(SleeperAPI.getLeague).toHaveBeenCalled()
    })
  })

  describe('null and edge case handling', () => {
    it('handles null cached_at as missing cache', async () => {
      const rowWithNullCachedAt = createMockLeagueRow()
      // @ts-expect-error - testing null case
      rowWithNullCachedAt.cached_at = null
      const freshLeague = createMockSleeperLeague()

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: rowWithNullCachedAt, error: null }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }
      mockSupabaseClient.from.mockReturnValue(mockChain)
      vi.mocked(SleeperAPI.getLeague).mockResolvedValue(freshLeague)

      await getCachedLeague('league-123')

      expect(SleeperAPI.getLeague).toHaveBeenCalled()
    })

    it('handles roster with null settings by defaulting to zeros', async () => {
      const rowWithNullSettings = createMockRosterRow({
        settings: null as unknown as Record<string, unknown>,
        cached_at: getFreshTimestamp(TTL.ROSTERS),
      })

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [rowWithNullSettings], error: null }),
        delete: vi.fn().mockResolvedValue({ error: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      }
      mockSupabaseClient.from.mockReturnValue(mockChain)

      const result = await getCachedRosters('league-123')

      expect(result[0].settings.wins).toBe(0)
      expect(result[0].settings.losses).toBe(0)
    })

    it('handles matchup with null points by defaulting to zero', async () => {
      const rowWithNullPoints = createMockMatchupRow({
        points: null,
        cached_at: getFreshTimestamp(TTL.MATCHUPS),
      })

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [rowWithNullPoints], error: null }),
        delete: vi.fn().mockResolvedValue({ error: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      }
      mockSupabaseClient.from.mockReturnValue(mockChain)

      const result = await getCachedMatchups('league-123', 1)

      expect(result[0].points).toBe(0)
    })
  })
})

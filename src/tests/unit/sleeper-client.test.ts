import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type {
  SleeperUser,
  SleeperLeague,
  SleeperRoster,
  SleeperMatchup,
  SleeperPlayer,
  SleeperNFLState,
  SleeperAPIError,
} from '@/lib/sleeper/types'

const mockFetch = vi.fn()

function createMockNFLState(overrides: Partial<SleeperNFLState> = {}): SleeperNFLState {
  return {
    season: '2025',
    season_type: 'regular',
    week: 10,
    leg: 1,
    display_week: 10,
    season_start_date: '2025-09-04',
    previous_season: '2024',
    ...overrides,
  }
}

function createMockUser(overrides: Partial<SleeperUser> = {}): SleeperUser {
  return {
    user_id: 'user-123',
    username: 'testuser',
    display_name: 'Test User',
    avatar: 'avatar-hash',
    ...overrides,
  }
}

function createMockLeague(overrides: Partial<SleeperLeague> = {}): SleeperLeague {
  return {
    league_id: 'league-123',
    name: 'Test League',
    season: '2025',
    status: 'in_season',
    sport: 'nfl',
    settings: { playoff_week_start: 15, num_teams: 12, playoff_teams: 6, leg: 1 },
    scoring_settings: { pass_td: 4, rush_td: 6 },
    roster_positions: ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DEF', 'BN', 'BN', 'BN', 'BN', 'BN', 'BN'],
    total_rosters: 12,
    previous_league_id: null,
    draft_id: 'draft-123',
    ...overrides,
  }
}

function createMockRoster(overrides: Partial<SleeperRoster> = {}): SleeperRoster {
  return {
    roster_id: 1,
    owner_id: 'user-123',
    league_id: 'league-123',
    players: ['4046', '6794', '4034'],
    starters: ['4046', '6794'],
    reserve: null,
    taxi: null,
    keepers: null,
    co_owners: null,
    settings: { wins: 7, losses: 3, ties: 0, fpts: 1250 },
    metadata: null,
    ...overrides,
  }
}

function createMockMatchup(overrides: Partial<SleeperMatchup> = {}): SleeperMatchup {
  return {
    roster_id: 1,
    matchup_id: 1,
    points: 125.5,
    custom_points: null,
    starters: ['4046', '6794'],
    starters_points: [28.5, 22.0],
    players: ['4046', '6794', '4034'],
    players_points: { '4046': 28.5, '6794': 22.0, '4034': 15.0 },
    ...overrides,
  }
}

function createMockPlayer(overrides: Partial<SleeperPlayer> = {}): SleeperPlayer {
  return {
    player_id: '4046',
    full_name: 'Patrick Mahomes',
    first_name: 'Patrick',
    last_name: 'Mahomes',
    team: 'KC',
    position: 'QB',
    age: 29,
    years_exp: 8,
    status: 'Active',
    injury_status: null,
    number: 15,
    height: "6'3\"",
    weight: '230',
    college: 'Texas Tech',
    fantasy_positions: ['QB'],
    ...overrides,
  }
}

function createMockResponse(data: unknown, status = 200, ok = true): Response {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : status === 404 ? 'Not Found' : 'Error',
    json: vi.fn().mockResolvedValue(data),
    headers: new Headers(),
    redirected: false,
    type: 'basic',
    url: '',
    clone: vi.fn(),
    body: null,
    bodyUsed: false,
    arrayBuffer: vi.fn(),
    blob: vi.fn(),
    formData: vi.fn(),
    text: vi.fn(),
  } as unknown as Response
}

describe('Sleeper API Client', () => {
  let getNFLState: typeof import('@/lib/sleeper/client').getNFLState
  let getUserByUsername: typeof import('@/lib/sleeper/client').getUserByUsername
  let getUserById: typeof import('@/lib/sleeper/client').getUserById
  let getUserLeagues: typeof import('@/lib/sleeper/client').getUserLeagues
  let getLeague: typeof import('@/lib/sleeper/client').getLeague
  let getLeagueRosters: typeof import('@/lib/sleeper/client').getLeagueRosters
  let getLeagueUsers: typeof import('@/lib/sleeper/client').getLeagueUsers
  let getMatchups: typeof import('@/lib/sleeper/client').getMatchups
  let getAllPlayers: typeof import('@/lib/sleeper/client').getAllPlayers
  let getCurrentSeason: typeof import('@/lib/sleeper/client').getCurrentSeason

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    global.fetch = mockFetch
    
    const client = await import('@/lib/sleeper/client')
    getNFLState = client.getNFLState
    getUserByUsername = client.getUserByUsername
    getUserById = client.getUserById
    getUserLeagues = client.getUserLeagues
    getLeague = client.getLeague
    getLeagueRosters = client.getLeagueRosters
    getLeagueUsers = client.getLeagueUsers
    getMatchups = client.getMatchups
    getAllPlayers = client.getAllPlayers
    getCurrentSeason = client.getCurrentSeason
  })

  describe('Request Headers and URL Construction', () => {
    it('includes Accept: application/json header', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(createMockNFLState()))

      await getNFLState()

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.sleeper.app/v1/state/nfl',
        expect.objectContaining({
          headers: expect.objectContaining({
            Accept: 'application/json',
          }),
        })
      )
    })

    it('includes next.revalidate cache option', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(createMockNFLState()))

      await getNFLState()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          next: { revalidate: 60 },
        })
      )
    })

    it('constructs correct base URL', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(createMockNFLState()))

      await getNFLState()

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.sleeper.app/v1/state/nfl',
        expect.any(Object)
      )
    })
  })

  describe('Error Handling', () => {
    it('throws SleeperAPIError for non-404 HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(null, 500, false))

      await expect(getNFLState()).rejects.toMatchObject({
        error: 'SleeperAPIError',
        statusCode: 500,
      })
    })

    it('throws SleeperAPIError with message containing status', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(null, 503, false))

      await expect(getNFLState()).rejects.toMatchObject({
        message: expect.stringContaining('503'),
      })
    })

    it('wraps network errors with statusCode 0', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'))

      await expect(getNFLState()).rejects.toMatchObject({
        error: 'NetworkError',
        message: 'Network failure',
        statusCode: 0,
      })
    })

    it('handles non-Error thrown values', async () => {
      mockFetch.mockRejectedValueOnce('string error')

      await expect(getNFLState()).rejects.toMatchObject({
        error: 'NetworkError',
        message: 'Unknown error',
        statusCode: 0,
      })
    })

    it('re-throws SleeperAPIError without wrapping', async () => {
      const apiError: SleeperAPIError = {
        error: 'SleeperAPIError',
        message: 'Rate limited',
        statusCode: 429,
      }
      mockFetch.mockRejectedValueOnce(apiError)

      await expect(getNFLState()).rejects.toEqual(apiError)
    })
  })

  describe('getNFLState', () => {
    it('fetches NFL state from /state/nfl', async () => {
      const mockState = createMockNFLState()
      mockFetch.mockResolvedValueOnce(createMockResponse(mockState))

      const result = await getNFLState()

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.sleeper.app/v1/state/nfl',
        expect.any(Object)
      )
      expect(result).toEqual(mockState)
    })

    it('returns all NFL state fields', async () => {
      const mockState = createMockNFLState({
        season: '2025',
        season_type: 'post',
        week: 18,
      })
      mockFetch.mockResolvedValueOnce(createMockResponse(mockState))

      const result = await getNFLState()

      expect(result.season).toBe('2025')
      expect(result.season_type).toBe('post')
      expect(result.week).toBe(18)
    })
  })

  describe('getUserByUsername', () => {
    it('returns user for valid username', async () => {
      const mockUser = createMockUser()
      mockFetch.mockResolvedValueOnce(createMockResponse(mockUser))

      const result = await getUserByUsername('testuser')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.sleeper.app/v1/user/testuser',
        expect.any(Object)
      )
      expect(result).toEqual(mockUser)
    })

    it('returns null for 404 (user not found)', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(null, 404, false))

      const result = await getUserByUsername('nonexistent')

      expect(result).toBeNull()
    })

    it('throws for other HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(null, 500, false))

      await expect(getUserByUsername('testuser')).rejects.toMatchObject({
        statusCode: 500,
      })
    })

    it('URL encodes special characters in username', async () => {
      const mockUser = createMockUser({ username: 'test user' })
      mockFetch.mockResolvedValueOnce(createMockResponse(mockUser))

      await getUserByUsername('test user')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.sleeper.app/v1/user/test%20user',
        expect.any(Object)
      )
    })

    it('handles username with special characters', async () => {
      const mockUser = createMockUser({ username: 'user@123' })
      mockFetch.mockResolvedValueOnce(createMockResponse(mockUser))

      await getUserByUsername('user@123')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.sleeper.app/v1/user/user%40123',
        expect.any(Object)
      )
    })
  })

  describe('getUserById', () => {
    it('returns user for valid user ID', async () => {
      const mockUser = createMockUser({ user_id: '123456789' })
      mockFetch.mockResolvedValueOnce(createMockResponse(mockUser))

      const result = await getUserById('123456789')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.sleeper.app/v1/user/123456789',
        expect.any(Object)
      )
      expect(result).toEqual(mockUser)
    })

    it('returns null for 404 (user not found)', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(null, 404, false))

      const result = await getUserById('nonexistent-id')

      expect(result).toBeNull()
    })

    it('throws for other HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(null, 403, false))

      await expect(getUserById('123')).rejects.toMatchObject({
        statusCode: 403,
      })
    })
  })

  describe('getUserLeagues', () => {
    it('fetches leagues for user and season', async () => {
      const mockLeagues = [createMockLeague(), createMockLeague({ league_id: 'league-456' })]
      mockFetch.mockResolvedValueOnce(createMockResponse(mockLeagues))

      const result = await getUserLeagues('user-123', '2025')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.sleeper.app/v1/user/user-123/leagues/nfl/2025',
        expect.any(Object)
      )
      expect(result).toHaveLength(2)
    })

    it('returns empty array when user has no leagues', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse([]))

      const result = await getUserLeagues('user-123', '2025')

      expect(result).toEqual([])
    })

    it('throws for HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(null, 500, false))

      await expect(getUserLeagues('user-123', '2025')).rejects.toMatchObject({
        statusCode: 500,
      })
    })
  })

  describe('getLeague', () => {
    it('fetches league by ID', async () => {
      const mockLeague = createMockLeague()
      mockFetch.mockResolvedValueOnce(createMockResponse(mockLeague))

      const result = await getLeague('league-123')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.sleeper.app/v1/league/league-123',
        expect.any(Object)
      )
      expect(result).toEqual(mockLeague)
    })

    it('returns all league fields', async () => {
      const mockLeague = createMockLeague({
        name: 'Dynasty League',
        total_rosters: 14,
      })
      mockFetch.mockResolvedValueOnce(createMockResponse(mockLeague))

      const result = await getLeague('league-123')

      expect(result.name).toBe('Dynasty League')
      expect(result.total_rosters).toBe(14)
      expect(result.roster_positions).toBeDefined()
    })

    it('throws for HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(null, 404, false))

      await expect(getLeague('nonexistent')).rejects.toMatchObject({
        statusCode: 404,
      })
    })
  })

  describe('getLeagueRosters', () => {
    it('fetches rosters for league', async () => {
      const mockRosters = [
        createMockRoster({ roster_id: 1 }),
        createMockRoster({ roster_id: 2 }),
      ]
      mockFetch.mockResolvedValueOnce(createMockResponse(mockRosters))

      const result = await getLeagueRosters('league-123')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.sleeper.app/v1/league/league-123/rosters',
        expect.any(Object)
      )
      expect(result).toHaveLength(2)
    })

    it('returns roster with player arrays', async () => {
      const mockRoster = createMockRoster({
        players: ['4046', '6794', '4034'],
        starters: ['4046', '6794'],
      })
      mockFetch.mockResolvedValueOnce(createMockResponse([mockRoster]))

      const result = await getLeagueRosters('league-123')

      expect(result[0].players).toEqual(['4046', '6794', '4034'])
      expect(result[0].starters).toEqual(['4046', '6794'])
    })

    it('throws for HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(null, 500, false))

      await expect(getLeagueRosters('league-123')).rejects.toMatchObject({
        statusCode: 500,
      })
    })
  })

  describe('getLeagueUsers', () => {
    it('fetches users for league', async () => {
      const mockUsers = [
        createMockUser({ user_id: 'user-1' }),
        createMockUser({ user_id: 'user-2' }),
      ]
      mockFetch.mockResolvedValueOnce(createMockResponse(mockUsers))

      const result = await getLeagueUsers('league-123')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.sleeper.app/v1/league/league-123/users',
        expect.any(Object)
      )
      expect(result).toHaveLength(2)
    })

    it('returns user details', async () => {
      const mockUser = createMockUser({
        display_name: 'Fantasy King',
        avatar: 'avatar-123',
      })
      mockFetch.mockResolvedValueOnce(createMockResponse([mockUser]))

      const result = await getLeagueUsers('league-123')

      expect(result[0].display_name).toBe('Fantasy King')
      expect(result[0].avatar).toBe('avatar-123')
    })

    it('throws for HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(null, 403, false))

      await expect(getLeagueUsers('league-123')).rejects.toMatchObject({
        statusCode: 403,
      })
    })
  })

  describe('getMatchups', () => {
    it('fetches matchups for league and week', async () => {
      const mockMatchups = [
        createMockMatchup({ matchup_id: 1, roster_id: 1 }),
        createMockMatchup({ matchup_id: 1, roster_id: 2 }),
      ]
      mockFetch.mockResolvedValueOnce(createMockResponse(mockMatchups))

      const result = await getMatchups('league-123', 5)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.sleeper.app/v1/league/league-123/matchups/5',
        expect.any(Object)
      )
      expect(result).toHaveLength(2)
    })

    it('returns matchup with points and starters', async () => {
      const mockMatchup = createMockMatchup({
        points: 145.5,
        starters_points: [30.0, 25.5, 20.0],
      })
      mockFetch.mockResolvedValueOnce(createMockResponse([mockMatchup]))

      const result = await getMatchups('league-123', 10)

      expect(result[0].points).toBe(145.5)
      expect(result[0].starters_points).toEqual([30.0, 25.5, 20.0])
    })

    it('handles week 0 (preseason)', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse([]))

      const result = await getMatchups('league-123', 0)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.sleeper.app/v1/league/league-123/matchups/0',
        expect.any(Object)
      )
      expect(result).toEqual([])
    })

    it('throws for HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(null, 500, false))

      await expect(getMatchups('league-123', 1)).rejects.toMatchObject({
        statusCode: 500,
      })
    })
  })

  describe('getAllPlayers', () => {
    it('fetches all NFL players', async () => {
      const mockPlayers: Record<string, SleeperPlayer> = {
        '4046': createMockPlayer({ player_id: '4046', full_name: 'Patrick Mahomes' }),
        '6794': createMockPlayer({ player_id: '6794', full_name: 'Justin Jefferson' }),
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockPlayers))

      const result = await getAllPlayers()

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.sleeper.app/v1/players/nfl',
        expect.any(Object)
      )
      expect(Object.keys(result)).toHaveLength(2)
      expect(result['4046'].full_name).toBe('Patrick Mahomes')
    })

    it('returns player with all fields', async () => {
      const mockPlayer = createMockPlayer({
        team: 'KC',
        position: 'QB',
        injury_status: 'Questionable',
      })
      mockFetch.mockResolvedValueOnce(createMockResponse({ '4046': mockPlayer }))

      const result = await getAllPlayers()

      expect(result['4046'].team).toBe('KC')
      expect(result['4046'].position).toBe('QB')
      expect(result['4046'].injury_status).toBe('Questionable')
    })

    it('throws for HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(null, 500, false))

      await expect(getAllPlayers()).rejects.toMatchObject({
        statusCode: 500,
      })
    })
  })

  describe('getCurrentSeason', () => {
    it('returns season from NFL state', async () => {
      const mockState = createMockNFLState({ season: '2025' })
      mockFetch.mockResolvedValueOnce(createMockResponse(mockState))

      const result = await getCurrentSeason()

      expect(result).toBe('2025')
    })

    it('calls getNFLState internally', async () => {
      const mockState = createMockNFLState({ season: '2024' })
      mockFetch.mockResolvedValueOnce(createMockResponse(mockState))

      await getCurrentSeason()

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.sleeper.app/v1/state/nfl',
        expect.any(Object)
      )
    })

    it('propagates errors from getNFLState', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(null, 500, false))

      await expect(getCurrentSeason()).rejects.toMatchObject({
        statusCode: 500,
      })
    })
  })

  describe('Edge Cases', () => {
    it('handles empty response body', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(null))

      const result = await getNFLState()

      expect(result).toBeNull()
    })

    it('handles JSON parse errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockRejectedValue(new SyntaxError('Unexpected token')),
      } as unknown as Response)

      await expect(getNFLState()).rejects.toMatchObject({
        error: 'NetworkError',
        statusCode: 0,
      })
    })

    it('handles concurrent requests to different endpoints', async () => {
      const mockState = createMockNFLState()
      const mockUser = createMockUser()
      const mockLeague = createMockLeague()

      mockFetch
        .mockResolvedValueOnce(createMockResponse(mockState))
        .mockResolvedValueOnce(createMockResponse(mockUser))
        .mockResolvedValueOnce(createMockResponse(mockLeague))

      const [state, user, league] = await Promise.all([
        getNFLState(),
        getUserByUsername('testuser'),
        getLeague('league-123'),
      ])

      expect(state.season).toBe('2025')
      expect(user?.username).toBe('testuser')
      expect(league.name).toBe('Test League')
    })

    it('handles very long user IDs', async () => {
      const longId = '1'.repeat(100)
      const mockUser = createMockUser({ user_id: longId })
      mockFetch.mockResolvedValueOnce(createMockResponse(mockUser))

      const result = await getUserById(longId)

      expect(result?.user_id).toBe(longId)
    })

    it('handles league with null previous_league_id', async () => {
      const mockLeague = createMockLeague({ previous_league_id: null })
      mockFetch.mockResolvedValueOnce(createMockResponse(mockLeague))

      const result = await getLeague('league-123')

      expect(result.previous_league_id).toBeNull()
    })

    it('handles roster with null owner_id (orphaned team)', async () => {
      const mockRoster = createMockRoster({ owner_id: null })
      mockFetch.mockResolvedValueOnce(createMockResponse([mockRoster]))

      const result = await getLeagueRosters('league-123')

      expect(result[0].owner_id).toBeNull()
    })

    it('handles player with null team (free agent)', async () => {
      const mockPlayer = createMockPlayer({ team: null, status: 'Inactive' })
      mockFetch.mockResolvedValueOnce(createMockResponse({ '9999': mockPlayer }))

      const result = await getAllPlayers()

      expect(result['9999'].team).toBeNull()
    })
  })
})

describe('Rate Limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows 16 requests per second without throttling', async () => {
    vi.resetModules()
    global.fetch = mockFetch
    const { getNFLState } = await import('@/lib/sleeper/client')
    
    const mockState = createMockNFLState()
    for (let i = 0; i < 16; i++) {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockState))
    }

    const startTime = Date.now()
    const promises = Array.from({ length: 16 }, () => getNFLState())
    await Promise.all(promises)
    const elapsed = Date.now() - startTime
    
    expect(elapsed).toBeLessThan(100)
    expect(mockFetch).toHaveBeenCalledTimes(16)
  })

  it('throttles 17th request until window expires', async () => {
    vi.resetModules()
    global.fetch = mockFetch
    const { getNFLState } = await import('@/lib/sleeper/client')
    
    const mockState = createMockNFLState()
    for (let i = 0; i < 17; i++) {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockState))
    }

    const firstBatch = Array.from({ length: 16 }, () => getNFLState())
    await Promise.all(firstBatch)

    const seventeenthPromise = getNFLState()
    await vi.advanceTimersByTimeAsync(1020)
    await seventeenthPromise

    expect(mockFetch).toHaveBeenCalledTimes(17)
  })

  it('clears old requests from rate limit window', async () => {
    vi.resetModules()
    global.fetch = mockFetch
    const { getNFLState } = await import('@/lib/sleeper/client')
    
    const mockState = createMockNFLState()
    for (let i = 0; i < 20; i++) {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockState))
    }

    const firstBatch = Array.from({ length: 10 }, () => getNFLState())
    await Promise.all(firstBatch)

    await vi.advanceTimersByTimeAsync(1100)

    const secondBatch = Array.from({ length: 10 }, () => getNFLState())
    await Promise.all(secondBatch)

    expect(mockFetch).toHaveBeenCalledTimes(20)
  })
})

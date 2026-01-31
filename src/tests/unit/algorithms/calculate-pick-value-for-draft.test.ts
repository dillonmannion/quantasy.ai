import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SleeperDraft, SleeperDraftPick, SleeperLeague, SleeperPlayer } from '@/lib/sleeper/types'
import type { PickValueOutput } from '@/lib/algorithms/types'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        not: vi.fn(() => ({
          data: [
            { id: 'player1', projected_points: 300 },
            { id: 'player2', projected_points: 250 },
            { id: 'player3', projected_points: 200 },
          ],
          error: null,
        })),
      })),
    })),
  })),
}))

vi.mock('@/lib/sleeper/draft', () => ({
  getDraft: vi.fn(async (draftId: string): Promise<SleeperDraft> => ({
    draft_id: draftId,
    league_id: 'league123',
    type: 'snake',
    status: 'drafting',
    start_time: Date.now(),
    settings: {
      teams: 12,
      rounds: 15,
    },
    draft_order: null,
    slot_to_roster_id: null,
  })),
  getDraftPicks: vi.fn(async (): Promise<SleeperDraftPick[]> => [
    {
      pick_no: 1,
      player_id: 'drafted1',
      picked_by: 'user1',
      roster_id: 1,
      round: 1,
      draft_slot: 1,
      pick_id: 'pick1',
      metadata: {
        team: 'KC',
        status: 'Active',
        sport: 'nfl',
        position: 'QB',
        player_id: 'drafted1',
        number: '15',
        news_updated: null,
        last_name: 'Mahomes',
        injury_status: null,
        first_name: 'Patrick',
      },
    },
  ]),
  getDraftTradedPicks: vi.fn(async () => []),
}))

vi.mock('@/lib/sleeper', () => ({
  getAllPlayers: vi.fn(async () => ({
    player1: {
      player_id: 'player1',
      full_name: 'Player One',
      first_name: 'Player',
      last_name: 'One',
      team: 'KC',
      position: 'QB',
      age: 25,
      years_exp: 3,
      status: 'Active',
      injury_status: null,
      number: 1,
      height: '6-2',
      weight: '220',
      college: 'Test U',
      fantasy_positions: ['QB'],
      adp: 10,
    } as SleeperPlayer,
    player2: {
      player_id: 'player2',
      full_name: 'Player Two',
      first_name: 'Player',
      last_name: 'Two',
      team: 'SF',
      position: 'RB',
      age: 24,
      years_exp: 2,
      status: 'Active',
      injury_status: null,
      number: 2,
      height: '5-11',
      weight: '210',
      college: 'Test U',
      fantasy_positions: ['RB'],
      adp: 15,
    } as SleeperPlayer,
    player3: {
      player_id: 'player3',
      full_name: 'Player Three',
      first_name: 'Player',
      last_name: 'Three',
      team: 'DAL',
      position: 'WR',
      age: 26,
      years_exp: 4,
      status: 'Active',
      injury_status: null,
      number: 3,
      height: '6-0',
      weight: '200',
      college: 'Test U',
      fantasy_positions: ['WR'],
      adp: 20,
    } as SleeperPlayer,
    drafted1: {
      player_id: 'drafted1',
      full_name: 'Drafted Player',
      first_name: 'Drafted',
      last_name: 'Player',
      team: 'KC',
      position: 'QB',
      age: 28,
      years_exp: 5,
      status: 'Active',
      injury_status: null,
      number: 15,
      height: '6-3',
      weight: '230',
      college: 'Test U',
      fantasy_positions: ['QB'],
      adp: 1,
    } as SleeperPlayer,
  })),
  getLeague: vi.fn(async (leagueId: string): Promise<SleeperLeague> => ({
    league_id: leagueId,
    name: 'Test League',
    season: '2025',
    status: 'in_season',
    sport: 'nfl',
    settings: {
      playoff_week_start: 15,
      num_teams: 12,
      playoff_teams: 6,
      leg: 1,
    },
    scoring_settings: {
      pass_td: 4,
      pass_int: -2,
      rush_yd: 0.1,
      rush_td: 6,
      rec_yd: 0.1,
      rec_td: 6,
      rec: 1,
    },
    roster_positions: ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DEF'],
    total_rosters: 12,
    previous_league_id: null,
    draft_id: 'draft123',
  })),
}))

vi.mock('@/lib/algorithms/cache', () => ({
  getOrComputeAlgorithm: vi.fn(async (_type, _key, _leagueId, _params, computeFn) => {
    return computeFn()
  }),
  getProjectionVersion: vi.fn(async () => 1),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('calculatePickValueForDraft', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should calculate pick value for a single pick', async () => {
    const { calculatePickValueForDraft } = await import('@/lib/algorithms/calculate-pick-value-for-draft')
    const result = await calculatePickValueForDraft('draft123', 10, false)

    expect(result).toBeDefined()
    expect(typeof result).toBe('object')
    expect((result as PickValueOutput).value).toBeGreaterThanOrEqual(0)
    expect((result as PickValueOutput).value).toBeLessThanOrEqual(100)
    expect((result as PickValueOutput).breakdown).toBeDefined()
    expect((result as PickValueOutput).explanation).toBeDefined()
  })

  it('should throw error when pickNumber is missing and allPicks is false', async () => {
    const { calculatePickValueForDraft } = await import('@/lib/algorithms/calculate-pick-value-for-draft')
    await expect(calculatePickValueForDraft('draft123', undefined, false)).rejects.toThrow(
      'pickNumber is required when allPicks is false'
    )
  })

  it('should throw error when draft is not found', async () => {
    const sleeper = await import('@/lib/sleeper/draft')
    const getDraftMock = sleeper.getDraft as ReturnType<typeof vi.fn>
    getDraftMock.mockRejectedValueOnce(new Error('Not found'))

    const { calculatePickValueForDraft } = await import('@/lib/algorithms/calculate-pick-value-for-draft')
    await expect(calculatePickValueForDraft('invalid-draft', 10, false)).rejects.toThrow(
      'Draft not found'
    )
  })

  it('should throw error when no projections are available', async () => {
    const supabase = await import('@/lib/supabase/server')
    const createClientMock = supabase.createClient as ReturnType<typeof vi.fn>
    createClientMock.mockResolvedValueOnce({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          not: vi.fn(() => ({
            data: [],
            error: null,
          })),
        })),
      })),
    } as never)

    const { calculatePickValueForDraft } = await import('@/lib/algorithms/calculate-pick-value-for-draft')
    await expect(calculatePickValueForDraft('draft123', 10, false)).rejects.toThrow(
      'No projections available'
    )
  })

  it('should calculate pick values for all picks when allPicks is true', async () => {
    const { calculatePickValueForDraft } = await import('@/lib/algorithms/calculate-pick-value-for-draft')
    const result = await calculatePickValueForDraft('draft123', undefined, true)

    expect(Array.isArray(result)).toBe(true)
    expect((result as PickValueOutput[]).length).toBeGreaterThan(0)
    expect((result as PickValueOutput[])[0].value).toBeGreaterThanOrEqual(0)
    expect((result as PickValueOutput[])[0].value).toBeLessThanOrEqual(100)
  })

  it('should filter out drafted players from remaining players', async () => {
    const { calculatePickValueForDraft } = await import('@/lib/algorithms/calculate-pick-value-for-draft')
    const result = await calculatePickValueForDraft('draft123', 10, false)

    expect(result).toBeDefined()
    expect((result as PickValueOutput).breakdown.expectedPlayers).toBeDefined()
    const expectedPlayerIds = (result as PickValueOutput).breakdown.expectedPlayers.map(
      (p) => p.playerId
    )
    expect(expectedPlayerIds).not.toContain('drafted1')
  })
})

import { http, HttpResponse } from 'msw'
import {
  TEST_USER,
  TEST_LEAGUE,
  TEST_DRAFT,
  TEST_NFL_STATE,
  TEST_ROSTERS,
  TEST_PLAYERS,
  generateMockVBDRankings,
} from './data'

const SLEEPER_BASE = 'https://api.sleeper.app/v1'

// RLS test league - defined inline for isolation (NOT in data.ts)
const RLS_TEST_LEAGUE = {
  ...TEST_LEAGUE,
  league_id: 'rls-test-league',
  name: 'RLS Test League',
}

export const vbdHandler = http.post('*/api/algorithms/vbd', () => {
  const rankings = generateMockVBDRankings()
  return HttpResponse.json({
    rankings,
    baselines: {
      QB: { position: 'QB', baselineRank: 12, playerName: 'Mock QB', projectedPoints: 280 },
      RB: { position: 'RB', baselineRank: 24, playerName: 'Mock RB', projectedPoints: 180 },
      WR: { position: 'WR', baselineRank: 30, playerName: 'Mock WR', projectedPoints: 160 },
      TE: { position: 'TE', baselineRank: 12, playerName: 'Mock TE', projectedPoints: 120 },
    },
    metadata: {
      leagueId: '987654321',
      leagueName: 'Test Fantasy League',
      scoringFormat: 'ppr',
      totalPlayers: 50,
      limit: 50,
      offset: 0,
    },
    generatedAt: new Date().toISOString(),
  })
})

export const lineupHandler = http.post('*/api/algorithms/lineup', () => {
  return HttpResponse.json({
    currentLineup: {
      starters: [
        { playerId: '4046', name: 'Patrick Mahomes', position: 'QB', projectedPoints: 25.5 },
        { playerId: '6794', name: 'Justin Herbert', position: 'QB', projectedPoints: 22.3 },
      ],
      bench: [
        { playerId: '4034', name: 'Travis Kelce', position: 'TE', projectedPoints: 18.2 },
      ],
      totalProjectedPoints: 66.0,
    },
    optimizedLineup: {
      starters: [
        { playerId: '4046', name: 'Patrick Mahomes', position: 'QB', projectedPoints: 25.5 },
        { playerId: '4034', name: 'Travis Kelce', position: 'TE', projectedPoints: 18.2 },
      ],
      bench: [
        { playerId: '6794', name: 'Justin Herbert', position: 'QB', projectedPoints: 22.3 },
      ],
      totalProjectedPoints: 66.0,
    },
    explanation: {
      methodology: 'Optimized lineup based on projected points and position requirements.',
      changes: ['Moved Travis Kelce to starters for better projection'],
      caveats: ['Projections are estimates and may change'],
    },
  })
})

export const tradeHandler = http.post('*/api/algorithms/trade', () => {
  return HttpResponse.json({
    verdict: 'fair',
    fairnessScore: 2.5,
    givingValue: 45.2,
    receivingValue: 47.7,
    explanation: {
      methodology: 'Trade evaluated using VBD-based fairness scoring.',
      playerBreakdown: [
        { playerId: '4046', name: 'Patrick Mahomes', position: 'QB', vbdValue: 25.5, isGiving: true },
        { playerId: '4034', name: 'Travis Kelce', position: 'TE', vbdValue: 22.2, isGiving: false },
      ],
      caveats: ['Projections subject to change', 'Bye weeks not considered'],
    },
  })
})

export const sleeperHandlers = [
  http.get(`${SLEEPER_BASE}/state/nfl`, () => {
    return HttpResponse.json(TEST_NFL_STATE)
  }),

  http.get(`${SLEEPER_BASE}/user/:username`, ({ params }) => {
    const { username } = params
    if (username === 'testuser' || username === TEST_USER.user_id) {
      return HttpResponse.json(TEST_USER)
    }
    if (username === 'nonexistentuser') {
      return new HttpResponse(null, { status: 404 })
    }
    return HttpResponse.json(TEST_USER)
  }),

  http.get(`${SLEEPER_BASE}/user/:userId/leagues/nfl/:season`, () => {
    return HttpResponse.json([TEST_LEAGUE, RLS_TEST_LEAGUE])
  }),

  http.get(`${SLEEPER_BASE}/league/:leagueId`, ({ params }) => {
    const { leagueId } = params
    if (leagueId === 'rls-test-league') {
      return HttpResponse.json(RLS_TEST_LEAGUE)
    }
    return HttpResponse.json(TEST_LEAGUE)
  }),

  http.get(`${SLEEPER_BASE}/league/:leagueId/rosters`, () => {
    return HttpResponse.json(TEST_ROSTERS)
  }),

  http.get(`${SLEEPER_BASE}/league/:leagueId/users`, () => {
    return HttpResponse.json([TEST_USER])
  }),

  http.get(`${SLEEPER_BASE}/league/:leagueId/drafts`, () => {
    return HttpResponse.json([TEST_DRAFT])
  }),

  http.get(`${SLEEPER_BASE}/league/:leagueId/matchups/:week`, () => {
    return HttpResponse.json([])
  }),

  http.get(`${SLEEPER_BASE}/draft/:draftId`, () => {
    return HttpResponse.json(TEST_DRAFT)
  }),

  http.get(`${SLEEPER_BASE}/draft/:draftId/picks`, () => {
    return HttpResponse.json([])
  }),

  http.get(`${SLEEPER_BASE}/players/nfl`, () => {
    return HttpResponse.json(TEST_PLAYERS)
  }),
]

export const handlers = [vbdHandler, lineupHandler, tradeHandler, ...sleeperHandlers]

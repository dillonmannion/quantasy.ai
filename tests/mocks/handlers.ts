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
  // Return LineupOutput format matching the algorithm types
  return HttpResponse.json({
    starters: [
      {
        playerId: '4046',
        fullName: 'Patrick Mahomes',
        team: 'KC',
        position: 'QB',
        eligiblePositions: ['QB', 'SUPERFLEX'],
        projectedPoints: 25.5,
        injuryStatus: null,
        status: 'Active',
      },
      {
        playerId: '6794',
        fullName: 'Derrick Henry',
        team: 'BAL',
        position: 'RB',
        eligiblePositions: ['RB', 'FLEX'],
        projectedPoints: 18.3,
        injuryStatus: null,
        status: 'Active',
      },
      {
        playerId: '4034',
        fullName: 'Travis Kelce',
        team: 'KC',
        position: 'TE',
        eligiblePositions: ['TE', 'FLEX'],
        projectedPoints: 14.2,
        injuryStatus: null,
        status: 'Active',
      },
    ],
    bench: [
      {
        playerId: '6801',
        fullName: 'Justin Herbert',
        team: 'LAC',
        position: 'QB',
        eligiblePositions: ['QB', 'SUPERFLEX'],
        projectedPoints: 22.3,
        injuryStatus: null,
        status: 'Active',
      },
      {
        playerId: '5001',
        fullName: 'Bench RB',
        team: 'SF',
        position: 'RB',
        eligiblePositions: ['RB', 'FLEX'],
        projectedPoints: 8.5,
        injuryStatus: 'Questionable',
        status: 'Active',
      },
    ],
    projectedPoints: 58.0,
    explanation: {
      algorithm: 'lineup_optimizer_v1',
      timestamp: new Date().toISOString(),
      inputsSummary: {
        rosterCount: 5,
        slotCount: 5,
        starterSlots: 3,
        benchSlots: 2,
        week: 1,
      },
      excludedPlayers: [],
      decisions: [
        {
          slotId: 'slot-1',
          slotType: 'starter',
          allowedPositions: ['QB'],
          playerId: '4046',
          fullName: 'Patrick Mahomes',
          projectedPoints: 25.5,
          reason: 'Highest projected points at QB position',
        },
        {
          slotId: 'slot-2',
          slotType: 'starter',
          allowedPositions: ['RB'],
          playerId: '6794',
          fullName: 'Derrick Henry',
          projectedPoints: 18.3,
          reason: 'Highest projected points at RB position',
        },
      ],
      caveats: [
        'Projections are estimates and may change before game time',
        'Injury statuses should be verified before lineup lock',
      ],
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

export const waiversHandler = http.post('*/api/algorithms/waivers', () => {
  return HttpResponse.json({
    recommendations: [
      {
        player: {
          playerId: 'wr-1',
          fullName: 'Test WR',
          position: 'WR',
          team: 'KC',
          eligiblePositions: ['WR'],
          projectedPoints: 180,
          injuryStatus: null,
          status: 'Active',
          byeWeek: null,
        },
        priorityScore: 45.5,
        suggestedFaabBid: {
          min: 24,
          max: 36,
          budgetPercentageMin: 24,
          budgetPercentageMax: 36,
        },
        vbdImprovement: 35,
        reasons: [
          'VBD: 40 (proj: 180 - baseline: 140)',
          'Improvement: +35 over Worst WR (5)',
          'Need: 1.3x (Starter upgrade)',
          'Priority score: 45.5 = 35 × 1.3',
          'FAAB range: $24-$36 (24%-36% of $100)',
        ],
      },
    ],
    droppable: [
      {
        playerId: 'rb-bench',
        fullName: 'Bench RB',
        position: 'RB',
        team: 'SF',
        eligiblePositions: ['RB'],
        projectedPoints: 80,
        injuryStatus: null,
        status: 'Active',
        byeWeek: null,
      },
    ],
    explanation: {
      algorithm: 'waiver_v1',
      timestamp: new Date().toISOString(),
      methodology: '## Waiver Priority Calculation\n\nRecommendations based on VBD improvement and roster need.',
      caveats: ['Bye week conflicts not factored in v1'],
      priorityFactors: ['VBD improvement', 'Roster need'],
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

export const handlers = [vbdHandler, lineupHandler, tradeHandler, waiversHandler, ...sleeperHandlers]

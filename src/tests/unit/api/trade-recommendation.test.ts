import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import crypto from 'crypto'

vi.mock('@/lib/supabase/server')
vi.mock('@/lib/ai')

import { POST } from '@/app/api/ai/trade-recommendation/route'
import * as supabaseModule from '@/lib/supabase/server'
import * as aiModule from '@/lib/ai'

function computeCacheKey(leagueId: string, myRosterId: number, targetRosterId: number, scoringFormat: string): string {
  const hashInput = JSON.stringify({
    league_id: leagueId,
    my_roster_id: myRosterId,
    target_roster_id: targetRosterId,
    scoring_format: scoringFormat,
  })
  return crypto.createHash('sha256').update(hashInput).digest('hex')
}

const mockGetUser = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockMaybeSingle = vi.fn()
const mockUpsert = vi.fn()
const mockGenerateTradeRecommendation = vi.fn()
const mockCheckLimit = vi.fn()

describe('POST /api/ai/trade-recommendation', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockSelect.mockReturnValue({
      eq: mockEq,
    })
    mockEq.mockReturnValue({
      eq: mockEq,
      maybeSingle: mockMaybeSingle,
    })
    mockMaybeSingle.mockResolvedValue({ data: null })
    mockUpsert.mockResolvedValue({ data: null })
    mockCheckLimit.mockReturnValue({ allowed: true })

    vi.mocked(supabaseModule.createClient).mockResolvedValue({
      auth: {
        getUser: mockGetUser,
      },
      from: vi.fn((table: string) => {
        if (table === 'algorithm_outputs') {
          return {
            select: mockSelect,
            upsert: mockUpsert,
          }
        }
      }),
    } as any)

    vi.mocked(aiModule.generateTradeRecommendation).mockImplementation(
      mockGenerateTradeRecommendation
    )
    Object.defineProperty(aiModule.aiRateLimiter, 'checkLimit', {
      value: mockCheckLimit,
      writable: true,
    })
  })

  it('returns 401 for unauthenticated requests', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
    })

    const request = new NextRequest('http://localhost:3000/api/ai/trade-recommendation', {
      method: 'POST',
      body: JSON.stringify({
        leagueId: 'league123',
        myRosterId: 1,
        myPlayers: [{ playerId: 'p1', name: 'Player 1', position: 'QB', value: 50 }],
        targetRosterId: 2,
        targetPlayers: [{ playerId: 'p2', name: 'Player 2', position: 'RB', value: 45 }],
        myNeeds: ['WR'],
        theirNeeds: ['QB'],
        scoringFormat: 'ppr',
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('Unauthorized')
  })

  it('returns 400 for missing required fields', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'user123' } },
    })

    const request = new NextRequest('http://localhost:3000/api/ai/trade-recommendation', {
      method: 'POST',
      body: JSON.stringify({
        leagueId: 'league123',
        // Missing myRosterId
        myPlayers: [{ playerId: 'p1', name: 'Player 1', position: 'QB', value: 50 }],
        targetRosterId: 2,
        targetPlayers: [{ playerId: 'p2', name: 'Player 2', position: 'RB', value: 45 }],
        myNeeds: ['WR'],
        theirNeeds: ['QB'],
        scoringFormat: 'ppr',
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('Missing required fields')
  })

  it('returns cached response when available', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'user123' } },
    })

    const leagueId = 'league123'
    const myRosterId = 1
    const targetRosterId = 2
    const scoringFormat = 'ppr'
    const cachedRecommendation = 'Trade Player 1 for Player 2'
    const generatedAt = '2025-02-02T00:00:00Z'
    const cacheKey = computeCacheKey(leagueId, myRosterId, targetRosterId, scoringFormat)

    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        explanation: {
          ai_text: cachedRecommendation,
          cache_key_hash: cacheKey,
          generated_at: generatedAt,
        },
      },
    })

    const request = new NextRequest('http://localhost:3000/api/ai/trade-recommendation', {
      method: 'POST',
      body: JSON.stringify({
        leagueId,
        myRosterId,
        myPlayers: [{ playerId: 'p1', name: 'Player 1', position: 'QB', value: 50 }],
        targetRosterId,
        targetPlayers: [{ playerId: 'p2', name: 'Player 2', position: 'RB', value: 45 }],
        myNeeds: ['WR'],
        theirNeeds: ['QB'],
        scoringFormat,
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.recommendation).toBe(cachedRecommendation)
    expect(data.cached).toBe(true)
    expect(data.generatedAt).toBe(generatedAt)
  })

  it('returns 429 when rate limited', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'user123' } },
    })

    mockMaybeSingle.mockResolvedValueOnce({
      data: null,
    })

    mockCheckLimit.mockReturnValueOnce({
      allowed: false,
      retryAfterMs: 5000,
    })

    const request = new NextRequest('http://localhost:3000/api/ai/trade-recommendation', {
      method: 'POST',
      body: JSON.stringify({
        leagueId: 'league123',
        myRosterId: 1,
        myPlayers: [{ playerId: 'p1', name: 'Player 1', position: 'QB', value: 50 }],
        targetRosterId: 2,
        targetPlayers: [{ playerId: 'p2', name: 'Player 2', position: 'RB', value: 45 }],
        myNeeds: ['WR'],
        theirNeeds: ['QB'],
        scoringFormat: 'ppr',
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(429)
    const data = await response.json()
    expect(data.error).toBe('Rate limited')
    expect(data.retryAfterMs).toBe(5000)
  })
})

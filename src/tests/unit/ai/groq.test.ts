import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { generateTradeRecommendation, generateExplanation } from '@/lib/ai'
import type { GenerateTradeRecommendationParams, GenerateExplanationParams } from '@/lib/ai'

const mockCreate = vi.fn()

vi.mock('groq-sdk', () => {
  return {
    default: class MockGroq {
      chat = {
        completions: {
          create: mockCreate,
        },
      }
    },
  }
})

describe('generateTradeRecommendation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GROQ_API_KEY = 'test-key'
  })

  afterEach(() => {
    vi.clearAllMocks()
    delete process.env.GROQ_API_KEY
  })

  it('returns recommendation string from Groq API', async () => {
    const mockResponse = 'Trade Patrick Mahomes for Josh Allen and a 2nd round pick'

    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: mockResponse,
          },
        },
      ],
    })

    const params: GenerateTradeRecommendationParams = {
      leagueId: 'league123',
      myRosterId: 1,
      myPlayers: [
        { name: 'Patrick Mahomes', position: 'QB', value: 50 },
        { name: 'Travis Kelce', position: 'TE', value: 40 },
      ],
      targetRosterId: 2,
      targetPlayers: [
        { name: 'Josh Allen', position: 'QB', value: 45 },
        { name: 'Mark Andrews', position: 'TE', value: 35 },
      ],
      myNeeds: ['WR', 'RB'],
      theirNeeds: ['QB', 'TE'],
      scoringFormat: 'ppr',
    }

    const result = await generateTradeRecommendation(params)

    expect(result).toBe(mockResponse)
    expect(mockCreate).toHaveBeenCalledOnce()
  })

  it('calls Groq with correct prompt structure', async () => {
    const mockResponse = 'Recommended trade proposal'

    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: mockResponse,
          },
        },
      ],
    })

    const params: GenerateTradeRecommendationParams = {
      leagueId: 'league123',
      myRosterId: 1,
      myPlayers: [{ name: 'Patrick Mahomes', position: 'QB', value: 50 }],
      targetRosterId: 2,
      targetPlayers: [{ name: 'Josh Allen', position: 'QB', value: 45 }],
      myNeeds: ['WR'],
      theirNeeds: ['RB'],
      scoringFormat: 'ppr',
    }

    await generateTradeRecommendation(params)

    const callArgs = mockCreate.mock.calls[0][0]
    expect(callArgs.model).toBe('llama-3.1-8b-instant')
    expect(callArgs.messages).toHaveLength(1)
    expect(callArgs.messages[0].role).toBe('user')
    expect(callArgs.messages[0].content).toContain('Patrick Mahomes')
    expect(callArgs.messages[0].content).toContain('Josh Allen')
    expect(callArgs.temperature).toBe(0.7)
    expect(callArgs.max_tokens).toBe(500)
  })

  it('throws error when Groq returns no content', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: null,
          },
        },
      ],
    })

    const params: GenerateTradeRecommendationParams = {
      leagueId: 'league123',
      myRosterId: 1,
      myPlayers: [{ name: 'Patrick Mahomes', position: 'QB', value: 50 }],
      targetRosterId: 2,
      targetPlayers: [{ name: 'Josh Allen', position: 'QB', value: 45 }],
      myNeeds: ['WR'],
      theirNeeds: ['RB'],
      scoringFormat: 'ppr',
    }

    await expect(generateTradeRecommendation(params)).rejects.toThrow(
      'No response from Groq API'
    )
  })

  it('returns fallback string when GROQ_API_KEY is missing', async () => {
    delete process.env.GROQ_API_KEY

    const params: GenerateTradeRecommendationParams = {
      leagueId: 'league123',
      myRosterId: 1,
      myPlayers: [{ name: 'Patrick Mahomes', position: 'QB', value: 50 }],
      targetRosterId: 2,
      targetPlayers: [{ name: 'Josh Allen', position: 'QB', value: 45 }],
      myNeeds: ['WR'],
      theirNeeds: ['RB'],
      scoringFormat: 'ppr',
    }

    const result = await generateTradeRecommendation(params)

    expect(result).toBe('AI trade recommendations are currently unavailable.')
    expect(mockCreate).not.toHaveBeenCalled()
  })
})

describe('generateExplanation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GROQ_API_KEY = 'test-key'
  })

  afterEach(() => {
    vi.clearAllMocks()
    delete process.env.GROQ_API_KEY
  })

  it('returns fallback string when GROQ_API_KEY is missing', async () => {
    delete process.env.GROQ_API_KEY

    const params: GenerateExplanationParams = {
      playerName: 'Patrick Mahomes',
      position: 'QB',
      vbd: 45.2,
      projectedPoints: 380.5,
      baselinePlayerName: 'Jared Goff',
      baselinePoints: 335.3,
      scoringFormat: 'ppr',
    }

    const result = await generateExplanation(params)

    expect(result).toBe('AI explanations are currently unavailable.')
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('returns explanation string from Groq API when API key is set', async () => {
    const mockResponse = 'Patrick Mahomes is valuable because...'

    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: mockResponse,
          },
        },
      ],
    })

    const params: GenerateExplanationParams = {
      playerName: 'Patrick Mahomes',
      position: 'QB',
      vbd: 45.2,
      projectedPoints: 380.5,
      baselinePlayerName: 'Jared Goff',
      baselinePoints: 335.3,
      scoringFormat: 'ppr',
    }

    const result = await generateExplanation(params)

    expect(result).toBe(mockResponse)
    expect(mockCreate).toHaveBeenCalledOnce()
  })
})

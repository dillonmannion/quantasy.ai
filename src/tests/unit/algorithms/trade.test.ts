import { describe, it, expect } from 'vitest'
import { evaluateTrade } from '@/lib/algorithms/trade'
import type {
  AlgorithmPlayer,
  Position,
  PositionBaseline,
  RosterSlot,
  TradeInput,
} from '@/lib/algorithms/types'

function createMockAlgorithmPlayer(
  playerId: string,
  fullName: string,
  position: Position,
  projectedPoints: number,
  eligiblePositions: Position[] = [position]
): AlgorithmPlayer {
  return {
    playerId,
    fullName,
    team: 'KC',
    position,
    eligiblePositions,
    projectedPoints,
    injuryStatus: null,
    status: 'Active',
    byeWeek: null,
  }
}

function createMockBaselines(overrides?: Partial<Record<Position, number>>): Record<Position, PositionBaseline> {
  const baseValues: Record<Position, number> = {
    QB: 200,
    RB: 150,
    WR: 140,
    TE: 110,
    K: 100,
    DEF: 90,
    DL: 50,
    LB: 45,
    DB: 40,
    FLEX: 150,
    SUPERFLEX: 200,
    REC_FLEX: 140,
    WRRB_FLEX: 140,
    IDP_FLEX: 45,
  }

  const baselines: Record<Position, PositionBaseline> = {} as Record<Position, PositionBaseline>
  const merged = { ...baseValues, ...overrides }
  Object.entries(merged).forEach(([position, projectedPoints]) => {
    baselines[position as Position] = {
      position: position as Position,
      playerId: `${position.toLowerCase()}-baseline`,
      playerName: `${position} Baseline`,
      team: null,
      projectedPoints,
      baselineRank: 12,
    }
  })

  return baselines
}

function createMockTradeInput(partial?: Partial<TradeInput>): TradeInput {
  return {
    giving: [],
    receiving: [],
    leagueSettings: {
      baselines: createMockBaselines(),
    },
    ...partial,
  }
}

describe('evaluateTrade', () => {
  it('calculates a fair 1-for-1 trade with balanced value', () => {
    const giving = [createMockAlgorithmPlayer('qb-1', 'QB One', 'QB', 250)]
    const receiving = [createMockAlgorithmPlayer('rb-1', 'RB One', 'RB', 200)]

    const input = createMockTradeInput({ giving, receiving })
    const result = evaluateTrade(input)

    expect(result.givingValue).toBe(50)
    expect(result.receivingValue).toBe(50)
    expect(result.fairnessScore).toBe(0)
    expect(result.verdict).toBe('fair')
    expect(result.explanation.playerBreakdown).toHaveLength(2)
  })

  it('scores a 2-for-1 trade as a slight advantage', () => {
    const giving = [
      createMockAlgorithmPlayer('rb-1', 'RB One', 'RB', 180),
      createMockAlgorithmPlayer('wr-1', 'WR One', 'WR', 170),
    ]
    const receiving = [createMockAlgorithmPlayer('qb-1', 'QB One', 'QB', 245)]

    const input = createMockTradeInput({ giving, receiving })
    const result = evaluateTrade(input)

    expect(result.givingValue).toBe(60)
    expect(result.receivingValue).toBe(45)
    expect(result.fairnessScore).toBeCloseTo(-25, 1)
    expect(result.verdict).toBe('bad')
  })

  it('scores a 3-for-2 trade as a significant advantage', () => {
    const giving = [
      createMockAlgorithmPlayer('rb-1', 'RB One', 'RB', 160),
      createMockAlgorithmPlayer('wr-1', 'WR One', 'WR', 155),
      createMockAlgorithmPlayer('te-1', 'TE One', 'TE', 120),
    ]
    const receiving = [
      createMockAlgorithmPlayer('qb-1', 'QB One', 'QB', 270),
      createMockAlgorithmPlayer('rb-2', 'RB Two', 'RB', 195),
    ]

    const input = createMockTradeInput({ giving, receiving })
    const result = evaluateTrade(input)

    expect(result.givingValue).toBe(35)
    expect(result.receivingValue).toBe(115)
    expect(result.fairnessScore).toBeCloseTo(69.6, 1)
    expect(result.verdict).toBe('great')
  })

  it('returns fair verdict for balanced values within +/-10 range', () => {
    const giving = [createMockAlgorithmPlayer('rb-1', 'RB One', 'RB', 170)]
    const receiving = [createMockAlgorithmPlayer('wr-1', 'WR One', 'WR', 162)]

    const input = createMockTradeInput({ giving, receiving })
    const result = evaluateTrade(input)

    expect(result.fairnessScore).toBeCloseTo(9, 0)
    expect(result.verdict).toBe('fair')
  })

  it('returns veto-worthy verdict for lopsided negative values', () => {
    const giving = [createMockAlgorithmPlayer('qb-1', 'QB One', 'QB', 250)]
    const receiving = [createMockAlgorithmPlayer('rb-1', 'RB One', 'RB', 160)]

    const input = createMockTradeInput({ giving, receiving })
    const result = evaluateTrade(input)

    expect(result.fairnessScore).toBeCloseTo(-80, 0)
    expect(result.verdict).toBe('veto-worthy')
  })

  it('handles empty trades with neutral output', () => {
    const result = evaluateTrade(createMockTradeInput())

    expect(result.givingValue).toBe(0)
    expect(result.receivingValue).toBe(0)
    expect(result.fairnessScore).toBe(0)
    expect(result.verdict).toBe('fair')
    expect(result.explanation.playerBreakdown).toEqual([])
  })

  it('includes lineup impact when roster, slots, and week are provided', () => {
    const slots: RosterSlot[] = [
      { slotId: 'qb', slotType: 'starter', allowedPositions: ['QB'] },
      { slotId: 'rb', slotType: 'starter', allowedPositions: ['RB'] },
      { slotId: 'flex', slotType: 'starter', allowedPositions: ['FLEX'] },
    ]

    const currentRoster = [
      createMockAlgorithmPlayer('qb-1', 'QB One', 'QB', 240),
      createMockAlgorithmPlayer('rb-1', 'RB One', 'RB', 155),
      createMockAlgorithmPlayer('rb-2', 'RB Two', 'RB', 130),
    ]

    const giving = [createMockAlgorithmPlayer('rb-2', 'RB Two', 'RB', 130)]
    const receiving = [createMockAlgorithmPlayer('rb-3', 'RB Three', 'RB', 190)]

    const input = createMockTradeInput({
      giving,
      receiving,
      currentRoster,
      week: 6,
      leagueSettings: {
        baselines: createMockBaselines(),
        rosterSlots: slots,
      },
    })

    const result = evaluateTrade(input)

    expect(result.explanation.lineupImpact).not.toBeNull()
    expect(result.explanation.lineupImpact?.delta).toBeGreaterThan(0)
    expect(result.explanation.lineupImpact?.preTrade.projectedPoints).toBeDefined()
    expect(result.explanation.lineupImpact?.postTrade.projectedPoints).toBeDefined()
  })

  it('adds a caveat when lineup impact cannot be computed', () => {
    const giving = [createMockAlgorithmPlayer('rb-1', 'RB One', 'RB', 160)]
    const receiving = [createMockAlgorithmPlayer('wr-1', 'WR One', 'WR', 175)]

    const input = createMockTradeInput({ giving, receiving })
    const result = evaluateTrade(input)

    expect(result.explanation.lineupImpact).toBeNull()
    expect(result.explanation.caveats.length).toBeGreaterThan(0)
  })
})

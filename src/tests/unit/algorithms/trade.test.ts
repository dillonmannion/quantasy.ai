import { describe, it, expect } from 'vitest'
import { evaluateTrade } from '@/lib/algorithms/trade'
import { calculateDynastyVBD } from '@/lib/algorithms/dynasty-vbd'
import { getDraftPickValue } from '@/lib/algorithms/draft-picks'
import type { DraftPick } from '@/lib/algorithms/draft-picks'
import type {
  AlgorithmPlayer,
  DynastyTradeInput,
  PlayerRanking,
  Position,
  PositionBaseline,
  RosterSlot,
} from '@/lib/algorithms/types'

function createMockAlgorithmPlayer(
  playerId: string,
  fullName: string,
  position: Position,
  projectedPoints: number,
  eligiblePositions: Position[] = [position],
  age?: number
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
    age,
  }
}

function createMockPlayerRanking(player: AlgorithmPlayer, vbdScore: number): PlayerRanking {
  return {
    playerId: player.playerId,
    fullName: player.fullName,
    firstName: null,
    lastName: null,
    team: player.team,
    position: player.position,
    eligiblePositions: player.eligiblePositions,
    projectedPoints: player.projectedPoints,
    vbdScore,
    overallRank: 0,
    positionRank: 0,
    status: player.status,
    injuryStatus: player.injuryStatus,
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

function createMockTradeInput(partial?: Partial<DynastyTradeInput>): DynastyTradeInput {
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

  it('applies dynasty value adjustments when enabled', () => {
    const baselines = createMockBaselines({ RB: 0 })
    const giving = [createMockAlgorithmPlayer('rb-1', 'RB Young', 'RB', 100, ['RB'], 23)]
    const receiving = [createMockAlgorithmPlayer('rb-2', 'RB Old', 'RB', 100, ['RB'], 32)]

    const input = createMockTradeInput({
      giving,
      receiving,
      leagueSettings: { baselines },
      useDynastyValues: true,
    })

    const givingVbd = giving[0].projectedPoints - baselines.RB.projectedPoints
    const receivingVbd = receiving[0].projectedPoints - baselines.RB.projectedPoints
    const givingDynasty = calculateDynastyVBD({
      player: createMockPlayerRanking(giving[0], givingVbd),
      age: giving[0].age ?? 0,
    }).dynastyVBD
    const receivingDynasty = calculateDynastyVBD({
      player: createMockPlayerRanking(receiving[0], receivingVbd),
      age: receiving[0].age ?? 0,
    }).dynastyVBD
    const maxAbs = Math.max(Math.abs(givingDynasty), Math.abs(receivingDynasty))
    const expectedFairness =
      maxAbs === 0 ? 0 : ((receivingDynasty - givingDynasty) / maxAbs) * 100

    const result = evaluateTrade(input)

    expect(result.givingValue).toBe(givingDynasty)
    expect(result.receivingValue).toBe(receivingDynasty)
    expect(result.givingValue).toBeGreaterThan(result.receivingValue)
    expect(result.fairnessScore).toBeCloseTo(expectedFairness, 2)
  })

  it('adds draft pick values to trade totals', () => {
    const baselines = createMockBaselines({ RB: 0, WR: 0 })
    const giving = [createMockAlgorithmPlayer('rb-1', 'RB One', 'RB', 100)]
    const receiving = [createMockAlgorithmPlayer('wr-1', 'WR One', 'WR', 80)]
    const givingDraftPicks: DraftPick[] = [{ year: 2026, round: 2, position: 'mid' }]
    const receivingDraftPicks: DraftPick[] = [{ year: 2025, round: 1, position: 'early' }]

    const input = createMockTradeInput({
      giving,
      receiving,
      givingDraftPicks,
      receivingDraftPicks,
      currentYear: 2025,
      leagueSettings: { baselines },
    })

    const givingValue = giving[0].projectedPoints - baselines.RB.projectedPoints
    const receivingValue = receiving[0].projectedPoints - baselines.WR.projectedPoints
    const expectedGiving = givingValue + getDraftPickValue(givingDraftPicks[0], 2025)
    const expectedReceiving =
      receivingValue + getDraftPickValue(receivingDraftPicks[0], 2025)

    const result = evaluateTrade(input)

    expect(result.givingValue).toBeCloseTo(expectedGiving, 5)
    expect(result.receivingValue).toBeCloseTo(expectedReceiving, 5)
  })
})

import { describe, it, expect } from 'vitest'
import { evaluateTrade } from '@/lib/algorithms/trade'
import { calculateDynastyVBD } from '@/lib/algorithms/dynasty-vbd'
import { getDraftPickValue } from '@/lib/algorithms/draft-picks'
import type { DraftPick } from '@/lib/algorithms/draft-picks'
import type {
  AlgorithmPlayer,
  DraftPickAsset,
  DynastyTradeInput,
  FutureRookiePickAsset,
  PlayerAsset,
  PlayerRanking,
  Position,
  PositionBaseline,
  RosterSlot,
  TradeableAsset,
  TradeInputV2,
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

function createMockPlayerAsset(overrides?: Partial<PlayerAsset>): PlayerAsset {
  return {
    type: 'player',
    playerId: 'player-1',
    fullName: 'Test Player',
    position: 'RB',
    projectedPoints: 200,
    ...overrides,
  }
}

function createMockDraftPickAsset(overrides?: Partial<DraftPickAsset>): DraftPickAsset {
  return {
    type: 'draft_pick',
    pickId: 'pick-2025-1-01',
    pickNumber: 1,
    round: 1,
    rosterId: 1,
    year: 2025,
    isFutureRookie: false,
    ...overrides,
  }
}

function createMockFutureRookiePickAsset(
  overrides?: Partial<FutureRookiePickAsset>
): FutureRookiePickAsset {
  return {
    type: 'future_rookie_pick',
    pickId: 'pick-2026-1-01',
    pickNumber: 1,
    round: 1,
    rosterId: 1,
    year: 2026,
    ...overrides,
  }
}

function createMockTradeInputV2(partial?: Partial<TradeInputV2>): TradeInputV2 {
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

  describe('TradeInputV2 with TradeableAssets', () => {
    const currentYear = new Date().getFullYear()

    it('evaluates player-for-pick trade using TradeInputV2', () => {
      const baselines = createMockBaselines({ RB: 0 })
      const giving: TradeableAsset[] = [
        createMockPlayerAsset({
          playerId: 'rb-1',
          fullName: 'RB One',
          position: 'RB',
          projectedPoints: 100,
        }),
      ]
      const receiving: TradeableAsset[] = [
        createMockDraftPickAsset({
          pickId: `pick-${currentYear}-1-01`,
          round: 1,
          year: currentYear,
        }),
      ]

      const input = createMockTradeInputV2({
        giving,
        receiving,
        leagueSettings: { baselines },
      })

      const result = evaluateTrade(input)

      expect(result.givingValue).toBe(100)
      expect(result.receivingValue).toBe(getDraftPickValue({ year: currentYear, round: 1, position: 'unknown' }, currentYear))
      expect(result.verdict).toBeDefined()
      expect(result.explanation.playerBreakdown).toBeDefined()
    })

    it('evaluates pick-for-pick trade using TradeInputV2', () => {
      const giving: TradeableAsset[] = [
        createMockDraftPickAsset({
          pickId: `pick-${currentYear}-2-01`,
          round: 2,
          year: currentYear,
        }),
      ]
      const receiving: TradeableAsset[] = [
        createMockDraftPickAsset({
          pickId: `pick-${currentYear}-1-12`,
          round: 1,
          year: currentYear,
        }),
      ]

      const input = createMockTradeInputV2({ giving, receiving })
      const result = evaluateTrade(input)

      const givingPickValue = getDraftPickValue({ year: currentYear, round: 2, position: 'unknown' }, currentYear)
      const receivingPickValue = getDraftPickValue({ year: currentYear, round: 1, position: 'unknown' }, currentYear)

      expect(result.givingValue).toBe(givingPickValue)
      expect(result.receivingValue).toBe(receivingPickValue)
      expect(result.receivingValue).toBeGreaterThan(result.givingValue)
    })

    it('evaluates multi-asset trade with players and picks', () => {
      const baselines = createMockBaselines({ RB: 0, WR: 0 })
      const giving: TradeableAsset[] = [
        createMockPlayerAsset({
          playerId: 'rb-1',
          fullName: 'RB One',
          position: 'RB',
          projectedPoints: 150,
        }),
        createMockDraftPickAsset({
          pickId: `pick-${currentYear}-2-01`,
          round: 2,
          year: currentYear,
        }),
      ]
      const receiving: TradeableAsset[] = [
        createMockPlayerAsset({
          playerId: 'wr-1',
          fullName: 'WR One',
          position: 'WR',
          projectedPoints: 200,
        }),
      ]

      const input = createMockTradeInputV2({
        giving,
        receiving,
        leagueSettings: { baselines },
      })

      const result = evaluateTrade(input)

      const playerValue = 150
      const pickValue = getDraftPickValue({ year: currentYear, round: 2, position: 'unknown' }, currentYear)
      const expectedGiving = playerValue + pickValue

      expect(result.givingValue).toBeCloseTo(expectedGiving, 5)
      expect(result.receivingValue).toBe(200)
    })

    it('evaluates future rookie pick trade', () => {
      const baselines = createMockBaselines({ RB: 0 })
      const nextYear = currentYear + 1
      const giving: TradeableAsset[] = [
        createMockPlayerAsset({
          playerId: 'rb-1',
          fullName: 'RB One',
          position: 'RB',
          projectedPoints: 100,
        }),
      ]
      const receiving: TradeableAsset[] = [
        createMockFutureRookiePickAsset({
          pickId: `pick-${nextYear}-1-01`,
          round: 1,
          year: nextYear,
        }),
      ]

      const input = createMockTradeInputV2({
        giving,
        receiving,
        leagueSettings: { baselines },
      })

      const result = evaluateTrade(input)

      const futurePickValue = getDraftPickValue({ year: nextYear, round: 1, position: 'unknown' }, currentYear)

      expect(result.givingValue).toBe(100)
      expect(result.receivingValue).toBe(futurePickValue)
      expect(result.receivingValue).toBeGreaterThan(result.givingValue)
    })

    it('handles empty TradeInputV2 with neutral output', () => {
      const input = createMockTradeInputV2()
      const result = evaluateTrade(input)

      expect(result.givingValue).toBe(0)
      expect(result.receivingValue).toBe(0)
      expect(result.fairnessScore).toBe(0)
      expect(result.verdict).toBe('fair')
    })
  })
})

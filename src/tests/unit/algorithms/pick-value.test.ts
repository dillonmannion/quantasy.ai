import { describe, it, expect } from 'vitest'
import { calculatePickValue } from '@/lib/algorithms/pick-value'
import type { DraftPick } from '@/lib/algorithms/draft-picks'
import type { PickValueInput, PickValueOutput, Position } from '@/lib/algorithms/types'
import type { SleeperPlayer } from '@/lib/sleeper/types'
import {
  createMockDraftState,
  createMockRemainingPlayers,
  createMockPickValueInput,
} from '@/tests/mocks'

const defaultScoringSettings = {
  pass_td: 4,
  pass_int: -2,
  rush_yd: 0.1,
  rush_td: 6,
  rec_yd: 0.1,
  rec_td: 6,
  rec: 1,
}

function createMockPlayer(
  id: string,
  name: string,
  position: Position,
  projectedPoints: number,
  adp?: number
): SleeperPlayer {
  const [firstName, lastName] = name.split(' ')
  const basePlayer: SleeperPlayer = {
    player_id: id,
    full_name: name,
    first_name: firstName,
    last_name: lastName ?? '',
    team: 'KC',
    position,
    age: 25,
    years_exp: 2,
    status: 'Active',
    injury_status: null,
    number: 0,
    height: '6-0',
    weight: '200',
    college: 'Test University',
    fantasy_positions: [position],
    metadata: {
      projected_points: projectedPoints,
    },
  }

  if (adp === undefined) {
    return basePlayer
  }

  return {
    ...basePlayer,
    adp,
  }
}

function buildPickNumber(pick: DraftPick, teams: number): number {
  const slot = pick.position === 'early'
    ? 1
    : pick.position === 'late'
      ? teams
      : Math.ceil(teams / 2)

  return (pick.round - 1) * teams + slot
}

function buildPickValueInput(
  input: Omit<PickValueInput, 'draftId'> & { draftId?: string }
): PickValueInput {
  return {
    draftId: input.draftId ?? 'mock-draft',
    pickNumber: input.pickNumber,
    remainingPlayers: input.remainingPlayers,
    leagueSettings: input.leagueSettings,
    scoringFormat: input.scoringFormat,
    projections: input.projections,
    draftedPlayerIds: input.draftedPlayerIds,
  }
}

describe('calculatePickValue', () => {
  it('should return higher value for earlier picks', () => {
    const remainingIds = createMockRemainingPlayers(30)
    const projections: Record<string, number> = {}
    const players = remainingIds.map((id, index) => {
      const projectedPoints = 260 - index
      projections[id] = projectedPoints
      return createMockPlayer(id, `RB${index}`, 'RB', projectedPoints, index + 1)
    })

    const draftState = createMockDraftState({
      draftedPlayerIds: new Set([players[0]?.player_id || 'player_100']),
    })

    const rosterPositions: Position[] = ['RB', 'RB']
    const teams = 12
    const earlyPick = createMockPickValueInput({ round: 1, position: 'early' })
    const latePick = createMockPickValueInput({ round: 1, position: 'late' })
    const nextRoundPick = createMockPickValueInput({ round: 2, position: 'early' })

    const baseInput = buildPickValueInput({
      pickNumber: buildPickNumber(earlyPick, teams),
      remainingPlayers: players,
      projections,
      draftedPlayerIds: draftState.draftedPlayerIds,
      leagueSettings: {
        teams,
        rosterPositions,
        scoringSettings: defaultScoringSettings,
      },
      scoringFormat: 'ppr',
    })

    const earlyValue = calculatePickValue(baseInput).value
    const lateValue = calculatePickValue({
      ...baseInput,
      pickNumber: buildPickNumber(latePick, teams),
    }).value
    const nextRoundValue = calculatePickValue({
      ...baseInput,
      pickNumber: buildPickNumber(nextRoundPick, teams),
    }).value

    expect(earlyValue).toBeGreaterThan(lateValue)
    expect(lateValue).toBeGreaterThan(nextRoundValue)
  })

  it('should boost value in Superflex leagues', () => {
    const projections: Record<string, number> = {}
    const players: SleeperPlayer[] = []

    const qbIds = createMockRemainingPlayers(12, ['qb-1', 'qb-2', 'qb-3', 'qb-4', 'qb-5', 'qb-6', 'qb-7', 'qb-8', 'qb-9', 'qb-10', 'qb-11', 'qb-12'])
    qbIds.forEach((id, index) => {
      const projectedPoints = 320 - index * 2
      projections[id] = projectedPoints
      players.push(createMockPlayer(id, `QB${index}`, 'QB', projectedPoints, index + 1))
    })

    const rbIds = createMockRemainingPlayers(12, ['rb-1', 'rb-2', 'rb-3', 'rb-4', 'rb-5', 'rb-6', 'rb-7', 'rb-8', 'rb-9', 'rb-10', 'rb-11', 'rb-12'])
    rbIds.forEach((id, index) => {
      const projectedPoints = 260 - index * 2
      projections[id] = projectedPoints
      players.push(createMockPlayer(id, `RB${index}`, 'RB', projectedPoints, index + 13))
    })

    const wrIds = createMockRemainingPlayers(12, ['wr-1', 'wr-2', 'wr-3', 'wr-4', 'wr-5', 'wr-6', 'wr-7', 'wr-8', 'wr-9', 'wr-10', 'wr-11', 'wr-12'])
    wrIds.forEach((id, index) => {
      const projectedPoints = 250 - index * 2
      projections[id] = projectedPoints
      players.push(createMockPlayer(id, `WR${index}`, 'WR', projectedPoints, index + 25))
    })

    const teIds = createMockRemainingPlayers(6, ['te-1', 'te-2', 'te-3', 'te-4', 'te-5', 'te-6'])
    teIds.forEach((id, index) => {
      const projectedPoints = 210 - index * 2
      projections[id] = projectedPoints
      players.push(createMockPlayer(id, `TE${index}`, 'TE', projectedPoints, index + 37))
    })

    const teams = 12
    const draftState = createMockDraftState({ draftedPlayerIds: new Set() })

    const standardInput = buildPickValueInput({
      pickNumber: 1,
      remainingPlayers: players,
      projections,
      draftedPlayerIds: draftState.draftedPlayerIds,
      leagueSettings: {
        teams,
        rosterPositions: ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX'],
        scoringSettings: defaultScoringSettings,
      },
      scoringFormat: 'ppr',
    })

    const superflexInput = buildPickValueInput({
      pickNumber: 1,
      remainingPlayers: players,
      projections,
      draftedPlayerIds: draftState.draftedPlayerIds,
      leagueSettings: {
        teams,
        rosterPositions: ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'SUPERFLEX'],
        scoringSettings: defaultScoringSettings,
      },
      scoringFormat: 'ppr',
    })

    const standardValue = calculatePickValue(standardInput).value
    const superflexValue = calculatePickValue(superflexInput).value

    expect(superflexValue).toBeGreaterThan(standardValue)
  })

  it('should boost TE value in TE-premium scoring', () => {
    const projections: Record<string, number> = {}
    const players: SleeperPlayer[] = []

    const rbIds = ['rb-a', 'rb-b', 'rb-c', 'rb-d']
    rbIds.forEach((id, index) => {
      const projectedPoints = 250 - index * 3
      projections[id] = projectedPoints
      players.push(createMockPlayer(id, `RB${index}`, 'RB', projectedPoints, index + 5))
    })

    const teIds = ['te-a', 'te-b', 'te-c']
    teIds.forEach((id, index) => {
      const projectedPoints = 200 - index * 2
      projections[id] = projectedPoints
      players.push(createMockPlayer(id, `TE${index}`, 'TE', projectedPoints, index + 10))
    })

    const wrIds = ['wr-a', 'wr-b', 'wr-c']
    wrIds.forEach((id, index) => {
      const projectedPoints = 240 - index * 2
      projections[id] = projectedPoints
      players.push(createMockPlayer(id, `WR${index}`, 'WR', projectedPoints, index + 13))
    })

    const teams = 12
    const draftState = createMockDraftState({ draftedPlayerIds: new Set() })

    const standardInput = buildPickValueInput({
      pickNumber: 12,
      remainingPlayers: players,
      projections,
      draftedPlayerIds: draftState.draftedPlayerIds,
      leagueSettings: {
        teams,
        rosterPositions: ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX'],
        scoringSettings: defaultScoringSettings,
      },
      scoringFormat: 'ppr',
    })

    const premiumInput = buildPickValueInput({
      pickNumber: 12,
      remainingPlayers: players,
      projections,
      draftedPlayerIds: draftState.draftedPlayerIds,
      leagueSettings: {
        teams,
        rosterPositions: ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX'],
        scoringSettings: {
          ...defaultScoringSettings,
          rec_te: 1.5,
        },
      },
      scoringFormat: 'ppr',
    })

    const standardResult: PickValueOutput = calculatePickValue(standardInput)
    const premiumResult: PickValueOutput = calculatePickValue(premiumInput)

    const standardTeValue =
      standardResult.breakdown.positionalValues.find(value => value.position === 'TE')
        ?.expectedValue ?? 0
    const premiumTeValue =
      premiumResult.breakdown.positionalValues.find(value => value.position === 'TE')
        ?.expectedValue ?? 0

    expect(premiumTeValue).toBeGreaterThan(standardTeValue)
  })

  it('should handle missing reception scoring settings', () => {
    const projections: Record<string, number> = {}
    const players = createMockRemainingPlayers(6).map((id, index) => {
      const projectedPoints = 210 - index * 2
      projections[id] = projectedPoints
      return createMockPlayer(id, `WR${index}`, 'WR', projectedPoints, index + 1)
    })

    const draftState = createMockDraftState({ draftedPlayerIds: new Set() })
    const result = calculatePickValue(
      buildPickValueInput({
        pickNumber: 6,
        remainingPlayers: players,
        projections,
        draftedPlayerIds: draftState.draftedPlayerIds,
        leagueSettings: {
          teams: 12,
          rosterPositions: ['WR', 'WR', 'FLEX'],
          scoringSettings: {
            pass_td: 4,
            pass_int: -2,
            rush_td: 6,
          },
        },
        scoringFormat: 'standard',
      })
    )

    expect(result.value).toBeGreaterThanOrEqual(0)
    expect(result.breakdown.expectedPlayers.length).toBeGreaterThan(0)
  })

  it('should apply bias adjustment within 0-20%', () => {
    const remainingIds = createMockRemainingPlayers(20)
    const projections: Record<string, number> = {}
    const players = remainingIds.map((id, index) => {
      const projectedPoints = 240 - index
      projections[id] = projectedPoints
      const adp = index === 0 ? undefined : index + 1
      return createMockPlayer(id, `WR${index}`, 'WR', projectedPoints, adp)
    })

    const draftState = createMockDraftState({ draftedPlayerIds: new Set() })
    const baseInput = buildPickValueInput({
      pickNumber: 12,
      remainingPlayers: players,
      projections,
      draftedPlayerIds: draftState.draftedPlayerIds,
      leagueSettings: {
        teams: 12,
        rosterPositions: ['WR', 'WR', 'FLEX'],
        scoringSettings: defaultScoringSettings,
      },
      scoringFormat: 'ppr',
    })

    const baseline = calculatePickValue({ ...baseInput, biasFactor: 0 }).value
    const biased = calculatePickValue({ ...baseInput, biasFactor: 0.1 }).value
    const capped = calculatePickValue({ ...baseInput, biasFactor: 0.2 }).value
    const over = calculatePickValue({ ...baseInput, biasFactor: 0.4 }).value
    const negative = calculatePickValue({ ...baseInput, biasFactor: -0.1 }).value

    expect(biased).toBeGreaterThan(baseline)
    expect(capped).toBeGreaterThanOrEqual(biased)
    expect(over).toBeCloseTo(capped, 4)
    expect(negative).toBeCloseTo(baseline, 4)
  })

  it('should add caveats for missing ADP and small pools', () => {
    const projections: Record<string, number> = {}
    const players: SleeperPlayer[] = [
      createMockPlayer('wr-x', 'WR X', 'WR', 220),
      createMockPlayer('wr-y', 'WR Y', 'WR', 210, 2),
      createMockPlayer('wr-z', 'WR Z', 'WR', 200, 3),
    ]

    players.forEach((player, index) => {
      projections[player.player_id] = 220 - index * 10
    })

    const draftState = createMockDraftState({ draftedPlayerIds: new Set() })
    const input = buildPickValueInput({
      pickNumber: 1,
      remainingPlayers: players,
      projections,
      draftedPlayerIds: draftState.draftedPlayerIds,
      leagueSettings: {
        teams: 12,
        rosterPositions: ['WR'],
        scoringSettings: defaultScoringSettings,
      },
      scoringFormat: 'ppr',
    })

    const result = calculatePickValue(input)
    expect(result.explanation.caveats).toContain(
      'Missing ADP data for some players; VBD rank used as fallback.'
    )
    expect(result.explanation.caveats).toContain(
      'Limited player pool; expected value uses fewer candidates.'
    )
  })

  it('should return zero when projections are missing', () => {
    const players: SleeperPlayer[] = [
      createMockPlayer('rb-m', 'RB M', 'RB', 190, 1),
      createMockPlayer('rb-n', 'RB N', 'RB', 185, 2),
    ]
    const draftState = createMockDraftState({ draftedPlayerIds: new Set() })
    const result = calculatePickValue(
      buildPickValueInput({
        pickNumber: 5,
        remainingPlayers: players,
        projections: {},
        draftedPlayerIds: draftState.draftedPlayerIds,
        leagueSettings: {
          teams: 12,
          rosterPositions: ['RB', 'RB'],
          scoringSettings: defaultScoringSettings,
        },
        scoringFormat: 'ppr',
      })
    )

    expect(result.value).toBe(0)
    expect(result.breakdown.expectedPlayers).toEqual([])
  })

  it('should handle zero VBD scores without NaN', () => {
    const projections: Record<string, number> = {}
    const players: SleeperPlayer[] = createMockRemainingPlayers(12).map((id, index) => {
      projections[id] = 100
      return createMockPlayer(id, `RB${index}`, 'RB', 100, index + 1)
    })

    const draftState = createMockDraftState({ draftedPlayerIds: new Set() })
    const result = calculatePickValue(
      buildPickValueInput({
        pickNumber: 1,
        remainingPlayers: players,
        projections,
        draftedPlayerIds: draftState.draftedPlayerIds,
        leagueSettings: {
          teams: 12,
          rosterPositions: ['RB'],
          scoringSettings: defaultScoringSettings,
        },
        scoringFormat: 'ppr',
      })
    )

    expect(result.value).toBe(0)
    expect(result.breakdown.expectedPlayers.length).toBeGreaterThan(0)
  })

  it('should handle empty player pool', () => {
    const draftState = createMockDraftState({ draftedPlayerIds: new Set() })
    const result = calculatePickValue(
      buildPickValueInput({
        pickNumber: 1,
        remainingPlayers: [],
        projections: {},
        draftedPlayerIds: draftState.draftedPlayerIds,
        leagueSettings: {
          teams: 12,
          rosterPositions: ['QB', 'RB', 'WR', 'TE'],
          scoringSettings: defaultScoringSettings,
        },
        scoringFormat: 'ppr',
      })
    )

    expect(result.value).toBe(0)
    expect(result.breakdown.expectedPlayers).toEqual([])
    expect(result.explanation.positionRunInfo).toEqual([])
  })

  it('should keep late picks low but non-negative', () => {
    const remainingIds = createMockRemainingPlayers(25)
    const projections: Record<string, number> = {}
    const players = remainingIds.map((id, index) => {
      const projectedPoints = 230 - index
      projections[id] = projectedPoints
      return createMockPlayer(id, `WR${index}`, 'WR', projectedPoints, index + 1)
    })

    const draftState = createMockDraftState({ draftedPlayerIds: new Set() })
    const input = buildPickValueInput({
      pickNumber: 1,
      remainingPlayers: players,
      projections,
      draftedPlayerIds: draftState.draftedPlayerIds,
      leagueSettings: {
        teams: 12,
        rosterPositions: ['WR', 'WR', 'FLEX'],
        scoringSettings: defaultScoringSettings,
      },
      scoringFormat: 'ppr',
    })

    const earlyValue = calculatePickValue(input).value
    const lateValue = calculatePickValue({ ...input, pickNumber: 120 }).value

    expect(lateValue).toBeGreaterThanOrEqual(0)
    expect(earlyValue).toBeGreaterThan(lateValue)
  })

  it('should floor negative values at 0', () => {
    const remainingIds = createMockRemainingPlayers(30)
    const projections: Record<string, number> = {}
    const players = remainingIds.map((id, index) => {
      const projectedPoints = 150 - index * 3
      projections[id] = projectedPoints
      return createMockPlayer(id, `RB${index}`, 'RB', projectedPoints, index + 1)
    })

    const draftState = createMockDraftState({ draftedPlayerIds: new Set() })
    const input = buildPickValueInput({
      pickNumber: 28,
      remainingPlayers: players,
      projections,
      draftedPlayerIds: draftState.draftedPlayerIds,
      leagueSettings: {
        teams: 12,
        rosterPositions: ['RB', 'RB'],
        scoringSettings: defaultScoringSettings,
      },
      scoringFormat: 'ppr',
    })

    const result = calculatePickValue(input)
    expect(result.value).toBe(0)
  })
})

import type {
  AlgorithmPlayer,
  DraftPickAsset,
  DynastyTradeInput,
  FutureRookiePickAsset,
  PlayerAsset,
  PlayerRanking,
  PositionBaseline,
  TradeableAsset,
  TradeInput,
  TradeInputV2,
  TradeLineupImpact,
  TradeOutput,
  TradePlayerBreakdown,
  TradeVerdict,
} from './types'
import { calculateDynastyVBD } from './dynasty-vbd'
import { getDraftPickValue } from './draft-picks'
import type { DraftPick } from './draft-picks'
import { optimizeLineup } from './lineup'

function isTradeInputV2(input: DynastyTradeInput | TradeInputV2): input is TradeInputV2 {
  const firstAsset = input.giving[0] ?? input.receiving[0]
  return firstAsset !== undefined && 'type' in firstAsset
}

function pickAssetToDraftPick(asset: DraftPickAsset | FutureRookiePickAsset): DraftPick {
  return {
    year: asset.year,
    round: asset.round,
    position: 'unknown',
  }
}

function calculateAssetValue(
  asset: TradeableAsset,
  baselines: Record<string, PositionBaseline>,
  caveats: string[],
  currentYear: number
): { value: number; breakdown: TradePlayerBreakdown } {
  switch (asset.type) {
    case 'player': {
      const baseline = baselines[asset.position]
      if (!baseline) {
        caveats.push(`Missing baseline for position ${asset.position}.`)
      }
      const baselinePoints = baseline?.projectedPoints ?? 0
      const vbdValue = asset.projectedPoints - baselinePoints

      return {
        value: vbdValue,
        breakdown: {
          playerId: asset.playerId,
          name: asset.fullName,
          position: asset.position,
          vbdValue,
          isGiving: false,
        },
      }
    }
    case 'draft_pick': {
      const pick = pickAssetToDraftPick(asset)
      const value = getDraftPickValue(pick, currentYear)

      return {
        value,
        breakdown: {
          playerId: asset.pickId,
          name: `${asset.year} Round ${asset.round} Pick`,
          position: 'FLEX',
          vbdValue: value,
          isGiving: false,
        },
      }
    }
    case 'future_rookie_pick': {
      const pick = pickAssetToDraftPick(asset)
      const value = getDraftPickValue(pick, currentYear)

      return {
        value,
        breakdown: {
          playerId: asset.pickId,
          name: `${asset.year} Round ${asset.round} Pick (Future)`,
          position: 'FLEX',
          vbdValue: value,
          isGiving: false,
        },
      }
    }
  }
}

function calculatePlayerVBD(
  player: AlgorithmPlayer,
  baselines: Record<string, PositionBaseline>,
  caveats: string[]
): number {
  const baseline = baselines[player.position]
  if (!baseline) {
    caveats.push(`Missing baseline for position ${player.position}.`)
  }
  const baselinePoints = baseline?.projectedPoints ?? 0
  return player.projectedPoints - baselinePoints
}

function buildDynastyRanking(player: AlgorithmPlayer, vbdScore: number): PlayerRanking {
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

function calculatePlayerValue(
  player: AlgorithmPlayer,
  baselines: Record<string, PositionBaseline>,
  caveats: string[],
  useDynastyValues: boolean
): number {
  const baseValue = calculatePlayerVBD(player, baselines, caveats)

  if (!useDynastyValues) return baseValue

  if (player.age === undefined || Number.isNaN(player.age)) {
    caveats.push(`Missing age for ${player.fullName}; dynasty adjustment skipped.`)
    return baseValue
  }

  const dynastyValue = calculateDynastyVBD({
    player: buildDynastyRanking(player, baseValue),
    age: player.age,
  })

  return dynastyValue.dynastyVBD
}

function buildTradeMethodology(useDynastyValues: boolean, hasDraftPicks: boolean): string {
  const lines = [
    'Values are calculated using VBD (projected points minus positional baseline).',
  ]

  if (useDynastyValues) {
    lines.push('Dynasty values adjust VBD using age curves and multi-year discounting.')
  }

  if (hasDraftPicks) {
    lines.push('Draft pick values are added using a discounted pick chart.')
  }

  lines.push(
    'Fairness is computed as ((receiving - giving) / max(abs(receiving), abs(giving))) * 100.'
  )

  return lines.join('\n')
}

function buildLineupImpact(input: TradeInput, caveats: string[]): TradeLineupImpact | null {
  const rosterSlots = input.leagueSettings.rosterSlots
  if (!input.currentRoster || !rosterSlots || rosterSlots.length === 0 || input.week === undefined) {
    caveats.push('Lineup impact not calculated due to missing roster, slots, or week.')
    return null
  }

  const preTrade = optimizeLineup({
    roster: input.currentRoster,
    slots: rosterSlots,
    week: input.week,
  })

  const givingIds = new Set(input.giving.map(player => player.playerId))
  const postTradeRoster = input.currentRoster
    .filter(player => !givingIds.has(player.playerId))
    .filter(player => !input.receiving.some(incoming => incoming.playerId === player.playerId))
    .concat(input.receiving)

  const postTrade = optimizeLineup({
    roster: postTradeRoster,
    slots: rosterSlots,
    week: input.week,
  })

  return {
    preTrade,
    postTrade,
    delta: postTrade.projectedPoints - preTrade.projectedPoints,
  }
}

function getVerdict(score: number): TradeVerdict {
  if (score >= 50) return 'great'
  if (score >= 10) return 'fair'
  if (score >= -10) return 'fair'
  if (score >= -50) return 'bad'
  return 'veto-worthy'
}

export function evaluateTrade(input: DynastyTradeInput): TradeOutput
export function evaluateTrade(input: TradeInputV2): TradeOutput
export function evaluateTrade(input: DynastyTradeInput | TradeInputV2): TradeOutput {
  if (isTradeInputV2(input)) {
    return evaluateTradeV2(input)
  }

  return evaluateTradeLegacy(input)
}

function evaluateTradeLegacy(input: DynastyTradeInput): TradeOutput {
  const caveats: string[] = []
  const playerBreakdown: TradePlayerBreakdown[] = []

  const { useDynastyValues = false, currentYear = new Date().getFullYear() } = input

  let givingValue = input.giving.reduce((total, player) => {
    const vbdValue = calculatePlayerValue(
      player,
      input.leagueSettings.baselines,
      caveats,
      useDynastyValues
    )
    playerBreakdown.push({
      playerId: player.playerId,
      name: player.fullName,
      position: player.position,
      vbdValue,
      isGiving: true,
    })
    return total + vbdValue
  }, 0)

  let receivingValue = input.receiving.reduce((total, player) => {
    const vbdValue = calculatePlayerValue(
      player,
      input.leagueSettings.baselines,
      caveats,
      useDynastyValues
    )
    playerBreakdown.push({
      playerId: player.playerId,
      name: player.fullName,
      position: player.position,
      vbdValue,
      isGiving: false,
    })
    return total + vbdValue
  }, 0)

  if (input.givingDraftPicks && input.givingDraftPicks.length > 0) {
    givingValue += input.givingDraftPicks.reduce(
      (total, pick) => total + getDraftPickValue(pick, currentYear),
      0
    )
  }

  if (input.receivingDraftPicks && input.receivingDraftPicks.length > 0) {
    receivingValue += input.receivingDraftPicks.reduce(
      (total, pick) => total + getDraftPickValue(pick, currentYear),
      0
    )
  }

  const maxAbs = Math.max(Math.abs(givingValue), Math.abs(receivingValue))
  const fairnessScore = maxAbs === 0 ? 0 : ((receivingValue - givingValue) / maxAbs) * 100

  const lineupImpact = buildLineupImpact(input, caveats)
  const hasDraftPicks =
    (input.givingDraftPicks?.length ?? 0) > 0 || (input.receivingDraftPicks?.length ?? 0) > 0

  return {
    fairnessScore,
    givingValue,
    receivingValue,
    verdict: getVerdict(fairnessScore),
    explanation: {
      playerBreakdown,
      lineupImpact,
      methodology: buildTradeMethodology(useDynastyValues, hasDraftPicks),
      caveats,
    },
  }
}

function evaluateTradeV2(input: TradeInputV2): TradeOutput {
  const caveats: string[] = []
  const playerBreakdown: TradePlayerBreakdown[] = []
  const currentYear = new Date().getFullYear()

  let givingValue = 0
  let receivingValue = 0
  let hasDraftPicks = false

  for (const asset of input.giving) {
    const result = calculateAssetValue(
      asset,
      input.leagueSettings.baselines,
      caveats,
      currentYear
    )
    givingValue += result.value
    playerBreakdown.push({ ...result.breakdown, isGiving: true })

    if (asset.type === 'draft_pick' || asset.type === 'future_rookie_pick') {
      hasDraftPicks = true
    }
  }

  for (const asset of input.receiving) {
    const result = calculateAssetValue(
      asset,
      input.leagueSettings.baselines,
      caveats,
      currentYear
    )
    receivingValue += result.value
    playerBreakdown.push({ ...result.breakdown, isGiving: false })

    if (asset.type === 'draft_pick' || asset.type === 'future_rookie_pick') {
      hasDraftPicks = true
    }
  }

  const maxAbs = Math.max(Math.abs(givingValue), Math.abs(receivingValue))
  const fairnessScore = maxAbs === 0 ? 0 : ((receivingValue - givingValue) / maxAbs) * 100

  const lineupImpact = buildLineupImpactV2(input, caveats)

  return {
    fairnessScore,
    givingValue,
    receivingValue,
    verdict: getVerdict(fairnessScore),
    explanation: {
      playerBreakdown,
      lineupImpact,
      methodology: buildTradeMethodology(false, hasDraftPicks),
      caveats,
    },
  }
}

function buildLineupImpactV2(input: TradeInputV2, caveats: string[]): TradeLineupImpact | null {
  const rosterSlots = input.leagueSettings.rosterSlots
  if (!input.currentRoster || !rosterSlots || rosterSlots.length === 0 || input.week === undefined) {
    caveats.push('Lineup impact not calculated due to missing roster, slots, or week.')
    return null
  }

  const preTrade = optimizeLineup({
    roster: input.currentRoster,
    slots: rosterSlots,
    week: input.week,
  })

  const givingPlayerIds = new Set(
    input.giving.filter((a): a is PlayerAsset => a.type === 'player').map((p) => p.playerId)
  )
  const receivingPlayers = input.receiving.filter((a): a is PlayerAsset => a.type === 'player')

  const postTradeRoster = input.currentRoster
    .filter((player) => !givingPlayerIds.has(player.playerId))
    .filter((player) => !receivingPlayers.some((incoming) => incoming.playerId === player.playerId))
    .concat(
      receivingPlayers.map((p) => ({
        playerId: p.playerId,
        fullName: p.fullName,
        team: 'UNK',
        position: p.position,
        eligiblePositions: [p.position],
        projectedPoints: p.projectedPoints,
        injuryStatus: null,
        status: 'Active' as const,
        byeWeek: null,
      }))
    )

  const postTrade = optimizeLineup({
    roster: postTradeRoster,
    slots: rosterSlots,
    week: input.week,
  })

  return {
    preTrade,
    postTrade,
    delta: postTrade.projectedPoints - preTrade.projectedPoints,
  }
}

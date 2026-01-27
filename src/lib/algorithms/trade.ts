import type {
  AlgorithmPlayer,
  PositionBaseline,
  TradeInput,
  TradeLineupImpact,
  TradeOutput,
  TradePlayerBreakdown,
  TradeVerdict,
} from './types'
import { optimizeLineup } from './lineup'

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

export function evaluateTrade(input: TradeInput): TradeOutput {
  const caveats: string[] = []
  const playerBreakdown: TradePlayerBreakdown[] = []

  const givingValue = input.giving.reduce((total, player) => {
    const vbdValue = calculatePlayerVBD(player, input.leagueSettings.baselines, caveats)
    playerBreakdown.push({
      playerId: player.playerId,
      name: player.fullName,
      position: player.position,
      vbdValue,
      isGiving: true,
    })
    return total + vbdValue
  }, 0)

  const receivingValue = input.receiving.reduce((total, player) => {
    const vbdValue = calculatePlayerVBD(player, input.leagueSettings.baselines, caveats)
    playerBreakdown.push({
      playerId: player.playerId,
      name: player.fullName,
      position: player.position,
      vbdValue,
      isGiving: false,
    })
    return total + vbdValue
  }, 0)

  const maxAbs = Math.max(Math.abs(givingValue), Math.abs(receivingValue))
  const fairnessScore = maxAbs === 0 ? 0 : ((receivingValue - givingValue) / maxAbs) * 100

  const lineupImpact = buildLineupImpact(input, caveats)

  return {
    fairnessScore,
    givingValue,
    receivingValue,
    verdict: getVerdict(fairnessScore),
    explanation: {
      playerBreakdown,
      lineupImpact,
      methodology:
        'Values are calculated using VBD (projected points minus positional baseline).\n' +
        'Fairness is computed as ((receiving - giving) / max(abs(receiving), abs(giving))) * 100.',
      caveats,
    },
  }
}

import type {
  ExpectedPlayer,
  PickValueBreakdown,
  PickValueExplanation,
  PickValueInput,
  PickValueOutput,
  Position,
} from './types'
import { calculateVBD } from './vbd'

const DEFAULT_TOP_N = 8
const DEFAULT_TEMPERATURE = 2.5
const MAX_BIAS = 0.2

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function getStarterCounts(rosterPositions: Position[]): Record<Position, number> {
  const counts: Record<Position, number> = {
    QB: 0,
    RB: 0,
    WR: 0,
    TE: 0,
    K: 0,
    DEF: 0,
    DL: 0,
    LB: 0,
    DB: 0,
    FLEX: 0,
    SUPERFLEX: 0,
    REC_FLEX: 0,
    WRRB_FLEX: 0,
    IDP_FLEX: 0,
  }
  rosterPositions.forEach((position) => {
    counts[position] += 1
  })
  return counts
}

function getPositionMultiplier(
  position: Position,
  hasSuperflex: boolean,
  tePremiumMultiplier: number
): number {
  if (position === 'QB' && hasSuperflex) {
    return 1.1
  }

  if (position === 'TE') {
    return tePremiumMultiplier
  }

  return 1
}

function buildPickValueExplanation(
  pickNumber: number,
  topCount: number,
  hasSuperflex: boolean,
  tePremiumMultiplier: number,
  biasFactor: number,
  usedFallbackAdp: boolean,
  expectedPlayers: ExpectedPlayer[]
): PickValueExplanation {
  const caveats: string[] = []

  if (usedFallbackAdp) {
    caveats.push('Missing ADP data for some players; VBD rank used as fallback.')
  }

  if (topCount < DEFAULT_TOP_N) {
    caveats.push('Limited player pool; expected value uses fewer candidates.')
  }

  const methodologyLines = [
    'Calculated VBD for remaining players using league baselines.',
    `Weighted the top ${topCount} players by ADP proximity (temperature ${DEFAULT_TEMPERATURE}).`,
    hasSuperflex ? 'Applied Superflex adjustment to QB values.' : 'No Superflex adjustment applied.',
    tePremiumMultiplier > 1
      ? `Applied TE premium multiplier (${tePremiumMultiplier.toFixed(2)}).`
      : 'No TE premium adjustment applied.',
    biasFactor > 0
      ? `Applied bias factor of ${(biasFactor * 100).toFixed(0)}%.`
      : 'No bias adjustment applied.',
  ]

  const positionCounts: Record<string, number> = {}
  expectedPlayers.forEach((player) => {
    positionCounts[player.position] = (positionCounts[player.position] || 0) + 1
  })

  const positionRunInfo = Object.entries(positionCounts)
    .filter(([, count]) => count >= 3)
    .map(([position, count]) =>
      `${position} run possible (${count} of top ${expectedPlayers.length}) near pick ${pickNumber}.`
    )

  return {
    algorithm: 'pick_value_v1',
    timestamp: new Date().toISOString(),
    methodology: methodologyLines.join('\n'),
    caveats,
    positionRunInfo,
  }
}

function buildEmptyOutput(): PickValueOutput {
  return {
    value: 0,
    breakdown: {
      expectedPlayers: [],
      positionalValues: [],
      biasAdjustment: {
        position: null,
        factor: 1,
      },
    },
    explanation: {
      algorithm: 'pick_value_v1',
      timestamp: new Date().toISOString(),
      methodology: 'No available players with projections; pick value defaults to 0.',
      caveats: ['Player pool was empty or missing projections.'],
      positionRunInfo: [],
    },
  }
}

/**
 * Calculate the expected value of a draft pick based on VBD of likely-available players.
 * 
 * Uses Monte Carlo estimation to weight players by selection probability at the pick position.
 * Applies league format adjustments (Superflex, TE-Premium) and optional fairness bias.
 * 
 * @param input - Pick valuation parameters including draft state, players, projections
 * @returns Pick value (0-100 scale) with breakdown of expected players and positional values
 * 
 * @example
 * const output = calculatePickValue({
 *   pickNumber: 5,
 *   remainingPlayers: [...],
 *   draftedPlayerIds: new Set([...]),
 *   leagueSettings: { teams: 12, rosterPositions: [...] },
 *   scoringFormat: 'ppr',
 *   projections: { 'player_id': 280.5 },
 *   biasFactor: 0.1
 * })
 * // Returns: { value: 75.3, breakdown: {...}, explanation: {...} }
 */
export function calculatePickValue(input: PickValueInput): PickValueOutput {
   const remainingPlayers = input.remainingPlayers.filter(
     (player) => !input.draftedPlayerIds.has(player.player_id)
   )

  const vbdOutput = calculateVBD({
    players: remainingPlayers,
    projections: input.projections,
    leagueSettings: input.leagueSettings,
    scoringFormat: input.scoringFormat,
    projectionSource: 'pick-value',
  })

  if (vbdOutput.rankings.length === 0) {
    return buildEmptyOutput()
  }

  const rankings = vbdOutput.rankings
  const adpById = new Map<string, number>()
  remainingPlayers.forEach((player) => {
    const adpValue = player['adp']
    if (typeof adpValue === 'number' && Number.isFinite(adpValue)) {
      adpById.set(player.player_id, adpValue)
    }
  })

  const candidates = rankings.map((ranking) => {
    const adpValue = adpById.get(ranking.playerId)
    const usedFallbackAdp = adpValue === undefined
    const adp = usedFallbackAdp ? ranking.overallRank : adpValue
    const distance = Math.abs(adp - input.pickNumber)

    return {
      ranking,
      adp,
      distance,
      usedFallbackAdp,
    }
  })

  candidates.sort((a, b) => {
    if (a.distance !== b.distance) {
      return a.distance - b.distance
    }
    return b.ranking.vbdScore - a.ranking.vbdScore
  })

  const topCount = Math.min(DEFAULT_TOP_N, candidates.length)
  const topCandidates = candidates.slice(0, topCount)
  const weightedCandidates = topCandidates.map((candidate) => ({
    candidate,
    weight: Math.exp(-candidate.distance / DEFAULT_TEMPERATURE),
  }))
  const weightSum = weightedCandidates.reduce((sum, item) => sum + item.weight, 0)
  const candidatesWithProb = weightedCandidates.map((item) => ({
    ...item,
    probability: item.weight / weightSum,
  }))

  const starterCounts = getStarterCounts(input.leagueSettings.rosterPositions)
  const totalStarters = Math.max(1, input.leagueSettings.rosterPositions.length)
  const hasSuperflex = input.leagueSettings.rosterPositions.includes('SUPERFLEX')
  const recValue = input.leagueSettings.scoringSettings.rec ?? 0
  const teRecValue = input.leagueSettings.scoringSettings.rec_te ?? recValue
  const tePremiumMultiplier = teRecValue > recValue ? 1 + (teRecValue - recValue) : 1
  const biasFactor = clamp(input.biasFactor ?? 0, 0, MAX_BIAS)
  const biasMultiplier = 1 + biasFactor

  let expectedValue = 0
  let usedFallbackAdp = false
  const positionalTotals = new Map<Position, number>()

  candidatesWithProb.forEach(({ candidate, probability }) => {
    const multiplier = getPositionMultiplier(
      candidate.ranking.position,
      hasSuperflex,
      tePremiumMultiplier
    )
    const playerValue = candidate.ranking.vbdScore * multiplier
    expectedValue += playerValue * probability

    const currentTotal = positionalTotals.get(candidate.ranking.position) ?? 0
    positionalTotals.set(candidate.ranking.position, currentTotal + playerValue * probability)

    if (candidate.usedFallbackAdp) {
      usedFallbackAdp = true
    }
  })

  const biasedValue = expectedValue * biasMultiplier
  const maxVbdScore = Math.max(0, ...rankings.map(ranking => ranking.vbdScore))
  const normalizedValue = maxVbdScore === 0 ? 0 : (biasedValue / maxVbdScore) * 100
  const value = clamp(normalizedValue, 0, 100)

  const expectedPlayers = candidatesWithProb
    .map(({ candidate, probability }) => ({
      playerId: candidate.ranking.playerId,
      fullName: candidate.ranking.fullName,
      position: candidate.ranking.position,
      probability,
      projectedPoints: candidate.ranking.projectedPoints,
    }))
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 5)

  const positionalValues = Array.from(positionalTotals.entries()).map(([position, value]) => {
    const starters = starterCounts[position]
    const scarcityMultiplier = 1 + starters / totalStarters

    return {
      position,
      expectedValue: value,
      scarcityMultiplier,
    }
  })

  const breakdown: PickValueBreakdown = {
    expectedPlayers,
    positionalValues,
    biasAdjustment: {
      position: input.biasPosition ?? null,
      factor: biasMultiplier,
    },
  }

  const explanation = buildPickValueExplanation(
    input.pickNumber,
    topCount,
    hasSuperflex,
    tePremiumMultiplier,
    biasFactor,
    usedFallbackAdp,
    expectedPlayers
  )

  return {
    value,
    breakdown,
    explanation,
  }
}

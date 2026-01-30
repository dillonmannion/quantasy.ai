import type { PlayerPreference, MarketConfig } from './types'

const PREFERENCE_MODIFIERS: Record<PlayerPreference, number> = {
  strongly_like: -0.06,
  like: -0.03,
  neutral: 0,
  dislike: 0.03,
  strongly_dislike: 0.06,
  dnd: 0,
}

function gaussianRandom(mean: number, stdDev: number): number {
  const u1 = Math.random()
  const u2 = Math.random()
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2)
  return z0 * stdDev + mean
}

export function simulateMarketPick(
  availablePlayers: string[],
  adpMap: Record<string, number>,
  preferences: Record<string, PlayerPreference>,
  config: MarketConfig
): string {
  if (availablePlayers.length === 0) {
    throw new Error('No available players to pick from')
  }

  const adpValues = Object.values(adpMap)
  const averageADP = adpValues.length > 0 ? adpValues.reduce((a, b) => a + b, 0) / adpValues.length : 0

  let bestPlayer = availablePlayers[0]
  let bestScore = -Infinity

  for (const playerId of availablePlayers) {
    const baseADP = adpMap[playerId] ?? averageADP
    const preference = preferences[playerId] ?? 'neutral'
    const modifier = PREFERENCE_MODIFIERS[preference]

    const adjustedADP = baseADP * (1 + modifier)

    const noise = gaussianRandom(0, config.noiseStdDev)
    const tiebreaker = Math.random() * config.tiebreaker

    const score = -adjustedADP + noise + tiebreaker

    if (score > bestScore) {
      bestScore = score
      bestPlayer = playerId
    }
  }

  return bestPlayer
}

export function simulateMarketPickDeterministic(
  availablePlayers: string[],
  adpMap: Record<string, number>,
  preferences: Record<string, PlayerPreference>,
  config: MarketConfig,
  randomFn: () => number = Math.random
): string {
  if (availablePlayers.length === 0) {
    throw new Error('No available players to pick from')
  }

  const adpValues = Object.values(adpMap)
  const averageADP = adpValues.length > 0 ? adpValues.reduce((a, b) => a + b, 0) / adpValues.length : 0

  let bestPlayer = availablePlayers[0]
  let bestScore = -Infinity

  for (const playerId of availablePlayers) {
    const baseADP = adpMap[playerId] ?? averageADP
    const preference = preferences[playerId] ?? 'neutral'
    const modifier = PREFERENCE_MODIFIERS[preference]

    const adjustedADP = baseADP * (1 + modifier)

    const u1 = randomFn()
    const u2 = randomFn()
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2)
    const noise = z0 * config.noiseStdDev

    const tiebreaker = randomFn() * config.tiebreaker

    const score = -adjustedADP + noise + tiebreaker

    if (score > bestScore) {
      bestScore = score
      bestPlayer = playerId
    }
  }

  return bestPlayer
}

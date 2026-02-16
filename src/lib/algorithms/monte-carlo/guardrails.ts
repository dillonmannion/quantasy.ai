import type { Position, PlayerRanking } from '@/lib/algorithms/types'

export interface GuardrailContext {
  userRoster: Array<{ position: Position; playerId: string }>
  availablePlayers: PlayerRanking[]
  picksUntilNextTurn: number
  picksRemaining: number
  minStartersByPosition: Record<Position, number>
  isSuperflex: boolean
  no2ndQBEnabled: boolean
}

export interface StarterFillResult {
  warnings: string[]
  positionBoosts: Record<Position, number>
}

export function calculateTEScarcityMultiplier(
  userRoster: Array<{ position: Position; playerId: string }>,
  availablePlayers: PlayerRanking[],
  picksUntilNextTurn: number
): number {
  const userHasTE = userRoster.some(p => p.position === 'TE')
  if (userHasTE) {
    return 1.0
  }

  const remainingTEs = availablePlayers.filter(p => p.position === 'TE').length

  if (remainingTEs <= picksUntilNextTurn) {
    return 1.5
  }

  if (remainingTEs <= 2 * picksUntilNextTurn) {
    return 1.2
  }

  return 1.0
}

export function calculateStarterFillGuardrail(
  userRoster: Array<{ position: Position; playerId: string }>,
  minStartersByPosition: Record<Position, number>,
  availablePlayers: PlayerRanking[],
  picksRemaining: number
): StarterFillResult {
  const warnings: string[] = []
  const positionBoosts: Record<Position, number> = {
    QB: 1.0,
    RB: 1.0,
    WR: 1.0,
    TE: 1.0,
    K: 1.0,
    DEF: 1.0,
    DL: 1.0,
    LB: 1.0,
    DB: 1.0,
    FLEX: 1.0,
    SUPERFLEX: 1.0,
    REC_FLEX: 1.0,
    WRRB_FLEX: 1.0,
    IDP_FLEX: 1.0,
  }

  for (const [position, minNeeded] of Object.entries(minStartersByPosition)) {
    const userCount = userRoster.filter(p => p.position === (position as Position)).length
    const needed = Math.max(0, minNeeded - userCount)
    const available = availablePlayers.filter(p => p.position === (position as Position)).length

    if (needed > available) {
      warnings.push(
        `${position} scarcity: need ${needed} but only ${available} available (${picksRemaining} picks remaining)`
      )
      positionBoosts[position as Position] = 1.5
    } else {
      positionBoosts[position as Position] = 1.0
    }
  }

  return { warnings, positionBoosts }
}

export function calculate2ndQBPenalty(
  userRoster: Array<{ position: Position; playerId: string }>,
  targetPosition: Position,
  isSuperflex: boolean,
  no2ndQBEnabled: boolean
): number {
  if (!no2ndQBEnabled) {
    return 1.0
  }

  if (isSuperflex) {
    return 1.0
  }

  if (targetPosition !== 'QB') {
    return 1.0
  }

  const userQBCount = userRoster.filter(p => p.position === 'QB').length

  if (userQBCount === 0) {
    return 1.0
  }

  return 0.5
}

export function applyGuardrails(
  playerId: string,
  playerPosition: Position,
  utilityScore: number,
  context: GuardrailContext
): number {
  let adjustedScore = utilityScore

  if (playerPosition === 'TE') {
    const teMultiplier = calculateTEScarcityMultiplier(
      context.userRoster,
      context.availablePlayers,
      context.picksUntilNextTurn
    )
    adjustedScore *= teMultiplier
  }

  if (playerPosition === 'QB') {
    const qbPenalty = calculate2ndQBPenalty(
      context.userRoster,
      playerPosition,
      context.isSuperflex,
      context.no2ndQBEnabled
    )
    adjustedScore *= qbPenalty
  }

  const starterFill = calculateStarterFillGuardrail(
    context.userRoster,
    context.minStartersByPosition,
    context.availablePlayers,
    context.picksRemaining
  )

  const positionBoost = starterFill.positionBoosts[playerPosition] ?? 1.0
  adjustedScore *= positionBoost

  return adjustedScore
}

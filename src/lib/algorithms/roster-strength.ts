import type { AlgorithmPlayer, PositionBaseline, RosterSlot, RosterStrength, Position } from './types'

const DEFAULT_STARTERS: Record<string, number> = {
  QB: 1,
  RB: 2,
  WR: 2,
  TE: 1,
  K: 1,
  DEF: 1,
  DL: 0,
  LB: 0,
  DB: 0,
}

const STANDARD_POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'DL', 'LB', 'DB']

/**
 * Calculates roster strength by evaluating the total VBD value at each position.
 *
 * Algorithm:
 * 1. For each position, identify how many starters are required
 * 2. Find the best N players at that position (N = starter count)
 * 3. Calculate VBD for each starter: projectedPoints - baseline.projectedPoints
 * 4. Sum VBD for each position
 * 5. Determine surplus (above average) and needs (below average) positions
 *
 * @param roster - Array of players on the roster with projectedPoints
 * @param baselines - Position baselines for VBD calculation (position -> baseline)
 * @param rosterSlots - Optional roster slot configuration to determine starter counts
 * @returns RosterStrength with totalVBD, byPosition, surplus, and needs
 */
export function calculateRosterStrength(
  roster: AlgorithmPlayer[],
  baselines: Partial<Record<string, PositionBaseline>>,
  rosterSlots?: RosterSlot[]
): RosterStrength {
  if (!roster || roster.length === 0) {
    return {
      totalVBD: 0,
      byPosition: {},
      surplus: [],
      needs: [],
    }
  }

  const byPosition: Record<string, number> = {}
  let totalVBD = 0

  for (const position of STANDARD_POSITIONS) {
    const starterCount = countStartersAtPosition(position as Position, rosterSlots)
    if (starterCount === 0) continue

    const positionPlayers = roster
      .filter((p) => p.position === position || p.eligiblePositions?.includes(position as Position))
      .sort((a, b) => b.projectedPoints - a.projectedPoints)

    const baseline = baselines[position]
    const baselinePoints = baseline?.projectedPoints ?? 0

    let positionVBD = 0
    const starters = positionPlayers.slice(0, starterCount)
    for (const player of starters) {
      const playerVBD = player.projectedPoints - baselinePoints
      positionVBD += playerVBD
    }

    if (starters.length < starterCount) {
      const missingSlots = starterCount - starters.length
      positionVBD -= missingSlots * baselinePoints
    }

    byPosition[position] = positionVBD
    totalVBD += positionVBD
  }

  const positionVBDs = Object.entries(byPosition)
  const avgVBD = positionVBDs.length > 0 
    ? positionVBDs.reduce((sum, [, vbd]) => sum + vbd, 0) / positionVBDs.length 
    : 0

  const surplus: string[] = []
  const needs: string[] = []

  for (const [position, vbd] of positionVBDs) {
    if (vbd > avgVBD * 1.1) {
      surplus.push(position)
    } else if (vbd < avgVBD * 0.9) {
      needs.push(position)
    }
  }

  return {
    totalVBD,
    byPosition,
    surplus,
    needs,
  }
}

function countStartersAtPosition(
  position: Position,
  rosterSlots: RosterSlot[] | undefined
): number {
  if (!rosterSlots || rosterSlots.length === 0) {
    return DEFAULT_STARTERS[position] ?? 0
  }

  let count = 0
  for (const slot of rosterSlots.filter((s) => s.slotType === 'starter')) {
    if (slot.allowedPositions.length === 1 && slot.allowedPositions[0] === position) {
      count++
    }
  }
  return count
}

export function calculateCompatibilityScore(
  myStrength: RosterStrength,
  theirStrength: RosterStrength
): { score: number; suggestedPositions: string[] } {
  const suggestedPositions: string[] = []
  let matchCount = 0

  for (const position of myStrength.surplus) {
    if (theirStrength.needs.includes(position)) {
      matchCount++
      suggestedPositions.push(`Give ${position}`)
    }
  }

  for (const position of theirStrength.surplus) {
    if (myStrength.needs.includes(position)) {
      matchCount++
      suggestedPositions.push(`Get ${position}`)
    }
  }

  const score = Math.min(100, Math.round((matchCount / 4) * 100))

  return { score, suggestedPositions }
}

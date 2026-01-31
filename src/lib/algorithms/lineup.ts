import type {
  AlgorithmPlayer,
  LineupExplanation,
  LineupInput,
  LineupOutput,
  Position,
  RosterSlot,
} from './types'

const TIMEOUT_MS = 500

const flexPositionMap: Record<Position, Position[] | null> = {
  FLEX: ['RB', 'WR', 'TE'],
  SUPERFLEX: ['QB', 'RB', 'WR', 'TE'],
  REC_FLEX: ['WR', 'TE'],
  WRRB_FLEX: ['WR', 'RB'],
  IDP_FLEX: ['DL', 'LB', 'DB'],
  QB: null,
  RB: null,
  WR: null,
  TE: null,
  K: null,
  DEF: null,
  DL: null,
  LB: null,
  DB: null,
}

function normalizeEligiblePositions(player: AlgorithmPlayer): Position[] {
  if (player.eligiblePositions && player.eligiblePositions.length > 0) {
    return player.eligiblePositions
  }
  return [player.position]
}

function expandSlotPositions(slot: RosterSlot): Position[] {
  const expanded = new Set<Position>()
  slot.allowedPositions.forEach(position => {
    const flexPositions = flexPositionMap[position]
    if (flexPositions) {
      flexPositions.forEach(flexPos => expanded.add(flexPos))
    } else {
      expanded.add(position)
    }
  })
  return Array.from(expanded)
}

function isEligibleForSlot(player: AlgorithmPlayer, slotPositions: Position[]): boolean {
  const eligiblePositions = normalizeEligiblePositions(player)
  return eligiblePositions.some(position => slotPositions.includes(position))
}

function isUnavailableForWeek(
  player: AlgorithmPlayer,
  week: number
): { unavailable: boolean; reason?: string; missingByeData: boolean } {
  const byeWeek = player.byeWeek
  const missingByeData = byeWeek === null || byeWeek === undefined

  if (!missingByeData && byeWeek === week) {
    return {
      unavailable: true,
      reason: `Bye week ${byeWeek}`,
      missingByeData: false,
    }
  }

  const status = typeof player.status === 'string' ? player.status.toUpperCase() : ''
  if (status === 'OUT' || status === 'IR') {
    return {
      unavailable: true,
      reason: `Status ${status}`,
      missingByeData,
    }
  }

  const injuryStatus =
    typeof player.injuryStatus === 'string' ? player.injuryStatus.toUpperCase() : ''
  if (injuryStatus === 'OUT' || injuryStatus === 'IR') {
    return {
      unavailable: true,
      reason: `Injury ${injuryStatus}`,
      missingByeData,
    }
  }

  return { unavailable: false, missingByeData }
}

function buildGreedyAssignment(
  slots: RosterSlot[],
  availablePlayers: AlgorithmPlayer[],
  slotPositions: Map<string, Position[]>
): { assignment: Map<string, AlgorithmPlayer | null>; projectedPoints: number } {
  const assignment = new Map<string, AlgorithmPlayer | null>()
  const used = new Set<string>()
  let projectedPoints = 0

  slots.forEach(slot => {
    const positions = slotPositions.get(slot.slotId) || []
    const eligible = availablePlayers
      .filter(player => !used.has(player.playerId) && isEligibleForSlot(player, positions))
      .sort((a, b) => b.projectedPoints - a.projectedPoints)

    const selected = eligible[0]
    if (selected) {
      assignment.set(slot.slotId, selected)
      used.add(selected.playerId)
      projectedPoints += selected.projectedPoints
    } else {
      assignment.set(slot.slotId, null)
    }
  })

  return { assignment, projectedPoints }
}

export function optimizeLineup(input: LineupInput): LineupOutput {
  const excludedPlayers: LineupExplanation['excludedPlayers'] = []
  const availablePlayers: AlgorithmPlayer[] = []
  const caveats: string[] = []
  let missingByeData = false

  input.roster.forEach(player => {
    const availability = isUnavailableForWeek(player, input.week)
    if (availability.missingByeData) {
      missingByeData = true
    }

    if (availability.unavailable) {
      excludedPlayers.push({
        playerId: player.playerId,
        fullName: player.fullName,
        reason: availability.reason || 'Unavailable',
      })
      return
    }

    availablePlayers.push({
      ...player,
      eligiblePositions: normalizeEligiblePositions(player),
    })
  })

  if (missingByeData) {
    caveats.push('Bye week data not available for all players.')
  }

  const starterSlots = input.slots.filter(slot => slot.slotType === 'starter')
  const benchSlots = input.slots.filter(slot => slot.slotType === 'bench')

  const slotPositions = new Map<string, Position[]>()
  starterSlots.forEach(slot => {
    slotPositions.set(slot.slotId, expandSlotPositions(slot))
  })

  const greedy = buildGreedyAssignment(starterSlots, availablePlayers, slotPositions)

  const slotsForSearch = [...starterSlots].sort((a, b) => {
    const aPositions = slotPositions.get(a.slotId)?.length ?? 0
    const bPositions = slotPositions.get(b.slotId)?.length ?? 0
    if (aPositions !== bPositions) {
      return aPositions - bPositions
    }
    return a.slotId.localeCompare(b.slotId)
  })

  const slotToPlayers = new Map<string, AlgorithmPlayer[]>()
  for (const slot of slotsForSearch) {
    const positions = slotPositions.get(slot.slotId) || []
    const eligible = availablePlayers
      .filter(player => isEligibleForSlot(player, positions))
      .sort((a, b) => b.projectedPoints - a.projectedPoints)
    slotToPlayers.set(slot.slotId, eligible)
  }

  let bestAssignment = new Map(greedy.assignment)
  let bestScore = greedy.projectedPoints
  let timedOut = false
  const startTime = Date.now()

  const backtrack = (
    index: number,
    used: Set<string>,
    currentScore: number,
    currentAssignment: Map<string, AlgorithmPlayer | null>
  ) => {
    if (Date.now() - startTime > TIMEOUT_MS) {
      timedOut = true
      return
    }

    if (index >= slotsForSearch.length) {
      if (currentScore > bestScore) {
        bestScore = currentScore
        bestAssignment = new Map(currentAssignment)
      }
      return
    }

    const slot = slotsForSearch[index]
    const allEligible = slotToPlayers.get(slot.slotId) || []
    const eligiblePlayers = allEligible.filter(player => !used.has(player.playerId))

    if (eligiblePlayers.length === 0) {
      currentAssignment.set(slot.slotId, null)
      backtrack(index + 1, used, currentScore, currentAssignment)
      currentAssignment.delete(slot.slotId)
      return
    }

    eligiblePlayers.forEach(player => {
      if (timedOut) return
      used.add(player.playerId)
      currentAssignment.set(slot.slotId, player)
      backtrack(index + 1, used, currentScore + player.projectedPoints, currentAssignment)
      currentAssignment.delete(slot.slotId)
      used.delete(player.playerId)
    })
  }

  backtrack(0, new Set<string>(), 0, new Map())

  if (timedOut) {
    caveats.push('Optimization exceeded 500ms; using greedy fallback.')
    bestAssignment = new Map(greedy.assignment)
    bestScore = greedy.projectedPoints
  }

  const starters: AlgorithmPlayer[] = []
  const decisions: LineupExplanation['decisions'] = []

  starterSlots.forEach(slot => {
    const selected = bestAssignment.get(slot.slotId) || null
    if (selected) {
      starters.push(selected)
      decisions.push({
        slotId: slot.slotId,
        slotType: slot.slotType,
        allowedPositions: slot.allowedPositions,
        playerId: selected.playerId,
        fullName: selected.fullName,
        projectedPoints: selected.projectedPoints,
        reason: timedOut
          ? 'Selected by greedy fallback due to timeout.'
          : 'Selected by backtracking search to maximize projected points.',
      })
    }
  })

  const starterIds = new Set(starters.map(player => player.playerId))
  const bench = availablePlayers.filter(player => !starterIds.has(player.playerId))

  const projectedPoints = starters.reduce((sum, player) => sum + player.projectedPoints, 0)

  return {
    starters,
    bench,
    projectedPoints,
    explanation: {
      algorithm: 'lineup_optimizer_v1',
      timestamp: new Date().toISOString(),
      inputsSummary: {
        rosterCount: input.roster.length,
        slotCount: input.slots.length,
        starterSlots: starterSlots.length,
        benchSlots: benchSlots.length,
        week: input.week,
      },
      excludedPlayers,
      decisions,
      caveats,
    },
  }
}

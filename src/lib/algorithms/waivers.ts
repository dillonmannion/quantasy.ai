import type {
  AlgorithmPlayer,
  FABBidRange,
  Position,
  PositionBaseline,
  RosterSlot,
  WaiverExplanation,
  WaiverInput,
  WaiverOutput,
  WaiverRecommendation,
} from './types'

/**
 * Default starter counts when rosterSlots not provided.
 * Conservative values for standard fantasy football leagues.
 */
const DEFAULT_STARTERS: Record<string, number> = {
  QB: 1,
  RB: 2,
  WR: 2,
  TE: 1,
  K: 1,
  DEF: 1,
  DL: 1,
  LB: 1,
  DB: 1,
}

/**
 * Counts dedicated starter slots for a specific position.
 * FLEX slots are NOT counted toward position-specific starters.
 * This is a conservative approach - a QB slot counts for QB, but a SUPERFLEX slot does NOT count for QB.
 */
function countStartersAtPosition(
  position: Position,
  rosterSlots: RosterSlot[] | undefined
): number {
  if (!rosterSlots || rosterSlots.length === 0) {
    return DEFAULT_STARTERS[position] ?? 1
  }

  let count = 0
  for (const slot of rosterSlots.filter((s) => s.slotType === 'starter')) {
    // Only count slots where this position is the ONLY allowed position
    // This excludes FLEX/SUPERFLEX/etc. slots
    if (slot.allowedPositions.length === 1 && slot.allowedPositions[0] === position) {
      count++
    }
  }
  return count
}

/**
 * Classifies the roster need multiplier for a waiver candidate.
 * Returns multiplier (1.5x injury, 1.3x upgrade, 0.8x depth, 1.0x default) and reason.
 */
function classifyNeedMultiplier(
  candidate: AlgorithmPlayer,
  currentRoster: AlgorithmPlayer[],
  rosterSlots: RosterSlot[] | undefined
): { multiplier: number; reason: string } {
  const position = candidate.position
  const rosterAtPosition = currentRoster.filter((p) => p.position === position)
  const startersNeeded = countStartersAtPosition(position, rosterSlots)

  // Apply Starter Proxy Rule: SORT FIRST, then take top N
  const sortedAtPosition = [...rosterAtPosition].sort((a, b) => {
    const pointsDiff = b.projectedPoints - a.projectedPoints
    if (pointsDiff !== 0) return pointsDiff
    return a.playerId.localeCompare(b.playerId) // tie-breaker
  })
  const starters = sortedAtPosition.slice(0, startersNeeded)

  // 1. INJURY REPLACEMENT (1.5x) - roster has injured starter at this position
  const injuredStarters = starters.filter(
    (p) => p.injuryStatus && ['Out', 'IR', 'Doubtful'].includes(p.injuryStatus)
  )
  if (injuredStarters.length > 0) {
    return { multiplier: 1.5, reason: 'Injury replacement for ' + injuredStarters[0].fullName }
  }

  // 2. STARTER UPGRADE (1.3x) - candidate would start over worst starter
  const worstStarter = starters[starters.length - 1]
  if (worstStarter && candidate.projectedPoints > worstStarter.projectedPoints) {
    return { multiplier: 1.3, reason: 'Starter upgrade over ' + worstStarter.fullName }
  }

  // 3. DEPTH (0.8x) - roster already has starter-quality players
  if (starters.length >= startersNeeded) {
    return { multiplier: 0.8, reason: 'Depth add (starter slots filled)' }
  }

  // Default: neutral (1.0x) - filling roster gap
  return { multiplier: 1.0, reason: 'Filling roster gap' }
}

/**
 * Finds players eligible to be dropped from the roster.
 * Protects top N players at each core position where N = starter count.
 * When rosterSlots not provided, only protects core positions (QB/RB/WR/TE).
 */
function findDroppable(
  currentRoster: AlgorithmPlayer[],
  rosterSlots: RosterSlot[] | undefined
): AlgorithmPlayer[] {
  // When no rosterSlots, only protect core fantasy positions (not K/DEF/IDP)
  const positionsToProtect: Position[] = rosterSlots
    ? ['QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'DL', 'LB', 'DB']
    : ['QB', 'RB', 'WR', 'TE']

  const protectedIds = new Set<string>()
  for (const position of positionsToProtect) {
    const minCount = countStartersAtPosition(position, rosterSlots)
    const playersAtPos = currentRoster
      .filter((p) => p.position === position)
      .sort((a, b) => {
        const pointsDiff = b.projectedPoints - a.projectedPoints
        if (pointsDiff !== 0) return pointsDiff
        return a.playerId.localeCompare(b.playerId)
      })
    playersAtPos.slice(0, minCount).forEach((p) => protectedIds.add(p.playerId))
  }

  return currentRoster.filter((p) => !protectedIds.has(p.playerId))
}

/**
 * Calculates FAAB bid range for a waiver candidate.
 * Returns null for non-FAAB leagues, exhausted budgets, or non-improvements.
 */
function calculateFaabBidRange(
  vbdImprovement: number,
  needMultiplier: number,
  faabBudget: { total: number; remaining: number } | undefined
): FABBidRange | null {
  // No FAAB budget = non-FAAB league
  if (!faabBudget || faabBudget.remaining <= 0) {
    return null
  }

  // EDGE CASE: Negative or zero VBD improvement = no bid suggestion
  if (vbdImprovement <= 0) {
    return null // Player doesn't improve roster, don't recommend a bid
  }

  // Step 1: Base bid as % of TOTAL budget based on VBD improvement
  // Clamp to [0, 0.30] to prevent negative/excessive bids
  const basePercent = Math.max(0, Math.min(vbdImprovement / 100, 0.3))
  const baseBid = Math.round(faabBudget.total * basePercent)

  // Step 2: Apply need multiplier
  const adjustedBid = Math.round(baseBid * needMultiplier)

  // Step 3: Cap at remaining budget
  const cappedBid = Math.min(adjustedBid, faabBudget.remaining)

  // Step 4: Calculate range (safe = 80%, aggressive = 120% of capped)
  const minBid = Math.max(1, Math.round(cappedBid * 0.8))
  const maxBid = Math.min(faabBudget.remaining, Math.round(cappedBid * 1.2))

  return {
    min: minBid,
    max: maxBid,
    budgetPercentageMin: Math.round((minBid / faabBudget.total) * 100),
    budgetPercentageMax: Math.round((maxBid / faabBudget.total) * 100),
  }
}

/**
 * Recommends waiver pickups based on VBD improvement and roster needs.
 * Pure function - no side effects or external calls.
 */
export function recommendWaivers(input: WaiverInput): WaiverOutput {
  const caveats: string[] = []
  const recommendations: WaiverRecommendation[] = []

  // Step 1: Filter candidates with missing baselines
  const candidatesWithBaselines = input.availablePlayers.filter((candidate) => {
    const baseline = input.leagueSettings.baselines[candidate.position]
    if (!baseline) {
      // Silently skip - add caveat once at end if any excluded
      return false
    }
    return true
  })

  // Add caveat if candidates were excluded
  if (candidatesWithBaselines.length < input.availablePlayers.length) {
    caveats.push('Players at positions without baselines are excluded')
  }

  // Step 2: For each candidate, calculate VBD improvement and priority
  for (const candidate of candidatesWithBaselines) {
    const baseline = input.leagueSettings.baselines[candidate.position] as PositionBaseline

    // VBD calculation
    const candidateVBD = candidate.projectedPoints - baseline.projectedPoints

    // Find worst starter at position for vbdImprovement calculation
    const rosterAtPosition = input.currentRoster
      .filter((p) => p.position === candidate.position)
      .sort((a, b) => {
        const pointsDiff = b.projectedPoints - a.projectedPoints
        if (pointsDiff !== 0) return pointsDiff
        return a.playerId.localeCompare(b.playerId)
      })

    const startersNeeded = countStartersAtPosition(
      candidate.position,
      input.leagueSettings.rosterSlots
    )
    const starters = rosterAtPosition.slice(0, startersNeeded)
    const worstStarter = starters[starters.length - 1]

    const worstStarterVBD = worstStarter
      ? worstStarter.projectedPoints - baseline.projectedPoints
      : 0 // No one to compare against

    const vbdImprovement = candidateVBD - worstStarterVBD

    // Calculate need multiplier
    const { multiplier: needMultiplier, reason: needReason } = classifyNeedMultiplier(
      candidate,
      input.currentRoster,
      input.leagueSettings.rosterSlots
    )

    // Priority score
    const priorityScore = vbdImprovement * needMultiplier

    // FAAB bid
    const suggestedFaabBid = calculateFaabBidRange(vbdImprovement, needMultiplier, input.faabBudget)

    // Build "Show Your Work" reasons
    const reasons: string[] = [
      `VBD: ${candidateVBD} (proj: ${candidate.projectedPoints} - baseline: ${baseline.projectedPoints})`,
      `Improvement: +${vbdImprovement} over ${worstStarter ? `${worstStarter.fullName} (${worstStarterVBD})` : 'empty roster (0)'}`,
      needReason,
      `Need: ${needMultiplier}x (${needReason})`,
      `Priority score: ${priorityScore} = ${vbdImprovement} × ${needMultiplier}`,
    ]

    if (suggestedFaabBid) {
      reasons.push(
        `FAAB range: $${suggestedFaabBid.min}-$${suggestedFaabBid.max} ` +
          `(${suggestedFaabBid.budgetPercentageMin}%-${suggestedFaabBid.budgetPercentageMax}% of $${input.faabBudget!.total})`
      )
    }

    recommendations.push({
      player: candidate,
      priorityScore,
      suggestedFaabBid,
      vbdImprovement,
      reasons,
    })
  }

  // Step 3: Sort recommendations (CANONICAL ordering)
  recommendations.sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore
    if (b.vbdImprovement !== a.vbdImprovement) return b.vbdImprovement - a.vbdImprovement
    if (b.player.projectedPoints !== a.player.projectedPoints)
      return b.player.projectedPoints - a.player.projectedPoints
    return a.player.playerId.localeCompare(b.player.playerId)
  })

  // Step 4: Calculate droppable players
  const droppable = findDroppable(input.currentRoster, input.leagueSettings.rosterSlots)

  // Step 5: Add standard caveats
  if (!input.leagueSettings.rosterSlots) {
    caveats.push('Roster slot configuration not provided; using default starter counts')
  }
  caveats.push('Bye week conflicts not factored in v1')
  caveats.push('Matchup strength not factored in v1')

  // Step 6: Build explanation
  const explanation: WaiverExplanation = {
    algorithm: 'waiver_v1',
    timestamp: new Date().toISOString(),
    methodology:
      '## Waiver Priority Calculation\n\n' +
      'Priority is calculated as: **VBD Improvement × Roster Need Multiplier**\n\n' +
      '### VBD Improvement\n' +
      'VBD Improvement = Candidate VBD - Worst Starter VBD at position\n' +
      '- Candidate VBD = Projected Points - Baseline Points\n' +
      '- Baseline = Replacement level player at position\n\n' +
      '### Roster Need Multipliers\n' +
      '- **1.5x**: Injury replacement (starter Out/IR/Doubtful)\n' +
      '- **1.3x**: Starter upgrade (candidate better than worst starter)\n' +
      '- **1.0x**: Filling roster gap\n' +
      '- **0.8x**: Depth add (starter slots filled)\n\n' +
      '### FAAB Bids\n' +
      'Base bid = min(VBD Improvement / 100, 30%) of total budget\n' +
      'Adjusted bid = Base × Need Multiplier\n' +
      'Range = 80%-120% of adjusted bid, capped at remaining budget',
    caveats,
    priorityFactors: ['VBD improvement', 'Roster need'],
  }

  return {
    recommendations,
    droppable,
    explanation,
  }
}

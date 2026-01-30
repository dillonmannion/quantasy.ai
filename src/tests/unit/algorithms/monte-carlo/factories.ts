import type {
  MonteCarloInput,
  PlayerPreference,
  MarketConfig,
  GuardrailConfig,
} from '@/lib/algorithms/monte-carlo/types'
import type { PlayerRanking, Position } from '@/lib/algorithms/types'
import type { DraftState } from '@/lib/draft/types'

/**
 * Realistic NFL player data for deterministic test scenarios.
 * Uses actual player names and positions with consistent IDs.
 */
const REALISTIC_PLAYERS: Array<{
  id: string
  name: string
  position: Position
  team: string
  projectedPoints: number
}> = [
  // QBs
  { id: '4046', name: 'Patrick Mahomes', position: 'QB', team: 'KC', projectedPoints: 310 },
  { id: '4040', name: 'Josh Allen', position: 'QB', team: 'BUF', projectedPoints: 305 },
  { id: '4041', name: 'Jalen Hurts', position: 'QB', team: 'PHI', projectedPoints: 300 },
  { id: '4039', name: 'Lamar Jackson', position: 'QB', team: 'BAL', projectedPoints: 295 },
  { id: '4043', name: 'Joe Burrow', position: 'QB', team: 'CIN', projectedPoints: 285 },

  // RBs
  { id: '6803', name: 'Christian McCaffrey', position: 'RB', team: 'SF', projectedPoints: 280 },
  { id: '6802', name: 'Derrick Henry', position: 'RB', team: 'TEN', projectedPoints: 260 },
  { id: '6801', name: 'Jonathan Taylor', position: 'RB', team: 'IND', projectedPoints: 250 },
  { id: '6804', name: 'Josh Jacobs', position: 'RB', team: 'LV', projectedPoints: 240 },
  { id: '6805', name: 'Saquon Barkley', position: 'RB', team: 'PHI', projectedPoints: 235 },
  { id: '6806', name: 'Breece Hall', position: 'RB', team: 'NYJ', projectedPoints: 225 },
  { id: '6807', name: 'Travis Etienne', position: 'RB', team: 'JAX', projectedPoints: 220 },

  // WRs
  { id: '5018', name: 'Tyreek Hill', position: 'WR', team: 'MIA', projectedPoints: 270 },
  { id: '5019', name: 'Justin Jefferson', position: 'WR', team: 'MIN', projectedPoints: 265 },
  { id: '5020', name: 'Stefon Diggs', position: 'WR', team: 'BUF', projectedPoints: 260 },
  { id: '5021', name: 'CeeDee Lamb', position: 'WR', team: 'DAL', projectedPoints: 255 },
  { id: '5022', name: 'A.J. Brown', position: 'WR', team: 'PHI', projectedPoints: 250 },
  { id: '5023', name: 'Davante Adams', position: 'WR', team: 'LV', projectedPoints: 245 },
  { id: '5024', name: 'Deebo Samuel', position: 'WR', team: 'SF', projectedPoints: 240 },

  // TEs
  { id: '5048', name: 'Travis Kelce', position: 'TE', team: 'KC', projectedPoints: 200 },
  { id: '5049', name: 'Mark Andrews', position: 'TE', team: 'BAL', projectedPoints: 180 },
  { id: '5050', name: 'Darren Waller', position: 'TE', team: 'NYG', projectedPoints: 170 },
  { id: '5051', name: 'George Kittle', position: 'TE', team: 'SF', projectedPoints: 165 },
]

/**
 * Create a mock PlayerRanking from basic player data.
 * Used internally by factory functions.
 */
function createMockPlayerRanking(
  id: string,
  name: string,
  position: Position,
  team: string,
  projectedPoints: number,
  overallRank: number
): PlayerRanking {
  const [firstName, ...lastNameParts] = name.split(' ')
  const lastName = lastNameParts.join(' ')

  return {
    playerId: id,
    fullName: name,
    firstName: firstName || null,
    lastName: lastName || null,
    team,
    position,
    eligiblePositions: [position],
    projectedPoints,
    vbdScore: projectedPoints - 100, // Simplified VBD
    overallRank,
    positionRank: overallRank, // Simplified
    status: 'Active',
    injuryStatus: null,
  }
}

/**
 * Create a mock DraftState for testing.
 * Represents the current state of a draft with picked players.
 *
 * @param overrides - Partial overrides for specific test scenarios
 * @returns DraftState with deterministic data
 */
export function createMockDraftBoard(overrides?: {
  teams?: number
  currentPick?: number
  draftedPlayers?: string[]
}): DraftState {
  const teams = overrides?.teams ?? 12
  const currentPick = overrides?.currentPick ?? 1
  const draftedPlayerIds = new Set(overrides?.draftedPlayers ?? [])

  return {
    draftId: 'mock-draft-123',
    status: 'drafting',
    picks: Array.from(draftedPlayerIds).map((playerId, index) => ({
      pickNumber: index + 1,
      playerId,
      playerName: REALISTIC_PLAYERS.find((p) => p.id === playerId)?.name ?? `Player ${playerId}`,
      position: REALISTIC_PLAYERS.find((p) => p.id === playerId)?.position ?? 'RB',
      rosterId: Math.floor(index / 2) + 1, // Alternate between teams
      timestamp: Date.now() - (draftedPlayerIds.size - index) * 5000,
    })),
    draftedPlayerIds,
    userRosterId: 1,
    currentPick,
  }
}

/**
 * Create a mock ADP map for testing.
 * Maps player IDs to Average Draft Position values (1-100).
 *
 * @param players - Optional array of player IDs to include (defaults to top 20)
 * @returns Record mapping player ID to ADP number
 */
export function createMockADPMap(players?: string[]): Record<string, number> {
  const playerList = players ?? REALISTIC_PLAYERS.slice(0, 20).map((p) => p.id)

  const adpMap: Record<string, number> = {}

  // Assign deterministic ADP values based on position and index
  playerList.forEach((playerId, index) => {
    const player = REALISTIC_PLAYERS.find((p) => p.id === playerId)
    if (player) {
      // Deterministic ADP: QB 1-5, RB 6-15, WR 16-25, TE 26-30
      const positionOffsets: Record<Position, number> = {
        QB: 0,
        RB: 5,
        WR: 15,
        TE: 25,
        K: 30,
        DEF: 35,
        FLEX: 0,
        SUPERFLEX: 0,
        REC_FLEX: 0,
        WRRB_FLEX: 0,
        IDP_FLEX: 0,
        DL: 0,
        LB: 0,
        DB: 0,
      }
      const positionOffset = positionOffsets[player.position] ?? 0

      adpMap[playerId] = positionOffset + index + 1
    }
  })

  return adpMap
}

/**
 * Create a mock preferences map for testing.
 * Maps player IDs to preference levels.
 *
 * @param likes - Optional array of player IDs to mark as "like"
 * @param dislikes - Optional array of player IDs to mark as "dislike"
 * @param dnd - Optional array of player IDs to mark as "dnd" (do not draft)
 * @returns Record mapping player ID to PlayerPreference
 */
export function createMockPreferences(
  likes?: string[],
  dislikes?: string[],
  dnd?: string[]
): Record<string, PlayerPreference> {
  const preferences: Record<string, PlayerPreference> = {}

  // Mark likes
  likes?.forEach((playerId) => {
    preferences[playerId] = 'like'
  })

  // Mark dislikes
  dislikes?.forEach((playerId) => {
    preferences[playerId] = 'dislike'
  })

  // Mark DND
  dnd?.forEach((playerId) => {
    preferences[playerId] = 'dnd'
  })

  return preferences
}

/**
 * Create a mock MonteCarloInput for testing.
 * Generates a complete, realistic simulation input with all required fields.
 *
 * @param overrides - Partial overrides for specific test scenarios
 * @returns MonteCarloInput with deterministic data
 *
 * @example
 * // Default 12-team PPR league
 * const input = createMockSimulationInput()
 *
 * @example
 * // Custom with specific preferences
 * const input = createMockSimulationInput({
 *   preferences: createMockPreferences(['6803'], ['5018']),
 *   riskTolerance: 0.5,
 * })
 */
export function createMockSimulationInput(
  overrides?: Partial<MonteCarloInput>
): MonteCarloInput {
  // Default players: top 20 realistic players
  const defaultPlayers = REALISTIC_PLAYERS.slice(0, 20).map((p, index) =>
    createMockPlayerRanking(p.id, p.name, p.position, p.team, p.projectedPoints, index + 1)
  )

  // Default ADP map
  const defaultAdpMap = createMockADPMap(defaultPlayers.map((p) => p.playerId))

  // Default draft board: 12 teams, pick 1, no drafted players
  const defaultDraftBoard = createMockDraftBoard({
    teams: 12,
    currentPick: 1,
    draftedPlayers: [],
  })

  // Default preferences: all neutral
  const defaultPreferences: Record<string, PlayerPreference> = {}
  defaultPlayers.forEach((p) => {
    defaultPreferences[p.playerId] = 'neutral'
  })

  // Default market config
  const defaultMarketConfig: MarketConfig = {
    noiseStdDev: 5, // 5 picks of noise
    adpWeight: 0.8, // 80% weight to ADP
    tiebreaker: 0.001,
  }

  // Default guardrail config
  const minStartersByPosition: Record<Position, number> = {
    QB: 1,
    RB: 2,
    WR: 2,
    TE: 1,
    K: 1,
    DEF: 1,
    FLEX: 1,
    SUPERFLEX: 0,
    REC_FLEX: 0,
    WRRB_FLEX: 0,
    IDP_FLEX: 0,
    DL: 0,
    LB: 0,
    DB: 0,
  }

  const defaultGuardrailConfig: GuardrailConfig = {
    requireTE: true,
    no2ndQB: true,
    minStartersByPosition,
  }

  return {
    players: overrides?.players ?? defaultPlayers,
    adpMap: overrides?.adpMap ?? defaultAdpMap,
    draftState: overrides?.draftState ?? defaultDraftBoard,
    userRosterId: overrides?.userRosterId ?? 1,
    preferences: overrides?.preferences ?? defaultPreferences,
    riskTolerance: overrides?.riskTolerance ?? 1.0, // Balanced
    marketConfig: overrides?.marketConfig ?? defaultMarketConfig,
    guardrailConfig: overrides?.guardrailConfig ?? defaultGuardrailConfig,
  }
}

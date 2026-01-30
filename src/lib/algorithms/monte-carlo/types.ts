import type { Position, PlayerRanking } from '@/lib/algorithms/types'
import type { DraftState } from '@/lib/draft/types'

/**
 * Player preference level for Monte Carlo simulation.
 * Used to adjust player selection probability in simulations.
 */
export type PlayerPreference =
  | 'strongly_like'
  | 'like'
  | 'neutral'
  | 'dislike'
  | 'strongly_dislike'
  | 'dnd' // Do Not Draft

/**
 * Preference modifiers mapping preference levels to probability adjustments.
 * Example: { 'strongly_like': 1.5, 'like': 1.2, 'neutral': 1.0, ... }
 * Values > 1.0 increase selection probability, < 1.0 decrease it.
 */
export type PreferenceModifiers = Record<PlayerPreference, number>

/**
 * Draft position information for a specific pick.
 * Represents where in the draft order a pick occurs.
 */
export interface DraftPosition {
  /** Round number (1-based) */
  round: number

  /** Pick within the round (1-based) */
  pick: number

  /** Overall pick number across all rounds (1-based) */
  overall: number
}

/**
 * Market configuration for Monte Carlo simulation.
 * Controls how ADP and noise affect player selection in simulations.
 */
export interface MarketConfig {
  /** Standard deviation of noise applied to ADP values (0-1 scale) */
  noiseStdDev: number

  /** Weight given to ADP in player selection (0-1, higher = more ADP influence) */
  adpWeight: number

  /** Tiebreaker strategy when players have equal adjusted values (0-1) */
  tiebreaker: number
}

/**
 * Guardrail configuration for roster construction.
 * Enforces constraints on roster composition during simulations.
 */
export interface GuardrailConfig {
  /** Require at least one TE in final roster */
  requireTE: boolean

  /** Prevent drafting a second QB (only one QB allowed) */
  no2ndQB: boolean

  /** Minimum number of starters required at each position */
  minStartersByPosition: Record<Position, number>
}

/**
 * Input parameters for Monte Carlo draft simulation.
 * Contains all data needed to run simulations and generate recommendations.
 */
export interface MonteCarloInput {
  /** Array of available players with rankings and projections */
  players: PlayerRanking[]

  /** ADP (Average Draft Position) for each player (keyed by player ID) */
  adpMap: Record<string, number>

  /** Current draft state including picks made and current position */
  draftState: DraftState

  /** User's roster ID in the league */
  userRosterId: number

  /** User preferences for each player (keyed by player ID) */
  preferences: Record<string, PlayerPreference>

  /** Risk tolerance for recommendations (0-1, higher = more aggressive) */
  riskTolerance: number

  /** Market configuration for simulation behavior */
  marketConfig: MarketConfig

  /** Guardrail configuration for roster constraints */
  guardrailConfig: GuardrailConfig
}

/**
 * Result of a single Monte Carlo simulation.
 * Represents one complete draft scenario from current position to end.
 */
export interface SimulationResult {
  /** Player IDs picked in this simulation (in order) */
  pickedPlayers: string[]

  /** Player IDs picked by the user in this simulation */
  userPicks: string[]

  /** Final roster composition with positions */
  finalRoster: Array<{
    position: Position
    playerId: string
  }>
}

/**
 * Recommendation for a single player pick.
 * Includes survival rate and reasoning.
 */
export interface PickRecommendation {
  /** Player ID being recommended */
  playerId: string

  /** Player name */
  playerName: string

  /** Player position */
  position: Position

  /** Percentage of simulations where this player was available at this pick (0-100) */
  survivalRate: number

  /** Confidence score for recommendation (0-1) */
  confidence: number

  /** Reasons for recommendation */
  reasons: string[]
}

/**
 * Output of Monte Carlo draft simulation.
 * Contains recommendations and analysis for draft decision-making.
 */
export interface MonteCarloOutput {
  /** Ranked pick recommendations for current position */
  recommendations: PickRecommendation[]

  /** Survival rate for each player (% of simulations where available) */
  survivalMap: Record<string, number>

  /** Best pick recommendation (player ID) or null if no valid picks */
  bestPick: string | null

  /** Metadata about the simulation run */
  metadata: {
    /** Total players evaluated */
    playerCount: number

    /** Number of simulations run */
    simulationCount: number

    /** Execution time in milliseconds */
    executionTimeMs: number
  }
}

/**
 * Detailed explanation of Monte Carlo simulation for "Show Your Work" transparency.
 * Stored in algorithm_outputs table for audit trail and user education.
 */
export interface MonteCarloExplanation {
  /** Algorithm version identifier */
  algorithm: 'monte_carlo_v1'

  /** ISO timestamp of calculation */
  timestamp: string

  /** Input parameters used */
  inputs: {
    /** Total players evaluated */
    playerCount: number

    /** Number of simulations run */
    simulationCount: number

    /** Risk tolerance setting (0-1) */
    riskTolerance: number

    /** Current draft round */
    currentRound: number

    /** Current pick in round */
    currentPick: number
  }

  /** Simulation configuration */
  config: {
    /** Market noise standard deviation */
    noiseStdDev: number

    /** ADP weight in selection */
    adpWeight: number

    /** Guardrails enforced */
    guardrails: {
      requireTE: boolean
      no2ndQB: boolean
    }
  }

  /** Top recommendations with reasoning */
  topRecommendations: Array<{
    playerId: string
    playerName: string
    position: Position
    survivalRate: number
    reasons: string[]
  }>

  /** Markdown-formatted explanation of methodology */
  methodology: string

  /** Known limitations and caveats */
  caveats: string[]
}

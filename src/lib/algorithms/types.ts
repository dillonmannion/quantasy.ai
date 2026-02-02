import type { SleeperPlayer } from '@/lib/sleeper/types'
import type { DraftPick } from './draft-picks'

/**
 * Scoring settings from Sleeper league configuration.
 * Maps stat keys to point values (e.g., "pass_td": 4, "rec_yd": 0.1)
 */
export type ScoringSettings = Record<string, number>

/**
 * Scoring format detection for display and calculations.
 * Determines how to interpret and present scoring rules.
 */
export type ScoringFormat = 'standard' | 'half_ppr' | 'ppr'

/**
 * NFL fantasy positions supported by the algorithm.
 * Includes standard positions and IDP (Individual Defensive Player) variants.
 */
export type Position =
  | 'QB'
  | 'RB'
  | 'WR'
  | 'TE'
  | 'K'
  | 'DEF'
  | 'DL'
  | 'LB'
  | 'DB'
  | 'FLEX'
  | 'SUPERFLEX'
  | 'REC_FLEX'
  | 'WRRB_FLEX'
  | 'IDP_FLEX'

/**
 * Roster configuration mapping positions to the number of starters at each position.
 * Example: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, K: 1, DEF: 1 }
 */
export type RosterConfig = Record<Position, number>

/**
 * Position baseline information used in VBD calculation.
 * Represents the last starter at a position (the "replacement level" player).
 */
export interface PositionBaseline {
  /** The position (QB, RB, WR, etc.) */
  position: Position

  /** The player ID of the baseline player (last starter at this position) */
  playerId: string

  /** Full name of the baseline player */
  playerName: string

  /** Team abbreviation (e.g., "KC", "SF") */
  team: string | null

  /** Projected points for the baseline player */
  projectedPoints: number

  /** Rank of this player at their position (e.g., QB12 for 12-team league) */
  baselineRank: number
}

/**
 * A player with their VBD ranking and calculation details.
 * Used in VBDOutput rankings array.
 */
export interface PlayerRanking {
  /** Sleeper player ID (string) */
  playerId: string

  /** Full name */
  fullName: string

  /** First name */
  firstName: string | null

  /** Last name */
  lastName: string | null

  /** NFL team abbreviation (e.g., "KC", "SF") */
  team: string | null

  /** Primary position (QB, RB, WR, TE, K, DEF, DL, LB, DB) */
  position: Position

  /** All eligible positions for this player */
  eligiblePositions: Position[]

  /** Projected points for this player */
  projectedPoints: number

  /** Value-Based Drafting score (player points - baseline points) */
  vbdScore: number

  /** Overall rank across all players */
  overallRank: number

  /** Rank within their primary position */
  positionRank: number

  /** Player status (Active, Injured Reserve, etc.) */
  status: string | null

  /** Injury status if applicable (Out, Doubtful, Questionable, IR) */
  injuryStatus: string | null
}

/**
 * Input parameters for VBD calculation.
 * Contains all data needed to compute rankings and baselines.
 */
export interface VBDInput {
  /** Array of all available players with projections */
  players: SleeperPlayer[]

  /** Projected points for each player (keyed by player ID) */
  projections: Record<string, number>

  /** League configuration */
  leagueSettings: {
    /** Number of teams in the league */
    teams: number

    /** Roster positions in order (e.g., ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DEF']) */
    rosterPositions: Position[]

    /** Scoring settings from Sleeper (stat key → point value) */
    scoringSettings: ScoringSettings
  }

  /** Detected scoring format for display purposes */
  scoringFormat: ScoringFormat

  /** Source of projections (e.g., "fantasypros", "nflverse") */
  projectionSource: string
}

/**
 * Output of VBD calculation.
 * Contains ranked players and baseline information for "Show Your Work" transparency.
 */
export interface VBDOutput {
  /** Players ranked by VBD score (highest first) */
  rankings: PlayerRanking[]

  /** Position baselines used in calculation (position → baseline info) */
  baselines: Record<Position, PositionBaseline>

  /** Metadata about the calculation */
  metadata: {
    /** Timestamp when calculation was performed */
    calculatedAt: string

    /** Number of players included in calculation */
    playerCount: number

    /** League size */
    leagueSize: number

    /** Scoring format used */
    scoringFormat: ScoringFormat

    /** Projection source */
    projectionSource: string
  }
}

/**
 * Detailed explanation of VBD calculation for "Show Your Work" transparency.
 * Stored in algorithm_outputs table for audit trail and user education.
 */
export interface VBDExplanation {
  /** Algorithm version identifier */
  algorithm: 'vbd_v1'

  /** ISO timestamp of calculation */
  timestamp: string

  /** Input parameters used */
  inputs: {
    /** Total players evaluated */
    playerCount: number

    /** Number of teams in league */
    leagueSize: number

    /** Scoring format (standard, half_ppr, ppr) */
    scoringFormat: ScoringFormat

    /** Roster configuration as array (e.g., ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DEF']) */
    rosterConfig: Position[]

    /** Source of player projections */
    projectionSource: string
  }

  /** Position baselines with player details */
  baselines: Record<
    Position,
    {
      /** Player ID of baseline player */
      playerId: string

      /** Player name */
      name: string

      /** Projected points for baseline player */
      projectedPoints: number

      /** Rank at position (e.g., 12 for QB12) */
      baselineRank: number
    }
  >

  /** Markdown-formatted explanation of methodology */
  methodology: string

  /** Known limitations and caveats */
  caveats: string[]
}

/**
 * Platform-agnostic player representation for algorithms.
 */
export interface AlgorithmPlayer {
  /** Unique player identifier */
  playerId: string

  /** Full name */
  fullName: string

  /** Team abbreviation (e.g., "KC") */
  team: string | null

  /** Primary position */
  position: Position

  /** All eligible positions for lineup slots */
  eligiblePositions: Position[]

  /** Projected points for the selected week */
  projectedPoints: number

  /** Injury status if applicable (Out, Questionable, IR) */
  injuryStatus: string | null

  /** Player status (Active, Out, IR, etc.) */
  status: string | null

  /** Bye week number if known */
  byeWeek?: number | null

  /** Player age in years (for dynasty evaluations) */
  age?: number
}

/**
 * Lineup slot definition.
 */
export interface RosterSlot {
  /** Unique slot identifier */
  slotId: string

  /** Slot type: starter or bench */
  slotType: 'starter' | 'bench'

  /** Allowed positions for this slot */
  allowedPositions: Position[]
}

/**
 * Input parameters for lineup optimization.
 */
export interface LineupInput {
  /** Roster of players to consider */
  roster: AlgorithmPlayer[]

  /** Lineup slot configuration */
  slots: RosterSlot[]

  /** Week number for availability filtering */
  week: number
}

/**
 * Explanation for lineup optimizer decisions.
 */
export interface LineupExplanation {
  /** Algorithm version identifier */
  algorithm: 'lineup_optimizer_v1'

  /** ISO timestamp of calculation */
  timestamp: string

  /** Input summary */
  inputsSummary: {
    rosterCount: number
    slotCount: number
    starterSlots: number
    benchSlots: number
    week: number
  }

  /** Players excluded with reasons */
  excludedPlayers: Array<{
    playerId: string
    fullName: string
    reason: string
  }>

  /** Slot assignment decisions */
  decisions: Array<{
    slotId: string
    slotType: 'starter' | 'bench'
    allowedPositions: Position[]
    playerId: string
    fullName: string
    projectedPoints: number
    reason: string
  }>

  /** Known limitations and caveats */
  caveats: string[]
}

/**
 * Output of lineup optimization.
 */
export interface LineupOutput {
  /** Selected starters */
  starters: AlgorithmPlayer[]

  /** Bench players (eligible but not started) */
  bench: AlgorithmPlayer[]

  /** Total projected points for starters */
  projectedPoints: number

  /** Detailed explanation for transparency */
  explanation: LineupExplanation
}

/**
 * Verdict classification for trade evaluation.
 */
export type TradeVerdict = 'great' | 'fair' | 'bad' | 'veto-worthy'

/**
 * Player-level breakdown for trade evaluation.
 */
export interface TradePlayerBreakdown {
  playerId: string
  name: string
  position: Position
  vbdValue: number
  isGiving: boolean
}

/**
 * Lineup impact summary for trade evaluation.
 */
export interface TradeLineupImpact {
  preTrade: LineupOutput
  postTrade: LineupOutput
  delta: number
}

/**
 * Explanation payload for trade evaluation.
 */
export interface TradeExplanation {
  playerBreakdown: TradePlayerBreakdown[]
  lineupImpact: TradeLineupImpact | null
  methodology: string
  caveats: string[]
}

/**
 * Input parameters for trade evaluation.
 */
export interface TradeInput {
  giving: AlgorithmPlayer[]
  receiving: AlgorithmPlayer[]
  leagueSettings: {
    baselines: Record<Position, PositionBaseline>
    rosterSlots?: RosterSlot[]
  }
  currentRoster?: AlgorithmPlayer[]
  week?: number
}

/**
 * Input parameters for dynasty trade evaluation.
 */
export interface DynastyTradeInput extends TradeInput {
  givingDraftPicks?: DraftPick[]
  receivingDraftPicks?: DraftPick[]
  useDynastyValues?: boolean
  currentYear?: number
}

/**
 * Output of trade evaluation.
 */
export interface TradeOutput {
  fairnessScore: number
  givingValue: number
  receivingValue: number
  verdict: TradeVerdict
  explanation: TradeExplanation
}

/**
 * Input parameters for waiver priority recommendations.
 */
export interface WaiverInput {
  /** Available players on waivers */
  availablePlayers: AlgorithmPlayer[]

  /** Current roster of the user */
  currentRoster: AlgorithmPlayer[]

  /** League configuration */
  leagueSettings: {
    /** Position baselines for VBD calculation */
    baselines: Partial<Record<Position, PositionBaseline>>

    /** Roster slot configuration */
    rosterSlots?: RosterSlot[]
  }

  /** Current week number */
  week: number

  /** FAAB budget information (if league uses FAAB) */
  faabBudget?: {
    /** Total FAAB budget for the season */
    total: number

    /** Remaining FAAB budget */
    remaining: number
  }
}

/**
 * FAAB bid range recommendation.
 */
export interface FABBidRange {
  /** Minimum recommended bid */
  min: number

  /** Maximum recommended bid */
  max: number

  /** Minimum as percentage of total budget */
  budgetPercentageMin: number

  /** Maximum as percentage of total budget */
  budgetPercentageMax: number
}

/**
 * Individual waiver recommendation.
 */
export interface WaiverRecommendation {
  /** Player being recommended */
  player: AlgorithmPlayer

  /** Priority score (higher = more urgent) */
  priorityScore: number

  /** Suggested FAAB bid range (null if league doesn't use FAAB) */
  suggestedFaabBid: FABBidRange | null

  /** VBD improvement if added to roster */
  vbdImprovement: number

  /** Reasons for recommendation */
  reasons: string[]
}

/**
 * Explanation payload for waiver recommendations.
 */
export interface WaiverExplanation {
  /** Algorithm version identifier */
  algorithm: 'waiver_v1'

  /** ISO timestamp of calculation */
  timestamp: string

  /** Markdown-formatted explanation of methodology */
  methodology: string

  /** Known limitations and caveats */
  caveats: string[]

  /** Factors considered in priority calculation */
  priorityFactors: string[]
}

/**
 * Output of waiver priority recommendations.
 */
export interface WaiverOutput {
  /** Ranked waiver recommendations */
  recommendations: WaiverRecommendation[]

  /** Players eligible to be dropped from current roster */
  droppable: AlgorithmPlayer[]

  /** Detailed explanation for transparency */
  explanation: WaiverExplanation
}

/**
 * Options for waiver orchestrator.
 */
export interface CalculateWaiversForLeagueOptions {
  /** Sleeper league ID */
  leagueId: string

  /** User's roster ID (1-based integer) */
  rosterId: number

  /** NFL week (1-18) */
  week: number

  /** FAAB budget (omit for non-FAAB leagues) */
  faabBudget?: {
    /** Total season budget (e.g., 100) */
    total: number

    /** Remaining budget */
    remaining: number
  }

  /** User ID for cache scoping */
  userId?: string

  /** Skip cache for live updates */
  skipCache?: boolean
}

/**
 * A draft pick that can be traded.
 * Includes current year picks and future rookie picks.
 */
export interface DraftPickAsset {
  /** Discriminator for union type */
  type: 'draft_pick'

  /** Unique pick identifier */
  pickId: string

  /** Pick number in draft order (1-based) */
  pickNumber: number

  /** Round number (1-based) */
  round: number

  /** Roster ID of pick owner */
  rosterId: number

  /** Year of draft (e.g., 2025) */
  year: number

  /** Whether this is a future rookie pick */
  isFutureRookie: boolean
}

/**
 * A future rookie pick (next year's draft).
 * Specialized asset for dynasty leagues.
 */
export interface FutureRookiePickAsset {
  /** Discriminator for union type */
  type: 'future_rookie_pick'

  /** Unique pick identifier */
  pickId: string

  /** Pick number in draft order (1-based) */
  pickNumber: number

  /** Round number (1-based) */
  round: number

  /** Roster ID of pick owner */
  rosterId: number

  /** Year of draft (e.g., 2026) */
  year: number
}

/**
 * A player that can be traded.
 */
export interface PlayerAsset {
  /** Discriminator for union type */
  type: 'player'

  /** Sleeper player ID */
  playerId: string

  /** Full name */
  fullName: string

  /** Position */
  position: Position

  /** Projected points */
  projectedPoints: number
}

/**
 * Union type for tradeable assets.
 * Can be a player, draft pick, or future rookie pick.
 */
export type TradeableAsset = PlayerAsset | DraftPickAsset | FutureRookiePickAsset

/**
 * Expected player outcomes for a draft pick.
 */
export interface ExpectedPlayer {
  /** Sleeper player ID */
  playerId: string

  /** Full name */
  fullName: string

  /** Position */
  position: Position

  /** Probability this player is available at this pick (0-1) */
  probability: number

  /** Projected points if drafted */
  projectedPoints: number
}

/**
 * Positional value breakdown for a pick.
 */
export interface PositionalValue {
  /** Position (QB, RB, WR, TE, K, DEF, etc.) */
  position: Position

  /** Expected value for this position at this pick */
  expectedValue: number

  /** Scarcity multiplier for this position */
  scarcityMultiplier: number
}

/**
 * Detailed breakdown of pick valuation.
 */
export interface PickValueBreakdown {
  /** Expected players available at this pick (top 5) */
  expectedPlayers: ExpectedPlayer[]

  /** Positional values at this pick */
  positionalValues: PositionalValue[]

  /** Bias adjustment for league tendencies (e.g., QB run, RB heavy) */
  biasAdjustment: {
    /** Position being over-drafted */
    position: Position | null

    /** Adjustment factor (>1 = over-drafted, <1 = under-drafted) */
    factor: number
  }
}

/**
 * Explanation of pick valuation for "Show Your Work" transparency.
 */
export interface PickValueExplanation {
  /** Algorithm version identifier */
  algorithm: 'pick_value_v1'

  /** ISO timestamp of calculation */
  timestamp: string

  /** Methodology description */
  methodology: string

  /** Known limitations and caveats */
  caveats: string[]

  /** Position run information (e.g., "QB run expected in round 3") */
  positionRunInfo: string[]
}

/**
 * Output of pick valuation calculation.
 */
export interface PickValueOutput {
  /** Overall value score for this pick (0-100) */
  value: number

  /** Detailed breakdown of valuation */
  breakdown: PickValueBreakdown

  /** Explanation for transparency */
  explanation: PickValueExplanation
}

/**
 * Input parameters for pick valuation.
 */
export interface PickValueInput {
  /** Draft ID */
  draftId: string

  /** Pick number (1-based) */
  pickNumber: number

  /** Bias factor applied to pick value (0-0.2 recommended) */
  biasFactor?: number

  /** Optional position bias indicator for explanations */
  biasPosition?: Position | null

  /** Remaining players available in draft */
  remainingPlayers: SleeperPlayer[]

  /** League configuration */
  leagueSettings: {
    /** Number of teams in the league */
    teams: number

    /** Roster positions in order */
    rosterPositions: Position[]

    /** Scoring settings from Sleeper */
    scoringSettings: ScoringSettings
  }

  /** Detected scoring format */
  scoringFormat: ScoringFormat

  /** Projected points for each player */
  projections: Record<string, number>

  /** Already drafted player IDs */
  draftedPlayerIds: Set<string>
}

/**
 * Updated TradeInput to accept tradeable assets.
 */
export interface TradeInputV2 {
  giving: TradeableAsset[]
  receiving: TradeableAsset[]
  leagueSettings: {
    baselines: Record<Position, PositionBaseline>
    rosterSlots?: RosterSlot[]
  }
  currentRoster?: AlgorithmPlayer[]
  week?: number
}

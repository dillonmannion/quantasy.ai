import type { SleeperPlayer } from '@/lib/sleeper/types'

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

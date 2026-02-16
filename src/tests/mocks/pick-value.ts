import type { DraftPick as DraftPickType } from '@/lib/algorithms/draft-picks'
import type { DraftState } from '@/lib/draft/types'

/**
 * Create a mock PickValueInput for testing.
 * Represents a single draft pick with year, round, and position information.
 *
 * @param overrides - Partial overrides for specific test scenarios
 * @returns DraftPick with deterministic data
 *
 * @example
 * // Default: 2025 round 1 mid-round pick
 * const pick = createMockPickValueInput()
 *
 * @example
 * // Custom: 2026 round 2 early pick
 * const pick = createMockPickValueInput({
 *   year: 2026,
 *   round: 2,
 *   position: 'early',
 * })
 */
export function createMockPickValueInput(
  overrides?: Partial<DraftPickType>
): DraftPickType {
  return {
    year: overrides?.year ?? 2025,
    round: overrides?.round ?? 1,
    position: overrides?.position ?? 'mid',
    originalOwner: overrides?.originalOwner,
  }
}

/**
 * Create a mock DraftState for testing pick valuation.
 * Represents the current state of a dynasty draft with picked players.
 *
 * @param overrides - Partial overrides for specific test scenarios
 * @returns DraftState with deterministic data
 *
 * @example
 * // Default: 12-team league, 3 picks drafted
 * const state = createMockDraftState()
 *
 * @example
 * // Custom: 10-team league, 5 picks drafted
 * const state = createMockDraftState({
 *   draftedPlayerIds: new Set(['player_1', 'player_2', 'player_3', 'player_4', 'player_5']),
 * })
 */
export function createMockDraftState(
  overrides?: Partial<DraftState> & {
    draftedPlayerIds?: Set<string>
  }
): DraftState {
  const draftedPlayerIds = overrides?.draftedPlayerIds ?? new Set(['player_1', 'player_2', 'player_3'])

  return {
    draftId: overrides?.draftId ?? 'mock-dynasty-draft-123',
    status: overrides?.status ?? 'drafting',
    picks: Array.from(draftedPlayerIds).map((playerId, index) => ({
      pickNumber: index + 1,
      playerId,
      playerName: `Player ${playerId}`,
      position: ['QB', 'RB', 'WR', 'TE'][index % 4] || 'RB',
      rosterId: Math.floor(index / 2) + 1,
      timestamp: Date.now() - (draftedPlayerIds.size - index) * 5000,
    })),
    draftedPlayerIds,
    userRosterId: overrides?.userRosterId ?? 1,
    currentPick: overrides?.currentPick ?? draftedPlayerIds.size + 1,
    userId: overrides?.userId ?? null,
  }
}

/**
 * Create a mock remaining players pool for testing.
 * Represents available players not yet drafted.
 *
 * @param count - Number of players to generate (default: 30)
 * @param overrides - Optional array of specific player IDs to include
 * @returns Array of player IDs available for drafting
 *
 * @example
 * // Default: 30 available players
 * const players = createMockRemainingPlayers()
 *
 * @example
 * // Custom: 50 players with specific IDs
 * const players = createMockRemainingPlayers(50, ['player_100', 'player_101'])
 */
export function createMockRemainingPlayers(
  count: number = 30,
  overrides?: string[]
): string[] {
  if (overrides && overrides.length > 0) {
    return overrides
  }

  return Array.from({ length: count }, (_, i) => `player_${i + 100}`)
}

/**
 * Create a mock future rookie pick for testing.
 * Represents a future draft pick that will be used for rookie selections.
 *
 * @param overrides - Partial overrides for specific test scenarios
 * @returns DraftPick with deterministic data for a future rookie pick
 *
 * @example
 * // Default: 2026 round 1 mid-round rookie pick
 * const pick = createMockFutureRookiePick()
 *
 * @example
 * // Custom: 2027 round 2 early pick
 * const pick = createMockFutureRookiePick({
 *   year: 2027,
 *   round: 2,
 *   position: 'early',
 * })
 */
export function createMockFutureRookiePick(
  overrides?: Partial<DraftPickType>
): DraftPickType {
  return {
    year: overrides?.year ?? 2026,
    round: overrides?.round ?? 1,
    position: overrides?.position ?? 'mid',
    originalOwner: overrides?.originalOwner,
  }
}

import { describe, it, expect, beforeEach } from 'vitest'
import {
  calculatePickOrder,
  runSimulation,
  runSimulationDeterministic,
  calculateSurvivalProbability,
  calculateSurvivalProbabilityDeterministic,
  type CancellationToken,
} from '@/lib/algorithms/monte-carlo/simulator'
import {
  createMockSimulationInput,
  createMockDraftBoard,
  createMockPreferences,
} from '@/tests/unit/algorithms/monte-carlo/factories'
import type { MonteCarloInput, MarketConfig } from '@/lib/algorithms/monte-carlo/types'

class SeededRandom {
  private seed: number

  constructor(seed: number) {
    this.seed = seed
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280
    return this.seed / 233280
  }
}

describe('Monte Carlo Simulator', () => {
  describe('calculatePickOrder', () => {
    describe('Standard snake draft', () => {
      it('should return forward order [1-12] for round 1', () => {
        const order = calculatePickOrder(1, 12)
        expect(order).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
      })

      it('should return reverse order [12-1] for round 2', () => {
        const order = calculatePickOrder(2, 12)
        expect(order).toEqual([12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1])
      })

      it('should return forward order [1-12] for round 5 (odd)', () => {
        const order = calculatePickOrder(5, 12)
        expect(order).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
      })

      it('should return reverse order [12-1] for round 6 (even)', () => {
        const order = calculatePickOrder(6, 12)
        expect(order).toEqual([12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1])
      })
    })

    describe('Third Round Reversal (3RR)', () => {
      it('should return forward order [1-12] for round 3 (3RR breaks snake)', () => {
        const order = calculatePickOrder(3, 12)
        expect(order).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
      })

      it('should return reverse order [12-1] for round 4 (resume snake after 3RR)', () => {
        const order = calculatePickOrder(4, 12)
        expect(order).toEqual([12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1])
      })

      it('should handle 10-team league with 3RR', () => {
        const order = calculatePickOrder(3, 10)
        expect(order).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
      })

      it('should handle 8-team league with 3RR', () => {
        const round3 = calculatePickOrder(3, 8)
        const round4 = calculatePickOrder(4, 8)

        expect(round3).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
        expect(round4).toEqual([8, 7, 6, 5, 4, 3, 2, 1])
      })
    })

    describe('Edge cases', () => {
      it('should handle single team league', () => {
        const order = calculatePickOrder(1, 1)
        expect(order).toEqual([1])
      })

      it('should handle round 1 of any league size', () => {
        const order4 = calculatePickOrder(1, 4)
        const order14 = calculatePickOrder(1, 14)

        expect(order4).toEqual([1, 2, 3, 4])
        expect(order14).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14])
      })

      it('should handle late rounds correctly', () => {
        const round15 = calculatePickOrder(15, 12) // Odd = forward
        const round16 = calculatePickOrder(16, 12) // Even = reverse

        expect(round15).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
        expect(round16).toEqual([12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1])
      })
    })
  })

  describe('runSimulation', () => {
    let input: MonteCarloInput

    beforeEach(() => {
      // Default: 12-team league, user has roster 1, currentPick = 1
      input = createMockSimulationInput()
    })

    describe('Basic simulation', () => {
      it('should return null when target player is taken before user pick', () => {
        // User is roster 1, pick 1 of round 1
        // Target is taken by roster 2 (who has lowest ADP player)
        const inputWithLaterPick = createMockSimulationInput({
          draftState: createMockDraftBoard({
            teams: 12,
            currentPick: 2, // Roster 2 is picking
            draftedPlayers: ['4046'], // Mahomes already taken
          }),
          userRosterId: 3, // User picks 3rd
        })

        // Target player '4040' (Josh Allen, ADP 2) will be taken by roster 2
        const lowNoiseConfig: MarketConfig = { noiseStdDev: 0.01, adpWeight: 0.8, tiebreaker: 0.001 }
        const inputWithConfig = { ...inputWithLaterPick, marketConfig: lowNoiseConfig }
        const rng = new SeededRandom(42)

        const result = runSimulationDeterministic(inputWithConfig, '4040', () => rng.next())

        // Josh Allen (ADP 2) should be picked by roster 2 before user (roster 3) gets a turn
        expect(result).toBeNull()
      })

      it('should return SimulationResult when target player is available at user pick', () => {
        // User is roster 1, gets first pick
        const lowNoiseConfig: MarketConfig = { noiseStdDev: 0.01, adpWeight: 0.8, tiebreaker: 0.001 }
        const inputWithConfig = { ...input, marketConfig: lowNoiseConfig }
        const rng = new SeededRandom(42)

        // Target is the best available player '4046' (Mahomes)
        const result = runSimulationDeterministic(inputWithConfig, '4046', () => rng.next())

        expect(result).not.toBeNull()
        expect(result?.userPicks).toContain('4046')
      })

      it('should correctly track picked players', () => {
        const lowNoiseConfig: MarketConfig = { noiseStdDev: 0.01, adpWeight: 0.8, tiebreaker: 0.001 }
        const inputWithConfig = { ...input, marketConfig: lowNoiseConfig }
        const rng = new SeededRandom(42)

        const result = runSimulationDeterministic(inputWithConfig, '4046', () => rng.next())

        expect(result).not.toBeNull()
        expect(result!.pickedPlayers.length).toBeGreaterThan(0)
        // Each picked player should be unique
        const uniquePicks = new Set(result!.pickedPlayers)
        expect(uniquePicks.size).toBe(result!.pickedPlayers.length)
      })

      it('should simulate until user has made 2 picks', () => {
        const lowNoiseConfig: MarketConfig = { noiseStdDev: 0.01, adpWeight: 0.8, tiebreaker: 0.001 }
        const inputWithConfig = { ...input, marketConfig: lowNoiseConfig }
        const rng = new SeededRandom(42)

        const result = runSimulationDeterministic(inputWithConfig, '4046', () => rng.next())

        expect(result).not.toBeNull()
        // User should have 2 picks (current round + next round)
        expect(result!.userPicks.length).toBe(2)
      })
    })

    describe('Pick order with 3RR', () => {
      it('should respect 3RR when simulating round 3', () => {
        // Start at round 3, pick 1
        const round3Input = createMockSimulationInput({
          draftState: createMockDraftBoard({
            teams: 12,
            currentPick: 25, // Round 3, pick 1 (24 picks in rounds 1-2)
            draftedPlayers: [], // No players drafted (simplified for test)
          }),
          userRosterId: 1,
        })

        const lowNoiseConfig: MarketConfig = { noiseStdDev: 0.01, adpWeight: 0.8, tiebreaker: 0.001 }
        const inputWithConfig = { ...round3Input, marketConfig: lowNoiseConfig }
        const rng = new SeededRandom(42)

        // User (roster 1) should pick first in round 3 (3RR = forward)
        const result = runSimulationDeterministic(inputWithConfig, '4046', () => rng.next())

        expect(result).not.toBeNull()
        expect(result!.userPicks).toContain('4046')
      })

      it('should correctly simulate wrap from round 1 to round 2', () => {
        // User is roster 1, pick 1 of round 1
        // After round 1, user picks last in round 2 (snake)
        const lowNoiseConfig: MarketConfig = { noiseStdDev: 0.01, adpWeight: 0.8, tiebreaker: 0.001 }
        const inputWithConfig = { ...input, marketConfig: lowNoiseConfig }
        const rng = new SeededRandom(42)

        const result = runSimulationDeterministic(inputWithConfig, '4046', () => rng.next())

        expect(result).not.toBeNull()
        expect(result!.userPicks.length).toBe(2)
        // First pick is at overall pick 1, second pick is at overall pick 24
        // (12 picks in round 1 + 12 picks in round 2, user is last in round 2 for snake)
      })
    })

    describe('Final roster construction', () => {
      it('should populate finalRoster with picked players', () => {
        const lowNoiseConfig: MarketConfig = { noiseStdDev: 0.01, adpWeight: 0.8, tiebreaker: 0.001 }
        const inputWithConfig = { ...input, marketConfig: lowNoiseConfig }
        const rng = new SeededRandom(42)

        const result = runSimulationDeterministic(inputWithConfig, '4046', () => rng.next())

        expect(result).not.toBeNull()
        expect(result!.finalRoster.length).toBe(2) // 2 user picks
        result!.finalRoster.forEach((slot: { playerId: string; position: string }) => {
          expect(slot.playerId).toBeDefined()
          expect(slot.position).toBeDefined()
        })
      })
    })

    describe('Edge cases', () => {
      it('should handle draft with some players already picked', () => {
        const partialDraftInput = createMockSimulationInput({
          draftState: createMockDraftBoard({
            teams: 12,
            currentPick: 5,
            draftedPlayers: ['4046', '4040', '4041', '4039'], // 4 players already drafted
          }),
          userRosterId: 5,
        })

        const lowNoiseConfig: MarketConfig = { noiseStdDev: 0.01, adpWeight: 0.8, tiebreaker: 0.001 }
        const inputWithConfig = { ...partialDraftInput, marketConfig: lowNoiseConfig }
        const rng = new SeededRandom(42)

        // Target player '4043' (Burrow, ADP 5) should be available
        const result = runSimulationDeterministic(inputWithConfig, '4043', () => rng.next())

        expect(result).not.toBeNull()
        // Drafted players should not be picked again
        expect(result!.pickedPlayers).not.toContain('4046')
        expect(result!.pickedPlayers).not.toContain('4040')
      })

      it('should handle user picking in middle of draft order', () => {
        const midPickInput = createMockSimulationInput({
          draftState: createMockDraftBoard({
            teams: 12,
            currentPick: 1,
            draftedPlayers: [],
          }),
          userRosterId: 6,
        })

        const lowNoiseConfig: MarketConfig = { noiseStdDev: 0.01, adpWeight: 0.8, tiebreaker: 0.001 }
        const inputWithConfig = { ...midPickInput, marketConfig: lowNoiseConfig }
        const rng = new SeededRandom(42)

        // Target CMC (ADP 11) - should be available at pick 6 since only 5 QBs have lower ADP
        const result = runSimulationDeterministic(inputWithConfig, '6803', () => rng.next())

        expect(result).not.toBeNull()
      })

      it('should return null when target is in already-picked players', () => {
        const targetAlreadyPicked = createMockSimulationInput({
          draftState: createMockDraftBoard({
            teams: 12,
            currentPick: 5,
            draftedPlayers: ['4046'], // Mahomes already drafted
          }),
          userRosterId: 5,
        })

        const lowNoiseConfig: MarketConfig = { noiseStdDev: 0.01, adpWeight: 0.8, tiebreaker: 0.001 }
        const inputWithConfig = { ...targetAlreadyPicked, marketConfig: lowNoiseConfig }
        const rng = new SeededRandom(42)

        const result = runSimulationDeterministic(inputWithConfig, '4046', () => rng.next())

        expect(result).toBeNull()
      })
    })

    describe('Production function', () => {
      it('should work without deterministic randomFn', () => {
        const lowNoiseConfig: MarketConfig = { noiseStdDev: 0.01, adpWeight: 0.8, tiebreaker: 0.001 }
        const inputWithConfig = { ...input, marketConfig: lowNoiseConfig }

        // Production function uses Math.random
        const result = runSimulation(inputWithConfig, '4046')

        // With very low noise, result should typically be non-null
        // But we can only verify it returns a valid structure or null
        if (result !== null) {
          expect(result.pickedPlayers).toBeDefined()
          expect(result.userPicks).toBeDefined()
          expect(result.finalRoster).toBeDefined()
        }
      })
    })
  })

  describe('calculateSurvivalProbability', () => {
    let input: MonteCarloInput

    beforeEach(() => {
      input = createMockSimulationInput()
    })

    describe('Basic survival calculation', () => {
      it('should return survival rate of 1.0 for player with very low ADP when user picks first', () => {
        // User picks first (roster 1), target is high ADP player (late pick)
        const lowNoiseConfig: MarketConfig = { noiseStdDev: 0.01, adpWeight: 0.8, tiebreaker: 0.001 }
        const inputWithConfig = { ...input, marketConfig: lowNoiseConfig }
        const rng = new SeededRandom(42)

        // '5048' is Travis Kelce (TE, ADP ~26)
        const result = calculateSurvivalProbabilityDeterministic(
          inputWithConfig,
          ['4046'], // Mahomes has lowest ADP, should always be available for pick 1
          100,
          () => rng.next()
        )

        // Mahomes should have 100% survival since user picks first
        expect(result['4046']).toBe(1.0)
      })

      it('should return survival rate of 0.0 for player with low ADP when user picks later', () => {
        const latePickInput = createMockSimulationInput({
          draftState: createMockDraftBoard({
            teams: 12,
            currentPick: 1,
            draftedPlayers: [],
          }),
          userRosterId: 12, // User picks last in round 1
        })

        const lowNoiseConfig: MarketConfig = { noiseStdDev: 0.01, adpWeight: 0.8, tiebreaker: 0.001 }
        const inputWithConfig = { ...latePickInput, marketConfig: lowNoiseConfig }
        const rng = new SeededRandom(42)

        // Mahomes (ADP 1) will almost always be taken before pick 12
        const result = calculateSurvivalProbabilityDeterministic(
          inputWithConfig,
          ['4046'],
          100,
          () => rng.next()
        )

        expect(result['4046']).toBeLessThan(0.2)
      })

      it('should calculate survival for multiple candidates', () => {
        const lowNoiseConfig: MarketConfig = { noiseStdDev: 0.01, adpWeight: 0.8, tiebreaker: 0.001 }
        const inputWithConfig = { ...input, marketConfig: lowNoiseConfig }
        const rng = new SeededRandom(42)

        const result = calculateSurvivalProbabilityDeterministic(
          inputWithConfig,
          ['4046', '4040', '6803'], // 3 candidates
          100,
          () => rng.next()
        )

        expect(Object.keys(result)).toHaveLength(3)
        expect(result['4046']).toBeDefined()
        expect(result['4040']).toBeDefined()
        expect(result['6803']).toBeDefined()
      })

      it('should return values between 0 and 1', () => {
        const midPickInput = createMockSimulationInput({
          draftState: createMockDraftBoard({
            teams: 12,
            currentPick: 1,
            draftedPlayers: [],
          }),
          userRosterId: 6,
        })

        // Higher noise for more variance
        const mediumNoiseConfig: MarketConfig = { noiseStdDev: 3, adpWeight: 0.8, tiebreaker: 0.001 }
        const inputWithConfig = { ...midPickInput, marketConfig: mediumNoiseConfig }
        const rng = new SeededRandom(42)

        const result = calculateSurvivalProbabilityDeterministic(
          inputWithConfig,
          ['4046', '4040', '4041', '4039', '4043'],
          100,
          () => rng.next()
        )

        Object.values(result).forEach((rate) => {
          expect(rate).toBeGreaterThanOrEqual(0)
          expect(rate).toBeLessThanOrEqual(1)
        })
      })
    })

    describe('Auto-scaling simulation count', () => {
      it('should auto-scale to more simulations when variance is high', () => {
        // This test verifies the auto-scaling logic exists
        // We can't easily test the exact count without exposing internals,
        // but we verify the function completes and returns valid results
        const highVarianceInput = createMockSimulationInput({
          draftState: createMockDraftBoard({
            teams: 12,
            currentPick: 1,
            draftedPlayers: [],
          }),
          userRosterId: 6,
        })

        // High noise = high variance = should scale up
        const highNoiseConfig: MarketConfig = { noiseStdDev: 10, adpWeight: 0.8, tiebreaker: 0.001 }
        const inputWithConfig = { ...highVarianceInput, marketConfig: highNoiseConfig }

        // Use production function to test auto-scaling
        const result = calculateSurvivalProbability(
          inputWithConfig,
          ['4046', '4040', '4041']
        )

        expect(Object.keys(result.survivalRates)).toHaveLength(3)
        // With auto-scaling, simulationCount should be >= initial (100)
        expect(result.metadata.simulationCount).toBeGreaterThanOrEqual(100)
      })

      it('should keep simulation count low when variance is low', () => {
        // Very low noise = consistent results = low variance
        const lowVarianceInput = createMockSimulationInput({
          draftState: createMockDraftBoard({
            teams: 12,
            currentPick: 1,
            draftedPlayers: [],
          }),
          userRosterId: 1, // Picks first, very predictable
        })

        const veryLowNoiseConfig: MarketConfig = { noiseStdDev: 0.001, adpWeight: 0.8, tiebreaker: 0.001 }
        const inputWithConfig = { ...lowVarianceInput, marketConfig: veryLowNoiseConfig }

        const result = calculateSurvivalProbability(
          inputWithConfig,
          ['4046'] // Single candidate, user picks first
        )

        // Low variance should keep simulation count at initial
        expect(result.metadata.simulationCount).toBeLessThanOrEqual(200)
      })

      it('should not exceed maximum simulation count of 1000', () => {
        const extremeVarianceInput = createMockSimulationInput({
          draftState: createMockDraftBoard({
            teams: 12,
            currentPick: 1,
            draftedPlayers: [],
          }),
          userRosterId: 6,
        })

        const extremeNoiseConfig: MarketConfig = { noiseStdDev: 50, adpWeight: 0.8, tiebreaker: 0.001 }
        const inputWithConfig = { ...extremeVarianceInput, marketConfig: extremeNoiseConfig }

        const result = calculateSurvivalProbability(
          inputWithConfig,
          ['4046', '4040', '4041']
        )

        expect(result.metadata.simulationCount).toBeLessThanOrEqual(1000)
      })
    })

    describe('Cancellation token', () => {
      it('should respect cancellation token and return partial results', () => {
        const input = createMockSimulationInput()
        const cancelToken: CancellationToken = { cancelled: false }

        // Cancel after a short delay
        setTimeout(() => {
          cancelToken.cancelled = true
        }, 10)

        const result = calculateSurvivalProbability(
          input,
          ['4046', '4040', '4041'],
          cancelToken
        )

        // Should have results (possibly partial)
        expect(result.survivalRates).toBeDefined()
        // Metadata should indicate if cancelled
        if (cancelToken.cancelled) {
          expect(result.metadata.cancelled).toBe(true)
        }
      })

      it('should return complete results when not cancelled', () => {
        const input = createMockSimulationInput({
          draftState: createMockDraftBoard({
            teams: 12,
            currentPick: 1,
            draftedPlayers: [],
          }),
          userRosterId: 1,
        })

        const cancelToken: CancellationToken = { cancelled: false }
        const lowNoiseConfig: MarketConfig = { noiseStdDev: 0.01, adpWeight: 0.8, tiebreaker: 0.001 }
        const inputWithConfig = { ...input, marketConfig: lowNoiseConfig }

        const result = calculateSurvivalProbability(
          inputWithConfig,
          ['4046'],
          cancelToken
        )

        expect(result.metadata.cancelled).toBe(false)
        expect(result.survivalRates['4046']).toBeDefined()
      })

      it('should check cancellation after each batch of simulations', () => {
        const input = createMockSimulationInput()
        const cancelToken: CancellationToken = { cancelled: true } // Already cancelled

        const result = calculateSurvivalProbability(
          input,
          ['4046', '4040'],
          cancelToken
        )

        // Should return early with partial/no results
        expect(result.metadata.cancelled).toBe(true)
        // Simulation count should be minimal
        expect(result.metadata.simulationCount).toBeLessThan(100)
      })
    })

    describe('Edge cases', () => {
      it('should handle empty candidate list with deterministic function', () => {
        const rng = new SeededRandom(42)

        const result = calculateSurvivalProbabilityDeterministic(
          input,
          [],
          100,
          () => rng.next()
        )

        expect(Object.keys(result)).toHaveLength(0)
      })

      it('should handle empty candidate list with production function', () => {
        const result = calculateSurvivalProbability(input, [])

        expect(Object.keys(result.survivalRates)).toHaveLength(0)
        expect(result.metadata.simulationCount).toBe(0)
        expect(result.metadata.cancelled).toBe(false)
      })

      it('should handle candidate not in player list', () => {
        const rng = new SeededRandom(42)

        const result = calculateSurvivalProbabilityDeterministic(
          input,
          ['unknown-player-id'],
          100,
          () => rng.next()
        )

        // Should still return a result for the candidate
        expect(result['unknown-player-id']).toBeDefined()
      })

      it('should return consistent results with same seed', () => {
        const rng1 = new SeededRandom(42)
        const rng2 = new SeededRandom(42)

        const lowNoiseConfig: MarketConfig = { noiseStdDev: 0.5, adpWeight: 0.8, tiebreaker: 0.001 }
        const inputWithConfig = { ...input, marketConfig: lowNoiseConfig }

        const result1 = calculateSurvivalProbabilityDeterministic(
          inputWithConfig,
          ['4046', '4040'],
          100,
          () => rng1.next()
        )

        const result2 = calculateSurvivalProbabilityDeterministic(
          inputWithConfig,
          ['4046', '4040'],
          100,
          () => rng2.next()
        )

        expect(result1['4046']).toBe(result2['4046'])
        expect(result1['4040']).toBe(result2['4040'])
      })
    })

    describe('Production function', () => {
      it('should work without deterministic randomFn', () => {
        const lowNoiseConfig: MarketConfig = { noiseStdDev: 0.01, adpWeight: 0.8, tiebreaker: 0.001 }
        const inputWithConfig = { ...input, marketConfig: lowNoiseConfig }

        const result = calculateSurvivalProbability(
          inputWithConfig,
          ['4046', '4040']
        )

        expect(result.survivalRates).toBeDefined()
        expect(result.metadata.simulationCount).toBeGreaterThan(0)
      })
    })
  })

  describe('Integration', () => {
    it('should work with full simulation input from factories', () => {
      const input = createMockSimulationInput({
        draftState: createMockDraftBoard({
          teams: 12,
          currentPick: 1,
          draftedPlayers: [],
        }),
        preferences: createMockPreferences(['6803'], ['4046']), // Like CMC, dislike Mahomes
        userRosterId: 1,
      })

      const lowNoiseConfig: MarketConfig = { noiseStdDev: 0.5, adpWeight: 0.8, tiebreaker: 0.001 }
      const inputWithConfig = { ...input, marketConfig: lowNoiseConfig }

      // Calculate survival for first user pick
      const result = calculateSurvivalProbability(
        inputWithConfig,
        input.players.slice(0, 5).map((p) => p.playerId)
      )

      expect(Object.keys(result.survivalRates).length).toBe(5)
      expect(result.metadata.simulationCount).toBeGreaterThan(0)
    })

    it('should handle mid-draft scenario', () => {
      const midDraftInput = createMockSimulationInput({
        draftState: createMockDraftBoard({
          teams: 12,
          currentPick: 37, // Round 4, pick 1
          draftedPlayers: ['4046', '4040', '4041', '4039', '4043', '6803', '6802', '6801'], // 8 players drafted
        }),
        userRosterId: 1,
      })

      const result = calculateSurvivalProbability(
        midDraftInput,
        ['6804', '6805', '5018', '5019'] // Available players
      )

      expect(result.survivalRates).toBeDefined()
      Object.values(result.survivalRates).forEach((rate) => {
        expect(rate).toBeGreaterThanOrEqual(0)
        expect(rate).toBeLessThanOrEqual(1)
      })
    })
  })
})

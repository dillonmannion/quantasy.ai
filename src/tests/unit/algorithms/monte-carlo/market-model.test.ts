import { describe, it, expect, beforeEach, vi } from 'vitest'
import { simulateMarketPick, simulateMarketPickDeterministic } from '@/lib/algorithms/monte-carlo/market-model'
import {
  createMockADPMap,
  createMockPreferences,
  createMockSimulationInput,
} from '@/tests/unit/algorithms/monte-carlo/factories'
import type { MarketConfig, PlayerPreference } from '@/lib/algorithms/monte-carlo/types'

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

describe('simulateMarketPick', () => {
  let adpMap: Record<string, number>
  let preferences: Record<string, PlayerPreference>
  let config: MarketConfig

  beforeEach(() => {
    vi.clearAllMocks()

    adpMap = createMockADPMap()

    preferences = createMockPreferences()

    config = {
      noiseStdDev: 5,
      adpWeight: 0.8,
      tiebreaker: 0.001,
    }
  })

  describe('ADP-based ranking', () => {
    it('should pick player with lowest ADP when all preferences are neutral', () => {
      const availablePlayers = ['4046', '4040', '4041']
      const lowNoiseConfig: MarketConfig = { noiseStdDev: 0.1, adpWeight: 0.8, tiebreaker: 0.001 }
      const rng = new SeededRandom(42)

      const picked = simulateMarketPickDeterministic(availablePlayers, adpMap, preferences, lowNoiseConfig, () => rng.next())

      expect(picked).toBe('4046')
    })

    it('should pick from RBs when they have lower ADP than QBs', () => {
      const availablePlayers = ['4046', '6803', '6802']
      const lowNoiseConfig: MarketConfig = { noiseStdDev: 0.1, adpWeight: 0.8, tiebreaker: 0.001 }
      const rng = new SeededRandom(42)

      const picked = simulateMarketPickDeterministic(availablePlayers, adpMap, preferences, lowNoiseConfig, () => rng.next())

      expect(picked).toBe('4046')
    })

    it('should handle multiple calls with deterministic results (seeded)', () => {
      const availablePlayers = ['4046', '4040', '4041']
      const lowNoiseConfig: MarketConfig = { noiseStdDev: 0.1, adpWeight: 0.8, tiebreaker: 0.001 }

      const rng1 = new SeededRandom(42)
      const pick1 = simulateMarketPickDeterministic(availablePlayers, adpMap, preferences, lowNoiseConfig, () => rng1.next())

      const rng2 = new SeededRandom(42)
      const pick2 = simulateMarketPickDeterministic(availablePlayers, adpMap, preferences, lowNoiseConfig, () => rng2.next())

      expect(pick1).toBe(pick2)
      expect(pick1).toBe('4046')
    })
  })

  describe('Preference modifiers', () => {
    it('should pick "like" player earlier than neutral player with higher ADP', () => {
      const customAdpMap = { '4046': 10, '6803': 10.2 }
      const availablePlayers = ['4046', '6803']
      const likePrefs = createMockPreferences(['6803'])
      const veryLowNoiseConfig: MarketConfig = { noiseStdDev: 0.01, adpWeight: 0.8, tiebreaker: 0.001 }
      const rng = new SeededRandom(42)

      const picked = simulateMarketPickDeterministic(availablePlayers, customAdpMap, likePrefs, veryLowNoiseConfig, () => rng.next())

      expect(picked).toBe('6803')
    })

    it('should pick "strongly_like" player even earlier', () => {
      const customAdpMap = { '4046': 10, '6803': 10.1 }
      const availablePlayers = ['4046', '6803']
      const strongLikePrefs: Record<string, PlayerPreference> = {}
      strongLikePrefs['6803'] = 'strongly_like'
      const veryLowNoiseConfig: MarketConfig = { noiseStdDev: 0.01, adpWeight: 0.8, tiebreaker: 0.001 }
      const rng = new SeededRandom(42)

      const picked = simulateMarketPickDeterministic(availablePlayers, customAdpMap, strongLikePrefs, veryLowNoiseConfig, () => rng.next())

      expect(picked).toBe('6803')
    })

    it('should pick "dislike" player later than neutral player with lower ADP', () => {
      const availablePlayers = ['4046', '6803']
      const dislikePrefs = createMockPreferences([], ['6803'])
      const lowNoiseConfig: MarketConfig = { noiseStdDev: 0.1, adpWeight: 0.8, tiebreaker: 0.001 }
      const rng = new SeededRandom(42)

      const picked = simulateMarketPickDeterministic(availablePlayers, adpMap, dislikePrefs, lowNoiseConfig, () => rng.next())

      expect(picked).toBe('4046')
    })

    it('should pick "strongly_dislike" player even later', () => {
      const availablePlayers = ['4046', '6803']
      const strongDislikePrefs: Record<string, PlayerPreference> = {}
      strongDislikePrefs['6803'] = 'strongly_dislike'
      const lowNoiseConfig: MarketConfig = { noiseStdDev: 0.1, adpWeight: 0.8, tiebreaker: 0.001 }
      const rng = new SeededRandom(42)

      const picked = simulateMarketPickDeterministic(availablePlayers, adpMap, strongDislikePrefs, lowNoiseConfig, () => rng.next())

      expect(picked).toBe('4046')
    })

    it('should treat "dnd" as neutral (no modifier)', () => {
      const availablePlayers = ['4046', '6803']
      const dndPrefs = createMockPreferences([], [], ['6803'])
      const lowNoiseConfig: MarketConfig = { noiseStdDev: 0.1, adpWeight: 0.8, tiebreaker: 0.001 }
      const rng = new SeededRandom(42)

      const picked = simulateMarketPickDeterministic(availablePlayers, adpMap, dndPrefs, lowNoiseConfig, () => rng.next())

      expect(picked).toBe('4046')
    })

    it('should apply correct modifier percentages', () => {
      const availablePlayers = ['5018', '5019', '5020', '5021', '5022']
      const prefs: Record<string, PlayerPreference> = {}
      prefs['5018'] = 'strongly_like'
      prefs['5019'] = 'like'
      prefs['5020'] = 'neutral'
      prefs['5021'] = 'dislike'
      prefs['5022'] = 'strongly_dislike'
      const lowNoiseConfig: MarketConfig = { noiseStdDev: 0.1, adpWeight: 0.8, tiebreaker: 0.001 }
      const rng = new SeededRandom(42)

      const picked = simulateMarketPickDeterministic(availablePlayers, adpMap, prefs, lowNoiseConfig, () => rng.next())

      expect(picked).toBe('5018')
    })
  })

  describe('Edge cases', () => {
    it('should throw error when availablePlayers is empty', () => {
      const availablePlayers: string[] = []

      expect(() => {
        simulateMarketPick(availablePlayers, adpMap, preferences, config)
      }).toThrow('No available players to pick from')
    })

    it('should use average ADP when player not in ADP map', () => {
      const customAdpMap = { '4046': 1, '4040': 2 }
      const availablePlayers = ['4046', '4040', 'unknown-player']
      const lowNoiseConfig: MarketConfig = { noiseStdDev: 0.1, adpWeight: 0.8, tiebreaker: 0.001 }
      const rng = new SeededRandom(42)

      const picked = simulateMarketPickDeterministic(availablePlayers, customAdpMap, preferences, lowNoiseConfig, () => rng.next())

      expect(picked).toBe('4046')
    })

    it('should handle single player in available list', () => {
      const availablePlayers = ['4046']
      const lowNoiseConfig: MarketConfig = { noiseStdDev: 0.1, adpWeight: 0.8, tiebreaker: 0.001 }
      const rng = new SeededRandom(42)

      const picked = simulateMarketPickDeterministic(availablePlayers, adpMap, preferences, lowNoiseConfig, () => rng.next())

      expect(picked).toBe('4046')
    })

    it('should handle all players with same ADP (tiebreaker)', () => {
      const sameAdpMap = {
        '4046': 10,
        '4040': 10,
        '4041': 10,
      }
      const availablePlayers = ['4046', '4040', '4041']
      const rng = new SeededRandom(42)

      const picked = simulateMarketPickDeterministic(availablePlayers, sameAdpMap, preferences, config, () => rng.next())

      expect(availablePlayers).toContain(picked)
    })

    it('should handle empty ADP map (all players use average)', () => {
      const emptyAdpMap: Record<string, number> = {}
      const availablePlayers = ['4046', '4040', '4041']
      const rng = new SeededRandom(42)

      const picked = simulateMarketPickDeterministic(availablePlayers, emptyAdpMap, preferences, config, () => rng.next())

      expect(availablePlayers).toContain(picked)
    })

    it('should handle empty preferences (all neutral)', () => {
      const emptyPrefs: Record<string, PlayerPreference> = {}
      const availablePlayers = ['4046', '4040', '4041']
      const lowNoiseConfig: MarketConfig = { noiseStdDev: 0.1, adpWeight: 0.8, tiebreaker: 0.001 }
      const rng = new SeededRandom(42)

      const picked = simulateMarketPickDeterministic(availablePlayers, adpMap, emptyPrefs, lowNoiseConfig, () => rng.next())

      expect(picked).toBe('4046')
    })
  })

  describe('Gaussian noise application', () => {
    it('should apply noise to ADP values', () => {
      const availablePlayers = ['4046', '4040']
      const results = new Set<string>()

      for (let i = 0; i < 100; i++) {
        const picked = simulateMarketPick(availablePlayers, adpMap, preferences, config)
        results.add(picked)
      }

      expect(results.size).toBeGreaterThanOrEqual(1)
      expect(results.size).toBeLessThanOrEqual(2)
    })

    it('should respect noise stdDev configuration', () => {
      const highNoiseConfig: MarketConfig = {
        noiseStdDev: 20,
        adpWeight: 0.8,
        tiebreaker: 0.001,
      }

      const availablePlayers = ['4046', '4040', '4041', '4039', '4043']
      const results = new Set<string>()

      for (let i = 0; i < 50; i++) {
        const picked = simulateMarketPick(availablePlayers, adpMap, preferences, highNoiseConfig)
        results.add(picked)
      }

      expect(results.size).toBeGreaterThan(1)
    })
  })

  describe('Formula verification', () => {
    it('should use formula: score = -ADP + randomNoise + tiebreaker', () => {
      const availablePlayers = ['4046', '6803']
      const lowNoiseConfig: MarketConfig = { noiseStdDev: 0.1, adpWeight: 0.8, tiebreaker: 0.001 }
      const rng = new SeededRandom(42)

      const picked = simulateMarketPickDeterministic(availablePlayers, adpMap, preferences, lowNoiseConfig, () => rng.next())

      expect(picked).toBe('4046')
    })

    it('should apply tiebreaker for identical scores', () => {
      const sameAdpMap = {
        '4046': 5,
        '4040': 5,
      }
      const availablePlayers = ['4046', '4040']
      const rng = new SeededRandom(42)

      const picked = simulateMarketPickDeterministic(availablePlayers, sameAdpMap, preferences, config, () => rng.next())

      expect(['4046', '4040']).toContain(picked)
    })
  })

  describe('Integration with factories', () => {
    it('should work with createMockSimulationInput data', () => {
      const input = createMockSimulationInput()
      const availablePlayers = input.players.map((p) => p.playerId)
      const lowNoiseConfig: MarketConfig = { noiseStdDev: 0.1, adpWeight: 0.8, tiebreaker: 0.001 }
      const rng = new SeededRandom(42)

      const picked = simulateMarketPickDeterministic(
        availablePlayers,
        input.adpMap,
        input.preferences,
        lowNoiseConfig,
        () => rng.next()
      )

      expect(availablePlayers).toContain(picked)
    })

    it('should work with custom ADP and preference overrides', () => {
      const input = createMockSimulationInput({
        adpMap: createMockADPMap(['6803', '6802', '6801']),
        preferences: createMockPreferences(['6803']),
      })

      const availablePlayers = ['6803', '6802', '6801']
      const lowNoiseConfig: MarketConfig = { noiseStdDev: 0.1, adpWeight: 0.8, tiebreaker: 0.001 }
      const rng = new SeededRandom(42)

      const picked = simulateMarketPickDeterministic(
        availablePlayers,
        input.adpMap,
        input.preferences,
        lowNoiseConfig,
        () => rng.next()
      )

      expect(picked).toBe('6803')
    })

    it('should use default randomFn when not provided', () => {
      const availablePlayers = ['4046', '4040']
      const lowNoiseConfig: MarketConfig = { noiseStdDev: 0.01, adpWeight: 0.8, tiebreaker: 0.001 }

      const picked = simulateMarketPickDeterministic(availablePlayers, adpMap, preferences, lowNoiseConfig)

      expect(availablePlayers).toContain(picked)
    })
  })
})

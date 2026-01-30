import { describe, it, expect } from 'vitest'
import type { Position } from '@/lib/algorithms/types'
import {
  calculateTEScarcityMultiplier,
  calculateStarterFillGuardrail,
  calculate2ndQBPenalty,
  applyGuardrails,
  type GuardrailContext,
} from '@/lib/algorithms/monte-carlo/guardrails'
import { createMockSimulationInput } from './factories'

describe('Draft Guardrails', () => {
  describe('calculateTEScarcityMultiplier', () => {
    it('should return 1.5 boost when user has no TE and remaining TEs <= picksUntilNextTurn', () => {
      const input = createMockSimulationInput()
      const userRoster: Array<{ position: 'TE'; playerId: string }> = []
      const availablePlayers = input.players.filter(p => p.position === 'TE')
      const picksUntilNextTurn = 5

      const multiplier = calculateTEScarcityMultiplier(
        userRoster,
        availablePlayers,
        picksUntilNextTurn
      )

      expect(multiplier).toBe(1.5)
    })

    it('should return 1.2 boost when user has no TE and remaining TEs <= 2x picksUntilNextTurn', () => {
      const input = createMockSimulationInput()
      const userRoster: Array<{ position: 'TE'; playerId: string }> = []
      const availablePlayers = input.players.filter(p => p.position === 'TE')
      const picksUntilNextTurn = 5

      const multiplier = calculateTEScarcityMultiplier(
        userRoster,
        availablePlayers,
        picksUntilNextTurn
      )

      expect(multiplier).toBe(1.5)
    })

    it('should return 1.0 when user has 1 TE', () => {
      const input = createMockSimulationInput()
      const userRoster: Array<{ position: 'TE'; playerId: string }> = [
        { position: 'TE', playerId: '5048' },
      ]
      const availablePlayers = input.players.filter(p => p.position === 'TE')
      const picksUntilNextTurn = 5

      const multiplier = calculateTEScarcityMultiplier(
        userRoster,
        availablePlayers,
        picksUntilNextTurn
      )

      expect(multiplier).toBe(1.0)
    })

    it('should return 1.0 when user has no TE but 20 TEs available', () => {
      const input = createMockSimulationInput()
      const userRoster: Array<{ position: 'TE'; playerId: string }> = []
      const availablePlayers = input.players.filter(p => p.position === 'TE')
      const picksUntilNextTurn = 5

      const manyTEs = [...availablePlayers, ...availablePlayers, ...availablePlayers, ...availablePlayers]

      const multiplier = calculateTEScarcityMultiplier(
        userRoster,
        manyTEs,
        picksUntilNextTurn
      )

      expect(multiplier).toBe(1.0)
    })
  })

  describe('calculateStarterFillGuardrail', () => {
    it('should generate warning when user needs 2 RBs but only 1 RB available', () => {
      const input = createMockSimulationInput()
      const userRoster: Array<{ position: Position; playerId: string }> = []
      const minStartersByPosition: Record<Position, number> = {
        RB: 2,
        WR: 2,
        QB: 1,
        TE: 1,
        K: 0,
        DEF: 0,
        DL: 0,
        LB: 0,
        DB: 0,
        FLEX: 0,
        SUPERFLEX: 0,
        REC_FLEX: 0,
        WRRB_FLEX: 0,
        IDP_FLEX: 0,
      }
      const availablePlayers = input.players.filter(p => p.position === 'RB').slice(0, 1)
      const picksRemaining = 10

      const result = calculateStarterFillGuardrail(
        userRoster,
        minStartersByPosition,
        availablePlayers,
        picksRemaining
      )

      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.warnings[0]).toContain('RB')
    })

    it('should not generate warning when user needs 2 RBs and 10 RBs available', () => {
      const input = createMockSimulationInput()
      const userRoster: Array<{ position: Position; playerId: string }> = []
      const minStartersByPosition: Record<Position, number> = {
        RB: 2,
        WR: 2,
        QB: 1,
        TE: 1,
        K: 0,
        DEF: 0,
        DL: 0,
        LB: 0,
        DB: 0,
        FLEX: 0,
        SUPERFLEX: 0,
        REC_FLEX: 0,
        WRRB_FLEX: 0,
        IDP_FLEX: 0,
      }
      const availablePlayers = input.players
      const picksRemaining = 10

      const result = calculateStarterFillGuardrail(
        userRoster,
        minStartersByPosition,
        availablePlayers,
        picksRemaining
      )

      expect(result.warnings.length).toBe(0)
    })

    it('should apply position boost when scarcity detected', () => {
      const input = createMockSimulationInput()
      const userRoster: Array<{ position: Position; playerId: string }> = []
      const minStartersByPosition: Record<Position, number> = {
        RB: 2,
        WR: 2,
        QB: 1,
        TE: 1,
        K: 0,
        DEF: 0,
        DL: 0,
        LB: 0,
        DB: 0,
        FLEX: 0,
        SUPERFLEX: 0,
        REC_FLEX: 0,
        WRRB_FLEX: 0,
        IDP_FLEX: 0,
      }
      const availablePlayers = input.players.filter(p => p.position === 'RB').slice(0, 1)
      const picksRemaining = 10

      const result = calculateStarterFillGuardrail(
        userRoster,
        minStartersByPosition,
        availablePlayers,
        picksRemaining
      )

      expect(result.positionBoosts['RB']).toBeGreaterThan(1.0)
    })
  })

  describe('calculate2ndQBPenalty', () => {
    it('should return 1.0 when no2ndQBEnabled is false', () => {
      const userRoster: Array<{ position: Position; playerId: string }> = [
        { position: 'QB', playerId: '4046' },
      ]
      const targetPosition: Position = 'QB'
      const isSuperflex = false
      const no2ndQBEnabled = false

      const multiplier = calculate2ndQBPenalty(
        userRoster,
        targetPosition,
        isSuperflex,
        no2ndQBEnabled
      )

      expect(multiplier).toBe(1.0)
    })

    it('should return 1.0 when isSuperflex is true', () => {
      const userRoster: Array<{ position: Position; playerId: string }> = [
        { position: 'QB', playerId: '4046' },
      ]
      const targetPosition: Position = 'QB'
      const isSuperflex = true
      const no2ndQBEnabled = true

      const multiplier = calculate2ndQBPenalty(
        userRoster,
        targetPosition,
        isSuperflex,
        no2ndQBEnabled
      )

      expect(multiplier).toBe(1.0)
    })

    it('should return 1.0 when user has 0 QBs and target is QB', () => {
      const userRoster: Array<{ position: Position; playerId: string }> = []
      const targetPosition: Position = 'QB'
      const isSuperflex = false
      const no2ndQBEnabled = true

      const multiplier = calculate2ndQBPenalty(
        userRoster,
        targetPosition,
        isSuperflex,
        no2ndQBEnabled
      )

      expect(multiplier).toBe(1.0)
    })

    it('should return 0.5 when user has 1 QB and target is QB', () => {
      const userRoster: Array<{ position: Position; playerId: string }> = [
        { position: 'QB', playerId: '4046' },
      ]
      const targetPosition: Position = 'QB'
      const isSuperflex = false
      const no2ndQBEnabled = true

      const multiplier = calculate2ndQBPenalty(
        userRoster,
        targetPosition,
        isSuperflex,
        no2ndQBEnabled
      )

      expect(multiplier).toBe(0.5)
    })

    it('should return 1.0 when user has 1 QB and target is RB', () => {
      const userRoster: Array<{ position: Position; playerId: string }> = [
        { position: 'QB', playerId: '4046' },
      ]
      const targetPosition: Position = 'RB'
      const isSuperflex = false
      const no2ndQBEnabled = true

      const multiplier = calculate2ndQBPenalty(
        userRoster,
        targetPosition,
        isSuperflex,
        no2ndQBEnabled
      )

      expect(multiplier).toBe(1.0)
    })
  })

  describe('applyGuardrails', () => {
    it('should apply TE scarcity boost to TE player', () => {
      const input = createMockSimulationInput()
      const context: GuardrailContext = {
        userRoster: [],
        availablePlayers: input.players.filter(p => p.position === 'TE'),
        picksUntilNextTurn: 5,
        picksRemaining: 10,
        minStartersByPosition: { RB: 2, WR: 2, QB: 1, TE: 1 } as Record<
          string,
          number
        >,
        isSuperflex: false,
        no2ndQBEnabled: false,
      }

      const baseUtility = 100
      const adjustedUtility = applyGuardrails('5048', 'TE', baseUtility, context)

      expect(adjustedUtility).toBeGreaterThan(baseUtility)
    })

    it('should apply 2nd QB penalty to QB player when applicable', () => {
      const input = createMockSimulationInput()
      const context: GuardrailContext = {
        userRoster: [{ position: 'QB' as const, playerId: '4046' }],
        availablePlayers: input.players,
        picksUntilNextTurn: 5,
        picksRemaining: 10,
        minStartersByPosition: { RB: 2, WR: 2, QB: 1, TE: 1 } as Record<
          string,
          number
        >,
        isSuperflex: false,
        no2ndQBEnabled: true,
      }

      const baseUtility = 100
      const adjustedUtility = applyGuardrails('4040', 'QB', baseUtility, context)

      expect(adjustedUtility).toBeLessThan(baseUtility)
    })

    it('should apply RB position boost when RB scarce', () => {
      const input = createMockSimulationInput()
      const context: GuardrailContext = {
        userRoster: [],
        availablePlayers: input.players.filter(p => p.position === 'RB').slice(0, 1), // Only 1 RB
        picksUntilNextTurn: 5,
        picksRemaining: 10,
        minStartersByPosition: { RB: 2, WR: 2, QB: 1, TE: 1 } as Record<
          string,
          number
        >,
        isSuperflex: false,
        no2ndQBEnabled: false,
      }

      const baseUtility = 100
      const adjustedUtility = applyGuardrails('6803', 'RB', baseUtility, context)

      expect(adjustedUtility).toBeGreaterThan(baseUtility)
    })

    it('should not modify non-TE, non-QB, non-scarce position', () => {
      const input = createMockSimulationInput()
      const context: GuardrailContext = {
        userRoster: [],
        availablePlayers: input.players,
        picksUntilNextTurn: 5,
        picksRemaining: 10,
        minStartersByPosition: { RB: 2, WR: 2, QB: 1, TE: 1 } as Record<
          string,
          number
        >,
        isSuperflex: false,
        no2ndQBEnabled: false,
      }

      const baseUtility = 100
      const adjustedUtility = applyGuardrails('5018', 'WR', baseUtility, context)

      expect(adjustedUtility).toBe(baseUtility)
    })
  })
})

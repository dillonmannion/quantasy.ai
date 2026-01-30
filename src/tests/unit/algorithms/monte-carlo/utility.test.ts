import { describe, it, expect } from 'vitest'
import {
  calculateUtility,
  generateRecommendation,
  classifyConfidence,
} from '@/lib/algorithms/monte-carlo/utility'
import { createMockSimulationInput } from './factories'

describe('Utility Calculations', () => {
  describe('calculateUtility', () => {
    it('should calculate utility for take now scenario', () => {
      const input = createMockSimulationInput()
      const targetPlayer = input.players[0]
      const bestAtWrapAround = 150 // Expected best available at wrap-around
      const lambda = 1.0 // Balanced risk tolerance

      const utility = calculateUtility({
        expectedValue: 280 + 150, // targetPoints + bestAtWrapAround
        standardDeviation: 20,
        lambda,
      })

      // utility = 430 - 1.0 * 20 = 410
      expect(utility).toBe(410)
    })

    it('should calculate utility with lambda = 0 (aggressive)', () => {
      const utility = calculateUtility({
        expectedValue: 300,
        standardDeviation: 50,
        lambda: 0,
      })

      // utility = 300 - 0 * 50 = 300 (no risk penalty)
      expect(utility).toBe(300)
    })

    it('should calculate utility with lambda = 2 (conservative)', () => {
      const utility = calculateUtility({
        expectedValue: 300,
        standardDeviation: 50,
        lambda: 2,
      })

      // utility = 300 - 2 * 50 = 200 (heavy risk penalty)
      expect(utility).toBe(200)
    })

    it('should handle zero standard deviation', () => {
      const utility = calculateUtility({
        expectedValue: 250,
        standardDeviation: 0,
        lambda: 1.0,
      })

      // utility = 250 - 1.0 * 0 = 250
      expect(utility).toBe(250)
    })

    it('should handle negative expected value', () => {
      const utility = calculateUtility({
        expectedValue: -50,
        standardDeviation: 30,
        lambda: 1.0,
      })

      // utility = -50 - 1.0 * 30 = -80
      expect(utility).toBe(-80)
    })
  })

  describe('generateRecommendation', () => {
    it('should recommend take_now when utility is significantly higher', () => {
      const input = createMockSimulationInput()
      const targetPlayer = input.players[0]

      const recommendation = generateRecommendation({
        playerId: targetPlayer.playerId,
        playerName: targetPlayer.fullName,
        position: targetPlayer.position,
        survivalRate: 15, // 15% survival = low chance of being available
        utilityTakeNow: 410,
        utilityWait: 390, // 20 point difference > 5 threshold
        lambda: 1.0,
      })

      expect(recommendation.recommendation).toBe('take_now')
      expect(recommendation.confidence).toBe('high')
      expect(recommendation.explanation).toContain('Strong recommend take now')
    })

    it('should recommend wait when utility is significantly higher', () => {
      const input = createMockSimulationInput()
      const targetPlayer = input.players[0]

      const recommendation = generateRecommendation({
        playerId: targetPlayer.playerId,
        playerName: targetPlayer.fullName,
        position: targetPlayer.position,
        survivalRate: 85, // 85% survival = high chance of being available
        utilityTakeNow: 380,
        utilityWait: 410, // 30 point difference > 5 threshold
        lambda: 1.0,
      })

      expect(recommendation.recommendation).toBe('wait')
      expect(recommendation.confidence).toBe('high')
      expect(recommendation.explanation).toContain('Recommend wait')
    })

    it('should recommend consider when utilities are marginal', () => {
      const input = createMockSimulationInput()
      const targetPlayer = input.players[0]

      const recommendation = generateRecommendation({
        playerId: targetPlayer.playerId,
        playerName: targetPlayer.fullName,
        position: targetPlayer.position,
        survivalRate: 50, // 50% survival = coin flip
        utilityTakeNow: 400,
        utilityWait: 402, // 2 point difference < 5 threshold
        lambda: 1.0,
      })

      expect(recommendation.recommendation).toBe('consider')
      expect(recommendation.confidence).toBe('low')
      expect(recommendation.explanation).toContain('Marginal decision')
    })

    it('should set high confidence when survival rate is very low (< 20%)', () => {
      const input = createMockSimulationInput()
      const targetPlayer = input.players[0]

      const recommendation = generateRecommendation({
        playerId: targetPlayer.playerId,
        playerName: targetPlayer.fullName,
        position: targetPlayer.position,
        survivalRate: 10, // < 20%
        utilityTakeNow: 410,
        utilityWait: 390,
        lambda: 1.0,
      })

      expect(recommendation.confidence).toBe('high')
    })

    it('should set high confidence when survival rate is very high (> 80%)', () => {
      const input = createMockSimulationInput()
      const targetPlayer = input.players[0]

      const recommendation = generateRecommendation({
        playerId: targetPlayer.playerId,
        playerName: targetPlayer.fullName,
        position: targetPlayer.position,
        survivalRate: 90, // > 80%
        utilityTakeNow: 380,
        utilityWait: 410,
        lambda: 1.0,
      })

      expect(recommendation.confidence).toBe('high')
    })

    it('should set low confidence when survival rate is 40-80% but in 35-65% range', () => {
      const input = createMockSimulationInput()
      const targetPlayer = input.players[0]

      const recommendation = generateRecommendation({
        playerId: targetPlayer.playerId,
        playerName: targetPlayer.fullName,
        position: targetPlayer.position,
        survivalRate: 60, // 40-80% but also 35-65% (low takes precedence)
        utilityTakeNow: 400,
        utilityWait: 405,
        lambda: 1.0,
      })

      expect(recommendation.confidence).toBe('low')
    })

    it('should set low confidence when survival rate is 35-65%', () => {
      const input = createMockSimulationInput()
      const targetPlayer = input.players[0]

      const recommendation = generateRecommendation({
        playerId: targetPlayer.playerId,
        playerName: targetPlayer.fullName,
        position: targetPlayer.position,
        survivalRate: 50, // 35-65% (coin flip)
        utilityTakeNow: 400,
        utilityWait: 402,
        lambda: 1.0,
      })

      expect(recommendation.confidence).toBe('low')
    })

    it('should handle edge case: 0% survival rate', () => {
      const input = createMockSimulationInput()
      const targetPlayer = input.players[0]

      const recommendation = generateRecommendation({
        playerId: targetPlayer.playerId,
        playerName: targetPlayer.fullName,
        position: targetPlayer.position,
        survivalRate: 0, // Player already gone
        utilityTakeNow: 0,
        utilityWait: 300,
        lambda: 1.0,
      })

      expect(recommendation.recommendation).toBe('wait')
      expect(recommendation.confidence).toBe('high')
    })

    it('should handle edge case: 100% survival rate', () => {
      const input = createMockSimulationInput()
      const targetPlayer = input.players[0]

      const recommendation = generateRecommendation({
        playerId: targetPlayer.playerId,
        playerName: targetPlayer.fullName,
        position: targetPlayer.position,
        survivalRate: 100, // No risk
        utilityTakeNow: 410,
        utilityWait: 390,
        lambda: 1.0,
      })

      expect(recommendation.recommendation).toBe('take_now')
      expect(recommendation.confidence).toBe('high')
    })

    it('should include survival rate in explanation', () => {
      const input = createMockSimulationInput()
      const targetPlayer = input.players[0]

      const recommendation = generateRecommendation({
        playerId: targetPlayer.playerId,
        playerName: targetPlayer.fullName,
        position: targetPlayer.position,
        survivalRate: 25,
        utilityTakeNow: 410,
        utilityWait: 390,
        lambda: 1.0,
      })

      expect(recommendation.explanation).toContain('25%')
    })
  })

  describe('classifyConfidence', () => {
    it('should classify high confidence when survival < 20%', () => {
      const confidence = classifyConfidence(15)
      expect(confidence).toBe('high')
    })

    it('should classify high confidence when survival > 80%', () => {
      const confidence = classifyConfidence(85)
      expect(confidence).toBe('high')
    })

    it('should classify low confidence when survival 40-80% but in 35-65% range', () => {
      const confidence = classifyConfidence(60)
      expect(confidence).toBe('low')
    })

    it('should classify medium confidence when survival 20-40%', () => {
      const confidence = classifyConfidence(30)
      expect(confidence).toBe('medium')
    })

    it('should classify low confidence when survival 35-65%', () => {
      const confidence = classifyConfidence(50)
      expect(confidence).toBe('low')
    })

    it('should classify low confidence at boundary 35%', () => {
      const confidence = classifyConfidence(35)
      expect(confidence).toBe('low')
    })

    it('should classify medium confidence at boundary 34%', () => {
      const confidence = classifyConfidence(34)
      expect(confidence).toBe('medium')
    })

    it('should classify low confidence at boundary 65%', () => {
      const confidence = classifyConfidence(65)
      expect(confidence).toBe('low')
    })

    it('should classify medium confidence at boundary 20%', () => {
      const confidence = classifyConfidence(20)
      expect(confidence).toBe('medium')
    })

    it('should classify low confidence at boundary 40%', () => {
      const confidence = classifyConfidence(40)
      expect(confidence).toBe('low')
    })

    it('should classify medium confidence at boundary 80%', () => {
      const confidence = classifyConfidence(80)
      expect(confidence).toBe('medium')
    })

    it('should classify high confidence at boundary 81%', () => {
      const confidence = classifyConfidence(81)
      expect(confidence).toBe('high')
    })

    it('should handle 0% survival', () => {
      const confidence = classifyConfidence(0)
      expect(confidence).toBe('high')
    })

    it('should handle 100% survival', () => {
      const confidence = classifyConfidence(100)
      expect(confidence).toBe('high')
    })
  })

  describe('Integration: Full recommendation flow', () => {
    it('should generate complete recommendation with all fields', () => {
      const input = createMockSimulationInput()
      const targetPlayer = input.players[0]

      const recommendation = generateRecommendation({
        playerId: targetPlayer.playerId,
        playerName: targetPlayer.fullName,
        position: targetPlayer.position,
        survivalRate: 25,
        utilityTakeNow: 410,
        utilityWait: 390,
        lambda: 1.0,
      })

      expect(recommendation).toHaveProperty('playerId')
      expect(recommendation).toHaveProperty('playerName')
      expect(recommendation).toHaveProperty('position')
      expect(recommendation).toHaveProperty('survivalRate')
      expect(recommendation).toHaveProperty('confidence')
      expect(recommendation).toHaveProperty('recommendation')
      expect(recommendation).toHaveProperty('explanation')
      expect(recommendation).toHaveProperty('expectedValue')
      expect(recommendation).toHaveProperty('utility')
    })

    it('should calculate expected value correctly in recommendation', () => {
      const input = createMockSimulationInput()
      const targetPlayer = input.players[0]

      const recommendation = generateRecommendation({
        playerId: targetPlayer.playerId,
        playerName: targetPlayer.fullName,
        position: targetPlayer.position,
        survivalRate: 50,
        utilityTakeNow: 410,
        utilityWait: 390,
        lambda: 1.0,
      })

      // Expected value should be the average of the two utilities
      expect(recommendation.expectedValue).toBe(400)
    })

    it('should use take_now utility when take_now is recommended', () => {
      const input = createMockSimulationInput()
      const targetPlayer = input.players[0]

      const recommendation = generateRecommendation({
        playerId: targetPlayer.playerId,
        playerName: targetPlayer.fullName,
        position: targetPlayer.position,
        survivalRate: 15,
        utilityTakeNow: 410,
        utilityWait: 390,
        lambda: 1.0,
      })

      expect(recommendation.utility).toBe(410)
    })

    it('should use wait utility when wait is recommended', () => {
      const input = createMockSimulationInput()
      const targetPlayer = input.players[0]

      const recommendation = generateRecommendation({
        playerId: targetPlayer.playerId,
        playerName: targetPlayer.fullName,
        position: targetPlayer.position,
        survivalRate: 85,
        utilityTakeNow: 380,
        utilityWait: 410,
        lambda: 1.0,
      })

      expect(recommendation.utility).toBe(410)
    })

    it('should use take_now utility when consider is recommended', () => {
      const input = createMockSimulationInput()
      const targetPlayer = input.players[0]

      const recommendation = generateRecommendation({
        playerId: targetPlayer.playerId,
        playerName: targetPlayer.fullName,
        position: targetPlayer.position,
        survivalRate: 50,
        utilityTakeNow: 400,
        utilityWait: 402,
        lambda: 1.0,
      })

      // For consider, use take_now utility (first option)
      expect(recommendation.utility).toBe(400)
    })

    it('should generate fallback explanation for wait + low confidence', () => {
      const input = createMockSimulationInput()
      const targetPlayer = input.players[0]

      const recommendation = generateRecommendation({
        playerId: targetPlayer.playerId,
        playerName: targetPlayer.fullName,
        position: targetPlayer.position,
        survivalRate: 50,
        utilityTakeNow: 380,
        utilityWait: 410,
        lambda: 1.0,
      })

      expect(recommendation.explanation).toContain('Survival rate')
    })
  })
})

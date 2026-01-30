import type { Position } from '@/lib/algorithms/types'

export interface UtilityInput {
  expectedValue: number
  standardDeviation: number
  lambda: number
}

export interface RecommendationInput {
  playerId: string
  playerName: string
  position: Position
  survivalRate: number
  utilityTakeNow: number
  utilityWait: number
  lambda: number
}

export type ConfidenceLevel = 'high' | 'medium' | 'low'
export type RecommendationType = 'take_now' | 'wait' | 'consider'

export interface UtilityRecommendation {
  playerId: string
  playerName: string
  position: Position
  survivalRate: number
  recommendation: RecommendationType
  confidence: ConfidenceLevel
  explanation: string
  expectedValue: number
  utility: number
}

export function calculateUtility(input: UtilityInput): number {
  return input.expectedValue - input.lambda * input.standardDeviation
}

export function classifyConfidence(survivalRate: number): ConfidenceLevel {
  if (survivalRate < 20 || survivalRate > 80) {
    return 'high'
  }

  if (survivalRate >= 35 && survivalRate <= 65) {
    return 'low'
  }

  return 'medium'
}

export function generateRecommendation(input: RecommendationInput): UtilityRecommendation {
  const utilityDiff = input.utilityTakeNow - input.utilityWait
  const threshold = 5

  let recommendation: RecommendationType
  let utility: number

  if (utilityDiff > threshold) {
    recommendation = 'take_now'
    utility = input.utilityTakeNow
  } else if (utilityDiff < -threshold) {
    recommendation = 'wait'
    utility = input.utilityWait
  } else {
    recommendation = 'consider'
    utility = input.utilityTakeNow
  }

  const confidence = classifyConfidence(input.survivalRate)
  const expectedValue = (input.utilityTakeNow + input.utilityWait) / 2

  const explanation = generateExplanation(
    recommendation,
    confidence,
    input.survivalRate,
    input.playerName
  )

  return {
    playerId: input.playerId,
    playerName: input.playerName,
    position: input.position,
    survivalRate: input.survivalRate,
    recommendation,
    confidence,
    explanation,
    expectedValue,
    utility,
  }
}

function generateExplanation(
  recommendation: RecommendationType,
  confidence: ConfidenceLevel,
  survivalRate: number,
  playerName: string
): string {
  const survivalPercent = Math.round(survivalRate)

  if (recommendation === 'take_now' && confidence === 'high') {
    return `Strong recommend take now. Low risk of being available later (${survivalPercent}% survival).`
  }

  if (recommendation === 'wait' && confidence === 'high') {
    return `Recommend wait. High probability available (${survivalPercent}% survival), better value later.`
  }

  if (recommendation === 'consider') {
    return `Marginal decision. Consider team needs and available alternatives.`
  }

  if (recommendation === 'take_now' && confidence === 'medium') {
    return `Lean toward taking now. Moderate risk of being available later (${survivalPercent}% survival).`
  }

  if (recommendation === 'wait' && confidence === 'medium') {
    return `Lean toward waiting. Moderate probability available (${survivalPercent}% survival).`
  }

  return `Decision on ${playerName}. Survival rate: ${survivalPercent}%.`
}

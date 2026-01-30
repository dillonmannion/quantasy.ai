import type { MonteCarloInput, SimulationResult } from './types'
import type { Position } from '@/lib/algorithms/types'
import { simulateMarketPickDeterministic, simulateMarketPick } from './market-model'

export interface CancellationToken {
  cancelled: boolean
}

export interface SurvivalProbabilityResult {
  survivalRates: Record<string, number>
  metadata: {
    simulationCount: number
    cancelled: boolean
  }
}

export function calculatePickOrder(round: number, teams: number, _totalRounds: number): number[] {
  const isReverse = round === 3 ? false : round % 2 === 0

  if (isReverse) {
    return Array.from({ length: teams }, (_, i) => teams - i)
  }
  return Array.from({ length: teams }, (_, i) => i + 1)
}

function getPickRound(overallPick: number, teams: number): number {
  return Math.ceil(overallPick / teams)
}

function getPickWithinRound(overallPick: number, teams: number): number {
  const remainder = overallPick % teams
  return remainder === 0 ? teams : remainder
}

function getRosterIdForPick(overallPick: number, teams: number, totalRounds: number): number {
  const round = getPickRound(overallPick, teams)
  const pickWithinRound = getPickWithinRound(overallPick, teams)
  const pickOrder = calculatePickOrder(round, teams, totalRounds)
  return pickOrder[pickWithinRound - 1]
}

export function runSimulationDeterministic(
  input: MonteCarloInput,
  targetPlayerId: string,
  randomFn: () => number = Math.random
): SimulationResult | null {
  const teams = 12
  const totalRounds = 16
  const maxPicks = teams * totalRounds

  const preDraftedPlayers = new Set(input.draftState.draftedPlayerIds)
  const allPickedPlayers: string[] = [...preDraftedPlayers]
  const newPickedPlayers: string[] = []
  const userPicks: string[] = []
  const finalRoster: Array<{ position: Position; playerId: string }> = []

  if (preDraftedPlayers.has(targetPlayerId)) {
    return null
  }

  const availablePlayers = new Set(
    input.players.map((p) => p.playerId).filter((id) => !allPickedPlayers.includes(id))
  )

  let currentPick = input.draftState.currentPick
  let userPickCount = 0

  while (userPickCount < 2 && currentPick <= maxPicks) {
    const rosterId = getRosterIdForPick(currentPick, teams, totalRounds)

    if (rosterId === input.userRosterId) {
      if (userPickCount === 0) {
        if (!availablePlayers.has(targetPlayerId)) {
          return null
        }
        allPickedPlayers.push(targetPlayerId)
        newPickedPlayers.push(targetPlayerId)
        userPicks.push(targetPlayerId)
        availablePlayers.delete(targetPlayerId)

        const player = input.players.find((p) => p.playerId === targetPlayerId)
        if (player) {
          finalRoster.push({ position: player.position, playerId: targetPlayerId })
        } else {
          finalRoster.push({ position: 'RB' as Position, playerId: targetPlayerId })
        }
      } else {
        const availableArray = Array.from(availablePlayers)
        if (availableArray.length === 0) {
          break
        }
        const pickId = getBestAvailableForUser(
          availablePlayers,
          input.adpMap,
          input.preferences,
          input.marketConfig,
          randomFn
        )

        allPickedPlayers.push(pickId)
        newPickedPlayers.push(pickId)
        userPicks.push(pickId)
        availablePlayers.delete(pickId)

        const player = input.players.find((p) => p.playerId === pickId)
        if (player) {
          finalRoster.push({ position: player.position, playerId: pickId })
        } else {
          finalRoster.push({ position: 'RB' as Position, playerId: pickId })
        }
      }

      userPickCount++
    } else {
      const availableArray = Array.from(availablePlayers)
      if (availableArray.length > 0) {
        const pickedId = simulateMarketPickDeterministic(
          availableArray,
          input.adpMap,
          input.preferences,
          input.marketConfig,
          randomFn
        )

        allPickedPlayers.push(pickedId)
        newPickedPlayers.push(pickedId)
        availablePlayers.delete(pickedId)
      }
    }

    currentPick++
  }

  if (userPickCount < 2) {
    return null
  }

  return {
    pickedPlayers: newPickedPlayers,
    userPicks,
    finalRoster,
  }
}

function getBestAvailableForUser(
  availablePlayers: Set<string>,
  adpMap: Record<string, number>,
  preferences: Record<string, string>,
  config: { noiseStdDev: number; adpWeight: number; tiebreaker: number },
  randomFn: () => number
): string {
  const availableArray = Array.from(availablePlayers)
  return simulateMarketPickDeterministic(
    availableArray,
    adpMap,
    preferences as Record<string, 'neutral' | 'like' | 'dislike' | 'strongly_like' | 'strongly_dislike' | 'dnd'>,
    config,
    randomFn
  )
}

export function runSimulation(
  input: MonteCarloInput,
  targetPlayerId: string
): SimulationResult | null {
  return runSimulationDeterministic(input, targetPlayerId, Math.random)
}

export function calculateSurvivalProbabilityDeterministic(
  input: MonteCarloInput,
  candidatePlayers: string[],
  numSimulations: number,
  randomFn: () => number = Math.random
): Record<string, number> {
  if (candidatePlayers.length === 0) {
    return {}
  }

  const survivalCounts: Record<string, number> = {}
  candidatePlayers.forEach((id) => {
    survivalCounts[id] = 0
  })

  for (let i = 0; i < numSimulations; i++) {
    for (const playerId of candidatePlayers) {
      const result = runSimulationDeterministic(input, playerId, randomFn)
      if (result !== null) {
        survivalCounts[playerId]++
      }
    }
  }

  const survivalRates: Record<string, number> = {}
  candidatePlayers.forEach((id) => {
    survivalRates[id] = survivalCounts[id] / numSimulations
  })

  return survivalRates
}

function calculateVariance(rates: number[]): number {
  if (rates.length === 0) return 0
  const mean = rates.reduce((a, b) => a + b, 0) / rates.length
  const squaredDiffs = rates.map((r) => Math.pow(r - mean, 2))
  return squaredDiffs.reduce((a, b) => a + b, 0) / rates.length
}

export function calculateSurvivalProbability(
  input: MonteCarloInput,
  candidatePlayers: string[],
  cancellationToken?: CancellationToken
): SurvivalProbabilityResult {
  if (candidatePlayers.length === 0) {
    return {
      survivalRates: {},
      metadata: { simulationCount: 0, cancelled: false },
    }
  }

  const BATCH_SIZE = 10
  const INITIAL_SIMULATIONS = 100
  const MAX_SIMULATIONS = 1000

  const survivalCounts: Record<string, number> = {}
  candidatePlayers.forEach((id) => {
    survivalCounts[id] = 0
  })

  let simulationCount = 0
  let targetSimulations = INITIAL_SIMULATIONS

  while (simulationCount < targetSimulations && simulationCount < MAX_SIMULATIONS) {
    if (cancellationToken?.cancelled) {
      const survivalRates: Record<string, number> = {}
      candidatePlayers.forEach((id) => {
        survivalRates[id] = simulationCount > 0 ? survivalCounts[id] / simulationCount : 0
      })
      return {
        survivalRates,
        metadata: { simulationCount, cancelled: true },
      }
    }

    for (let b = 0; b < BATCH_SIZE && simulationCount < targetSimulations; b++) {
      for (const playerId of candidatePlayers) {
        const result = runSimulation(input, playerId)
        if (result !== null) {
          survivalCounts[playerId]++
        }
      }
      simulationCount++
    }

    if (simulationCount >= INITIAL_SIMULATIONS && simulationCount < MAX_SIMULATIONS) {
      const currentRates = candidatePlayers.map((id) => survivalCounts[id] / simulationCount)
      const variance = calculateVariance(currentRates)

      if (variance > 0.2) {
        targetSimulations = MAX_SIMULATIONS
      } else if (variance > 0.1) {
        targetSimulations = Math.min(500, MAX_SIMULATIONS)
      }
    }
  }

  const survivalRates: Record<string, number> = {}
  candidatePlayers.forEach((id) => {
    survivalRates[id] = survivalCounts[id] / simulationCount
  })

  return {
    survivalRates,
    metadata: { simulationCount, cancelled: false },
  }
}

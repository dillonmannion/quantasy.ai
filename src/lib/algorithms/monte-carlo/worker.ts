import { runSimulation } from './simulator'
import type { MonteCarloInput, MonteCarloOutput, PickRecommendation } from './types'
import type { WorkerMessage, WorkerResponse } from './worker-client'

// Re-implementing variance calculation since it's not exported
function calculateVariance(rates: number[]): number {
  if (rates.length === 0) return 0
  const mean = rates.reduce((a, b) => a + b, 0) / rates.length
  const squaredDiffs = rates.map((r) => Math.pow(r - mean, 2))
  return squaredDiffs.reduce((a, b) => a + b, 0) / rates.length
}

let isCancelled = false

self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
  const { data } = event

  if (data.type === 'CANCEL') {
    isCancelled = true
    return
  }

  if (data.type === 'START') {
    isCancelled = false
    try {
      const result = await runMonteCarloSimulation(data.input, data.candidatePlayers)
      if (result) {
        const response: WorkerResponse = {
          type: 'RESULT',
          output: result,
        }
        self.postMessage(response)
      }
    } catch (error: any) {
      const response: WorkerResponse = {
        type: 'ERROR',
        error: error.message || 'Unknown error',
      }
      self.postMessage(response)
    }
  }
})

async function runMonteCarloSimulation(
  input: MonteCarloInput,
  candidatePlayers: string[]
): Promise<MonteCarloOutput | null> {
  const start = performance.now()
  const BATCH_SIZE = 10
  const INITIAL_SIMULATIONS = 100
  const MAX_SIMULATIONS = 1000

  const survivalCounts: Record<string, number> = {}
  candidatePlayers.forEach((id) => {
    survivalCounts[id] = 0
  })

  let simulationCount = 0
  let targetSimulations = INITIAL_SIMULATIONS

  // Loop until we reach target simulations or cancel
  while (simulationCount < targetSimulations && simulationCount < MAX_SIMULATIONS) {
    if (isCancelled) return null

    // Run a batch
    for (let b = 0; b < BATCH_SIZE && simulationCount < targetSimulations; b++) {
      for (const playerId of candidatePlayers) {
        // Run single simulation for this player
        const result = runSimulation(input, playerId)
        if (result !== null) {
          survivalCounts[playerId]++
        }
      }
      simulationCount++
    }

    // Report progress
    const progress = Math.min(100, Math.round((simulationCount / targetSimulations) * 100))
    const progressMsg: WorkerResponse = { type: 'PROGRESS', progress }
    self.postMessage(progressMsg)

    // Yield to event loop to allow processing CANCEL messages
    await new Promise((resolve) => setTimeout(resolve, 0))

    // Check variance after INITIAL_SIMULATIONS to decide if we need more
    if (
      simulationCount >= INITIAL_SIMULATIONS &&
      simulationCount < MAX_SIMULATIONS &&
      targetSimulations === INITIAL_SIMULATIONS
    ) {
      const currentRates = candidatePlayers.map((id) => survivalCounts[id] / simulationCount)
      const variance = calculateVariance(currentRates)

      // If variance is high, increase simulations for better accuracy
      if (variance > 0.2) {
        targetSimulations = MAX_SIMULATIONS
      } else if (variance > 0.1) {
        targetSimulations = Math.min(500, MAX_SIMULATIONS)
      }
    }
  }

  if (isCancelled) return null

  const executionTimeMs = performance.now() - start
  const survivalMap: Record<string, number> = {}
  
  candidatePlayers.forEach((id) => {
    survivalMap[id] = survivalCounts[id] / simulationCount
  })

  // Generate recommendations based on survival rates and VBD score
  const recommendations: PickRecommendation[] = candidatePlayers
    .map((id) => {
      const player = input.players.find((p) => p.playerId === id)
      if (!player) return null

      const rate = survivalMap[id] // 0-1
      
      // Calculate confidence score (simple heuristic)
      const confidence = rate > 0.8 ? 0.9 : rate > 0.5 ? 0.6 : 0.3

      return {
        playerId: id,
        playerName: player.fullName,
        position: player.position,
        survivalRate: rate * 100, // Convert to 0-100 for display
        confidence,
        reasons: [`Survival Chance: ${(rate * 100).toFixed(1)}%`],
      }
    })
    .filter((r): r is PickRecommendation => r !== null)

  // Sort by survival rate descending (primary)
  recommendations.sort((a, b) => b.survivalRate - a.survivalRate)

  const bestPick = recommendations[0]?.playerId || null

  return {
    recommendations,
    survivalMap,
    bestPick,
    metadata: {
      playerCount: candidatePlayers.length,
      simulationCount,
      executionTimeMs,
    },
  }
}

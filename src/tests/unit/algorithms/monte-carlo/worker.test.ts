import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MonteCarloWorker } from '../../../../lib/algorithms/monte-carlo/worker-client'
import type { MonteCarloInput, MonteCarloOutput } from '../../../../lib/algorithms/monte-carlo/types'

describe('MonteCarloWorker', () => {
  let workerClient: MonteCarloWorker
  let mockWorkerInstance: {
    postMessage: any
    terminate: any
    addEventListener: any
    removeEventListener: any
    onmessage?: (event: MessageEvent) => void
  }

  beforeEach(() => {
    vi.clearAllMocks()

    mockWorkerInstance = {
      postMessage: vi.fn(),
      terminate: vi.fn(),
      addEventListener: vi.fn((event, handler) => {
        if (event === 'message') {
          mockWorkerInstance.onmessage = handler
        }
      }),
      removeEventListener: vi.fn(),
    }

    global.Worker = vi.fn(() => mockWorkerInstance) as any
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should initialize worker on instantiation', () => {
    // Determine if worker is initialized lazily or eagerly.
    // In current implementation, it's lazy (in runSimulation).
    workerClient = new MonteCarloWorker()
    const input = {} as MonteCarloInput
    workerClient.runSimulation(input, [])
    
    expect(Worker).toHaveBeenCalledWith(
      expect.any(Object), // URL object
      expect.objectContaining({ type: 'module' })
    )
  })

  it('should send START message when running simulation', async () => {
    workerClient = new MonteCarloWorker()
    const input = {} as MonteCarloInput
    const candidatePlayers = ['p1']
    workerClient.runSimulation(input, candidatePlayers)

    expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith({
      type: 'START',
      input,
      candidatePlayers
    })
  })

  it('should handle PROGRESS messages', async () => {
    workerClient = new MonteCarloWorker()
    const onProgress = vi.fn()
    const input = {} as MonteCarloInput
    
    workerClient.runSimulation(input, [], onProgress)

    const progressEvent = new MessageEvent('message', {
      data: { type: 'PROGRESS', progress: 50 }
    })
    
    if (mockWorkerInstance.onmessage) {
      mockWorkerInstance.onmessage(progressEvent)
    }

    expect(onProgress).toHaveBeenCalledWith(50)
  })

  it('should resolve with RESULT', async () => {
    workerClient = new MonteCarloWorker()
    const input = {} as MonteCarloInput
    const expectedOutput = { bestPick: 'player1' } as unknown as MonteCarloOutput
    
    const promise = workerClient.runSimulation(input, [])

    const resultEvent = new MessageEvent('message', {
      data: { type: 'RESULT', output: expectedOutput }
    })
    
    if (mockWorkerInstance.onmessage) {
      mockWorkerInstance.onmessage(resultEvent)
    }

    const result = await promise
    expect(result).toEqual(expectedOutput)
  })

  it('should reject on ERROR', async () => {
    workerClient = new MonteCarloWorker()
    const input = {} as MonteCarloInput
    const promise = workerClient.runSimulation(input, [])

    const errorEvent = new MessageEvent('message', {
      data: { type: 'ERROR', error: 'Simulation failed' }
    })
    
    if (mockWorkerInstance.onmessage) {
      mockWorkerInstance.onmessage(errorEvent)
    }

    await expect(promise).rejects.toThrow('Simulation failed')
  })

  it('should send CANCEL message on cancel()', () => {
    workerClient = new MonteCarloWorker()
    workerClient.runSimulation({} as any, []) // Initialize worker
    workerClient.cancel()
    expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith({ type: 'CANCEL' })
  })

  it('should terminate worker on terminate()', () => {
    workerClient = new MonteCarloWorker()
    workerClient.runSimulation({} as any, []) // Initialize worker
    workerClient.terminate()
    expect(mockWorkerInstance.terminate).toHaveBeenCalled()
  })
})

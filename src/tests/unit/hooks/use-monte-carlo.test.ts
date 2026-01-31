/**
 * @vitest-environment jsdom
 */
import { JSDOM } from 'jsdom'

if (typeof document === 'undefined') {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost',
  })
  global.document = dom.window.document
  global.window = dom.window as any
  global.navigator = dom.window.navigator
}

import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useMonteCarlo } from '@/hooks/use-monte-carlo'
import type { MonteCarloInput, MonteCarloOutput } from '@/lib/algorithms/monte-carlo/types'

// Mock MonteCarloWorker
const mockRunSimulation = vi.fn()
const mockCancel = vi.fn()
const mockTerminate = vi.fn()

vi.mock('@/lib/algorithms/monte-carlo/worker-client', () => {
  return {
    MonteCarloWorker: class {
      runSimulation = mockRunSimulation
      cancel = mockCancel
      terminate = mockTerminate
    },
  }
})

describe('useMonteCarlo', () => {
  const mockInput: Omit<MonteCarloInput, 'riskTolerance' | 'preferences'> = {
    players: [],
    adpMap: {},
    draftState: {
        draftId: 'test-draft',
        status: 'drafting',
        picks: [],
        draftedPlayerIds: new Set(),
        userRosterId: 1,
        currentPick: 1
    },
    userRosterId: 1,
    marketConfig: { noiseStdDev: 0.1, adpWeight: 0.5, tiebreaker: 0.5 },
    guardrailConfig: { 
        requireTE: false, 
        no2ndQB: false, 
        minStartersByPosition: { 
            QB: 1, RB: 2, WR: 2, TE: 1, K: 1, DEF: 1, 
            FLEX: 1, SUPERFLEX: 0, IDP_FLEX: 0, WRRB_FLEX: 0, REC_FLEX: 0,
            DL: 0, LB: 0, DB: 0 
        } 
    },
  }

  const mockOutput: MonteCarloOutput = {
    recommendations: [],
    survivalMap: {},
    bestPick: null,
    metadata: {
      playerCount: 0,
      simulationCount: 100,
      executionTimeMs: 100,
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockRunSimulation.mockReturnValue(new Promise(() => {}))
  })

  it('should start in idle state', () => {
    const { result } = renderHook(() => useMonteCarlo(mockInput))
    expect(result.current.status).toBe('idle')
    expect(result.current.results).toBeNull()
    expect(result.current.error).toBeNull()
    expect(result.current.progress).toBe(0)
  })

  it('should run simulation and update state', async () => {
    let resolveSimulation: (val: MonteCarloOutput) => void
    mockRunSimulation.mockReturnValue(new Promise(resolve => {
      resolveSimulation = resolve
    }))
    
    const { result } = renderHook(() => useMonteCarlo(mockInput))

    let runPromise: Promise<void>
    await act(async () => {
      runPromise = result.current.runSimulation()
    })
    
    expect(result.current.status).toBe('loading')
    
    await act(async () => {
      resolveSimulation!(mockOutput)
      await runPromise!
    })
    
    expect(result.current.status).toBe('complete')
    expect(result.current.results).toBe(mockOutput)
  })

  it('should handle progress updates', async () => {
    mockRunSimulation.mockImplementation((input, candidates, onProgress) => {
      if (onProgress) {
        onProgress(50)
      }
      return Promise.resolve(mockOutput)
    })

    const { result } = renderHook(() => useMonteCarlo(mockInput))

    await act(async () => {
      await result.current.runSimulation()
    })
    
    expect(result.current.progress).toBe(50)
    expect(result.current.status).toBe('complete')
  })

  it('should debounce auto-runs when input changes', async () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(
      ({ input }) => useMonteCarlo(input, { enabled: true, debounceMs: 300 }), 
      { initialProps: { input: mockInput } }
    )

    const newInput = { ...mockInput, userRosterId: 2 }
    
    rerender({ input: newInput })
    rerender({ input: { ...newInput, userRosterId: 3 } })
    
    act(() => {
      vi.advanceTimersByTime(200)
    })
    
    mockRunSimulation.mockClear()
    
    rerender({ input: { ...newInput, userRosterId: 4 } })
    
    act(() => {
      vi.advanceTimersByTime(300)
    })
    
    expect(mockRunSimulation).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it('should allow setting risk tolerance', () => {
    const { result } = renderHook(() => useMonteCarlo(mockInput))
    
    act(() => {
      result.current.setRiskTolerance(0.8)
    })
  })

  it('should allow setting preferences', () => {
    const { result } = renderHook(() => useMonteCarlo(mockInput))
    
    act(() => {
      result.current.setPreference('player-1', 'like')
    })
  })

  it('should cancel simulation', async () => {
    mockRunSimulation.mockReturnValue(new Promise(() => {}))
    
    const { result } = renderHook(() => useMonteCarlo(mockInput))
    
    await act(async () => {
      result.current.runSimulation()
    })
    
    expect(result.current.status).toBe('loading')
    
    act(() => {
      result.current.cancel()
    })
    
    expect(mockCancel).toHaveBeenCalled()
    expect(result.current.status).toBe('idle')
  })
})

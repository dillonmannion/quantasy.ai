import { useState, useEffect, useRef, useCallback } from 'react'
import { MonteCarloWorker } from '@/lib/algorithms/monte-carlo/worker-client'
import type { MonteCarloInput, MonteCarloOutput, PlayerPreference } from '@/lib/algorithms/monte-carlo/types'

export type MonteCarloStatus = 'idle' | 'loading' | 'running' | 'complete' | 'error'

export interface UseMonteCarloOptions {
  enabled?: boolean
  debounceMs?: number
  initialRiskTolerance?: number
  initialPreferences?: Record<string, PlayerPreference>
}

export function useMonteCarlo(
  baseInput: Omit<MonteCarloInput, 'riskTolerance' | 'preferences'> | null,
  options: UseMonteCarloOptions = {}
) {
  const { 
    enabled = false, 
    debounceMs = 300, 
    initialRiskTolerance = 0.5, 
    initialPreferences = {} 
  } = options

  const [status, setStatus] = useState<MonteCarloStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<MonteCarloOutput | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const [riskTolerance, setRiskToleranceState] = useState(initialRiskTolerance)
  const [preferences, setPreferencesState] = useState(initialPreferences)

  const workerRef = useRef<MonteCarloWorker | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    workerRef.current = new MonteCarloWorker()
    return () => {
      workerRef.current?.terminate()
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [])

  const cancel = useCallback(() => {
    workerRef.current?.cancel()
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    setStatus('idle')
  }, [])

  const runSimulation = useCallback(async () => {
    if (!baseInput || !workerRef.current) return

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)

    setStatus('loading')
    setProgress(0)
    setError(null)
    
    workerRef.current.cancel()

    const input: MonteCarloInput = {
      ...baseInput,
      riskTolerance,
      preferences
    }
    
    const candidatePlayers = input.players.map(p => p.playerId)

    try {
      const result = await workerRef.current.runSimulation(
        input, 
        candidatePlayers,
        (p) => {
             setProgress(p)
             if (p > 0) setStatus('running')
        }
      )
      
      setResults(result)
      setStatus('complete')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      if (message !== 'Cancelled') {
         setError(message || 'Simulation failed')
         setStatus('error')
      }
    }
  }, [baseInput, riskTolerance, preferences])

  useEffect(() => {
    if (!enabled || !baseInput) return

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)

    debounceTimerRef.current = setTimeout(() => {
      runSimulation()
    }, debounceMs)

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [baseInput, riskTolerance, preferences, enabled, debounceMs, runSimulation])

  const setRiskTolerance = useCallback((val: number) => {
      setRiskToleranceState(val)
  }, [])

  const setPreference = useCallback((playerId: string, pref: PlayerPreference) => {
      setPreferencesState(prev => ({ ...prev, [playerId]: pref }))
  }, [])

  return {
    status,
    progress,
    results,
    error,
    runSimulation,
    cancel,
    setRiskTolerance,
    setPreference,
    riskTolerance,
    preferences
  }
}

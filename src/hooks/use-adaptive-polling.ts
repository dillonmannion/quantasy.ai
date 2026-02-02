'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

export interface AdaptivePollingOptions {
  baseInterval: number
  minInterval?: number
  maxInterval?: number
  staleTime?: number
  isGameActive?: boolean
  enabled?: boolean
}

export interface AdaptivePollingReturn<T> {
  data: T | null
  isLoading: boolean
  lastUpdated: Date | null
  isStale: boolean
  error: Error | null
  refetch: () => Promise<void>
}

const DEFAULT_MIN_INTERVAL = 30000
const DEFAULT_MAX_INTERVAL = 300000
const DEFAULT_STALE_TIME = 120000

export function useAdaptivePolling<T>(
  fetcher: () => Promise<T>,
  options: AdaptivePollingOptions
): AdaptivePollingReturn<T> {
  const {
    baseInterval,
    minInterval = DEFAULT_MIN_INTERVAL,
    maxInterval = DEFAULT_MAX_INTERVAL,
    staleTime = DEFAULT_STALE_TIME,
    isGameActive = false,
    enabled = true,
  } = options

  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const errorCountRef = useRef(0)
  const isFetchingRef = useRef(false)

  const isStale = lastUpdated
    ? Date.now() - lastUpdated.getTime() > staleTime
    : true

  const getCurrentInterval = useCallback(() => {
    if (typeof window === 'undefined') return baseInterval

    const isHidden = document.visibilityState === 'hidden'
    
    if (isHidden) {
      return maxInterval
    }

    if (isGameActive) {
      return minInterval
    }

    if (errorCountRef.current > 0) {
      const backoff = Math.min(
        baseInterval * Math.pow(2, errorCountRef.current),
        maxInterval
      )
      return backoff
    }

    return baseInterval
  }, [baseInterval, minInterval, maxInterval, isGameActive])

  const fetchData = useCallback(async () => {
    if (isFetchingRef.current) return

    isFetchingRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      const result = await fetcher()
      setData(result)
      setLastUpdated(new Date())
      errorCountRef.current = 0
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Fetch failed')
      setError(error)
      errorCountRef.current += 1
      console.error('[AdaptivePolling] Fetch error:', error)
    } finally {
      setIsLoading(false)
      isFetchingRef.current = false
    }
  }, [fetcher])

  const refetch = useCallback(async () => {
    await fetchData()
  }, [fetchData])

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    fetchData()

    const startPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }

      const interval = getCurrentInterval()
      intervalRef.current = setInterval(fetchData, interval)
    }

    startPolling()

    const handleVisibilityChange = () => {
      startPolling()
    }

    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (typeof window !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    }
  }, [enabled, fetchData, getCurrentInterval])

  return {
    data,
    isLoading,
    lastUpdated,
    isStale,
    error,
    refetch,
  }
}

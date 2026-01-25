'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface UseConnectionStatusReturn {
  isOnline: boolean
  isReconnecting: boolean
  retryCount: number
  maxRetries: number
  manualRetry: () => void
}

const MAX_RETRIES = 3

export function useConnectionStatus(): UseConnectionStatusReturn {
  const [isOnline, setIsOnline] = useState(true)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Calculate exponential backoff delay: 1s, 2s, 4s, 8s, 16s
  const getBackoffDelay = useCallback((attempt: number): number => {
    const delay = 1000 * Math.pow(2, attempt)
    return Math.min(delay, 16000) // Cap at 16s
  }, [])

  // Attempt to reconnect by checking navigator.onLine
  const attemptReconnect = useCallback(() => {
    if (navigator.onLine) {
      // Successfully reconnected
      setIsOnline(true)
      setIsReconnecting(false)
      setRetryCount(0)
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = null
      }
      return
    }

    // Still offline, schedule next retry if under limit
    if (retryCount < MAX_RETRIES) {
      const nextRetryCount = retryCount + 1
      setRetryCount(nextRetryCount)
      const delay = getBackoffDelay(nextRetryCount - 1)

      retryTimeoutRef.current = setTimeout(() => {
        attemptReconnect()
      }, delay)
    } else {
      // Max retries reached, stop auto-retry
      setIsReconnecting(false)
    }
  }, [retryCount, getBackoffDelay])

  // Handle offline event
  const handleOffline = useCallback(() => {
    setIsOnline(false)
    setIsReconnecting(true)
    setRetryCount(0)

    // Start first retry immediately
    const delay = getBackoffDelay(0)
    retryTimeoutRef.current = setTimeout(() => {
      attemptReconnect()
    }, delay)
  }, [getBackoffDelay, attemptReconnect])

  // Handle online event
  const handleOnline = useCallback(() => {
    setIsOnline(true)
    setIsReconnecting(false)
    setRetryCount(0)

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }
  }, [])

  // Manual retry function
  const manualRetry = useCallback(() => {
    setRetryCount(0)
    setIsReconnecting(true)

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
    }

    const delay = getBackoffDelay(0)
    retryTimeoutRef.current = setTimeout(() => {
      attemptReconnect()
    }, delay)
  }, [getBackoffDelay, attemptReconnect])

  // Setup event listeners
  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)

      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = null
      }
    }
  }, [handleOnline, handleOffline])

  return {
    isOnline,
    isReconnecting,
    retryCount,
    maxRetries: MAX_RETRIES,
    manualRetry,
  }
}

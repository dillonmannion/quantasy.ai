'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useDraftState } from '@/lib/draft'
import type { DraftPick } from '@/lib/draft/types'
import type { SleeperDraftPick } from '@/lib/sleeper/types'

const DEFAULT_POLL_INTERVAL_MS = 3000
const MAX_BACKOFF_MS = 20000
const MAX_ERROR_RETRIES = 3

interface UseDraftSyncOptions {
  draftId: string | null
  status: 'pre_draft' | 'drafting' | 'complete' | 'mock'
  pollIntervalMs?: number
}

interface UseDraftSyncReturn {
  isSyncing: boolean
  error: string | null
  lastSyncAt: number | null
}

function mapSleeperPickToDraftPick(pick: SleeperDraftPick): DraftPick {
  return {
    pickNumber: pick.pick_no,
    playerId: pick.player_id,
    playerName: `${pick.metadata.first_name} ${pick.metadata.last_name}`,
    position: pick.metadata.position,
    rosterId: pick.roster_id,
    timestamp: Date.now(),
  }
}

export function useDraftSync({
  draftId,
  status,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
}: UseDraftSyncOptions): UseDraftSyncReturn {
  const { state, dispatch } = useDraftState()
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const backoffRef = useRef(pollIntervalMs)
  const errorCountRef = useRef(0)
  const isPollingRef = useRef(false)

  const shouldPoll = status === 'drafting' && draftId !== null

  const fetchPicks = useCallback(async () => {
    if (!draftId || isPollingRef.current) return

    isPollingRef.current = true
    setIsSyncing(true)

    try {
      const response = await fetch(`/api/draft/${draftId}/picks`)

      if (response.status === 401) {
        setError('Unauthorized - please log in')
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        return
      }

      if (response.status === 404) {
        setError('Draft not found')
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        return
      }

      if (response.status === 429) {
        const data = await response.json()
        const retryAfterMs = data.retryAfterMs || 5000
        backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF_MS)
        setError(`Rate limited - retrying in ${Math.round(backoffRef.current / 1000)}s`)

        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
        intervalRef.current = setInterval(fetchPicks, backoffRef.current)
        return
      }

      if (!response.ok) {
        errorCountRef.current++
        if (errorCountRef.current >= MAX_ERROR_RETRIES) {
          setError('Server error - stopped polling')
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          return
        }
        setError(`Server error - retry ${errorCountRef.current}/${MAX_ERROR_RETRIES}`)
        return
      }

      const data = await response.json()
      const picks: SleeperDraftPick[] = data.picks || []

      if (picks.length !== state.picks.length) {
        const mappedPicks = picks.map(mapSleeperPickToDraftPick)
        dispatch({ type: 'SYNC_PICKS', picks: mappedPicks })
      }

      errorCountRef.current = 0
      backoffRef.current = pollIntervalMs
      setError(null)
      setLastSyncAt(Date.now())
    } catch (err) {
      errorCountRef.current++
      if (errorCountRef.current >= MAX_ERROR_RETRIES) {
        setError('Network error - stopped polling')
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        return
      }
      setError(`Network error - retry ${errorCountRef.current}/${MAX_ERROR_RETRIES}`)
    } finally {
      isPollingRef.current = false
      setIsSyncing(false)
    }
  }, [draftId, state.picks.length, dispatch, pollIntervalMs])

  useEffect(() => {
    if (!shouldPoll) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    fetchPicks()
    intervalRef.current = setInterval(fetchPicks, backoffRef.current)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [shouldPoll, fetchPicks])

  useEffect(() => {
    if (status === 'complete' && intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [status])

  return { isSyncing, error, lastSyncAt }
}

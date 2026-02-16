'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { refreshLeagueData } from './actions'
import { showSuccess, showError } from '@/lib/toast'

interface RefreshButtonProps {
  leagueId: string
}

export function RefreshButton({ leagueId }: RefreshButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)

    try {
      const result = await refreshLeagueData(leagueId)

      if (result.success) {
        showSuccess('League data refreshed', 'Your league data has been updated')
      } else {
        showError('Refresh failed', 'Could not refresh league data')
      }

      startTransition(() => {
        router.refresh()
      })
    } catch (error) {
      console.error('Refresh error:', error)
      showError('Refresh error', 'An unexpected error occurred')
    } finally {
      setIsRefreshing(false)
    }
  }

  const loading = isRefreshing || isPending

  return (
    <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
      <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
      {loading ? 'Refreshing...' : 'Refresh'}
    </Button>
  )
}

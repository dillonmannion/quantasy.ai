'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorAlert } from '@/components/ui/error-alert'
import { Loader2, RefreshCw } from 'lucide-react'
import { FadeIn } from '@/components/animation'
import type { WaiverOutput } from '@/lib/algorithms/types'

const RecommendationList = dynamic(
  () => import('@/components/waiver').then((mod) => mod.RecommendationList),
  { loading: () => <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full" />)}</div> }
)

const DroppablePlayerSelector = dynamic(
  () => import('@/components/waiver').then((mod) => mod.DroppablePlayerSelector),
  { loading: () => <Skeleton className="h-64 w-full" /> }
)

interface Props {
  leagueId: string
  rosterId: number
  defaultWeek: number
  initialRecommendations: WaiverOutput | null
}

interface WaiversState {
  week: number
  faabTotal: string
  faabRemaining: string
  recommendations: WaiverOutput | null
  loading: boolean
  error: string | null
}

export function WaiversClient({ leagueId, rosterId, defaultWeek, initialRecommendations }: Props) {
  const [state, setState] = useState<WaiversState>({
    week: defaultWeek,
    faabTotal: '100',
    faabRemaining: '100',
    recommendations: initialRecommendations,
    loading: false,
    error: null
  })

  const fetchRecommendations = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      // Build FAAB budget (or omit)
      let faabBudget: { total: number; remaining: number } | undefined
      if (state.faabTotal || state.faabRemaining) {
        const total = state.faabTotal ? parseFloat(state.faabTotal) : 100
        const remaining = state.faabRemaining ? parseFloat(state.faabRemaining) : total
        
        if (remaining > total) {
          setState(prev => ({ ...prev, error: 'Remaining cannot exceed Total', loading: false }))
          return
        }
        
        if (total <= 0 || remaining < 0) {
           setState(prev => ({ ...prev, error: 'Budget must be positive', loading: false }))
           return
        }

        faabBudget = { total, remaining }
      }
      
      const response = await fetch('/api/algorithms/waivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leagueId,
          rosterId,
          week: state.week,
          faabBudget,
        }),
      })
      
      if (!response.ok) {
        const { error } = await response.json()
        throw new Error(error || 'Failed to fetch recommendations')
      }
      
      const data = await response.json()
      setState(prev => ({ ...prev, recommendations: data, loading: false }))
    } catch (err) {
      setState(prev => ({ 
        ...prev, 
        error: err instanceof Error ? err.message : 'Unknown error',
        loading: false 
      }))
    }
  }, [leagueId, rosterId, state.week, state.faabTotal, state.faabRemaining])

  useEffect(() => {
    if (!initialRecommendations) {
      fetchRecommendations()
    }
  }, [initialRecommendations, fetchRecommendations])



  const handleWeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newWeek = parseInt(e.target.value)
    if (!isNaN(newWeek) && newWeek > 0 && newWeek <= 18) {
      setState(prev => ({ ...prev, week: newWeek }))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-end justify-between">
        <div className="flex gap-4 items-end">
          <div className="space-y-2">
            <Label htmlFor="week">Week</Label>
            <Input 
              id="week" 
              type="number" 
              min={1} 
              max={18}
              value={state.week}
              onChange={handleWeekChange}
              className="w-20"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="faab-total">FAAB Total</Label>
            <Input 
              id="faab-total" 
              type="number"
              value={state.faabTotal}
              onChange={(e) => setState(prev => ({ ...prev, faabTotal: e.target.value }))}
              className="w-24"
              placeholder="100"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="faab-remaining">Remaining</Label>
            <Input 
              id="faab-remaining" 
              type="number"
              value={state.faabRemaining}
              onChange={(e) => setState(prev => ({ ...prev, faabRemaining: e.target.value }))}
              className="w-24"
              placeholder="100"
            />
          </div>
        </div>

        <Button 
          onClick={fetchRecommendations} 
          disabled={state.loading}
          variant="outline"
          className="w-full md:w-auto"
        >
          {state.loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh Recommendations
        </Button>
      </div>

      {state.error && (
        <ErrorAlert message={state.error} />
      )}

      {state.recommendations && (
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-2xl font-bold font-display">Top Waiver Picks</h2>
            <RecommendationList recommendations={state.recommendations.recommendations} />
          </div>
          
          <div className="space-y-6">
            <h2 className="text-2xl font-bold font-display">Droppable Players</h2>
            <DroppablePlayerSelector droppable={state.recommendations.droppable} />
            
            <FadeIn delay={0.2}>
              <Card className="card-balatro p-6 bg-accent/20">
                <h3 className="font-bold mb-2">Methodology</h3>
                <p className="text-sm text-muted-foreground">
                  Recommendations are based on Value-Based Drafting (VBD) principles, 
                  comparing available free agents against your current roster weakness.
                  FAAB bids are calculated based on projected improvement over replacement level.
                </p>
              </Card>
            </FadeIn>
          </div>
        </div>
      )}
    </div>
  )
}

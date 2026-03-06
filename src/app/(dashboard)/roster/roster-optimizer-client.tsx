'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { FadeIn, Shimmer } from '@/components/animation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorAlert } from '@/components/ui/error-alert'
import type { LineupOutput } from '@/lib/algorithms/types'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const LineupComparison = dynamic(
  () => import('@/components/roster/lineup-comparison').then((mod) => mod.LineupComparison),
  { loading: () => <Skeleton className="h-96 w-full" /> }
)

const LineupExplanationPanel = dynamic(
  () => import('@/components/roster/lineup-explanation').then((mod) => mod.LineupExplanationPanel),
  { loading: () => <Skeleton className="h-32 w-full" /> }
)

const ApplyOptimizationButton = dynamic(
  () => import('@/components/roster/apply-optimization-button').then((mod) => mod.ApplyOptimizationButton),
  { ssr: false }
)

interface RosterOptimizerClientProps {
  leagueId: string
  leagueName: string
  rosterId: number
  currentWeek: number
}

export function RosterOptimizerClient({
  leagueId,
  leagueName,
  rosterId,
  currentWeek,
}: RosterOptimizerClientProps) {
  const [selectedWeek, setSelectedWeek] = useState(currentWeek)
  const [isLoading, setIsLoading] = useState(false)
  const [currentLineup, setCurrentLineup] = useState<LineupOutput | null>(null)
  const [optimizedLineup, setOptimizedLineup] = useState<LineupOutput | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hasFetchedInitial, setHasFetchedInitial] = useState(false)

  const fetchLineups = useCallback(async (week: number) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/algorithms/lineup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leagueId,
          rosterId,
          week,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch lineup')
      }

      const data = (await response.json()) as LineupOutput
      setCurrentLineup(data)
      setOptimizedLineup(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [leagueId, rosterId])

  useEffect(() => {
    if (!hasFetchedInitial) {
      setHasFetchedInitial(true)
      fetchLineups(currentWeek)
    }
  }, [hasFetchedInitial, currentWeek, fetchLineups])

  const handleWeekChange = (week: number) => {
    if (week >= 1 && week <= 18) {
      setSelectedWeek(week)
      setCurrentLineup(null)
      setOptimizedLineup(null)
      setError(null)
      fetchLineups(week)
    }
  }

  const handleApplyOptimization = async () => {
    if (!optimizedLineup) return
    
    try {
      setIsLoading(true)
      const response = await fetch('/api/algorithms/lineup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leagueId,
          rosterId,
          week: selectedWeek,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to apply optimization')
      }

      setCurrentLineup(optimizedLineup)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply optimization')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Roster Optimizer</h1>
          <p className="text-muted-foreground">
            {leagueName} - Week {selectedWeek}
          </p>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3">
          <h2 className="font-semibold">Select Week</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => handleWeekChange(selectedWeek - 1)}
              disabled={selectedWeek <= 1}
              aria-label="Previous week"
              className="min-w-[44px] min-h-[44px] shrink-0 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="overflow-x-auto flex-1 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex gap-1 w-max">
                {Array.from({ length: 18 }, (_, i) => i + 1).map((week) => (
                  <Button
                    key={week}
                    variant={selectedWeek === week ? 'default' : 'outline'}
                    onClick={() => handleWeekChange(week)}
                    className="min-w-[44px] min-h-[44px] snap-center"
                    aria-label={`Select Week ${week}`}
                  >
                    {week}
                  </Button>
                ))}
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => handleWeekChange(selectedWeek + 1)}
              disabled={selectedWeek >= 18}
              aria-label="Next week"
              className="min-w-[44px] min-h-[44px] shrink-0 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {error && (
        <FadeIn delay={0.2}>
          <ErrorAlert message={error} />
        </FadeIn>
      )}

      {isLoading && !currentLineup && !optimizedLineup ? (
        <FadeIn delay={0.2}>
          <Card className="p-8 relative overflow-hidden">
            <div className="space-y-4">
              <div className="h-12 bg-muted rounded animate-pulse" />
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-muted rounded animate-pulse" />
                ))}
              </div>
              <div className="h-64 bg-muted rounded animate-pulse" />
            </div>
            <Shimmer />
          </Card>
        </FadeIn>
      ) : currentLineup && optimizedLineup ? (
        <>
          <FadeIn delay={0.2}>
            <LineupComparison
              current={currentLineup}
              optimized={optimizedLineup}
            />
          </FadeIn>

          <FadeIn delay={0.3}>
            <LineupExplanationPanel
              explanation={optimizedLineup.explanation}
            />
          </FadeIn>

          <FadeIn delay={0.4}>
            <div className="flex justify-end">
              <ApplyOptimizationButton
                current={currentLineup}
                optimized={optimizedLineup}
                onApply={handleApplyOptimization}
                isLoading={isLoading}
              />
            </div>
          </FadeIn>
        </>
      ) : null}
    </div>
  )
}

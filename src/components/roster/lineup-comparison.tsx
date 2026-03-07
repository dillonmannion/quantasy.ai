'use client'

import { Card } from '@/components/ui/card'
import { FadeIn } from '@/components/animation'
import { LineupSlot } from './lineup-slot'
import type { LineupOutput } from '@/lib/algorithms/types'
import { cn } from '@/lib/utils'

interface LineupComparisonProps {
  current: LineupOutput
  optimized: LineupOutput
  className?: string
}

export function LineupComparison({
  current,
  optimized,
  className,
}: LineupComparisonProps) {
  const pointsDelta = optimized.projectedPoints - current.projectedPoints
  const hasImprovement = pointsDelta > 0
  const pointsDeltaPercent =
    current.projectedPoints > 0
      ? ((pointsDelta / current.projectedPoints) * 100).toFixed(1)
      : '0'
  const currentStarterSlotCount = Math.max(
    current.starters.length,
    current.explanation.inputsSummary.starterSlots
  )
  const optimizedStarterSlotCount = Math.max(
    optimized.starters.length,
    optimized.explanation.inputsSummary.starterSlots
  )

  return (
    <div className={cn('space-y-6', className)}>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FadeIn delay={0.1}>
           <Card className="p-4 text-center">
             <div className="text-xs text-muted-foreground uppercase font-medium mb-1">
               Current Lineup
             </div>
              <div className="text-2xl font-bold text-white">
               {current.projectedPoints.toFixed(1)}
             </div>
             <div className="text-xs text-muted-foreground">projected pts</div>
           </Card>
        </FadeIn>

        <FadeIn delay={0.2}>
           <Card className="p-4 text-center">
             <div className="text-xs text-muted-foreground uppercase font-medium mb-1">
               Optimized Lineup
             </div>
             <div className="text-2xl font-bold text-primary">
               {optimized.projectedPoints.toFixed(1)}
             </div>
             <div className="text-xs text-muted-foreground">projected pts</div>
           </Card>
        </FadeIn>

        <FadeIn delay={0.3}>
          <Card
            className={cn(
              'p-4 text-center',
              hasImprovement && 'border-primary/50 bg-primary/5'
            )}
          >
             <div className="text-xs text-muted-foreground uppercase font-medium mb-1">
               Improvement
             </div>
             <div
                className={cn(
                  'text-2xl font-bold',
                  hasImprovement ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {hasImprovement ? '+' : ''}
                {pointsDelta.toFixed(1)}
              </div>
              <div className="text-xs text-muted-foreground">
               {hasImprovement ? '+' : ''}
               {pointsDeltaPercent}%
             </div>
          </Card>
        </FadeIn>
      </div>

      {/* Side-by-side Lineups */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current Lineup */}
        <FadeIn delay={0.4}>
          <div className="space-y-3">
             <h3 className="font-semibold text-sm text-white">Current Lineup</h3>
            <div className="space-y-2">
              {Array.from({ length: currentStarterSlotCount }, (_, index) => {
                const player = current.starters[index] ?? null
                return (
                <LineupSlot
                  key={player?.playerId ?? `current-empty-${index}`}
                  slot={{
                    slotId: player ? `current-${player.playerId}` : `current-empty-${index}`,
                    slotType: 'starter',
                    allowedPositions: player?.eligiblePositions ?? [],
                  }}
                  player={player}
                  projectedPoints={player?.projectedPoints}
                />
                )
              })}
            </div>
          </div>
        </FadeIn>

        {/* Optimized Lineup */}
        <FadeIn delay={0.5}>
          <div className="space-y-3">
             <h3 className="font-semibold text-sm text-white">Optimized Lineup</h3>
            <div className="space-y-2">
              {Array.from({ length: optimizedStarterSlotCount }, (_, index) => {
                const player = optimized.starters[index] ?? null
                return (
                <LineupSlot
                  key={player?.playerId ?? `optimized-empty-${index}`}
                  slot={{
                    slotId: player ? `optimized-${player.playerId}` : `optimized-empty-${index}`,
                    slotType: 'starter',
                    allowedPositions: player?.eligiblePositions ?? [],
                  }}
                  player={player}
                  projectedPoints={player?.projectedPoints}
                  isOptimized={hasImprovement && !!player}
                />
                )
              })}
            </div>
          </div>
        </FadeIn>
      </div>

      {/* Bench Players */}
      {(current.bench.length > 0 || optimized.bench.length > 0) && (
        <FadeIn delay={0.6}>
          <Card className="p-4">
             <h3 className="font-semibold text-sm mb-3 text-white">Bench</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {optimized.bench.map((player) => (
                <LineupSlot
                  key={player.playerId}
                  slot={{
                    slotId: `bench-${player.playerId}`,
                    slotType: 'bench',
                    allowedPositions: player.eligiblePositions,
                  }}
                  player={player}
                  projectedPoints={player.projectedPoints}
                />
              ))}
            </div>
          </Card>
        </FadeIn>
      )}
    </div>
  )
}

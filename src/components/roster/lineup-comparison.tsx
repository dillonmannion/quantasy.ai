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
  const pointsDeltaPercent =
    current.projectedPoints > 0
      ? ((pointsDelta / current.projectedPoints) * 100).toFixed(1)
      : '0'

  return (
    <div className={cn('space-y-6', className)}>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FadeIn delay={0.1}>
          <Card className="p-4 text-center">
            <div className="text-xs text-muted-foreground uppercase font-medium mb-1">
              Current Lineup
            </div>
            <div className="text-2xl font-bold">
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
              pointsDelta > 0 && 'border-primary/50 bg-primary/5'
            )}
          >
            <div className="text-xs text-muted-foreground uppercase font-medium mb-1">
              Improvement
            </div>
            <div
              className={cn(
                'text-2xl font-bold',
                pointsDelta > 0 ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {pointsDelta > 0 ? '+' : ''}
              {pointsDelta.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground">
              {pointsDelta > 0 ? '+' : ''}
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
            <h3 className="font-semibold text-sm">Current Lineup</h3>
            <div className="space-y-2">
              {current.starters.map((player) => (
                <LineupSlot
                  key={player.playerId}
                  slot={{
                    slotId: `current-${player.playerId}`,
                    slotType: 'starter',
                    allowedPositions: player.eligiblePositions,
                  }}
                  player={player}
                  projectedPoints={player.projectedPoints}
                />
              ))}
            </div>
          </div>
        </FadeIn>

        {/* Optimized Lineup */}
        <FadeIn delay={0.5}>
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Optimized Lineup</h3>
            <div className="space-y-2">
              {optimized.starters.map((player) => (
                <LineupSlot
                  key={player.playerId}
                  slot={{
                    slotId: `optimized-${player.playerId}`,
                    slotType: 'starter',
                    allowedPositions: player.eligiblePositions,
                  }}
                  player={player}
                  projectedPoints={player.projectedPoints}
                  isOptimized={true}
                />
              ))}
            </div>
          </div>
        </FadeIn>
      </div>

      {/* Bench Players */}
      {(current.bench.length > 0 || optimized.bench.length > 0) && (
        <FadeIn delay={0.6}>
          <Card className="p-4">
            <h3 className="font-semibold text-sm mb-3">Bench</h3>
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

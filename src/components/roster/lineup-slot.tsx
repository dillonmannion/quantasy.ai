'use client'

import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { cn } from '@/lib/utils'
import type { AlgorithmPlayer } from '@/lib/algorithms/types'

interface LineupSlotProps {
  slot: {
    slotId: string
    slotType: 'starter' | 'bench'
    allowedPositions: string[]
  }
  player: AlgorithmPlayer | null
  projectedPoints?: number
  isOptimized?: boolean
  className?: string
}

export function LineupSlot({
  slot,
  player,
  projectedPoints,
  isOptimized = false,
  className,
}: LineupSlotProps) {
  return (
    <Card
      className={cn(
        'p-4 flex flex-col gap-2',
        isOptimized && 'border-primary/50 bg-primary/5',
        !player && 'border-dashed opacity-50',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
           <div className="text-xs font-medium text-white uppercase">
            {slot.slotType === 'starter' ? 'Starter' : 'Bench'}
          </div>
           <div className="text-sm text-muted-foreground">
             {slot.allowedPositions.join(', ')}
           </div>
        </div>
        {isOptimized && (
          <div className="text-xs font-semibold bg-primary text-primary-foreground px-2 py-1 rounded">
            Optimized
          </div>
        )}
      </div>

      {player ? (
        <div className="space-y-1">
          <div className="font-semibold text-sm">{player.fullName}</div>
           <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {player.position}
              {player.team && ` • ${player.team}`}
            </span>
            {projectedPoints !== undefined && (
              <span className="font-mono font-medium text-foreground">
                {projectedPoints.toFixed(1)} pts
              </span>
            )}
          </div>
          {player.injuryStatus && (
            <div className="text-sm text-destructive font-medium">
              {player.injuryStatus}
            </div>
          )}
        </div>
      ) : (
        <EmptyState
          variant="minimal"
          title="Empty slot"
          className="py-2"
        />
      )}
    </Card>
  )
}

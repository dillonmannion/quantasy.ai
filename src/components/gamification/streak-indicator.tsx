'use client'

import { Flame } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { StreakType } from '@/lib/gamification/streaks'

interface StreakIndicatorProps {
  streakType: StreakType
  currentStreak: number
  isAtRisk?: boolean
  variant?: 'sm' | 'lg'
  className?: string
}

const streakLabels: Record<StreakType, string> = {
  DAILY_LOGIN: 'Daily Login',
  WEEKLY_LINEUP_REVIEW: 'Weekly Review',
  DRAFT_RESEARCH: 'Draft Research',
  WAIVER_WIRE_WEDNESDAY: 'Waiver Wednesday',
}

export function StreakIndicator({
  streakType,
  currentStreak,
  isAtRisk = false,
  variant = 'sm',
  className,
}: StreakIndicatorProps) {
  const label = streakLabels[streakType]

  if (variant === 'sm') {
    return (
      <Badge
        variant={isAtRisk ? 'destructive' : 'secondary'}
        className={cn('gap-1', className)}
      >
        <Flame className={cn('w-3 h-3', isAtRisk && 'animate-pulse')} />
        <span className="font-bold">{currentStreak}</span>
      </Badge>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2 p-4 rounded-lg border',
        isAtRisk
          ? 'border-destructive bg-destructive/10'
          : 'border-border bg-card',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <Flame
          className={cn(
            'w-8 h-8',
            isAtRisk ? 'text-destructive animate-pulse' : 'text-orange-500'
          )}
        />
        <span className="text-4xl font-black">{currentStreak}</span>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold">{label}</p>
        {isAtRisk && (
          <p className="text-sm text-destructive mt-1">Streak at risk!</p>
        )}
      </div>
    </div>
  )
}

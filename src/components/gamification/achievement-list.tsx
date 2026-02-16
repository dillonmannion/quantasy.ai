'use client'

import { AchievementBadge } from './achievement-badge'
import type { AchievementRecord } from '@/lib/gamification/types'
import { cn } from '@/lib/utils'

interface AchievementListProps {
  achievements: AchievementRecord[]
  showLocked?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function AchievementList({
  achievements,
  showLocked = true,
  size = 'md',
  className,
}: AchievementListProps) {
  const displayAchievements = showLocked
    ? achievements
    : achievements.filter(a => a.unlocked_at)

  if (displayAchievements.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No achievements yet. Keep playing to unlock them!
      </div>
    )
  }

  return (
    <div
      className={cn(
        'grid gap-4',
        size === 'sm' && 'grid-cols-6 md:grid-cols-8',
        size === 'md' && 'grid-cols-4 md:grid-cols-6',
        size === 'lg' && 'grid-cols-2 md:grid-cols-4',
        className
      )}
    >
      {displayAchievements.map((achievement) => (
        <AchievementBadge
          key={achievement.id}
          achievement={achievement}
          size={size}
          showLabel={size !== 'sm'}
        />
      ))}
    </div>
  )
}

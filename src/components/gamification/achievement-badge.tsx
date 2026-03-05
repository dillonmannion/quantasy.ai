'use client'

import { 
  Book, 
  Trophy, 
  CheckCircle, 
  Flag, 
  ArrowLeftRight, 
  Zap, 
  Calendar, 
  Flame,
  type LucideIcon
} from 'lucide-react'
import { Kaching } from '@/components/animation'
import { cn } from '@/lib/utils'
import type { AchievementRecord, AchievementType } from '@/lib/gamification/types'
import { useState, useEffect } from 'react'

interface AchievementBadgeProps {
  achievement: AchievementRecord
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

const achievementIcons: Record<AchievementType, LucideIcon> = {
  READ_10_EXPLANATIONS: Book,
  MADE_FIRST_DRAFT_PICK: Trophy,
  VERIFIED_5_VBD: CheckCircle,
  COMPLETED_DRAFT: Flag,
  MADE_FIRST_TRADE: ArrowLeftRight,
  APPLIED_OPTIMAL_LINEUP: Zap,
  WEEK_1_REVIEW: Calendar,
  SEVEN_DAY_STREAK: Flame,
}

const achievementNames: Record<AchievementType, string> = {
  READ_10_EXPLANATIONS: 'Curious Mind',
  MADE_FIRST_DRAFT_PICK: 'First Pick',
  VERIFIED_5_VBD: 'VBD Expert',
  COMPLETED_DRAFT: 'Draft Complete',
  MADE_FIRST_TRADE: 'Deal Maker',
  APPLIED_OPTIMAL_LINEUP: 'Optimizer',
  WEEK_1_REVIEW: 'Week 1 Ready',
  SEVEN_DAY_STREAK: 'Dedicated',
}

const sizeClasses = {
  sm: {
    container: 'w-12 h-12',
    icon: 'w-6 h-6',
    text: 'text-xs',
  },
  md: {
    container: 'w-16 h-16',
    icon: 'w-8 h-8',
    text: 'text-sm',
  },
  lg: {
    container: 'w-24 h-24',
    icon: 'w-12 h-12',
    text: 'text-base',
  },
}

export function AchievementBadge({
  achievement,
  size = 'md',
  showLabel = false,
  className,
}: AchievementBadgeProps) {
  const Icon = achievementIcons[achievement.achievement_type]
  const name = achievementNames[achievement.achievement_type]
  const isLocked = !achievement.unlocked_at
  
  const computeIsRecent = () => {
    if (!achievement.unlocked_at) return false
    return Date.now() - new Date(achievement.unlocked_at).getTime() < 24 * 60 * 60 * 1000
  }
  
  const [isRecent] = useState(computeIsRecent)
  const [showCelebration, setShowCelebration] = useState(computeIsRecent)

  useEffect(() => {
    if (showCelebration) {
      const timer = setTimeout(() => setShowCelebration(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [showCelebration])

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div
        className={cn(
          'card-balatro flex items-center justify-center relative',
          sizeClasses[size].container,
          isLocked && 'opacity-50 grayscale'
        )}
      >
        <Icon className={cn(sizeClasses[size].icon, 'text-primary')} />
        {isRecent && (
          <div className="absolute -top-1 -right-1">
            <span className="flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
            </span>
          </div>
        )}
      </div>
      
      {showLabel && (
        <div className="text-center">
          <p className={cn('font-semibold', sizeClasses[size].text)}>
            {name}
          </p>
          {achievement.unlocked_at && (
            <p className="text-sm text-muted-foreground">
              {new Date(achievement.unlocked_at).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      <Kaching 
        show={showCelebration} 
        value="🏆" 
        label={name}
        variant="purple"
        onComplete={() => setShowCelebration(false)}
      />
    </div>
  )
}

'use client'

import { toast } from 'sonner'
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
import type { AchievementType } from '@/lib/gamification/types'

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

const achievementMessages: Record<AchievementType, { title: string; description: string }> = {
  READ_10_EXPLANATIONS: {
    title: 'Curious Mind Unlocked!',
    description: 'You\'ve read 10 AI explanations',
  },
  MADE_FIRST_DRAFT_PICK: {
    title: 'First Pick!',
    description: 'You made your first draft pick',
  },
  VERIFIED_5_VBD: {
    title: 'VBD Expert!',
    description: 'You\'ve verified 5 VBD calculations',
  },
  COMPLETED_DRAFT: {
    title: 'Draft Complete!',
    description: 'You completed your first draft',
  },
  MADE_FIRST_TRADE: {
    title: 'Deal Maker!',
    description: 'You made your first trade',
  },
  APPLIED_OPTIMAL_LINEUP: {
    title: 'Optimizer!',
    description: 'You applied an optimal lineup',
  },
  WEEK_1_REVIEW: {
    title: 'Week 1 Ready!',
    description: 'You reviewed your lineup for week 1',
  },
  SEVEN_DAY_STREAK: {
    title: 'Dedicated!',
    description: 'You maintained a 7-day streak',
  },
}

export function showAchievementToast(achievementType: AchievementType) {
  const Icon = achievementIcons[achievementType]
  const message = achievementMessages[achievementType]

  return toast.success(message.title, {
    description: message.description,
    icon: <Icon className="w-5 h-5" />,
    duration: 5000,
    className: 'achievement-toast',
  })
}

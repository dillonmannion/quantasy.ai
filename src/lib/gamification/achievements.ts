import { createClient } from '@/lib/supabase/client'
import { COUNTER_THRESHOLDS, incrementCounterValue } from './counters'
import type { AchievementRecord, AchievementType, CounterType } from './types'

export async function checkAchievement(userId: string, type: AchievementType): Promise<boolean> {
  if (!userId) return false
  const supabase = createClient()
  const { data, error } = await supabase
    .from('achievements')
    .select('id')
    .eq('user_id', userId)
    .eq('achievement_type', type)
    .maybeSingle()

  if (error) {
    console.error('[Gamification] Failed to check achievement:', error)
    return false
  }

  return Boolean(data?.id)
}

export async function unlockAchievement(
  userId: string,
  type: AchievementType,
  metadata: Record<string, unknown> = {}
): Promise<boolean> {
  if (!userId) return false
  const supabase = createClient()
  const { error } = await supabase
    .from('achievements')
    .upsert(
      {
        user_id: userId,
        achievement_type: type,
        metadata,
      },
      { onConflict: 'user_id,achievement_type', ignoreDuplicates: true }
    )

  if (error) {
    console.error('[Gamification] Failed to unlock achievement:', error)
    return false
  }

  return true
}

export async function getUserAchievements(userId: string): Promise<AchievementRecord[]> {
  if (!userId) return []
  const supabase = createClient()
  const { data, error } = await supabase
    .from('achievements')
    .select('id, user_id, achievement_type, unlocked_at, metadata')
    .eq('user_id', userId)
    .order('unlocked_at', { ascending: true })

  if (error) {
    console.error('[Gamification] Failed to load achievements:', error)
    return []
  }

  return data ?? []
}

export async function incrementCounter(
  userId: string,
  counterType: CounterType
): Promise<{ count: number; achievementUnlocked: AchievementType | null } | null> {
  if (!userId) return null
  const counters = await incrementCounterValue(userId, counterType)
  if (!counters) return null

  const counterValue = counters[counterType] ?? 0
  const threshold = COUNTER_THRESHOLDS[counterType]

  if (counterValue >= threshold.threshold) {
    await unlockAchievement(userId, threshold.achievement, {
      counterType,
      count: counterValue,
    })
  }

  return {
    count: counterValue,
    achievementUnlocked: counterValue >= threshold.threshold ? threshold.achievement : null,
  }
}

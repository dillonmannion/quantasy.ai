import { createClient } from '@/lib/supabase/client'
import type { AchievementType, CounterType, GamificationCounters } from './types'

export const COUNTER_THRESHOLDS: Record<
  CounterType,
  { achievement: AchievementType; threshold: number }
> = {
  explanation_views: { achievement: 'READ_10_EXPLANATIONS', threshold: 10 },
  vbd_verifications: { achievement: 'VERIFIED_5_VBD', threshold: 5 },
}

function normalizeCounters(data: unknown): GamificationCounters | null {
  if (!data || typeof data !== 'object') return null
  const record = data as Record<string, unknown>
  return {
    explanation_views: typeof record.explanation_views === 'number' ? record.explanation_views : 0,
    vbd_verifications: typeof record.vbd_verifications === 'number' ? record.vbd_verifications : 0,
  }
}

export async function incrementCounterValue(
  userId: string,
  counterType: CounterType,
  amount = 1
): Promise<GamificationCounters | null> {
  if (!userId) return null
  const supabase = createClient()
  const { data, error } = await supabase.rpc('increment_gamification_counter', {
    target_user_id: userId,
    counter_key: counterType,
    increment_by: amount,
  })

  if (error) {
    console.error('[Gamification] Failed to increment counter:', error)
    return null
  }

  return normalizeCounters(data)
}

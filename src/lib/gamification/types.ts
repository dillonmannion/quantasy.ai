export const ACHIEVEMENT_TYPES = [
  'READ_10_EXPLANATIONS',
  'MADE_FIRST_DRAFT_PICK',
  'VERIFIED_5_VBD',
  'COMPLETED_DRAFT',
  'MADE_FIRST_TRADE',
  'APPLIED_OPTIMAL_LINEUP',
  'WEEK_1_REVIEW',
  'SEVEN_DAY_STREAK',
] as const

export type AchievementType = (typeof ACHIEVEMENT_TYPES)[number]

export const COUNTER_TYPES = ['explanation_views', 'vbd_verifications'] as const

export type CounterType = (typeof COUNTER_TYPES)[number]

export type GamificationCounters = Record<CounterType, number>

export type AchievementRecord = {
  id: string
  user_id: string
  achievement_type: AchievementType
  unlocked_at: string
  metadata: Record<string, unknown> | null
}

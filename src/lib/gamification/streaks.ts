import { createClient } from '@/lib/supabase/client'

export const STREAK_TYPES = [
  'DAILY_LOGIN',
  'WEEKLY_LINEUP_REVIEW',
  'DRAFT_RESEARCH',
  'WAIVER_WIRE_WEDNESDAY',
] as const

export type StreakType = (typeof STREAK_TYPES)[number]

export type StreakRecord = {
  id: string
  user_id: string
  streak_type: StreakType
  current_streak: number
  longest_streak: number
  last_activity_at: string | null
  streak_start_date: string | null
}

const GRACE_HOURS = 4
const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS
const WEEK_MS = 7 * DAY_MS
const GRACE_MS = GRACE_HOURS * HOUR_MS

function parseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function getDailyPeriodIndex(date: Date): number {
  const shiftedMs = date.getTime() - GRACE_MS
  return Math.floor(shiftedMs / DAY_MS)
}

function getWeeklyPeriodIndex(date: Date): number {
  const shifted = new Date(date.getTime() - GRACE_MS)
  const dayOfWeek = shifted.getUTCDay()
  const diffToMonday = (dayOfWeek + 6) % 7
  const midnightMs = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate()
  )
  const mondayMs = midnightMs - diffToMonday * DAY_MS
  return Math.floor(mondayMs / WEEK_MS)
}

function getPeriodIndex(date: Date, streakType: StreakType): number {
  return streakType === 'DAILY_LOGIN' ? getDailyPeriodIndex(date) : getWeeklyPeriodIndex(date)
}

function isSamePeriod(lastDate: Date, now: Date, streakType: StreakType): boolean {
  return getPeriodIndex(lastDate, streakType) === getPeriodIndex(now, streakType)
}

function getMaxGapMs(streakType: StreakType): number {
  return streakType === 'DAILY_LOGIN' ? (24 * HOUR_MS + GRACE_MS) : 7 * DAY_MS + GRACE_MS
}

export function isStreakBroken(lastActivity: string | Date | null, streakType: StreakType): boolean {
  const lastDate = parseDate(lastActivity)
  if (!lastDate) return true
  const now = new Date()

  if (isSamePeriod(lastDate, now, streakType)) return false

  const elapsedMs = now.getTime() - lastDate.getTime()
  if (elapsedMs < 0) return false

  return elapsedMs > getMaxGapMs(streakType)
}

export async function updateStreak(
  userId: string,
  streakType: StreakType
): Promise<StreakRecord | null> {
  if (!userId) return null
  const supabase = createClient()
  const { data: existing, error } = await supabase
    .from('user_streaks')
    .select(
      'id, user_id, streak_type, current_streak, longest_streak, last_activity_at, streak_start_date'
    )
    .eq('user_id', userId)
    .eq('streak_type', streakType)
    .maybeSingle()

  if (error) {
    console.error('[Gamification] Failed to load streak:', error)
    return null
  }

  const now = new Date()
  const nowIso = now.toISOString()
  const lastDate = parseDate(existing?.last_activity_at)

  const samePeriod = lastDate ? isSamePeriod(lastDate, now, streakType) : false
  const broken = lastDate ? isStreakBroken(lastDate, streakType) : true
  const elapsedMs = lastDate ? now.getTime() - lastDate.getTime() : null
  const inFuture = typeof elapsedMs === 'number' && elapsedMs < 0

  let currentStreak = existing?.current_streak ?? 0
  let longestStreak = existing?.longest_streak ?? 0
  let streakStartDate = existing?.streak_start_date ?? null

  const shouldIncrement = Boolean(lastDate && !samePeriod && !inFuture && !broken)
  const shouldReset = Boolean(lastDate && !samePeriod && !inFuture && broken)

  if (!lastDate) {
    currentStreak = 1
    longestStreak = Math.max(longestStreak, currentStreak)
    streakStartDate = nowIso
  } else if (shouldIncrement) {
    currentStreak = currentStreak > 0 ? currentStreak + 1 : 1
    longestStreak = Math.max(longestStreak, currentStreak)
    if (!streakStartDate) {
      streakStartDate = lastDate.toISOString()
    }
  } else if (shouldReset) {
    currentStreak = 1
    longestStreak = Math.max(longestStreak, currentStreak)
    streakStartDate = nowIso
  }

  const { data, error: upsertError } = await supabase
    .from('user_streaks')
    .upsert(
      {
        user_id: userId,
        streak_type: streakType,
        current_streak: currentStreak,
        longest_streak: longestStreak,
        last_activity_at: nowIso,
        streak_start_date: streakStartDate,
      },
      { onConflict: 'user_id,streak_type' }
    )
    .select(
      'id, user_id, streak_type, current_streak, longest_streak, last_activity_at, streak_start_date'
    )
    .maybeSingle()

  if (upsertError) {
    console.error('[Gamification] Failed to update streak:', upsertError)
    return null
  }

  return data ?? null
}

export async function getUserStreaks(userId: string): Promise<StreakRecord[]> {
  if (!userId) return []
  const supabase = createClient()
  const { data, error } = await supabase
    .from('user_streaks')
    .select(
      'id, user_id, streak_type, current_streak, longest_streak, last_activity_at, streak_start_date'
    )
    .eq('user_id', userId)
    .order('streak_type', { ascending: true })

  if (error) {
    console.error('[Gamification] Failed to load streaks:', error)
    return []
  }

  return data ?? []
}

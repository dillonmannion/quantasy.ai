import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  isStreakBroken,
  updateStreak,
  getUserStreaks,
  STREAK_TYPES,
  type StreakRecord,
  type StreakType,
} from '@/lib/gamification/streaks'
import { createClient } from '@/lib/supabase/client'

vi.mock('@/lib/supabase/client')

function createMockSupabaseClient() {
  return {
    from: vi.fn(),
  }
}

function createMockStreakRecord(
  id: string = 'streak-1',
  userId: string = 'user-1',
  streakType: StreakType = 'DAILY_LOGIN',
  currentStreak: number = 5,
  longestStreak: number = 10,
  lastActivityAt: string | null = '2024-01-01T12:00:00Z',
  streakStartDate: string | null = '2024-01-01T00:00:00Z'
): StreakRecord {
  return {
    id,
    user_id: userId,
    streak_type: streakType,
    current_streak: currentStreak,
    longest_streak: longestStreak,
    last_activity_at: lastActivityAt,
    streak_start_date: streakStartDate,
  }
}

describe('Gamification Streaks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('isStreakBroken', () => {
    it('should return true when lastActivity is null', () => {
      const result = isStreakBroken(null, 'DAILY_LOGIN')
      expect(result).toBe(true)
    })

    it('should return true when lastActivity is undefined', () => {
      const result = isStreakBroken(undefined as any, 'DAILY_LOGIN')
      expect(result).toBe(true)
    })

    it('should return true when lastActivity is empty string', () => {
      const result = isStreakBroken('', 'DAILY_LOGIN')
      expect(result).toBe(true)
    })

    it('should return false when activity is in same daily period', () => {
      const now = new Date()
      const sameDay = new Date(now.getTime() - 2 * 60 * 60 * 1000) // 2 hours ago
      const result = isStreakBroken(sameDay, 'DAILY_LOGIN')
      expect(result).toBe(false)
    })

    it('should return false when activity is in same weekly period', () => {
      const now = new Date()
      const sameWeek = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
      const result = isStreakBroken(sameWeek, 'WEEKLY_LINEUP_REVIEW')
      expect(result).toBe(false)
    })

    it('should return false when activity is within grace period for daily streak', () => {
      const now = new Date()
      const withinGrace = new Date(now.getTime() - 25 * 60 * 60 * 1000) // 25 hours ago
      const result = isStreakBroken(withinGrace, 'DAILY_LOGIN')
      expect(result).toBe(false)
    })

    it('should return true when activity exceeds grace period for daily streak', () => {
      const now = new Date()
      const exceedsGrace = new Date(now.getTime() - 29 * 60 * 60 * 1000) // 29 hours ago
      const result = isStreakBroken(exceedsGrace, 'DAILY_LOGIN')
      expect(result).toBe(true)
    })

    it('should return false when activity is within grace period for weekly streak', () => {
      const now = new Date()
      const withinGrace = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000) // 6 days ago
      const result = isStreakBroken(withinGrace, 'WEEKLY_LINEUP_REVIEW')
      expect(result).toBe(false)
    })

    it('should return true when activity exceeds grace period for weekly streak', () => {
      const now = new Date()
      const exceedsGrace = new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000) // 9 days ago
      const result = isStreakBroken(exceedsGrace, 'WEEKLY_LINEUP_REVIEW')
      expect(result).toBe(true)
    })

    it('should return false when activity is in future (clock skew)', () => {
      const now = new Date()
      const future = new Date(now.getTime() + 1 * 60 * 60 * 1000) // 1 hour in future
      const result = isStreakBroken(future, 'DAILY_LOGIN')
      expect(result).toBe(false)
    })

    it('should handle Date object input', () => {
      const now = new Date()
      const yesterday = new Date(now.getTime() - 12 * 60 * 60 * 1000)
      const result = isStreakBroken(yesterday, 'DAILY_LOGIN')
      expect(result).toBe(false)
    })

    it('should handle ISO string input', () => {
      const now = new Date()
      const yesterday = new Date(now.getTime() - 12 * 60 * 60 * 1000)
      const result = isStreakBroken(yesterday.toISOString(), 'DAILY_LOGIN')
      expect(result).toBe(false)
    })

    it('should return true for invalid date string', () => {
      const result = isStreakBroken('invalid-date', 'DAILY_LOGIN')
      expect(result).toBe(true)
    })

    it('should handle all streak types', () => {
      const now = new Date()
      const recentActivity = new Date(now.getTime() - 12 * 60 * 60 * 1000)

      for (const streakType of STREAK_TYPES) {
        const result = isStreakBroken(recentActivity, streakType)
        expect(result).toBe(false)
      }
    })
  })

  describe('updateStreak', () => {
    it('should return null when userId is empty', async () => {
      const result = await updateStreak('', 'DAILY_LOGIN')
      expect(result).toBeNull()
      expect(createClient).not.toHaveBeenCalled()
    })

    it('should create new streak when no existing record', async () => {
      const mockSupabase = createMockSupabaseClient()
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn()
          .mockResolvedValueOnce({
            data: null,
            error: null,
          })
          .mockResolvedValueOnce({
            data: createMockStreakRecord('streak-1', 'user-1', 'DAILY_LOGIN', 1, 1),
            error: null,
          }),
        upsert: vi.fn().mockReturnThis(),
      }
      mockSupabase.from.mockReturnValue(mockQuery)
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      const result = await updateStreak('user-1', 'DAILY_LOGIN')

      expect(result).not.toBeNull()
      expect(result?.current_streak).toBe(1)
      expect(result?.longest_streak).toBe(1)
      expect(result?.streak_start_date).not.toBeNull()
      expect(mockSupabase.from).toHaveBeenCalledWith('user_streaks')
    })

    it('should increment streak when activity in new period', async () => {
      const mockSupabase = createMockSupabaseClient()
      const yesterday = new Date(new Date().getTime() - 25 * 60 * 60 * 1000)
      const existing = createMockStreakRecord(
        'streak-1',
        'user-1',
        'DAILY_LOGIN',
        5,
        10,
        yesterday.toISOString(),
        '2024-01-01T00:00:00Z'
      )

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn()
          .mockResolvedValueOnce({
            data: existing,
            error: null,
          })
          .mockResolvedValueOnce({
            data: { ...existing, current_streak: 6, longest_streak: 10 },
            error: null,
          }),
        upsert: vi.fn().mockReturnThis(),
      }
      mockSupabase.from.mockReturnValue(mockQuery)
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      const result = await updateStreak('user-1', 'DAILY_LOGIN')

      expect(result?.current_streak).toBe(6)
      expect(result?.longest_streak).toBe(10)
    })

    it('should reset streak when broken', async () => {
      const mockSupabase = createMockSupabaseClient()
      const longAgo = new Date(new Date().getTime() - 30 * 60 * 60 * 1000) // 30 hours ago
      const existing = createMockStreakRecord(
        'streak-1',
        'user-1',
        'DAILY_LOGIN',
        5,
        10,
        longAgo.toISOString(),
        '2024-01-01T00:00:00Z'
      )

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn()
          .mockResolvedValueOnce({
            data: existing,
            error: null,
          })
          .mockResolvedValueOnce({
            data: { ...existing, current_streak: 1, longest_streak: 10 },
            error: null,
          }),
        upsert: vi.fn().mockReturnThis(),
      }
      mockSupabase.from.mockReturnValue(mockQuery)
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      const result = await updateStreak('user-1', 'DAILY_LOGIN')

      expect(result?.current_streak).toBe(1)
      expect(result?.longest_streak).toBe(10)
    })

    it('should not increment when activity in same period', async () => {
      const mockSupabase = createMockSupabaseClient()
      const twoHoursAgo = new Date(new Date().getTime() - 2 * 60 * 60 * 1000)
      const existing = createMockStreakRecord(
        'streak-1',
        'user-1',
        'DAILY_LOGIN',
        5,
        10,
        twoHoursAgo.toISOString(),
        '2024-01-01T00:00:00Z'
      )

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn()
          .mockResolvedValueOnce({
            data: existing,
            error: null,
          })
          .mockResolvedValueOnce({
            data: { ...existing, current_streak: 5, longest_streak: 10 },
            error: null,
          }),
        upsert: vi.fn().mockReturnThis(),
      }
      mockSupabase.from.mockReturnValue(mockQuery)
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      const result = await updateStreak('user-1', 'DAILY_LOGIN')

      expect(result?.current_streak).toBe(5)
    })

    it('should update longest_streak when current exceeds it', async () => {
      const mockSupabase = createMockSupabaseClient()
      const yesterday = new Date(new Date().getTime() - 25 * 60 * 60 * 1000)
      const existing = createMockStreakRecord(
        'streak-1',
        'user-1',
        'DAILY_LOGIN',
        9,
        9,
        yesterday.toISOString(),
        '2024-01-01T00:00:00Z'
      )

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn()
          .mockResolvedValueOnce({
            data: existing,
            error: null,
          })
          .mockResolvedValueOnce({
            data: { ...existing, current_streak: 10, longest_streak: 10 },
            error: null,
          }),
        upsert: vi.fn().mockReturnThis(),
      }
      mockSupabase.from.mockReturnValue(mockQuery)
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      const result = await updateStreak('user-1', 'DAILY_LOGIN')

      expect(result?.current_streak).toBe(10)
      expect(result?.longest_streak).toBe(10)
    })

    it('should set streak_start_date on first activity', async () => {
      const mockSupabase = createMockSupabaseClient()
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
        upsert: vi.fn().mockReturnThis(),
      }
      mockSupabase.from.mockReturnValue(mockQuery)
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      const result = await updateStreak('user-1', 'DAILY_LOGIN')

      expect(result?.streak_start_date).not.toBeNull()
    })

    it('should preserve streak_start_date when incrementing', async () => {
      const mockSupabase = createMockSupabaseClient()
      const startDate = '2024-01-01T00:00:00Z'
      const yesterday = new Date(new Date().getTime() - 25 * 60 * 60 * 1000)
      const existing = createMockStreakRecord(
        'streak-1',
        'user-1',
        'DAILY_LOGIN',
        5,
        10,
        yesterday.toISOString(),
        startDate
      )

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn()
          .mockResolvedValueOnce({
            data: existing,
            error: null,
          })
          .mockResolvedValueOnce({
            data: { ...existing, current_streak: 6, streak_start_date: startDate },
            error: null,
          }),
        upsert: vi.fn().mockReturnThis(),
      }
      mockSupabase.from.mockReturnValue(mockQuery)
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      const result = await updateStreak('user-1', 'DAILY_LOGIN')

      expect(result?.streak_start_date).toBe(startDate)
    })

    it('should update streak_start_date when resetting', async () => {
      const mockSupabase = createMockSupabaseClient()
      const longAgo = new Date(new Date().getTime() - 30 * 60 * 60 * 1000)
      const existing = createMockStreakRecord(
        'streak-1',
        'user-1',
        'DAILY_LOGIN',
        5,
        10,
        longAgo.toISOString(),
        '2024-01-01T00:00:00Z'
      )

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn()
          .mockResolvedValueOnce({
            data: existing,
            error: null,
          })
          .mockResolvedValueOnce({
            data: { ...existing, current_streak: 1, streak_start_date: new Date().toISOString() },
            error: null,
          }),
        upsert: vi.fn().mockReturnThis(),
      }
      mockSupabase.from.mockReturnValue(mockQuery)
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      const result = await updateStreak('user-1', 'DAILY_LOGIN')

      expect(result?.streak_start_date).not.toBeNull()
    })

    it('should return null on select error', async () => {
      const mockSupabase = createMockSupabaseClient()
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('Database error'),
        }),
      }
      mockSupabase.from.mockReturnValue(mockQuery)
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      const result = await updateStreak('user-1', 'DAILY_LOGIN')

      expect(result).toBeNull()
    })

    it('should return null on upsert error', async () => {
      const mockSupabase = createMockSupabaseClient()
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn()
          .mockResolvedValueOnce({
            data: null,
            error: null,
          })
          .mockResolvedValueOnce({
            data: null,
            error: new Error('Upsert failed'),
          }),
        upsert: vi.fn().mockReturnThis(),
      }
      mockSupabase.from.mockReturnValue(mockQuery)
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      const result = await updateStreak('user-1', 'DAILY_LOGIN')

      expect(result).toBeNull()
    })

    it('should handle all streak types', async () => {
      for (const streakType of STREAK_TYPES) {
        vi.clearAllMocks()
        const mockSupabase = createMockSupabaseClient()
        const mockQuery = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn()
            .mockResolvedValueOnce({
              data: null,
              error: null,
            })
            .mockResolvedValueOnce({
              data: createMockStreakRecord('streak-1', 'user-1', streakType, 1, 1),
              error: null,
            }),
          upsert: vi.fn().mockReturnThis(),
        }
        mockSupabase.from.mockReturnValue(mockQuery)
        vi.mocked(createClient).mockReturnValue(mockSupabase as any)

        const result = await updateStreak('user-1', streakType)
        expect(result).not.toBeNull()
      }
    })

    it('should call upsert with correct conflict resolution', async () => {
      const mockSupabase = createMockSupabaseClient()
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
        upsert: vi.fn().mockReturnThis(),
      }
      mockSupabase.from.mockReturnValue(mockQuery)
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      await updateStreak('user-1', 'DAILY_LOGIN')

      expect(mockQuery.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
          streak_type: 'DAILY_LOGIN',
        }),
        { onConflict: 'user_id,streak_type' }
      )
    })

    it('should return null when upsert returns null data', async () => {
      const mockSupabase = createMockSupabaseClient()
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn()
          .mockResolvedValueOnce({
            data: null,
            error: null,
          })
          .mockResolvedValueOnce({
            data: null,
            error: null,
          }),
        upsert: vi.fn().mockReturnThis(),
      }
      mockSupabase.from.mockReturnValue(mockQuery)
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      const result = await updateStreak('user-1', 'DAILY_LOGIN')

      expect(result).toBeNull()
    })
  })

  describe('getUserStreaks', () => {
    it('should return empty array when userId is empty', async () => {
      const result = await getUserStreaks('')

      expect(result).toEqual([])
      expect(createClient).not.toHaveBeenCalled()
    })

    it('should return all streaks for user ordered by streak_type', async () => {
      const mockSupabase = createMockSupabaseClient()
      const streaks = [
        createMockStreakRecord('streak-1', 'user-1', 'DAILY_LOGIN', 5, 10),
        createMockStreakRecord('streak-2', 'user-1', 'WEEKLY_LINEUP_REVIEW', 3, 5),
        createMockStreakRecord('streak-3', 'user-1', 'DRAFT_RESEARCH', 2, 4),
      ]
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: streaks,
          error: null,
        }),
      }
      mockSupabase.from.mockReturnValue(mockQuery)
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      const result = await getUserStreaks('user-1')

      expect(result).toEqual(streaks)
      expect(mockSupabase.from).toHaveBeenCalledWith('user_streaks')
      expect(mockQuery.select).toHaveBeenCalledWith(
        'id, user_id, streak_type, current_streak, longest_streak, last_activity_at, streak_start_date'
      )
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-1')
      expect(mockQuery.order).toHaveBeenCalledWith('streak_type', { ascending: true })
    })

    it('should return empty array when user has no streaks', async () => {
      const mockSupabase = createMockSupabaseClient()
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }
      mockSupabase.from.mockReturnValue(mockQuery)
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      const result = await getUserStreaks('user-1')

      expect(result).toEqual([])
    })

    it('should return empty array on database error', async () => {
      const mockSupabase = createMockSupabaseClient()
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('Database error'),
        }),
      }
      mockSupabase.from.mockReturnValue(mockQuery)
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      const result = await getUserStreaks('user-1')

      expect(result).toEqual([])
    })

    it('should handle null data gracefully', async () => {
      const mockSupabase = createMockSupabaseClient()
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }
      mockSupabase.from.mockReturnValue(mockQuery)
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      const result = await getUserStreaks('user-1')

      expect(result).toEqual([])
    })

    it('should include all streak properties', async () => {
      const mockSupabase = createMockSupabaseClient()
      const streak = createMockStreakRecord(
        'streak-1',
        'user-1',
        'DAILY_LOGIN',
        5,
        10,
        '2024-01-01T12:00:00Z',
        '2024-01-01T00:00:00Z'
      )
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [streak],
          error: null,
        }),
      }
      mockSupabase.from.mockReturnValue(mockQuery)
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      const result = await getUserStreaks('user-1')

      expect(result[0]).toEqual(streak)
      expect(result[0].id).toBe('streak-1')
      expect(result[0].user_id).toBe('user-1')
      expect(result[0].streak_type).toBe('DAILY_LOGIN')
      expect(result[0].current_streak).toBe(5)
      expect(result[0].longest_streak).toBe(10)
      expect(result[0].last_activity_at).toBe('2024-01-01T12:00:00Z')
      expect(result[0].streak_start_date).toBe('2024-01-01T00:00:00Z')
    })

    it('should handle streaks with null last_activity_at', async () => {
      const mockSupabase = createMockSupabaseClient()
      const streak = createMockStreakRecord(
        'streak-1',
        'user-1',
        'DAILY_LOGIN',
        0,
        0,
        null,
        null
      )
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [streak],
          error: null,
        }),
      }
      mockSupabase.from.mockReturnValue(mockQuery)
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      const result = await getUserStreaks('user-1')

      expect(result[0].last_activity_at).toBeNull()
      expect(result[0].streak_start_date).toBeNull()
    })

    it('should return multiple streaks in correct order', async () => {
      const mockSupabase = createMockSupabaseClient()
      const streaks = [
        createMockStreakRecord('streak-1', 'user-1', 'DAILY_LOGIN', 5, 10),
        createMockStreakRecord('streak-2', 'user-1', 'DRAFT_RESEARCH', 2, 4),
        createMockStreakRecord('streak-3', 'user-1', 'WAIVER_WIRE_WEDNESDAY', 1, 3),
        createMockStreakRecord('streak-4', 'user-1', 'WEEKLY_LINEUP_REVIEW', 3, 5),
      ]
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: streaks,
          error: null,
        }),
      }
      mockSupabase.from.mockReturnValue(mockQuery)
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      const result = await getUserStreaks('user-1')

      expect(result).toHaveLength(4)
      expect(result).toEqual(streaks)
    })
  })
})

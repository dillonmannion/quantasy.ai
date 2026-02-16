import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  checkAchievement,
  unlockAchievement,
  getUserAchievements,
  incrementCounter,
} from '@/lib/gamification/achievements'
import { incrementCounterValue } from '@/lib/gamification/counters'
import { createClient } from '@/lib/supabase/client'
import type { AchievementRecord, AchievementType, CounterType, GamificationCounters } from '@/lib/gamification/types'

vi.mock('@/lib/supabase/client')

vi.mock('@/lib/gamification/counters', async () => {
  const actual = await vi.importActual('@/lib/gamification/counters')
  return {
    ...actual,
    incrementCounterValue: vi.fn(),
  }
})

function createMockSupabaseClient() {
  return {
    from: vi.fn(),
    rpc: vi.fn(),
  }
}

function createMockAchievementRecord(
  id: string = 'ach-1',
  userId: string = 'user-1',
  type: AchievementType = 'READ_10_EXPLANATIONS',
  unlockedAt: string = '2024-01-01T00:00:00Z',
  metadata: Record<string, unknown> | null = null
): AchievementRecord {
  return {
    id,
    user_id: userId,
    achievement_type: type,
    unlocked_at: unlockedAt,
    metadata,
  }
}

function createMockCounters(
  explanationViews: number = 0,
  vbdVerifications: number = 0
): GamificationCounters {
  return {
    explanation_views: explanationViews,
    vbd_verifications: vbdVerifications,
  }
}

describe('Gamification Achievements', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('checkAchievement', () => {
    it('should return true when achievement exists', async () => {
      const mockSupabase = createMockSupabaseClient()
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'ach-1' },
          error: null,
        }),
      }
      mockSupabase.from.mockReturnValue(mockQuery)
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      const result = await checkAchievement('user-1', 'READ_10_EXPLANATIONS')

      expect(result).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith('achievements')
      expect(mockQuery.select).toHaveBeenCalledWith('id')
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-1')
      expect(mockQuery.eq).toHaveBeenCalledWith('achievement_type', 'READ_10_EXPLANATIONS')
    })

    it('should return false when achievement does not exist', async () => {
      const mockSupabase = createMockSupabaseClient()
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }
      mockSupabase.from.mockReturnValue(mockQuery)
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      const result = await checkAchievement('user-1', 'READ_10_EXPLANATIONS')

      expect(result).toBe(false)
    })

    it('should return false when userId is empty', async () => {
      const result = await checkAchievement('', 'READ_10_EXPLANATIONS')

      expect(result).toBe(false)
      expect(createClient).not.toHaveBeenCalled()
    })

    it('should return false on Supabase error', async () => {
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

      const result = await checkAchievement('user-1', 'READ_10_EXPLANATIONS')

      expect(result).toBe(false)
    })

    it('should handle null data gracefully', async () => {
      const mockSupabase = createMockSupabaseClient()
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }
      mockSupabase.from.mockReturnValue(mockQuery)
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      const result = await checkAchievement('user-1', 'VERIFIED_5_VBD')

      expect(result).toBe(false)
    })
  })

  describe('unlockAchievement', () => {
    it('should unlock achievement successfully', async () => {
      const mockSupabase = createMockSupabaseClient()
      const mockQuery = {
        upsert: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }
      mockSupabase.from.mockReturnValue(mockQuery)
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      const result = await unlockAchievement('user-1', 'READ_10_EXPLANATIONS')

      expect(result).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith('achievements')
      expect(mockQuery.upsert).toHaveBeenCalledWith(
        {
          user_id: 'user-1',
          achievement_type: 'READ_10_EXPLANATIONS',
          metadata: {},
        },
        { onConflict: 'user_id,achievement_type', ignoreDuplicates: true }
      )
    })

    it('should unlock achievement with metadata', async () => {
      const mockSupabase = createMockSupabaseClient()
      const mockQuery = {
        upsert: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }
      mockSupabase.from.mockReturnValue(mockQuery)
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      const metadata = { count: 10, timestamp: '2024-01-01' }
      const result = await unlockAchievement('user-1', 'READ_10_EXPLANATIONS', metadata)

      expect(result).toBe(true)
      expect(mockQuery.upsert).toHaveBeenCalledWith(
        {
          user_id: 'user-1',
          achievement_type: 'READ_10_EXPLANATIONS',
          metadata,
        },
        { onConflict: 'user_id,achievement_type', ignoreDuplicates: true }
      )
    })

    it('should be idempotent on duplicate unlock', async () => {
      const mockSupabase = createMockSupabaseClient()
      const mockQuery = {
        upsert: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }
      mockSupabase.from.mockReturnValue(mockQuery)
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      const result1 = await unlockAchievement('user-1', 'READ_10_EXPLANATIONS')
      expect(result1).toBe(true)

      const result2 = await unlockAchievement('user-1', 'READ_10_EXPLANATIONS')
      expect(result2).toBe(true)
    })

    it('should return false when userId is empty', async () => {
      const result = await unlockAchievement('', 'READ_10_EXPLANATIONS')

      expect(result).toBe(false)
      expect(createClient).not.toHaveBeenCalled()
    })

    it('should return false on Supabase error', async () => {
      const mockSupabase = createMockSupabaseClient()
      const mockQuery = {
        upsert: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('Database error'),
        }),
      }
      mockSupabase.from.mockReturnValue(mockQuery)
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      const result = await unlockAchievement('user-1', 'READ_10_EXPLANATIONS')

      expect(result).toBe(false)
    })

    it('should handle different achievement types', async () => {
      const mockSupabase = createMockSupabaseClient()
      const mockQuery = {
        upsert: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }
      mockSupabase.from.mockReturnValue(mockQuery)
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      const achievementTypes: AchievementType[] = [
        'READ_10_EXPLANATIONS',
        'MADE_FIRST_DRAFT_PICK',
        'VERIFIED_5_VBD',
        'COMPLETED_DRAFT',
      ]

      for (const type of achievementTypes) {
        const result = await unlockAchievement('user-1', type)
        expect(result).toBe(true)
      }
    })
  })

  describe('getUserAchievements', () => {
    it('should return all achievements for user ordered by unlocked_at', async () => {
      const mockSupabase = createMockSupabaseClient()
      const achievements = [
        createMockAchievementRecord('ach-1', 'user-1', 'READ_10_EXPLANATIONS', '2024-01-01T00:00:00Z'),
        createMockAchievementRecord('ach-2', 'user-1', 'VERIFIED_5_VBD', '2024-01-02T00:00:00Z'),
        createMockAchievementRecord('ach-3', 'user-1', 'MADE_FIRST_DRAFT_PICK', '2024-01-03T00:00:00Z'),
      ]
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: achievements,
          error: null,
        }),
      }
      mockSupabase.from.mockReturnValue(mockQuery)
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      const result = await getUserAchievements('user-1')

      expect(result).toEqual(achievements)
      expect(mockSupabase.from).toHaveBeenCalledWith('achievements')
      expect(mockQuery.select).toHaveBeenCalledWith(
        'id, user_id, achievement_type, unlocked_at, metadata'
      )
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-1')
      expect(mockQuery.order).toHaveBeenCalledWith('unlocked_at', { ascending: true })
    })

    it('should return empty array when user has no achievements', async () => {
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

      const result = await getUserAchievements('user-1')

      expect(result).toEqual([])
    })

    it('should return empty array when userId is empty', async () => {
      const result = await getUserAchievements('')

      expect(result).toEqual([])
      expect(createClient).not.toHaveBeenCalled()
    })

    it('should return empty array on Supabase error', async () => {
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

      const result = await getUserAchievements('user-1')

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

      const result = await getUserAchievements('user-1')

      expect(result).toEqual([])
    })

    it('should include metadata in returned achievements', async () => {
      const mockSupabase = createMockSupabaseClient()
      const achievements = [
        createMockAchievementRecord(
          'ach-1',
          'user-1',
          'READ_10_EXPLANATIONS',
          '2024-01-01T00:00:00Z',
          { count: 10 }
        ),
      ]
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: achievements,
          error: null,
        }),
      }
      mockSupabase.from.mockReturnValue(mockQuery)
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      const result = await getUserAchievements('user-1')

      expect(result[0].metadata).toEqual({ count: 10 })
    })
  })

  describe('incrementCounter', () => {
    it('should increment counter and return count', async () => {
      const mockCounters = createMockCounters(5, 0)
      vi.mocked(incrementCounterValue).mockResolvedValue(mockCounters)

      const result = await incrementCounter('user-1', 'explanation_views')

      expect(result).toEqual({
        count: 5,
        achievementUnlocked: null,
      })
      expect(incrementCounterValue).toHaveBeenCalledWith('user-1', 'explanation_views')
    })

    it('should unlock achievement when counter reaches threshold', async () => {
      const mockCounters = createMockCounters(10, 0)
      vi.mocked(incrementCounterValue).mockResolvedValue(mockCounters)

      const mockSupabase = createMockSupabaseClient()
      const mockQuery = {
        upsert: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }
      mockSupabase.from.mockReturnValue(mockQuery)
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      const result = await incrementCounter('user-1', 'explanation_views')

      expect(result).toEqual({
        count: 10,
        achievementUnlocked: 'READ_10_EXPLANATIONS',
      })
      expect(mockQuery.upsert).toHaveBeenCalled()
    })

    it('should unlock achievement with correct metadata when threshold reached', async () => {
      const mockCounters = createMockCounters(5, 5)
      vi.mocked(incrementCounterValue).mockResolvedValue(mockCounters)

      const mockSupabase = createMockSupabaseClient()
      const mockQuery = {
        upsert: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }
      mockSupabase.from.mockReturnValue(mockQuery)
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      const result = await incrementCounter('user-1', 'vbd_verifications')

      expect(result).toEqual({
        count: 5,
        achievementUnlocked: 'VERIFIED_5_VBD',
      })
      expect(mockQuery.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
          achievement_type: 'VERIFIED_5_VBD',
          metadata: expect.objectContaining({
            counterType: 'vbd_verifications',
            count: 5,
          }),
        }),
        expect.any(Object)
      )
    })

    it('should not unlock achievement when counter below threshold', async () => {
      const mockCounters = createMockCounters(5, 0)
      vi.mocked(incrementCounterValue).mockResolvedValue(mockCounters)

      const result = await incrementCounter('user-1', 'explanation_views')

      expect(result).toEqual({
        count: 5,
        achievementUnlocked: null,
      })
    })

    it('should return null when userId is empty', async () => {
      const result = await incrementCounter('', 'explanation_views')

      expect(result).toBeNull()
      expect(incrementCounterValue).not.toHaveBeenCalled()
    })

    it('should return null when counter increment fails', async () => {
      vi.mocked(incrementCounterValue).mockResolvedValue(null)

      const result = await incrementCounter('user-1', 'explanation_views')

      expect(result).toBeNull()
    })

    it('should handle different counter types', async () => {
      const counterTypes: CounterType[] = ['explanation_views', 'vbd_verifications']

      for (const counterType of counterTypes) {
        vi.clearAllMocks()
        const mockCounters = createMockCounters(0, 0)
        vi.mocked(incrementCounterValue).mockResolvedValue(mockCounters)

        const result = await incrementCounter('user-1', counterType)

        expect(result).not.toBeNull()
        expect(incrementCounterValue).toHaveBeenCalledWith('user-1', counterType)
      }
    })

    it('should use correct threshold for each counter type', async () => {
      const mockSupabase = createMockSupabaseClient()
      const mockQuery = {
        upsert: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }
      mockSupabase.from.mockReturnValue(mockQuery)
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      const counters1 = createMockCounters(10, 0)
      vi.mocked(incrementCounterValue).mockResolvedValue(counters1)

      const result1 = await incrementCounter('user-1', 'explanation_views')
      expect(result1?.achievementUnlocked).toBe('READ_10_EXPLANATIONS')

      vi.clearAllMocks()
      mockSupabase.from.mockReturnValue(mockQuery)
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      const counters2 = createMockCounters(0, 5)
      vi.mocked(incrementCounterValue).mockResolvedValue(counters2)

      const result2 = await incrementCounter('user-1', 'vbd_verifications')
      expect(result2?.achievementUnlocked).toBe('VERIFIED_5_VBD')
    })

    it('should handle counter value exactly at threshold', async () => {
      const mockCounters = createMockCounters(10, 0)
      vi.mocked(incrementCounterValue).mockResolvedValue(mockCounters)

      const mockSupabase = createMockSupabaseClient()
      const mockQuery = {
        upsert: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }
      mockSupabase.from.mockReturnValue(mockQuery)
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      const result = await incrementCounter('user-1', 'explanation_views')

      expect(result?.achievementUnlocked).toBe('READ_10_EXPLANATIONS')
    })

    it('should handle counter value above threshold', async () => {
      const mockCounters = createMockCounters(15, 0)
      vi.mocked(incrementCounterValue).mockResolvedValue(mockCounters)

      const mockSupabase = createMockSupabaseClient()
      const mockQuery = {
        upsert: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }
      mockSupabase.from.mockReturnValue(mockQuery)
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      const result = await incrementCounter('user-1', 'explanation_views')

      expect(result?.achievementUnlocked).toBe('READ_10_EXPLANATIONS')
    })
  })
})

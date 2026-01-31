import { describe, it, expect } from 'vitest'
import { getDraftPickValue, compareDraftPicks, type DraftPick } from '@/lib/algorithms/draft-picks'

describe('Draft Picks', () => {
  describe('getDraftPickValue', () => {
    it('should value 1.01 higher than 1.12', () => {
      const early: DraftPick = { year: 2025, round: 1, position: 'early' }
      const late: DraftPick = { year: 2025, round: 1, position: 'late' }
      
      const earlyValue = getDraftPickValue(early, 2025)
      const lateValue = getDraftPickValue(late, 2025)
      
      expect(earlyValue).toBeGreaterThan(lateValue)
    })

    it('should discount future picks', () => {
      const current: DraftPick = { year: 2025, round: 1, position: 'mid' }
      const future: DraftPick = { year: 2026, round: 1, position: 'mid' }
      
      const currentValue = getDraftPickValue(current, 2025)
      const futureValue = getDraftPickValue(future, 2025)
      
      expect(currentValue).toBeGreaterThan(futureValue)
    })

    it('should value round 1 higher than round 2', () => {
      const r1: DraftPick = { year: 2025, round: 1, position: 'mid' }
      const r2: DraftPick = { year: 2025, round: 2, position: 'mid' }
      
      expect(getDraftPickValue(r1, 2025)).toBeGreaterThan(getDraftPickValue(r2, 2025))
    })

    it('should return 0 for past picks', () => {
      const past: DraftPick = { year: 2024, round: 1, position: 'early' }
      expect(getDraftPickValue(past, 2025)).toBe(0)
    })

    it('should apply 15% discount per year by default', () => {
      const current: DraftPick = { year: 2025, round: 1, position: 'mid' }
      const future: DraftPick = { year: 2026, round: 1, position: 'mid' }
      
      const currentValue = getDraftPickValue(current, 2025)
      const futureValue = getDraftPickValue(future, 2025)
      
      expect(futureValue).toBeCloseTo(currentValue * 0.85, 1)
    })
  })

  describe('compareDraftPicks', () => {
    it('should sort picks by value (highest first)', () => {
      const picks: DraftPick[] = [
        { year: 2025, round: 2, position: 'mid' },
        { year: 2025, round: 1, position: 'early' },
        { year: 2026, round: 1, position: 'mid' },
      ]
      
      picks.sort((a, b) => compareDraftPicks(a, b, 2025))
      
      expect(picks[0].round).toBe(1)
      expect(picks[0].position).toBe('early')
    })
  })
})

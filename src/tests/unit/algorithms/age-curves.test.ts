import { describe, it, expect } from 'vitest'
import { AGE_CURVES, getAgeFactor, getYearsToCliff } from '@/lib/algorithms/age-curves'

describe('Age Curves', () => {
  describe('AGE_CURVES constant', () => {
    it('should have QB peak at 29', () => {
      expect(AGE_CURVES.QB?.peakAge).toBe(29)
    })

    it('should have RB peak at 25', () => {
      expect(AGE_CURVES.RB?.peakAge).toBe(25)
    })

    it('should have WR peak at 27', () => {
      expect(AGE_CURVES.WR?.peakAge).toBe(27)
    })

    it('should have TE peak at 28', () => {
      expect(AGE_CURVES.TE?.peakAge).toBe(28)
    })
  })

  describe('getAgeFactor', () => {
    it('should return 1.0 at peak age', () => {
      expect(getAgeFactor('QB', 29)).toBe(1.0)
      expect(getAgeFactor('RB', 25)).toBe(1.0)
      expect(getAgeFactor('WR', 27)).toBe(1.0)
    })

    it('should return value < 1.0 for ages past peak', () => {
      expect(getAgeFactor('RB', 28)).toBeLessThan(1.0)
      expect(getAgeFactor('QB', 35)).toBeLessThan(1.0)
    })

    it('should return steep decline past cliff age', () => {
      const atCliff = getAgeFactor('RB', 28)
      const pastCliff = getAgeFactor('RB', 30)
      expect(pastCliff).toBeLessThan(atCliff * 0.7)
    })

    it('should return 1.0 for unknown position', () => {
      expect(getAgeFactor('FLEX' as any, 25)).toBe(1.0)
    })

    it('should handle young players (before peak)', () => {
      const youngRB = getAgeFactor('RB', 22)
      expect(youngRB).toBeLessThan(1.0)
      expect(youngRB).toBeGreaterThan(0.5)
    })
  })

  describe('getYearsToCliff', () => {
    it('should return years remaining until cliff', () => {
      expect(getYearsToCliff('RB', 25)).toBe(3)
      expect(getYearsToCliff('QB', 30)).toBe(8)
    })

    it('should return 0 for players at or past cliff', () => {
      expect(getYearsToCliff('RB', 28)).toBe(0)
      expect(getYearsToCliff('RB', 30)).toBe(0)
    })

    it('should return 10 for unknown position', () => {
      expect(getYearsToCliff('FLEX' as any, 25)).toBe(10)
    })
  })
})

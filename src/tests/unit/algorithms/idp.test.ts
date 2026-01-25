import { describe, it, expect } from 'vitest'
import {
  calculateIDPScarcityMultiplier,
  getIDPGroup,
} from '@/lib/algorithms/idp'

describe('IDP Position Handler', () => {
  describe('getIDPGroup', () => {
    it('should map DL position to DL group', () => {
      expect(getIDPGroup('DL')).toBe('DL')
    })

    it('should map DE position to DL group', () => {
      expect(getIDPGroup('DE')).toBe('DL')
    })

    it('should map DT position to DL group', () => {
      expect(getIDPGroup('DT')).toBe('DL')
    })

    it('should map EDR position to DL group', () => {
      expect(getIDPGroup('EDR')).toBe('DL')
    })

    it('should map LB position to LB group', () => {
      expect(getIDPGroup('LB')).toBe('LB')
    })

    it('should map ILB position to LB group', () => {
      expect(getIDPGroup('ILB')).toBe('LB')
    })

    it('should map OLB position to LB group', () => {
      expect(getIDPGroup('OLB')).toBe('LB')
    })

    it('should map DB position to DB group', () => {
      expect(getIDPGroup('DB')).toBe('DB')
    })

    it('should map CB position to DB group', () => {
      expect(getIDPGroup('CB')).toBe('DB')
    })

    it('should map S position to DB group', () => {
      expect(getIDPGroup('S')).toBe('DB')
    })

    it('should map SS position to DB group', () => {
      expect(getIDPGroup('SS')).toBe('DB')
    })

    it('should map FS position to DB group', () => {
      expect(getIDPGroup('FS')).toBe('DB')
    })

    it('should return null for unknown position', () => {
      expect(getIDPGroup('QB')).toBeNull()
      expect(getIDPGroup('RB')).toBeNull()
      expect(getIDPGroup('WR')).toBeNull()
    })
  })

  describe('calculateIDPScarcityMultiplier', () => {
    it('should return 1.0 for no IDP slots', () => {
      const rosterPositions = ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DEF']
      expect(calculateIDPScarcityMultiplier(rosterPositions)).toBe(1.0)
    })

    it('should return 1.0 for exactly 40% IDP slots (threshold)', () => {
      // 6 IDP in 15 slots = 40%
      const rosterPositions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'DL', 'DL', 'LB', 'LB', 'DB', 'DB', 'FLEX', 'FLEX', 'FLEX']
      expect(calculateIDPScarcityMultiplier(rosterPositions)).toBe(1.0)
    })

    it('should return 1.4 for 60% IDP slots', () => {
      // 9 IDP in 15 slots = 60%
      // Formula: 1.0 + (0.60 - 0.40) * 2 = 1.0 + 0.20 * 2 = 1.4
      const rosterPositions = ['QB', 'RB', 'WR', 'TE', 'K', 'DL', 'DL', 'DL', 'LB', 'LB', 'LB', 'DB', 'DB', 'DB', 'FLEX']
      expect(calculateIDPScarcityMultiplier(rosterPositions)).toBe(1.4)
    })

    it('should handle IDP_FLEX position in count', () => {
      // 7 IDP in 15 slots = 46.67%
      // Formula: 1.0 + (0.4667 - 0.40) * 2 = 1.0 + 0.0667 * 2 ≈ 1.1334
      const rosterPositions = ['QB', 'RB', 'WR', 'TE', 'K', 'DL', 'DL', 'LB', 'LB', 'DB', 'DB', 'IDP_FLEX', 'FLEX', 'FLEX', 'FLEX']
      const result = calculateIDPScarcityMultiplier(rosterPositions)
      expect(result).toBeCloseTo(1.1334, 3)
    })

    it('should handle EDR position in count', () => {
      // 6 IDP in 15 slots = 40% (with EDR)
      const rosterPositions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'DL', 'LB', 'DB', 'EDR', 'FLEX', 'FLEX', 'FLEX', 'FLEX', 'FLEX']
      expect(calculateIDPScarcityMultiplier(rosterPositions)).toBe(1.0)
    })

    it('should return 1.2 for 50% IDP slots', () => {
      // 7.5 IDP in 15 slots = 50%
      // Formula: 1.0 + (0.50 - 0.40) * 2 = 1.0 + 0.10 * 2 = 1.2
      // Using 8 IDP in 16 slots = 50%
      const rosterPositions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'DL', 'DL', 'LB', 'LB', 'DB', 'DB', 'EDR', 'IDP_FLEX', 'FLEX', 'FLEX']
      expect(calculateIDPScarcityMultiplier(rosterPositions)).toBe(1.2)
    })

    it('should return 1.0 for less than 40% IDP slots', () => {
      // 5 IDP in 15 slots = 33.33%
      const rosterPositions = ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DEF', 'DL', 'LB', 'DB', 'FLEX', 'FLEX', 'FLEX']
      expect(calculateIDPScarcityMultiplier(rosterPositions)).toBe(1.0)
    })
  })
})

import { describe, it, expect } from 'vitest'
import { detectScoringFormat, getScoringExplanation } from '@/lib/algorithms/scoring'
import type { ScoringSettings } from '@/lib/algorithms/types'

describe('scoring format detection and explanation', () => {
  describe('detectScoringFormat', () => {
    it('should detect standard scoring when rec is 0', () => {
      const settings: ScoringSettings = { rec: 0 }
      expect(detectScoringFormat(settings)).toBe('standard')
    })

    it('should detect half-PPR when rec is 0.5', () => {
      const settings: ScoringSettings = { rec: 0.5 }
      expect(detectScoringFormat(settings)).toBe('half_ppr')
    })

    it('should detect PPR when rec is 1', () => {
      const settings: ScoringSettings = { rec: 1 }
      expect(detectScoringFormat(settings)).toBe('ppr')
    })

    it('should default to standard when rec key is missing', () => {
      const settings: ScoringSettings = { pass_td: 4, pass_yd: 0.04 }
      expect(detectScoringFormat(settings)).toBe('standard')
    })

    it('should handle empty scoring settings', () => {
      const settings: ScoringSettings = {}
      expect(detectScoringFormat(settings)).toBe('standard')
    })
  })

  describe('getScoringExplanation', () => {
    it('should generate explanation for standard scoring', () => {
      const settings: ScoringSettings = {
        rec: 0,
        pass_td: 4,
        pass_yd: 0.04,
        rush_td: 6,
        rush_yd: 0.1,
      }
      const explanation = getScoringExplanation(settings)
      expect(Array.isArray(explanation)).toBe(true)
      expect(explanation.length).toBeGreaterThan(0)
      expect(explanation[0]).toContain('Standard')
    })

    it('should generate explanation for half-PPR', () => {
      const settings: ScoringSettings = {
        rec: 0.5,
        pass_td: 4,
        pass_yd: 0.04,
        rush_td: 6,
        rush_yd: 0.1,
      }
      const explanation = getScoringExplanation(settings)
      expect(explanation.length).toBeGreaterThan(0)
      expect(explanation[0]).toContain('Half-PPR')
    })

    it('should generate explanation for PPR', () => {
      const settings: ScoringSettings = {
        rec: 1,
        pass_td: 4,
        pass_yd: 0.04,
        rush_td: 6,
        rush_yd: 0.1,
      }
      const explanation = getScoringExplanation(settings)
      expect(explanation.length).toBeGreaterThan(0)
      expect(explanation[0]).toContain('PPR')
    })

    it('should include IDP settings in explanation when present', () => {
      const settings: ScoringSettings = {
        rec: 0,
        pass_td: 4,
        pass_yd: 0.04,
        rush_td: 6,
        rush_yd: 0.1,
        def_tk: 1,
        def_sack: 1,
        def_int: 2,
      }
      const explanation = getScoringExplanation(settings)
      expect(explanation.some((line: string) => line.toLowerCase().includes('idp') || line.toLowerCase().includes('defense'))).toBe(true)
    })

    it('should return array of human-readable strings', () => {
      const settings: ScoringSettings = {
        rec: 1,
        pass_td: 4,
        pass_yd: 0.04,
        rush_td: 6,
        rush_yd: 0.1,
      }
      const explanation = getScoringExplanation(settings)
      expect(Array.isArray(explanation)).toBe(true)
      explanation.forEach((line: string) => {
        expect(typeof line).toBe('string')
        expect(line.length).toBeGreaterThan(0)
      })
    })

    it('should handle empty scoring settings gracefully', () => {
      const settings: ScoringSettings = {}
      const explanation = getScoringExplanation(settings)
      expect(Array.isArray(explanation)).toBe(true)
      expect(explanation.length).toBeGreaterThan(0)
    })
  })
})

import type { Position } from './types'

export interface AgeCurveConfig {
  position: Position
  peakAge: number
  decayRate: number
  cliffAge: number
}

export const AGE_CURVES: Partial<Record<Position, AgeCurveConfig>> = {
  QB: { position: 'QB', peakAge: 29, decayRate: 0.03, cliffAge: 38 },
  RB: { position: 'RB', peakAge: 25, decayRate: 0.12, cliffAge: 28 },
  WR: { position: 'WR', peakAge: 27, decayRate: 0.06, cliffAge: 32 },
  TE: { position: 'TE', peakAge: 28, decayRate: 0.05, cliffAge: 33 },
  K:  { position: 'K',  peakAge: 32, decayRate: 0.02, cliffAge: 40 },
  DEF: { position: 'DEF', peakAge: 27, decayRate: 0.00, cliffAge: 99 },
  DL: { position: 'DL', peakAge: 27, decayRate: 0.08, cliffAge: 32 },
  LB: { position: 'LB', peakAge: 26, decayRate: 0.09, cliffAge: 31 },
  DB: { position: 'DB', peakAge: 27, decayRate: 0.07, cliffAge: 32 },
}

export function getAgeFactor(position: Position, age: number): number {
  const config = AGE_CURVES[position]
  if (!config) return 1.0
  
  const { peakAge, decayRate, cliffAge } = config
  
  if (age > cliffAge) {
    const yearsPostCliff = age - cliffAge
    return Math.exp(-decayRate * (cliffAge - peakAge)) * Math.pow(0.7, yearsPostCliff)
  }
  
  return Math.exp(-decayRate * Math.abs(age - peakAge))
}

export function getYearsToCliff(position: Position, age: number): number {
  const config = AGE_CURVES[position]
  if (!config) return 10
  return Math.max(0, config.cliffAge - age)
}

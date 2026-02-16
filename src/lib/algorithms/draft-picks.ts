export interface DraftPick {
  year: number
  round: number
  position: 'early' | 'mid' | 'late' | 'unknown'
  originalOwner?: string
}

const ROUND_BASE_VALUES: Record<number, number> = {
  1: 8500,
  2: 4500,
  3: 2500,
  4: 1200,
  5: 500,
}

const POSITION_MODIFIERS: Record<string, number> = {
  early: 1.15,
  mid: 1.0,
  late: 0.85,
  unknown: 1.0,
}

export function getDraftPickValue(
  pick: DraftPick,
  currentYear: number,
  discountRate: number = 0.15
): number {
  const baseValue = ROUND_BASE_VALUES[pick.round] || 200
  const positionMod = POSITION_MODIFIERS[pick.position] || 1.0
  const yearsDiff = pick.year - currentYear
  
  if (yearsDiff < 0) return 0
  if (yearsDiff === 0) return baseValue * positionMod
  
  const discountFactor = Math.pow(1 - discountRate, yearsDiff)
  return baseValue * positionMod * discountFactor
}

export function compareDraftPicks(
  a: DraftPick,
  b: DraftPick,
  currentYear: number
): number {
  return getDraftPickValue(b, currentYear) - getDraftPickValue(a, currentYear)
}

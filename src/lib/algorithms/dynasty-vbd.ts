import { getAgeFactor } from './age-curves'
import type { PlayerRanking } from './types'

export interface DynastyVBDInput {
  player: PlayerRanking
  age: number
  yearsToProject?: number
  discountRate?: number
}

export interface DynastyVBDOutput {
  currentVBD: number
  dynastyVBD: number
  ageFactor: number
  yearlyBreakdown: Array<{
    year: number
    age: number
    factor: number
    discountedVBD: number
  }>
}

export function calculateDynastyVBD(input: DynastyVBDInput): DynastyVBDOutput {
  const {
    player,
    age,
    yearsToProject = 3,
    discountRate = 0.20,
  } = input

  const currentAgeFactor = getAgeFactor(player.position, age)
  const yearlyBreakdown: DynastyVBDOutput['yearlyBreakdown'] = []
  let dynastyVBD = 0

  for (let t = 0; t < yearsToProject; t++) {
    const futureAge = age + t
    const futureFactor = getAgeFactor(player.position, futureAge)
    const relativeDecline = futureFactor / currentAgeFactor
    const yearVBD = player.vbdScore * relativeDecline
    const discountedVBD = yearVBD / Math.pow(1 + discountRate, t)

    dynastyVBD += discountedVBD

    yearlyBreakdown.push({
      year: t,
      age: futureAge,
      factor: futureFactor,
      discountedVBD: Math.round(discountedVBD),
    })
  }

  return {
    currentVBD: player.vbdScore,
    dynastyVBD: Math.round(dynastyVBD),
    ageFactor: currentAgeFactor,
    yearlyBreakdown,
  }
}

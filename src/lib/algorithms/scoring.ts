import type { ScoringSettings, ScoringFormat } from './types'

/**
 * Detects the scoring format (standard, half-PPR, or PPR) from Sleeper scoring settings.
 * Uses the `rec` (reception) point value to determine format:
 * - 0 points per reception = Standard
 * - 0.5 points per reception = Half-PPR
 * - 1 point per reception = PPR
 *
 * @param scoringSettings - Sleeper scoring settings object (stat key → point value)
 * @returns Detected scoring format: 'standard' | 'half_ppr' | 'ppr'
 */
export function detectScoringFormat(scoringSettings: ScoringSettings): ScoringFormat {
  const recValue = scoringSettings.rec ?? 0

  if (recValue === 1) {
    return 'ppr'
  }

  if (recValue === 0.5) {
    return 'half_ppr'
  }

  return 'standard'
}

/**
 * Generates human-readable explanation of scoring rules for "Show Your Work" transparency.
 * Returns array of strings describing the scoring format and any special settings (IDP, etc).
 *
 * @param scoringSettings - Sleeper scoring settings object
 * @returns Array of human-readable explanation strings
 */
export function getScoringExplanation(scoringSettings: ScoringSettings): string[] {
  const explanation: string[] = []

  // Detect and add scoring format
  const format = detectScoringFormat(scoringSettings)
  if (format === 'ppr') {
    explanation.push('Scoring Format: PPR (1 point per reception)')
  } else if (format === 'half_ppr') {
    explanation.push('Scoring Format: Half-PPR (0.5 points per reception)')
  } else {
    explanation.push('Scoring Format: Standard (0 points per reception)')
  }

  // Add passing scoring
  const passYd = scoringSettings.pass_yd ?? 0
  const passTd = scoringSettings.pass_td ?? 0
  const passInt = scoringSettings.pass_int ?? 0

  if (passYd > 0 || passTd > 0 || passInt > 0) {
    const passRules: string[] = []
    if (passYd > 0) passRules.push(`${passYd} pts per passing yard`)
    if (passTd > 0) passRules.push(`${passTd} pts per passing TD`)
    if (passInt > 0) passRules.push(`-${passInt} pts per interception`)
    if (passRules.length > 0) {
      explanation.push(`Passing: ${passRules.join(', ')}`)
    }
  }

  // Add rushing scoring
  const rushYd = scoringSettings.rush_yd ?? 0
  const rushTd = scoringSettings.rush_td ?? 0

  if (rushYd > 0 || rushTd > 0) {
    const rushRules: string[] = []
    if (rushYd > 0) rushRules.push(`${rushYd} pts per rushing yard`)
    if (rushTd > 0) rushRules.push(`${rushTd} pts per rushing TD`)
    if (rushRules.length > 0) {
      explanation.push(`Rushing: ${rushRules.join(', ')}`)
    }
  }

  // Add receiving scoring
  const recYd = scoringSettings.rec_yd ?? 0
  const recTd = scoringSettings.rec_td ?? 0

  if (recYd > 0 || recTd > 0) {
    const recRules: string[] = []
    if (recYd > 0) recRules.push(`${recYd} pts per receiving yard`)
    if (recTd > 0) recRules.push(`${recTd} pts per receiving TD`)
    if (recRules.length > 0) {
      explanation.push(`Receiving: ${recRules.join(', ')}`)
    }
  }

  // Check for IDP (Individual Defensive Player) settings
  const idpKeys = ['def_tk', 'def_sack', 'def_int', 'def_fr', 'def_td', 'def_ff', 'def_pa']
  const hasIDP = idpKeys.some((key) => scoringSettings[key] !== undefined && scoringSettings[key] !== 0)

  if (hasIDP) {
    const idpRules: string[] = []
    if (scoringSettings.def_tk !== undefined && scoringSettings.def_tk > 0) {
      idpRules.push(`${scoringSettings.def_tk} pts per tackle`)
    }
    if (scoringSettings.def_sack !== undefined && scoringSettings.def_sack > 0) {
      idpRules.push(`${scoringSettings.def_sack} pts per sack`)
    }
    if (scoringSettings.def_int !== undefined && scoringSettings.def_int > 0) {
      idpRules.push(`${scoringSettings.def_int} pts per interception`)
    }
    if (scoringSettings.def_fr !== undefined && scoringSettings.def_fr > 0) {
      idpRules.push(`${scoringSettings.def_fr} pts per forced fumble`)
    }
    if (scoringSettings.def_td !== undefined && scoringSettings.def_td > 0) {
      idpRules.push(`${scoringSettings.def_td} pts per defensive TD`)
    }
    if (scoringSettings.def_ff !== undefined && scoringSettings.def_ff > 0) {
      idpRules.push(`${scoringSettings.def_ff} pts per fumble recovery`)
    }
    if (scoringSettings.def_pa !== undefined && scoringSettings.def_pa > 0) {
      idpRules.push(`${scoringSettings.def_pa} pts per point allowed`)
    }
    if (idpRules.length > 0) {
      explanation.push(`IDP Scoring: ${idpRules.join(', ')}`)
    }
  }

  // Add kicker scoring if present
  const kickFg = scoringSettings.fgm ?? 0
  const kickPat = scoringSettings.xpm ?? 0

  if (kickFg > 0 || kickPat > 0) {
    const kickRules: string[] = []
    if (kickFg > 0) kickRules.push(`${kickFg} pts per field goal`)
    if (kickPat > 0) kickRules.push(`${kickPat} pts per PAT`)
    if (kickRules.length > 0) {
      explanation.push(`Kicking: ${kickRules.join(', ')}`)
    }
  }

  // If no scoring rules were added beyond format, add a note
  if (explanation.length === 1) {
    explanation.push('(No additional scoring rules configured)')
  }

  return explanation
}

const IDP_POSITION_MAP: Record<string, 'DL' | 'LB' | 'DB'> = {
  'DL': 'DL',
  'DE': 'DL',
  'DT': 'DL',
  'EDR': 'DL',
  'LB': 'LB',
  'ILB': 'LB',
  'OLB': 'LB',
  'DB': 'DB',
  'CB': 'DB',
  'S': 'DB',
  'SS': 'DB',
  'FS': 'DB',
}

export function getIDPGroup(position: string): 'DL' | 'LB' | 'DB' | null {
  return IDP_POSITION_MAP[position] ?? null
}

export function calculateIDPScarcityMultiplier(rosterPositions: string[]): number {
  const totalSlots = rosterPositions.length
  const idpSlots = rosterPositions.filter(p =>
    ['DL', 'LB', 'DB', 'IDP_FLEX', 'EDR'].includes(p)
  ).length

  const idpPercentage = idpSlots / totalSlots

  if (idpPercentage >= 0.4) {
    return 1.0 + (idpPercentage - 0.4) * 2
  }

  return 1.0
}

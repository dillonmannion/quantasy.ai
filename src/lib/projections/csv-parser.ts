/**
 * Parse CSV content into projections map.
 * Expected CSV format:
 * player_id,name,position,team,projected_points
 * 4046,Patrick Mahomes,QB,KC,380.5
 * ...
 *
 * Minimum required columns: player_id, projected_points
 */
export interface ParsedProjection {
  playerId: string
  name?: string
  position?: string
  team?: string
  projectedPoints: number
}

export interface CSVParseResult {
  projections: Record<string, number>
  parsed: ParsedProjection[]
  errors: string[]
}

export function parseProjectionsCSV(csvContent: string): CSVParseResult {
  const lines = csvContent.trim().split('\n')
  const errors: string[] = []
  const projections: Record<string, number> = {}
  const parsed: ParsedProjection[] = []

  if (lines.length < 2) {
    return {
      projections: {},
      parsed: [],
      errors: ['CSV must have at least a header row and one data row'],
    }
  }

  const headerLine = lines[0]
  const headers = headerLine.split(',').map((h) => h.trim().toLowerCase())

  const playerIdIndex = headers.findIndex(
    (h) => h === 'player_id' || h === 'playerid' || h === 'id'
  )
  const projectedPointsIndex = headers.findIndex(
    (h) =>
      h === 'projected_points' ||
      h === 'projectedpoints' ||
      h === 'points' ||
      h === 'fpts' ||
      h === 'projection'
  )
  const nameIndex = headers.findIndex(
    (h) => h === 'name' || h === 'full_name' || h === 'player_name' || h === 'player'
  )
  const positionIndex = headers.findIndex(
    (h) => h === 'position' || h === 'pos'
  )
  const teamIndex = headers.findIndex(
    (h) => h === 'team' || h === 'tm'
  )

  if (playerIdIndex === -1) {
    return {
      projections: {},
      parsed: [],
      errors: ['Missing required column: player_id (or playerid, id)'],
    }
  }

  if (projectedPointsIndex === -1) {
    return {
      projections: {},
      parsed: [],
      errors: [
        'Missing required column: projected_points (or projectedpoints, points, fpts, projection)',
      ],
    }
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const values = parseCSVLine(line)

    const playerId = values[playerIdIndex]?.trim()
    const projectedPointsStr = values[projectedPointsIndex]?.trim()

    if (!playerId) {
      errors.push(`Row ${i + 1}: Missing player_id`)
      continue
    }

    const projectedPoints = parseFloat(projectedPointsStr || '')
    if (isNaN(projectedPoints)) {
      errors.push(`Row ${i + 1}: Invalid projected_points value "${projectedPointsStr}"`)
      continue
    }

    projections[playerId] = projectedPoints

    parsed.push({
      playerId,
      projectedPoints,
      name: nameIndex !== -1 ? values[nameIndex]?.trim() : undefined,
      position: positionIndex !== -1 ? values[positionIndex]?.trim() : undefined,
      team: teamIndex !== -1 ? values[teamIndex]?.trim() : undefined,
    })
  }

  return { projections, parsed, errors }
}

/**
 * Parse a single CSV line, handling quoted values with commas
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }

  result.push(current)
  return result
}

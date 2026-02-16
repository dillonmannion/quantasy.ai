/**
 * DynastyProcess Pick Value Fetcher
 * 
 * Fetches rookie draft pick values from DynastyProcess public data repository.
 * Data is cached for 24 hours to minimize network requests.
 * 
 * Data source: https://github.com/dynastyprocess/data
 * CSV endpoint: https://raw.githubusercontent.com/dynastyprocess/data/master/files/values-picks.csv
 */

import { logger } from '@/lib/logger'

const DYNASTY_PROCESS_URL =
  'https://raw.githubusercontent.com/dynastyprocess/data/master/files/values-picks.csv'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours
const RATE_LIMIT_MS = 5000 // 1 request per 5 seconds

/**
 * Raw pick value data from DynastyProcess CSV
 */
interface DynastyProcessPickRaw {
  player: string // e.g., "2026 Pick 1.01"
  pos: string // Always "PICK"
  ecr_1qb: string // Expert consensus ranking for 1QB leagues
  ecr_2qb: string // Expert consensus ranking for 2QB/Superflex leagues
  scrape_date: string // e.g., "2026-01-30"
  pick: string // Pick number (1-60) or "NA" for generic picks
}

/**
 * Parsed pick value for internal use
 */
export interface FuturePickValue {
  /** Season year (e.g., "2026") */
  season: string
  /** Round number (1-5) */
  round: number
  /** Pick number within round (1-12), or null for generic picks */
  pickNumber: number | null
  /** Overall pick number (1-60), or null for generic picks */
  overallPick: number | null
  /** Pick position descriptor (e.g., "Early", "Mid", "Late"), or null for specific picks */
  position: string | null
  /** Value in 1QB leagues (ECR-based) */
  value1QB: number
  /** Value in 2QB/Superflex leagues (ECR-based) */
  value2QB: number
  /** Original player string from CSV (e.g., "2026 Pick 1.01") */
  label: string
}

/**
 * In-memory cache with timestamp
 */
let cachedData: { values: FuturePickValue[]; timestamp: number } | null = null

/**
 * Rate limiter state
 */
let lastRequestTime = 0

/**
 * Rate limiter - ensures minimum 5 seconds between requests
 */
async function throttle(): Promise<void> {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime

  if (timeSinceLastRequest < RATE_LIMIT_MS) {
    const waitTime = RATE_LIMIT_MS - timeSinceLastRequest
    logger.debug('DynastyProcess', `Rate limited, waiting ${waitTime}ms`)
    await new Promise((resolve) => setTimeout(resolve, waitTime))
  }

  lastRequestTime = Date.now()
}

/**
 * Parse CSV text into array of objects
 */
function parseCSV(csvText: string): DynastyProcessPickRaw[] {
  const lines = csvText.trim().split('\n')
  const headers = lines[0]!.split(',').map((h) => h.replace(/"/g, ''))

  return lines.slice(1).map((line) => {
    // Handle quoted values with commas
    const values: string[] = []
    let currentValue = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]!

      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(currentValue)
        currentValue = ''
      } else {
        currentValue += char
      }
    }
    values.push(currentValue) // Push last value

    const obj: Record<string, string> = {}
    headers.forEach((header, index) => {
      obj[header] = values[index] || ''
    })

    return obj as unknown as DynastyProcessPickRaw
  })
}

/**
 * Extract season, round, and pick info from player string
 * 
 * Examples:
 * - "2026 Pick 1.01" → { season: "2026", round: 1, pickNumber: 1, position: null }
 * - "2027 Early 1st" → { season: "2027", round: 1, pickNumber: null, position: "Early" }
 * - "2027 1st" → { season: "2027", round: 1, pickNumber: null, position: null }
 */
function parsePickLabel(
  label: string
): Pick<
  FuturePickValue,
  'season' | 'round' | 'pickNumber' | 'position' | 'overallPick'
> {
  const parts = label.split(' ')
  const season = parts[0]!

  // Check for specific pick (e.g., "2026 Pick 1.01")
  if (parts[1] === 'Pick') {
    const [roundStr, pickStr] = parts[2]!.split('.')
    const round = parseInt(roundStr!, 10)
    const pickNumber = parseInt(pickStr!, 10)
    const overallPick = (round - 1) * 12 + pickNumber

    return { season, round, pickNumber, overallPick, position: null }
  }

  // Check for generic pick with position (e.g., "2027 Early 1st")
  const positionWords = ['Early', 'Mid', 'Late']
  const position = positionWords.find((p) => parts.includes(p)) || null

  // Extract round from "1st", "2nd", "3rd", "4th", "5th"
  const roundPart = parts.find((p) => /^\d+(st|nd|rd|th)$/.test(p))
  const round = roundPart ? parseInt(roundPart, 10) : 1

  return { season, round, pickNumber: null, overallPick: null, position }
}

/**
 * Map DynastyProcess pick to internal format
 */
export function mapDPValueToInternal(
  dpPick: DynastyProcessPickRaw
): FuturePickValue {
  const { player, ecr_1qb, ecr_2qb } = dpPick
  const { season, round, pickNumber, overallPick, position } =
    parsePickLabel(player)

  // DynastyProcess uses ECR (Expert Consensus Ranking) as value
  // Lower ECR = higher value (e.g., ECR 20 is better than ECR 100)
  // We'll invert this to a 0-1000 scale where higher = better
  const value1QB = parseFloat(ecr_1qb)
  const value2QB = parseFloat(ecr_2qb)

  return {
    season,
    round,
    pickNumber,
    overallPick,
    position,
    value1QB,
    value2QB,
    label: player,
  }
}

/**
 * Fetch future pick values from DynastyProcess
 * 
 * Returns cached data if available and fresh (< 24 hours old).
 * On network failure, returns stale cache or null.
 * 
 * @returns Array of pick values, or null on failure with no cache
 */
export async function getFuturePickValues(): Promise<FuturePickValue[] | null> {
  try {
    // Check cache
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL_MS) {
      logger.debug('DynastyProcess', 'Returning cached pick values')
      return cachedData.values
    }

    // Rate limit
    await throttle()

    // Fetch from DynastyProcess
    logger.info('DynastyProcess', 'Fetching pick values from GitHub')
    const response = await fetch(DYNASTY_PROCESS_URL, {
      headers: { 'User-Agent': 'Quantasy/1.0' },
    })

    if (!response.ok) {
      logger.error('DynastyProcess', `HTTP error: ${response.status}`)
      return cachedData?.values ?? null // Return stale cache or null
    }

    const rawData = await response.text()
    const parsed = parseCSV(rawData)

    const values = parsed.map(mapDPValueToInternal)
    cachedData = { values, timestamp: Date.now() }

    logger.info('DynastyProcess', `Cached ${values.length} pick values`)
    return values
  } catch (error) {
    logger.error('DynastyProcess', 'Fetch failed', { error })
    return cachedData?.values ?? null // Return stale cache or null
  }
}

/**
 * DynastyProcess Player Value Fetcher
 * 
 * Fetches player values from DynastyProcess public data repository.
 * Data is cached for 24 hours to minimize network requests.
 * 
 * Data source: https://github.com/dynastyprocess/data
 * CSV endpoint: https://raw.githubusercontent.com/dynastyprocess/data/master/files/values-players.csv
 */

import type { ExternalPlayerValue } from '@/lib/algorithms/types'
import { logger } from '@/lib/logger'

const DYNASTY_PROCESS_PLAYERS_URL =
  'https://raw.githubusercontent.com/dynastyprocess/data/master/files/values-players.csv'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Raw player value data from DynastyProcess CSV
 */
interface DynastyProcessPlayerRaw {
  player: string // Player name
  pos: string // Position (QB, RB, WR, TE)
  team: string // NFL team abbreviation
  age: string // Player age
  draft_year: string // NFL draft year
  ecr_1qb: string // Expert consensus ranking for 1QB leagues
  ecr_2qb: string // Expert consensus ranking for 2QB/Superflex leagues
  ecr_pos: string // Position rank
  value_1qb: string // Dynasty value in 1QB leagues
  value_2qb: string // Dynasty value in 2QB/Superflex leagues
  scrape_date: string // Date of data scrape
  fp_id: string // FantasyPros ID
  sleeper_id?: string // Sleeper ID (if available)
}

/**
 * In-memory cache with timestamp
 */
interface CacheEntry {
  values: Record<string, ExternalPlayerValue>
  timestamp: number
}

let cachedData: CacheEntry | null = null
let fetchPromise: Promise<Record<string, ExternalPlayerValue>> | null = null

/**
 * Parse CSV text into array of objects
 */
function parseCSV(csvText: string): DynastyProcessPlayerRaw[] {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) return []

  const headers = lines[0]!.split(',').map((h) => h.replace(/"/g, '').trim())

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
        values.push(currentValue.trim())
        currentValue = ''
      } else {
        currentValue += char
      }
    }
    values.push(currentValue.trim()) // Push last value

    const obj: Record<string, string> = {}
    headers.forEach((header, index) => {
      obj[header] = values[index] || ''
    })

    return obj as unknown as DynastyProcessPlayerRaw
  })
}

/**
 * Check if value is valid (not empty, NA, or 0)
 */
function isValidValue(value: string | undefined): boolean {
  return !!value && value !== 'NA' && value !== '' && value !== '0'
}

/**
 * Map DynastyProcess player to internal ExternalPlayerValue format
 */
function mapDPPlayerToInternal(
  dpPlayer: DynastyProcessPlayerRaw
): ExternalPlayerValue | null {
  // Skip players without Sleeper ID
  if (!isValidValue(dpPlayer.sleeper_id)) {
    return null
  }

  const value1QB = parseFloat(dpPlayer.value_1qb)
  const value2QB = parseFloat(dpPlayer.value_2qb)

  // Skip players with no valid values (NaN or zero)
  if (
    (isNaN(value1QB) || value1QB === 0) &&
    (isNaN(value2QB) || value2QB === 0)
  ) {
    return null
  }

  return {
    playerId: dpPlayer.sleeper_id!,
    source: 'DynastyProcess',
    // value_1qb is dynasty format (1QB leagues)
    // value_2qb is superflex format (2QB leagues)
    // Both are dynasty values, just different league formats
    dynasty_value: !isNaN(value1QB) && value1QB !== 0 ? value1QB : null,
    redraft_value: !isNaN(value2QB) && value2QB !== 0 ? value2QB : null,
    updated_at: new Date().toISOString(),
  }
}

/**
 * Fetch player values from DynastyProcess
 * 
 * Returns cached data if available and fresh (< 24 hours old).
 * On network failure, returns stale cache or empty object.
 * Concurrent calls are deduplicated via singleton promise.
 * 
 * @returns Record of player values keyed by Sleeper ID
 */
export async function fetchDynastyProcessPlayerValues(): Promise<
  Record<string, ExternalPlayerValue>
> {
  try {
    // Check cache
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL_MS) {
      logger.debug('DynastyProcess', 'Returning cached player values')
      return cachedData.values
    }

    // Deduplicate concurrent fetches
    if (fetchPromise) {
      logger.debug('DynastyProcess', 'Reusing in-flight fetch promise')
      return fetchPromise
    }

    // Create new fetch promise
    fetchPromise = (async () => {
      try {
        logger.info('DynastyProcess', 'Fetching player values from GitHub')
        const response = await fetch(DYNASTY_PROCESS_PLAYERS_URL, {
          headers: { 'User-Agent': 'Quantasy/1.0' },
        })

        if (!response.ok) {
          logger.error('DynastyProcess', `HTTP error: ${response.status}`)
          return cachedData?.values ?? {} // Return stale cache or empty
        }

        const rawData = await response.text()
        const parsed = parseCSV(rawData)

        const values: Record<string, ExternalPlayerValue> = {}
        let skippedCount = 0

        for (const dpPlayer of parsed) {
          const mapped = mapDPPlayerToInternal(dpPlayer)
          if (mapped) {
            values[mapped.playerId] = mapped
          } else {
            skippedCount++
          }
        }

        cachedData = { values, timestamp: Date.now() }

        logger.info('DynastyProcess', `Cached ${Object.keys(values).length} player values (skipped ${skippedCount} without Sleeper ID)`)
        return values
      } catch (error) {
        logger.error('DynastyProcess', 'Fetch failed', { error })
        return cachedData?.values ?? {}
      } finally {
        fetchPromise = null
      }
    })()

    return fetchPromise
  } catch (error) {
    logger.error('DynastyProcess', 'Fetch failed', { error })
    fetchPromise = null
    return cachedData?.values ?? {} // Return stale cache or empty
  }
}

/**
 * Clear the player values cache (for testing)
 */
export function clearDynastyProcessPlayerCache(): void {
  cachedData = null
  fetchPromise = null
}

/**
 * Get cache status (for monitoring)
 */
export function getDynastyProcessPlayerCacheStatus(): {
  isValid: boolean
  ageMs: number | null
  playerCount: number | null
} {
  if (!cachedData) {
    return { isValid: false, ageMs: null, playerCount: null }
  }

  const ageMs = Date.now() - cachedData.timestamp
  return {
    isValid: ageMs < CACHE_TTL_MS,
    ageMs,
    playerCount: Object.keys(cachedData.values).length,
  }
}

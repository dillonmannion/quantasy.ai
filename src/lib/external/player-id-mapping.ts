/**
 * Player ID Mapping - maps between Sleeper, KTC, FantasyPros, and ESPN IDs.
 * Source: DynastyProcess db_playerids.csv (cached 24h).
 */

import type { PlayerIdMapping } from '@/lib/algorithms/types'

const CSV_URL =
  'https://raw.githubusercontent.com/dynastyprocess/data/master/files/db_playerids.csv'

const CACHE_TTL_MS = 24 * 60 * 60 * 1000

interface PlayerIdMaps {
  sleeperToKTC: Map<string, string>
  ktcToSleeper: Map<string, string>
  sleeperToFantasyPros: Map<string, string>
  sleeperToESPN: Map<string, string>
  sleeperToFull: Map<string, PlayerIdMapping>
}

interface CacheEntry {
  maps: PlayerIdMaps
  timestamp: number
}

let cache: CacheEntry | null = null
let fetchPromise: Promise<PlayerIdMaps> | null = null

function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) return []

  const headers = lines[0]!.split(',').map((h) => h.replace(/"/g, '').trim())

  return lines.slice(1).map((line) => {
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
    values.push(currentValue.trim())

    const obj: Record<string, string> = {}
    headers.forEach((header, index) => {
      obj[header] = values[index] || ''
    })

    return obj
  })
}

function isValidId(value: string | undefined): value is string {
  return !!value && value !== 'NA' && value !== ''
}

function buildMaps(rows: Record<string, string>[]): PlayerIdMaps {
  const maps: PlayerIdMaps = {
    sleeperToKTC: new Map(),
    ktcToSleeper: new Map(),
    sleeperToFantasyPros: new Map(),
    sleeperToESPN: new Map(),
    sleeperToFull: new Map(),
  }

  for (const row of rows) {
    const sleeperId = row['sleeper_id']
    const ktcId = row['ktc_id']
    const fantasyprosId = row['fantasypros_id']
    const espnId = row['espn_id']

    if (!isValidId(sleeperId)) continue

    if (isValidId(ktcId)) {
      maps.sleeperToKTC.set(sleeperId, ktcId)
      maps.ktcToSleeper.set(ktcId, sleeperId)
    }

    if (isValidId(fantasyprosId)) {
      maps.sleeperToFantasyPros.set(sleeperId, fantasyprosId)
    }

    if (isValidId(espnId)) {
      maps.sleeperToESPN.set(sleeperId, espnId)
    }

    const fullMapping: PlayerIdMapping = {
      sleeper_id: sleeperId,
      ktc_id: isValidId(ktcId) ? ktcId : null,
      fantasypros_id: isValidId(fantasyprosId) ? fantasyprosId : null,
      dynasty_process_id: null,
    }
    maps.sleeperToFull.set(sleeperId, fullMapping)
  }

  return maps
}

async function fetchMappings(): Promise<PlayerIdMaps> {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL_MS) {
    return cache.maps
  }

  if (fetchPromise) {
    return fetchPromise
  }

  fetchPromise = (async () => {
    try {
      const response = await fetch(CSV_URL)

      if (!response.ok) {
        throw new Error(`Failed to fetch player ID CSV: ${response.status}`)
      }

      const csvText = await response.text()
      const rows = parseCSV(csvText)
      const maps = buildMaps(rows)

      cache = { maps, timestamp: Date.now() }

      return maps
    } finally {
      fetchPromise = null
    }
  })()

  return fetchPromise
}

export async function getKTCIdFromSleeper(
  sleeperId: string
): Promise<string | null> {
  const maps = await fetchMappings()
  return maps.sleeperToKTC.get(sleeperId) ?? null
}

export async function getSleeperIdFromKTC(
  ktcId: string
): Promise<string | null> {
  const maps = await fetchMappings()
  return maps.ktcToSleeper.get(ktcId) ?? null
}

export async function getFantasyProsIdFromSleeper(
  sleeperId: string
): Promise<string | null> {
  const maps = await fetchMappings()
  return maps.sleeperToFantasyPros.get(sleeperId) ?? null
}

export async function getESPNIdFromSleeper(
  sleeperId: string
): Promise<string | null> {
  const maps = await fetchMappings()
  return maps.sleeperToESPN.get(sleeperId) ?? null
}

export async function getPlayerIdMapping(
  sleeperId: string
): Promise<PlayerIdMapping | null> {
  const maps = await fetchMappings()
  return maps.sleeperToFull.get(sleeperId) ?? null
}

export async function getPlayerIdMappingsBatch(
  sleeperIds: string[]
): Promise<Map<string, PlayerIdMapping>> {
  const maps = await fetchMappings()
  const result = new Map<string, PlayerIdMapping>()

  for (const sleeperId of sleeperIds) {
    const mapping = maps.sleeperToFull.get(sleeperId)
    if (mapping) {
      result.set(sleeperId, mapping)
    }
  }

  return result
}

export function clearPlayerIdMappingCache(): void {
  cache = null
  fetchPromise = null
}

export function getPlayerIdMappingCacheStatus(): {
  isValid: boolean
  ageMs: number | null
  playerCount: number | null
} {
  if (!cache) {
    return { isValid: false, ageMs: null, playerCount: null }
  }

  const ageMs = Date.now() - cache.timestamp
  return {
    isValid: ageMs < CACHE_TTL_MS,
    ageMs,
    playerCount: cache.maps.sleeperToFull.size,
  }
}

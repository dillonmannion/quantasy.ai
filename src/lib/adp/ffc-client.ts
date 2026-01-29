// Data from Fantasy Football Calculator (fantasyfootballcalculator.com)

const BASE_URL = 'https://fantasyfootballcalculator.com/api/v1/adp'
const DEBUG = process.env.NODE_ENV === 'development'

interface FFCResponse {
  name?: string
  adp?: number
  position?: string
  [key: string]: unknown
}

const adpCache = new Map<string, Record<string, number>>()

function getCacheKey(
  format: 'ppr' | 'half-ppr' | 'standard',
  teams: number,
  year: number
): string {
  return `${format}:${teams}:${year}`
}

export async function fetchADP(
  format: 'ppr' | 'half-ppr' | 'standard',
  teams: number,
  year: number
): Promise<Record<string, number>> {
  const cacheKey = getCacheKey(format, teams, year)

  if (adpCache.has(cacheKey)) {
    if (DEBUG) {
      console.log(`[ADP] Cache hit for ${cacheKey}`)
    }
    return adpCache.get(cacheKey)!
  }

  try {
    const url = `${BASE_URL}/${format}?teams=${teams}&year=${year}`

    if (DEBUG) {
      console.log(`[ADP] Fetching ${url}`)
    }

    const response = await fetch(url)

    if (!response.ok) {
      if (DEBUG) {
        console.error(
          `[ADP] HTTP ${response.status} for ${format}/${teams}/${year}`
        )
      }
      return {}
    }

    const data = (await response.json()) as FFCResponse[]

    const result: Record<string, number> = {}
    for (const item of data) {
      if (item.name && typeof item.adp === 'number') {
        result[item.name] = item.adp
      }
    }

    adpCache.set(cacheKey, result)

    if (DEBUG) {
      console.log(`[ADP] Cached ${Object.keys(result).length} players`)
    }

    return result
  } catch (error) {
    if (DEBUG) {
      console.error(`[ADP] Error fetching ADP:`, error)
    }
    return {}
  }
}

export function clearADPCache(): void {
  adpCache.clear()
}

/**
 * KeepTradeCut (KTC) Player Value Scraper
 *
 * Scrapes dynasty player values from KeepTradeCut using headless browser automation.
 * Data is cached for 24 hours to minimize requests and respect the site.
 *
 * Note: KTC is dynasty-focused, so only dynasty_value is populated (not redraft_value).
 *
 * @see https://keeptradecut.com/dynasty-rankings
 */

import type { ExternalPlayerValue } from '@/lib/algorithms/types'
import { logger } from '@/lib/logger'
import { getSleeperIdFromKTC } from './player-id-mapping'

const KTC_RANKINGS_URL = 'https://keeptradecut.com/dynasty-rankings'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours
const RATE_LIMIT_MS = 10000 // 10 seconds between requests

/**
 * Raw player data scraped from KTC page
 */
interface KTCPlayerRaw {
  name: string
  ktcId: string
  position: string
  value: number
}

/**
 * In-memory cache with timestamp
 */
interface CacheEntry {
  values: Record<string, ExternalPlayerValue>
  timestamp: number
}

let cachedData: CacheEntry | null = null
let lastRequestTime = 0

/**
 * Enforce rate limiting between requests
 */
async function throttle(): Promise<void> {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime

  if (timeSinceLastRequest < RATE_LIMIT_MS) {
    const waitTime = RATE_LIMIT_MS - timeSinceLastRequest
    logger.debug('KTC-Players', `Rate limited, waiting ${waitTime}ms`)
    await new Promise((resolve) => setTimeout(resolve, waitTime))
  }

  lastRequestTime = Date.now()
}

/**
 * Dynamically import Playwright (optional devDependency)
 */
// @ts-expect-error - Playwright is optional devDependency for browser scraping
async function getPlaywright(): Promise<typeof import('playwright') | null> {
  try {
    // @ts-expect-error - Dynamic import of optional dependency
    const playwright = await import('playwright')
    return playwright
  } catch {
    logger.warn('KTC-Players', 'Playwright not available - browser scraping disabled')
    return null
  }
}

/**
 * Scrape player data from KTC dynasty rankings page
 */
async function scrapePlayersFromPage(): Promise<KTCPlayerRaw[]> {
  const playwright = await getPlaywright()
  if (!playwright) {
    throw new Error('Playwright not available')
  }

  const browser = await playwright.chromium.launch({ headless: true })
  const context = await browser.newContext({
    userAgent: 'Quantasy/1.0 (Fantasy Football Analysis Tool)',
  })
  const page = await context.newPage()

  try {
    logger.info('KTC-Players', 'Navigating to dynasty rankings page')
    await page.goto(KTC_RANKINGS_URL, {
      waitUntil: 'networkidle',
      timeout: 30000,
    })

    // Wait for rankings content to load
    await page.waitForSelector('.rankings-page', { timeout: 10000 }).catch(() => {
      logger.debug('KTC-Players', 'Rankings page selector not found, continuing anyway')
    })

    // Click "Players" filter to exclude picks
    const playersFilterSelector =
      '[data-filter="players"], .position-filter-players, button:has-text("Players")'
    const playersFilter = await page.$(playersFilterSelector)
    if (playersFilter) {
      await playersFilter.click()
      await page.waitForTimeout(1000)
    }

    // Scrape player data from page
    const players = await page.evaluate(() => {
      const results: KTCPlayerRaw[] = []

      // Try multiple selector patterns for different page layouts
      const selectorPatterns = [
        '.player-row',
        '.ranking-row',
        '[data-player-type="player"]',
        '.player-info',
        'tr.player',
      ]

      for (const selector of selectorPatterns) {
        const elements = document.querySelectorAll(selector)
        if (elements.length > 0) {
          elements.forEach((el) => {
            // Find player name element
            const nameEl = el.querySelector('.player-name, .name, [data-name], td:first-child')
            // Find value element
            const valueEl = el.querySelector('.player-value, .value, [data-value], td:last-child')
            // Find position element
            const posEl = el.querySelector('.position, .pos, [data-position]')
            // Find KTC ID from data attribute or link
            const playerLink = el.querySelector('a[href*="/player/"]')
            const ktcIdFromData =
              el.getAttribute('data-player-id') ||
              el.getAttribute('data-ktc-id') ||
              el.getAttribute('data-id')

            // Extract KTC ID from URL pattern like "/player/12345"
            let ktcIdFromUrl: string | null = null
            if (playerLink) {
              const href = playerLink.getAttribute('href')
              const match = href?.match(/\/player\/(\d+)/)
              if (match) {
                ktcIdFromUrl = match[1] || null
              }
            }

            const ktcId = ktcIdFromData || ktcIdFromUrl || ''

            if (nameEl && valueEl) {
              const name = nameEl.textContent?.trim() || ''
              const value = parseInt(valueEl.textContent?.replace(/[^0-9]/g, '') || '0', 10)
              const position = posEl?.textContent?.trim() || ''

              // Skip pick entries (format: "2026 Early 1st", etc.)
              const isPickEntry =
                name.match(/^\d{4}/) &&
                (name.toLowerCase().includes('1st') ||
                  name.toLowerCase().includes('2nd') ||
                  name.toLowerCase().includes('3rd') ||
                  name.toLowerCase().includes('4th') ||
                  name.toLowerCase().includes('pick'))

              // Only include player entries (not picks)
              if (!isPickEntry && name && value > 0 && ktcId) {
                results.push({
                  name,
                  ktcId,
                  position,
                  value,
                })
              }
            }
          })
          if (results.length > 0) break
        }
      }

      return results
    })

    logger.info('KTC-Players', `Scraped ${players.length} players from page`)
    return players
  } finally {
    await browser.close()
  }
}

/**
 * Map raw KTC player data to ExternalPlayerValue, converting KTC ID to Sleeper ID
 *
 * @param player Raw player data from KTC
 * @returns ExternalPlayerValue or null if no Sleeper ID mapping exists
 */
async function mapKTCPlayerToInternal(
  player: KTCPlayerRaw
): Promise<ExternalPlayerValue | null> {
  const sleeperId = await getSleeperIdFromKTC(player.ktcId)

  if (!sleeperId) {
    logger.warn(
      'KTC-Players',
      `KTC player ${player.name} (KTC ID: ${player.ktcId}) has no Sleeper ID mapping`
    )
    return null
  }

  return {
    playerId: sleeperId,
    source: 'KTC',
    dynasty_value: player.value,
    // KTC is dynasty-focused, no redraft values
    redraft_value: null,
    updated_at: new Date().toISOString(),
  }
}

/**
 * Fetch player values from KeepTradeCut dynasty rankings
 *
 * Returns cached data if available and fresh (< 24 hours old).
 * On scraping failure, returns stale cache or empty object.
 *
 * Players without Sleeper ID mappings are skipped with a warning log.
 *
 * @returns Record of player values keyed by Sleeper ID
 */
export async function fetchKTCPlayerValues(): Promise<Record<string, ExternalPlayerValue>> {
  try {
    // Check cache
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL_MS) {
      logger.debug('KTC-Players', 'Returning cached player values')
      return cachedData.values
    }

    await throttle()

    logger.info('KTC-Players', 'Scraping player values from KTC')
    const rawPlayers = await scrapePlayersFromPage()

    if (rawPlayers.length === 0) {
      logger.warn('KTC-Players', 'No players found on page - selectors may need updating')
      return cachedData?.values ?? {}
    }

    const values: Record<string, ExternalPlayerValue> = {}
    let skippedCount = 0

    // Process players sequentially to avoid overwhelming the ID mapping API
    for (const player of rawPlayers) {
      const mapped = await mapKTCPlayerToInternal(player)
      if (mapped) {
        values[mapped.playerId] = mapped
      } else {
        skippedCount++
      }
    }

    cachedData = { values, timestamp: Date.now() }

    logger.info(
      'KTC-Players',
      `Cached ${Object.keys(values).length} player values (skipped ${skippedCount} without Sleeper ID mapping)`
    )
    return values
  } catch (error) {
    logger.error('KTC-Players', 'Scrape failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    return cachedData?.values ?? {}
  }
}

/**
 * Clear the player values cache (for testing)
 */
export function clearKTCPlayerCache(): void {
  cachedData = null
  logger.debug('KTC-Players', 'Cache cleared')
}

/**
 * Get cache status (for monitoring)
 */
export function getKTCPlayerCacheStatus(): {
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

/**
 * Reset rate limiter for testing
 */
export function resetKTCPlayerRateLimiter(): void {
  lastRequestTime = 0
}

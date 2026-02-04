/**
 * KeepTradeCut (KTC) Pick Value Scraper
 *
 * Scrapes rookie draft pick values from KeepTradeCut using headless browser automation.
 * Data is cached for 24 hours to minimize requests and respect the site.
 *
 * @see https://keeptradecut.com/dynasty-rankings
 */

import { logger } from '@/lib/logger'
import type { FuturePickValue } from './dynasty-process'

const KTC_RANKINGS_URL = 'https://keeptradecut.com/dynasty-rankings'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const RATE_LIMIT_MS = 10000

interface KTCPickRaw {
  name: string
  position: string
  value: number
  tier?: string
}

let cachedData: { values: FuturePickValue[]; timestamp: number } | null = null
let lastRequestTime = 0

async function throttle(): Promise<void> {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime

  if (timeSinceLastRequest < RATE_LIMIT_MS) {
    const waitTime = RATE_LIMIT_MS - timeSinceLastRequest
    logger.debug('KTC', `Rate limited, waiting ${waitTime}ms`)
    await new Promise((resolve) => setTimeout(resolve, waitTime))
  }

  lastRequestTime = Date.now()
}

/**
 * Parses pick names like "2026 Early 1st", "2026 Mid 2nd", "2026 1st"
 * Regex: ^(\d{4})\s+(Early|Mid|Late)?\s*(\d+)(st|nd|rd|th)$
 */
function parseKTCPickName(name: string): {
  season: string
  round: number
  tier: string | null
} | null {
  const match = name.match(/^(\d{4})\s+(Early|Mid|Late)?\s*(\d+)(st|nd|rd|th)$/i)
  if (!match) return null

  const [, season, tier, roundNum] = match
  return {
    season: season!,
    round: parseInt(roundNum!, 10),
    tier: tier || null,
  }
}

function mapKTCToInternal(pick: KTCPickRaw): FuturePickValue | null {
  const parsed = parseKTCPickName(pick.name)
  if (!parsed) return null

  return {
    season: parsed.season,
    round: parsed.round,
    pickNumber: null,
    overallPick: null,
    position: parsed.tier,
    value1QB: pick.value,
    value2QB: pick.value,
    label: pick.name,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getPlaywright(): Promise<any | null> {
  try {
    // Use variable to completely hide import from bundler static analysis
    // Playwright is an optional devDependency for browser scraping
    const moduleName = 'playwright'
    const playwright = await import(moduleName)
    return playwright
  } catch {
    logger.warn('KTC', 'Playwright not available - browser scraping disabled')
    return null
  }
}

async function scrapePicksFromPage(): Promise<KTCPickRaw[]> {
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
    logger.info('KTC', 'Navigating to rankings page')
    await page.goto(KTC_RANKINGS_URL, {
      waitUntil: 'networkidle',
      timeout: 30000,
    })

    await page.waitForSelector('.rankings-page', { timeout: 10000 }).catch(() => {
      logger.debug('KTC', 'Rankings page selector not found, continuing anyway')
    })

    const picksFilterSelector = '[data-filter="picks"], .position-filter-picks, button:has-text("Picks")'
    const picksFilter = await page.$(picksFilterSelector)
    if (picksFilter) {
      await picksFilter.click()
      await page.waitForTimeout(1000)
    }

    const picks = await page.evaluate(() => {
      const results: KTCPickRaw[] = []

      const selectorPatterns = [
        '.player-row',
        '.ranking-row',
        '[data-player-type="pick"]',
        '.player-info',
        'tr.player',
      ]

      for (const selector of selectorPatterns) {
        const elements = document.querySelectorAll(selector)
        if (elements.length > 0) {
          elements.forEach((el) => {
            const nameEl = el.querySelector(
              '.player-name, .name, [data-name], td:first-child'
            )
            const valueEl = el.querySelector(
              '.player-value, .value, [data-value], td:last-child'
            )
            const posEl = el.querySelector('.position, .pos, [data-position]')

            if (nameEl && valueEl) {
              const name = nameEl.textContent?.trim() || ''
              const value = parseInt(
                valueEl.textContent?.replace(/[^0-9]/g, '') || '0',
                10
              )
              const position = posEl?.textContent?.trim() || 'PICK'

              const isPickEntry =
                name.match(/^\d{4}/) &&
                (name.toLowerCase().includes('1st') ||
                  name.toLowerCase().includes('2nd') ||
                  name.toLowerCase().includes('3rd') ||
                  name.toLowerCase().includes('4th') ||
                  name.toLowerCase().includes('pick'))

              if (isPickEntry) {
                results.push({ name, value, position })
              }
            }
          })
          if (results.length > 0) break
        }
      }

      return results
    })

    logger.info('KTC', `Scraped ${picks.length} picks from page`)
    return picks
  } finally {
    await browser.close()
  }
}

export async function scrapeKTCPickValues(): Promise<FuturePickValue[] | null> {
  try {
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL_MS) {
      logger.debug('KTC', 'Returning cached pick values')
      return cachedData.values
    }

    await throttle()

    logger.info('KTC', 'Scraping pick values from KTC')
    const rawPicks = await scrapePicksFromPage()

    if (rawPicks.length === 0) {
      logger.warn('KTC', 'No picks found on page - selectors may need updating')
      return cachedData?.values ?? null
    }

    const values = rawPicks
      .map(mapKTCToInternal)
      .filter((v): v is FuturePickValue => v !== null)

    cachedData = { values, timestamp: Date.now() }

    logger.info('KTC', `Cached ${values.length} pick values`)
    return values
  } catch (error) {
    logger.error('KTC', 'Scrape failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    return cachedData?.values ?? null
  }
}

export function clearKTCCache(): void {
  cachedData = null
  logger.debug('KTC', 'Cache cleared')
}

export function getKTCCacheStatus(): {
  hasCachedData: boolean
  cachedAt: Date | null
  itemCount: number
} {
  return {
    hasCachedData: cachedData !== null,
    cachedAt: cachedData ? new Date(cachedData.timestamp) : null,
    itemCount: cachedData?.values.length ?? 0,
  }
}

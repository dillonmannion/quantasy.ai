import 'server-only'

/**
 * FantasyCalc Pick Value Scraper
 *
 * Scrapes rookie draft pick values from FantasyCalc using headless browser automation.
 * Data is cached for 24 hours to minimize requests and respect the site.
 *
 * @see https://fantasycalc.com/trade-value-chart
 */

import { logger } from '@/lib/logger'
import type { FuturePickValue } from './dynasty-process'

const FANTASYCALC_URL = 'https://fantasycalc.com/trade-value-chart'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const RATE_LIMIT_MS = 10000

interface FantasyCalcPickRaw {
  name: string
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
    logger.debug('FantasyCalc', `Rate limited, waiting ${waitTime}ms`)
    await new Promise((resolve) => setTimeout(resolve, waitTime))
  }

  lastRequestTime = Date.now()
}

/**
 * Parses pick names like "2026 1st (Early)", "2026 2nd", "2026 Mid 3rd"
 * Regex: ^(\d{4})\s+(Early|Mid|Late)?\s*(\d+)(st|nd|rd|th)(?:\s*\((Early|Mid|Late)\))?$
 */
function parseFantasyCalcPickName(name: string): {
  season: string
  round: number
  tier: string | null
} | null {
  const match = name.match(
    /^(\d{4})\s+(Early|Mid|Late)?\s*(\d+)(st|nd|rd|th)(?:\s*\((Early|Mid|Late)\))?$/i
  )
  if (!match) return null

  const [, season, tierPrefix, roundNum, , tierSuffix] = match
  return {
    season: season!,
    round: parseInt(roundNum!, 10),
    tier: tierPrefix || tierSuffix || null,
  }
}

function mapFantasyCalcToInternal(pick: FantasyCalcPickRaw): FuturePickValue | null {
  const parsed = parseFantasyCalcPickName(pick.name)
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
    logger.warn('FantasyCalc', 'Playwright not available - browser scraping disabled')
    return null
  }
}

async function scrapePicksFromPage(): Promise<FantasyCalcPickRaw[]> {
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
    logger.info('FantasyCalc', 'Navigating to trade value chart')
    await page.goto(FANTASYCALC_URL, {
      waitUntil: 'networkidle',
      timeout: 30000,
    })

    await page.waitForSelector('app-root', { timeout: 10000 }).catch(() => {
      logger.debug('FantasyCalc', 'Angular root not found, continuing anyway')
    })

    const picksFilterSelectors = [
      '[data-filter="picks"]',
      'button:has-text("Picks")',
      '.filter-picks',
      '[aria-label*="pick"]',
    ]

    for (const selector of picksFilterSelectors) {
      const filter = await page.$(selector)
      if (filter) {
        await filter.click()
        await page.waitForTimeout(1000)
        break
      }
    }

    const picks = await page.evaluate(() => {
      const results: FantasyCalcPickRaw[] = []

      const selectorPatterns = [
        '.player-row',
        '.value-row',
        '[data-type="pick"]',
        '.player-card',
        'tr[data-player]',
        '.ranking-item',
      ]

      for (const selector of selectorPatterns) {
        const elements = document.querySelectorAll(selector)
        if (elements.length > 0) {
          elements.forEach((el) => {
            const nameEl = el.querySelector(
              '.player-name, .name, [data-name], .player-info, td:first-child'
            )
            const valueEl = el.querySelector(
              '.player-value, .value, [data-value], .trade-value, td:last-child'
            )

            if (nameEl && valueEl) {
              const name = nameEl.textContent?.trim() || ''
              const value = parseInt(
                valueEl.textContent?.replace(/[^0-9]/g, '') || '0',
                10
              )

              const isPickEntry =
                name.match(/^\d{4}/) &&
                (name.toLowerCase().includes('1st') ||
                  name.toLowerCase().includes('2nd') ||
                  name.toLowerCase().includes('3rd') ||
                  name.toLowerCase().includes('4th') ||
                  name.toLowerCase().includes('pick'))

              if (isPickEntry) {
                results.push({ name, value })
              }
            }
          })
          if (results.length > 0) break
        }
      }

      return results
    })

    logger.info('FantasyCalc', `Scraped ${picks.length} picks from page`)
    return picks
  } finally {
    await browser.close()
  }
}

export async function scrapeFantasyCalcPickValues(): Promise<FuturePickValue[] | null> {
  try {
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL_MS) {
      logger.debug('FantasyCalc', 'Returning cached pick values')
      return cachedData.values
    }

    await throttle()

    logger.info('FantasyCalc', 'Scraping pick values')
    const rawPicks = await scrapePicksFromPage()

    if (rawPicks.length === 0) {
      logger.warn('FantasyCalc', 'No picks found on page - selectors may need updating')
      return cachedData?.values ?? null
    }

    const values = rawPicks
      .map(mapFantasyCalcToInternal)
      .filter((v): v is FuturePickValue => v !== null)

    cachedData = { values, timestamp: Date.now() }

    logger.info('FantasyCalc', `Cached ${values.length} pick values`)
    return values
  } catch (error) {
    logger.error('FantasyCalc', 'Scrape failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    return cachedData?.values ?? null
  }
}

export function clearFantasyCalcCache(): void {
  cachedData = null
  logger.debug('FantasyCalc', 'Cache cleared')
}

export function getFantasyCalcCacheStatus(): {
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

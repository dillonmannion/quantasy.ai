/**
 * FantasyCalc Player Value Scraper
 *
 * Scrapes player trade values from FantasyCalc using headless browser automation.
 * Supports both dynasty and redraft formats with separate caches (24h TTL).
 *
 * FantasyCalc uses Sleeper player IDs natively, so no ID mapping required.
 *
 * @see https://fantasycalc.com/trade-value-chart
 */

import { logger } from '@/lib/logger'
import type { ExternalPlayerValue } from '@/lib/algorithms/types'

const FANTASYCALC_URL = 'https://fantasycalc.com/trade-value-chart'
const CACHE_TTL_24_HOURS_MS = 24 * 60 * 60 * 1000
const RATE_LIMIT_10_SECONDS_MS = 10000

type Format = 'dynasty' | 'redraft'

interface FantasyCalcPlayerRaw {
  name: string
  sleeperId: string
  value: number
  position?: string
}

interface CacheEntry {
  values: Record<string, ExternalPlayerValue>
  timestamp: number
}

const dynastyAndRedraftCache: Record<Format, CacheEntry | null> = {
  dynasty: null,
  redraft: null,
}

let lastRequestTime = 0

async function throttle(): Promise<void> {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime

  if (timeSinceLastRequest < RATE_LIMIT_10_SECONDS_MS) {
    const waitTime = RATE_LIMIT_10_SECONDS_MS - timeSinceLastRequest
    logger.debug('FantasyCalcPlayers', `Rate limited, waiting ${waitTime}ms`)
    await new Promise((resolve) => setTimeout(resolve, waitTime))
  }

  lastRequestTime = Date.now()
}

// @ts-expect-error - Playwright is optional devDependency for browser scraping
async function getPlaywright(): Promise<typeof import('playwright') | null> {
  try {
    // @ts-expect-error - Dynamic import of optional dependency
    const playwright = await import('playwright')
    return playwright
  } catch {
    logger.warn('FantasyCalcPlayers', 'Playwright not available - browser scraping disabled')
    return null
  }
}

function buildUrl(format: Format): string {
  const isDynasty = format === 'dynasty'
  return `${FANTASYCALC_URL}?isDynasty=${isDynasty}&numQbs=1`
}

async function scrapePlayersFromPage(format: Format): Promise<FantasyCalcPlayerRaw[]> {
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
    const url = buildUrl(format)
    logger.info('FantasyCalcPlayers', `Navigating to trade value chart (${format})`, { url })

    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000,
    })

    await page.waitForSelector('app-root', { timeout: 10000 }).catch(() => {
      logger.debug('FantasyCalcPlayers', 'Angular root not found, continuing anyway')
    })

    await page.waitForTimeout(2000)

    const playersFilterSelectors = [
      '[data-filter="players"]',
      'button:has-text("Players")',
      '.filter-players',
      '[aria-label*="player"]',
    ]

    for (const selector of playersFilterSelectors) {
      const filter = await page.$(selector)
      if (filter) {
        await filter.click()
        await page.waitForTimeout(1000)
        break
      }
    }

    const players = await page.evaluate(() => {
      const results: FantasyCalcPlayerRaw[] = []

      const rowSelectors = [
        '.player-row',
        '.value-row',
        '[data-type="player"]',
        '.player-card',
        'tr[data-player]',
        '.ranking-item',
        '.player-item',
      ]

      for (const selector of rowSelectors) {
        const elements = document.querySelectorAll(selector)
        if (elements.length > 0) {
          elements.forEach((el) => {
            const sleeperIdAttr =
              el.getAttribute('data-sleeper-id') ||
              el.getAttribute('data-player-id') ||
              el.querySelector('[data-sleeper-id]')?.getAttribute('data-sleeper-id') ||
              el.querySelector('[data-player-id]')?.getAttribute('data-player-id')

            const nameEl = el.querySelector(
              '.player-name, .name, [data-name], .player-info, td:first-child, a[href*="player"]'
            )

            const valueEl = el.querySelector(
              '.player-value, .value, [data-value], .trade-value, td:last-child, .rank-value'
            )

            const posEl = el.querySelector('.position, .pos, [data-position]')

            if (nameEl && valueEl) {
              const name = nameEl.textContent?.trim() || ''
              const value = parseInt(
                valueEl.textContent?.replace(/[^0-9]/g, '') || '0',
                10
              )

              const looksLikePick =
                name.match(/^\d{4}/) &&
                (name.toLowerCase().includes('1st') ||
                  name.toLowerCase().includes('2nd') ||
                  name.toLowerCase().includes('3rd') ||
                  name.toLowerCase().includes('4th') ||
                  name.toLowerCase().includes('pick'))

              if (!looksLikePick && name && sleeperIdAttr && value > 0) {
                results.push({
                  name,
                  sleeperId: sleeperIdAttr,
                  value,
                  position: posEl?.textContent?.trim(),
                })
              }
            }
          })
          if (results.length > 0) break
        }
      }

      return results
    })

    logger.info('FantasyCalcPlayers', `Scraped ${players.length} players from page (${format})`)
    return players
  } finally {
    await browser.close()
  }
}

function mapToExternalPlayerValue(
  player: FantasyCalcPlayerRaw,
  format: Format
): ExternalPlayerValue {
  return {
    playerId: player.sleeperId,
    source: 'FantasyCalc',
    dynasty_value: format === 'dynasty' ? player.value : null,
    redraft_value: format === 'redraft' ? player.value : null,
    updated_at: new Date().toISOString(),
  }
}

/**
 * Fetches player values from FantasyCalc for the specified format.
 * Returns cached data if available and fresh (24h TTL).
 * Gracefully degrades to cached/empty data on scraping errors.
 */
export async function fetchFantasyCalcPlayerValues(
  format: Format
): Promise<Record<string, ExternalPlayerValue>> {
  try {
    const cached = dynastyAndRedraftCache[format]
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_24_HOURS_MS) {
      logger.debug('FantasyCalcPlayers', `Returning cached ${format} values`)
      return cached.values
    }

    await throttle()

    logger.info('FantasyCalcPlayers', `Scraping ${format} player values`)
    const rawPlayers = await scrapePlayersFromPage(format)

    if (rawPlayers.length === 0) {
      logger.warn('FantasyCalcPlayers', 'No players found on page - selectors may need updating')
      return cached?.values ?? {}
    }

    const values: Record<string, ExternalPlayerValue> = {}
    for (const player of rawPlayers) {
      values[player.sleeperId] = mapToExternalPlayerValue(player, format)
    }

    dynastyAndRedraftCache[format] = { values, timestamp: Date.now() }

    logger.info('FantasyCalcPlayers', `Cached ${Object.keys(values).length} ${format} player values`)
    return values
  } catch (error) {
    logger.error('FantasyCalcPlayers', `Scrape failed for ${format}`, {
      error: error instanceof Error ? error.message : String(error),
    })
    return dynastyAndRedraftCache[format]?.values ?? {}
  }
}

export function clearFantasyCalcPlayerCache(format?: Format): void {
  if (format) {
    dynastyAndRedraftCache[format] = null
    logger.debug('FantasyCalcPlayers', `Cache cleared for ${format}`)
  } else {
    dynastyAndRedraftCache.dynasty = null
    dynastyAndRedraftCache.redraft = null
    logger.debug('FantasyCalcPlayers', 'All caches cleared')
  }
}

export function getFantasyCalcPlayerCacheStatus(): {
  dynasty: { hasCachedData: boolean; cachedAt: Date | null; itemCount: number }
  redraft: { hasCachedData: boolean; cachedAt: Date | null; itemCount: number }
} {
  return {
    dynasty: {
      hasCachedData: dynastyAndRedraftCache.dynasty !== null,
      cachedAt: dynastyAndRedraftCache.dynasty ? new Date(dynastyAndRedraftCache.dynasty.timestamp) : null,
      itemCount: dynastyAndRedraftCache.dynasty ? Object.keys(dynastyAndRedraftCache.dynasty.values).length : 0,
    },
    redraft: {
      hasCachedData: dynastyAndRedraftCache.redraft !== null,
      cachedAt: dynastyAndRedraftCache.redraft ? new Date(dynastyAndRedraftCache.redraft.timestamp) : null,
      itemCount: dynastyAndRedraftCache.redraft ? Object.keys(dynastyAndRedraftCache.redraft.values).length : 0,
    },
  }
}

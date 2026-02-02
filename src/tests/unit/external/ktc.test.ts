import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { FuturePickValue } from '@/lib/external/dynasty-process'

function createMockBrowser(mockPage: Record<string, unknown>) {
  const mockContext = { newPage: vi.fn().mockResolvedValue(mockPage) }
  return {
    newContext: vi.fn().mockResolvedValue(mockContext),
    close: vi.fn().mockResolvedValue(undefined),
  }
}

function createMockPage(evaluateResult: unknown[]) {
  return {
    goto: vi.fn().mockResolvedValue(undefined),
    waitForSelector: vi.fn().mockResolvedValue(undefined),
    $: vi.fn().mockResolvedValue(null),
    evaluate: vi.fn().mockResolvedValue(evaluateResult),
    waitForTimeout: vi.fn().mockResolvedValue(undefined),
  }
}

vi.mock('playwright', () => ({
  chromium: {
    launch: vi.fn(),
  },
}))

describe('KTC Pick Value Scraper', () => {
   let scrapeKTCPickValues: typeof import('@/lib/external/ktc').scrapeKTCPickValues
   let clearKTCCache: typeof import('@/lib/external/ktc').clearKTCCache
   let getKTCCacheStatus: typeof import('@/lib/external/ktc').getKTCCacheStatus
   // @ts-expect-error - Playwright is optional devDependency, mocked in tests
   let playwrightMock: typeof import('playwright')

   beforeEach(async () => {
     vi.clearAllMocks()
     vi.resetModules()
     vi.useFakeTimers()
     vi.setSystemTime(new Date('2026-01-31T12:00:00Z'))

      // Playwright is mocked via vi.mock() above
      // @ts-expect-error - Dynamic import of mocked module
      playwrightMock = await import('playwright')

      const ktc = await import('@/lib/external/ktc')
    scrapeKTCPickValues = ktc.scrapeKTCPickValues
    clearKTCCache = ktc.clearKTCCache
    getKTCCacheStatus = ktc.getKTCCacheStatus

    clearKTCCache()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('caching', () => {
    it('returns cached data within 24-hour TTL', async () => {
      const mockPage = createMockPage([{ name: '2026 Early 1st', value: 8500, position: 'PICK' }])
      const mockBrowser = createMockBrowser(mockPage)
      vi.mocked(playwrightMock.chromium.launch).mockResolvedValue(mockBrowser as never)

      const firstCall = await scrapeKTCPickValues()
      expect(firstCall).toHaveLength(1)
      expect(playwrightMock.chromium.launch).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(23 * 60 * 60 * 1000)

      const secondCall = await scrapeKTCPickValues()
      expect(secondCall).toHaveLength(1)
      expect(playwrightMock.chromium.launch).toHaveBeenCalledTimes(1)
    })

    it('refreshes cache after 24-hour TTL expires', async () => {
      const mockPage = createMockPage([{ name: '2026 Early 1st', value: 8500, position: 'PICK' }])
      const mockBrowser = createMockBrowser(mockPage)
      vi.mocked(playwrightMock.chromium.launch).mockResolvedValue(mockBrowser as never)

      await scrapeKTCPickValues()
      expect(playwrightMock.chromium.launch).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(25 * 60 * 60 * 1000)

      await scrapeKTCPickValues()
      expect(playwrightMock.chromium.launch).toHaveBeenCalledTimes(2)
    })

    it('tracks cache status correctly', async () => {
      expect(getKTCCacheStatus()).toEqual({
        hasCachedData: false,
        cachedAt: null,
        itemCount: 0,
      })

      const mockPage = createMockPage([{ name: '2026 Early 1st', value: 8500, position: 'PICK' }])
      const mockBrowser = createMockBrowser(mockPage)
      vi.mocked(playwrightMock.chromium.launch).mockResolvedValue(mockBrowser as never)

      await scrapeKTCPickValues()

      const status = getKTCCacheStatus()
      expect(status.hasCachedData).toBe(true)
      expect(status.itemCount).toBe(1)
      expect(status.cachedAt).toBeInstanceOf(Date)
    })
  })

  describe('rate limiting', () => {
    it('enforces 10-second delay between requests', async () => {
      const mockPage = createMockPage([{ name: '2026 Early 1st', value: 8500, position: 'PICK' }])
      const mockBrowser = createMockBrowser(mockPage)
      vi.mocked(playwrightMock.chromium.launch).mockResolvedValue(mockBrowser as never)

      await scrapeKTCPickValues()
      clearKTCCache()

      vi.advanceTimersByTime(5000)

      const secondCallPromise = scrapeKTCPickValues()
      expect(playwrightMock.chromium.launch).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(5000)
      await secondCallPromise

      expect(playwrightMock.chromium.launch).toHaveBeenCalledTimes(2)
    })

    it('proceeds immediately if 10+ seconds have passed', async () => {
      const mockPage = createMockPage([{ name: '2026 Early 1st', value: 8500, position: 'PICK' }])
      const mockBrowser = createMockBrowser(mockPage)
      vi.mocked(playwrightMock.chromium.launch).mockResolvedValue(mockBrowser as never)

      await scrapeKTCPickValues()
      clearKTCCache()

      vi.advanceTimersByTime(11000)

      await scrapeKTCPickValues()
      expect(playwrightMock.chromium.launch).toHaveBeenCalledTimes(2)
    })
  })

  describe('error handling', () => {
    it('returns stale cache on scraping error', async () => {
      const mockPage = {
        goto: vi.fn().mockResolvedValue(undefined),
        waitForSelector: vi.fn().mockResolvedValue(undefined),
        $: vi.fn().mockResolvedValue(null),
        evaluate: vi.fn()
          .mockResolvedValueOnce([{ name: '2026 Early 1st', value: 8500, position: 'PICK' }])
          .mockRejectedValueOnce(new Error('Page crashed')),
        waitForTimeout: vi.fn().mockResolvedValue(undefined),
      }
      const mockBrowser = createMockBrowser(mockPage)
      vi.mocked(playwrightMock.chromium.launch).mockResolvedValue(mockBrowser as never)

      const firstResult = await scrapeKTCPickValues()
      expect(firstResult).toHaveLength(1)

      vi.advanceTimersByTime(25 * 60 * 60 * 1000)

      const secondResult = await scrapeKTCPickValues()
      expect(secondResult).toHaveLength(1)
      expect(secondResult![0].label).toBe('2026 Early 1st')
    })

    it('returns null when no cache and scraping fails', async () => {
      vi.mocked(playwrightMock.chromium.launch).mockRejectedValue(new Error('Browser failed'))

      const result = await scrapeKTCPickValues()
      expect(result).toBeNull()
    })
  })

  describe('pick parsing', () => {
    it('correctly maps scraped data to FuturePickValue', async () => {
      const mockPage = createMockPage([
        { name: '2026 Early 1st', value: 8500, position: 'PICK' },
        { name: '2026 Mid 2nd', value: 4000, position: 'PICK' },
        { name: '2027 Late 3rd', value: 1200, position: 'PICK' },
        { name: '2026 4th', value: 500, position: 'PICK' },
      ])
      const mockBrowser = createMockBrowser(mockPage)
      vi.mocked(playwrightMock.chromium.launch).mockResolvedValue(mockBrowser as never)

      const result = await scrapeKTCPickValues()

      expect(result).toHaveLength(4)

      const pick1 = result!.find((p: FuturePickValue) => p.label === '2026 Early 1st')
      expect(pick1).toMatchObject({
        season: '2026',
        round: 1,
        position: 'Early',
        value1QB: 8500,
        value2QB: 8500,
      })

      const pick2 = result!.find((p: FuturePickValue) => p.label === '2026 Mid 2nd')
      expect(pick2).toMatchObject({
        season: '2026',
        round: 2,
        position: 'Mid',
      })

      const pick3 = result!.find((p: FuturePickValue) => p.label === '2027 Late 3rd')
      expect(pick3).toMatchObject({
        season: '2027',
        round: 3,
        position: 'Late',
      })

      const pick4 = result!.find((p: FuturePickValue) => p.label === '2026 4th')
      expect(pick4).toMatchObject({
        season: '2026',
        round: 4,
        position: null,
      })
    })

    it('filters out unparseable entries', async () => {
      const mockPage = createMockPage([
        { name: '2026 Early 1st', value: 8500, position: 'PICK' },
        { name: 'Invalid Entry', value: 1000, position: 'PLAYER' },
        { name: 'Patrick Mahomes', value: 9999, position: 'QB' },
      ])
      const mockBrowser = createMockBrowser(mockPage)
      vi.mocked(playwrightMock.chromium.launch).mockResolvedValue(mockBrowser as never)

      const result = await scrapeKTCPickValues()

      expect(result).toHaveLength(1)
      expect(result![0].label).toBe('2026 Early 1st')
    })
  })

  describe('browser configuration', () => {
    it('launches browser in headless mode', async () => {
      const mockPage = createMockPage([])
      const mockBrowser = createMockBrowser(mockPage)
      vi.mocked(playwrightMock.chromium.launch).mockResolvedValue(mockBrowser as never)

      await scrapeKTCPickValues()

      expect(playwrightMock.chromium.launch).toHaveBeenCalledWith({ headless: true })
    })

    it('sets custom user agent', async () => {
      const mockPage = createMockPage([])
      const mockBrowser = createMockBrowser(mockPage)
      vi.mocked(playwrightMock.chromium.launch).mockResolvedValue(mockBrowser as never)

      await scrapeKTCPickValues()

      expect(mockBrowser.newContext).toHaveBeenCalledWith({
        userAgent: expect.stringContaining('Quantasy'),
      })
    })

    it('closes browser after scraping', async () => {
      const mockPage = createMockPage([])
      const mockBrowser = createMockBrowser(mockPage)
      vi.mocked(playwrightMock.chromium.launch).mockResolvedValue(mockBrowser as never)

      await scrapeKTCPickValues()

      expect(mockBrowser.close).toHaveBeenCalled()
    })
  })
})

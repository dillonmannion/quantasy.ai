import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { ExternalPlayerValue } from '@/lib/algorithms/types'

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

describe('FantasyCalc Player Value Scraper', () => {
  let fetchFantasyCalcPlayerValues: typeof import('@/lib/external/fantasy-calc-players').fetchFantasyCalcPlayerValues
  let clearFantasyCalcPlayerCache: typeof import('@/lib/external/fantasy-calc-players').clearFantasyCalcPlayerCache
  let getFantasyCalcPlayerCacheStatus: typeof import('@/lib/external/fantasy-calc-players').getFantasyCalcPlayerCacheStatus
  // @ts-expect-error - Playwright is optional devDependency, mocked in tests
  let playwrightMock: typeof import('playwright')

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-02T12:00:00Z'))

    // @ts-expect-error - Dynamic import of mocked module
    playwrightMock = await import('playwright')

    const mod = await import('@/lib/external/fantasy-calc-players')
    fetchFantasyCalcPlayerValues = mod.fetchFantasyCalcPlayerValues
    clearFantasyCalcPlayerCache = mod.clearFantasyCalcPlayerCache
    getFantasyCalcPlayerCacheStatus = mod.getFantasyCalcPlayerCacheStatus

    clearFantasyCalcPlayerCache()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('fetching dynasty values', () => {
    it('returns player values keyed by sleeper ID', async () => {
      const mockPage = createMockPage([
        { name: 'Patrick Mahomes', sleeperId: '4046', value: 9500, position: 'QB' },
        { name: 'Josh Allen', sleeperId: '4881', value: 9200, position: 'QB' },
      ])
      const mockBrowser = createMockBrowser(mockPage)
      vi.mocked(playwrightMock.chromium.launch).mockResolvedValue(mockBrowser as never)

      const result = await fetchFantasyCalcPlayerValues('dynasty')

      expect(Object.keys(result)).toHaveLength(2)
      expect(result['4046']).toMatchObject({
        playerId: '4046',
        source: 'FantasyCalc',
        dynasty_value: 9500,
        redraft_value: null,
      })
      expect(result['4881'].dynasty_value).toBe(9200)
    })

    it('navigates to dynasty URL', async () => {
      const mockPage = createMockPage([{ name: 'Test', sleeperId: '123', value: 100 }])
      const mockBrowser = createMockBrowser(mockPage)
      vi.mocked(playwrightMock.chromium.launch).mockResolvedValue(mockBrowser as never)

      await fetchFantasyCalcPlayerValues('dynasty')

      expect(mockPage.goto).toHaveBeenCalledWith(
        expect.stringContaining('isDynasty=true'),
        expect.any(Object)
      )
    })
  })

  describe('fetching redraft values', () => {
    it('returns player values with redraft_value populated', async () => {
      const mockPage = createMockPage([
        { name: 'Ja\'Marr Chase', sleeperId: '7564', value: 8800, position: 'WR' },
      ])
      const mockBrowser = createMockBrowser(mockPage)
      vi.mocked(playwrightMock.chromium.launch).mockResolvedValue(mockBrowser as never)

      const result = await fetchFantasyCalcPlayerValues('redraft')

      expect(result['7564']).toMatchObject({
        playerId: '7564',
        source: 'FantasyCalc',
        dynasty_value: null,
        redraft_value: 8800,
      })
    })

    it('navigates to redraft URL', async () => {
      const mockPage = createMockPage([{ name: 'Test', sleeperId: '123', value: 100 }])
      const mockBrowser = createMockBrowser(mockPage)
      vi.mocked(playwrightMock.chromium.launch).mockResolvedValue(mockBrowser as never)

      await fetchFantasyCalcPlayerValues('redraft')

      expect(mockPage.goto).toHaveBeenCalledWith(
        expect.stringContaining('isDynasty=false'),
        expect.any(Object)
      )
    })
  })

  describe('separate caches', () => {
    it('maintains separate caches for dynasty and redraft', async () => {
      const dynastyPage = createMockPage([
        { name: 'Dynasty Player', sleeperId: '1111', value: 5000 },
      ])
      const redraftPage = createMockPage([
        { name: 'Redraft Player', sleeperId: '2222', value: 3000 },
      ])
      const mockBrowser = createMockBrowser(dynastyPage)
      vi.mocked(playwrightMock.chromium.launch).mockResolvedValue(mockBrowser as never)

      const dynasty1 = await fetchFantasyCalcPlayerValues('dynasty')
      expect(dynasty1['1111']).toBeDefined()

      vi.advanceTimersByTime(11000)

      vi.mocked(playwrightMock.chromium.launch).mockResolvedValue(
        createMockBrowser(redraftPage) as never
      )
      const redraft1 = await fetchFantasyCalcPlayerValues('redraft')
      expect(redraft1['2222']).toBeDefined()

      const dynasty2 = await fetchFantasyCalcPlayerValues('dynasty')
      expect(dynasty2['1111']).toBeDefined()
      expect(playwrightMock.chromium.launch).toHaveBeenCalledTimes(2)
    })

    it('clears specific cache when format provided', async () => {
      const mockPage = createMockPage([{ name: 'Test', sleeperId: '123', value: 100 }])
      const mockBrowser = createMockBrowser(mockPage)
      vi.mocked(playwrightMock.chromium.launch).mockResolvedValue(mockBrowser as never)

      await fetchFantasyCalcPlayerValues('dynasty')
      await vi.advanceTimersByTimeAsync(11000)
      await fetchFantasyCalcPlayerValues('redraft')

      clearFantasyCalcPlayerCache('dynasty')

      const status = getFantasyCalcPlayerCacheStatus()
      expect(status.dynasty.hasCachedData).toBe(false)
      expect(status.redraft.hasCachedData).toBe(true)
    })

    it('clears all caches when no format provided', async () => {
      const mockPage = createMockPage([{ name: 'Test', sleeperId: '123', value: 100 }])
      const mockBrowser = createMockBrowser(mockPage)
      vi.mocked(playwrightMock.chromium.launch).mockResolvedValue(mockBrowser as never)

      await fetchFantasyCalcPlayerValues('dynasty')
      await vi.advanceTimersByTimeAsync(11000)
      await fetchFantasyCalcPlayerValues('redraft')

      clearFantasyCalcPlayerCache()

      const status = getFantasyCalcPlayerCacheStatus()
      expect(status.dynasty.hasCachedData).toBe(false)
      expect(status.redraft.hasCachedData).toBe(false)
    })
  })

  describe('24-hour cache TTL', () => {
    it('returns cached data within 24-hour TTL', async () => {
      const mockPage = createMockPage([{ name: 'Test', sleeperId: '123', value: 100 }])
      const mockBrowser = createMockBrowser(mockPage)
      vi.mocked(playwrightMock.chromium.launch).mockResolvedValue(mockBrowser as never)

      await fetchFantasyCalcPlayerValues('dynasty')
      expect(playwrightMock.chromium.launch).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(23 * 60 * 60 * 1000)

      await fetchFantasyCalcPlayerValues('dynasty')
      expect(playwrightMock.chromium.launch).toHaveBeenCalledTimes(1)
    })

    it('refreshes cache after 24-hour TTL expires', async () => {
      const mockPage = createMockPage([{ name: 'Test', sleeperId: '123', value: 100 }])
      const mockBrowser = createMockBrowser(mockPage)
      vi.mocked(playwrightMock.chromium.launch).mockResolvedValue(mockBrowser as never)

      await fetchFantasyCalcPlayerValues('dynasty')
      expect(playwrightMock.chromium.launch).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(25 * 60 * 60 * 1000)

      await fetchFantasyCalcPlayerValues('dynasty')
      expect(playwrightMock.chromium.launch).toHaveBeenCalledTimes(2)
    })
  })

  describe('rate limiting', () => {
    it('enforces 10-second delay between requests', async () => {
      const mockPage = createMockPage([{ name: 'Test', sleeperId: '123', value: 100 }])
      const mockBrowser = createMockBrowser(mockPage)
      vi.mocked(playwrightMock.chromium.launch).mockResolvedValue(mockBrowser as never)

      await fetchFantasyCalcPlayerValues('dynasty')
      clearFantasyCalcPlayerCache('dynasty')

      vi.advanceTimersByTime(5000)

      const secondCallPromise = fetchFantasyCalcPlayerValues('dynasty')
      expect(playwrightMock.chromium.launch).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(5000)
      await secondCallPromise

      expect(playwrightMock.chromium.launch).toHaveBeenCalledTimes(2)
    })

    it('proceeds immediately if 10+ seconds have passed', async () => {
      const mockPage = createMockPage([{ name: 'Test', sleeperId: '123', value: 100 }])
      const mockBrowser = createMockBrowser(mockPage)
      vi.mocked(playwrightMock.chromium.launch).mockResolvedValue(mockBrowser as never)

      await fetchFantasyCalcPlayerValues('dynasty')
      clearFantasyCalcPlayerCache('dynasty')

      vi.advanceTimersByTime(11000)

      await fetchFantasyCalcPlayerValues('dynasty')
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
          .mockResolvedValueOnce([{ name: 'Player A', sleeperId: '111', value: 5000 }])
          .mockRejectedValueOnce(new Error('Page crashed')),
        waitForTimeout: vi.fn().mockResolvedValue(undefined),
      }
      const mockBrowser = createMockBrowser(mockPage)
      vi.mocked(playwrightMock.chromium.launch).mockResolvedValue(mockBrowser as never)

      const firstResult = await fetchFantasyCalcPlayerValues('dynasty')
      expect(Object.keys(firstResult)).toHaveLength(1)

      vi.advanceTimersByTime(25 * 60 * 60 * 1000)

      const secondResult = await fetchFantasyCalcPlayerValues('dynasty')
      expect(Object.keys(secondResult)).toHaveLength(1)
      expect(secondResult['111'].dynasty_value).toBe(5000)
    })

    it('returns empty object when no cache and scraping fails', async () => {
      vi.mocked(playwrightMock.chromium.launch).mockRejectedValue(new Error('Browser failed'))

      const result = await fetchFantasyCalcPlayerValues('dynasty')
      expect(result).toEqual({})
    })

    it('returns empty object when page has no players', async () => {
      const mockPage = createMockPage([])
      const mockBrowser = createMockBrowser(mockPage)
      vi.mocked(playwrightMock.chromium.launch).mockResolvedValue(mockBrowser as never)

      const result = await fetchFantasyCalcPlayerValues('dynasty')
      expect(result).toEqual({})
    })
  })

  describe('cache status', () => {
    it('reports initial empty status', () => {
      const status = getFantasyCalcPlayerCacheStatus()

      expect(status.dynasty).toEqual({
        hasCachedData: false,
        cachedAt: null,
        itemCount: 0,
      })
      expect(status.redraft).toEqual({
        hasCachedData: false,
        cachedAt: null,
        itemCount: 0,
      })
    })

    it('reports status after caching', async () => {
      const mockPage = createMockPage([
        { name: 'Player A', sleeperId: '111', value: 5000 },
        { name: 'Player B', sleeperId: '222', value: 4000 },
      ])
      const mockBrowser = createMockBrowser(mockPage)
      vi.mocked(playwrightMock.chromium.launch).mockResolvedValue(mockBrowser as never)

      await fetchFantasyCalcPlayerValues('dynasty')

      const status = getFantasyCalcPlayerCacheStatus()
      expect(status.dynasty.hasCachedData).toBe(true)
      expect(status.dynasty.itemCount).toBe(2)
      expect(status.dynasty.cachedAt).toBeInstanceOf(Date)
      expect(status.redraft.hasCachedData).toBe(false)
    })
  })

  describe('browser configuration', () => {
    it('launches browser in headless mode', async () => {
      const mockPage = createMockPage([])
      const mockBrowser = createMockBrowser(mockPage)
      vi.mocked(playwrightMock.chromium.launch).mockResolvedValue(mockBrowser as never)

      await fetchFantasyCalcPlayerValues('dynasty')

      expect(playwrightMock.chromium.launch).toHaveBeenCalledWith({ headless: true })
    })

    it('sets custom user agent', async () => {
      const mockPage = createMockPage([])
      const mockBrowser = createMockBrowser(mockPage)
      vi.mocked(playwrightMock.chromium.launch).mockResolvedValue(mockBrowser as never)

      await fetchFantasyCalcPlayerValues('dynasty')

      expect(mockBrowser.newContext).toHaveBeenCalledWith({
        userAgent: expect.stringContaining('Quantasy'),
      })
    })

    it('closes browser after scraping', async () => {
      const mockPage = createMockPage([])
      const mockBrowser = createMockBrowser(mockPage)
      vi.mocked(playwrightMock.chromium.launch).mockResolvedValue(mockBrowser as never)

      await fetchFantasyCalcPlayerValues('dynasty')

      expect(mockBrowser.close).toHaveBeenCalled()
    })
  })

  describe('ExternalPlayerValue format', () => {
    it('includes updated_at timestamp', async () => {
      const mockPage = createMockPage([
        { name: 'Test Player', sleeperId: '999', value: 7500 },
      ])
      const mockBrowser = createMockBrowser(mockPage)
      vi.mocked(playwrightMock.chromium.launch).mockResolvedValue(mockBrowser as never)

      const result = await fetchFantasyCalcPlayerValues('dynasty')

      const player = result['999'] as ExternalPlayerValue
      expect(player.updated_at).toBe('2026-02-02T12:00:00.000Z')
    })

    it('sets source to FantasyCalc', async () => {
      const mockPage = createMockPage([
        { name: 'Test Player', sleeperId: '999', value: 7500 },
      ])
      const mockBrowser = createMockBrowser(mockPage)
      vi.mocked(playwrightMock.chromium.launch).mockResolvedValue(mockBrowser as never)

      const result = await fetchFantasyCalcPlayerValues('dynasty')

      expect(result['999'].source).toBe('FantasyCalc')
    })
  })
})

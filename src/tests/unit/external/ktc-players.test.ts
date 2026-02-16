import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

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

vi.mock('@/lib/external/player-id-mapping', () => ({
  getSleeperIdFromKTC: vi.fn(),
}))

describe('KTC Player Value Scraper', () => {
  let fetchKTCPlayerValues: typeof import('@/lib/external/ktc-players').fetchKTCPlayerValues
  let clearKTCPlayerCache: typeof import('@/lib/external/ktc-players').clearKTCPlayerCache
  let getKTCPlayerCacheStatus: typeof import('@/lib/external/ktc-players').getKTCPlayerCacheStatus
  let resetKTCPlayerRateLimiter: typeof import('@/lib/external/ktc-players').resetKTCPlayerRateLimiter
  // @ts-expect-error - Playwright is optional devDependency, mocked in tests
  let playwrightMock: typeof import('playwright')
  let getSleeperIdFromKTCMock: typeof import('@/lib/external/player-id-mapping').getSleeperIdFromKTC

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-31T12:00:00Z'))

    // @ts-expect-error - Dynamic import of mocked module
    playwrightMock = await import('playwright')

    const playerIdMapping = await import('@/lib/external/player-id-mapping')
    getSleeperIdFromKTCMock = playerIdMapping.getSleeperIdFromKTC as typeof getSleeperIdFromKTCMock

    const ktcPlayers = await import('@/lib/external/ktc-players')
    fetchKTCPlayerValues = ktcPlayers.fetchKTCPlayerValues
    clearKTCPlayerCache = ktcPlayers.clearKTCPlayerCache
    getKTCPlayerCacheStatus = ktcPlayers.getKTCPlayerCacheStatus
    resetKTCPlayerRateLimiter = ktcPlayers.resetKTCPlayerRateLimiter

    clearKTCPlayerCache()
    resetKTCPlayerRateLimiter()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('successful scraping with ID mapping', () => {
    it('fetches player values and maps KTC IDs to Sleeper IDs', async () => {
      const mockPage = createMockPage([
        { name: 'Patrick Mahomes', ktcId: '1234', position: 'QB', value: 9500 },
        { name: 'Ja\'Marr Chase', ktcId: '5678', position: 'WR', value: 9200 },
      ])
      const mockBrowser = createMockBrowser(mockPage)
      vi.mocked(playwrightMock.chromium.launch).mockResolvedValue(mockBrowser as never)
      vi.mocked(getSleeperIdFromKTCMock)
        .mockResolvedValueOnce('4046')
        .mockResolvedValueOnce('7564')

      const result = await fetchKTCPlayerValues()

      expect(Object.keys(result)).toHaveLength(2)
      expect(result['4046']).toMatchObject({
        playerId: '4046',
        source: 'KTC',
        dynasty_value: 9500,
        redraft_value: null,
      })
      expect(result['7564']).toMatchObject({
        playerId: '7564',
        source: 'KTC',
        dynasty_value: 9200,
        redraft_value: null,
      })
    })

    it('includes updated_at timestamp in ISO format', async () => {
      const mockPage = createMockPage([
        { name: 'Patrick Mahomes', ktcId: '1234', position: 'QB', value: 9500 },
      ])
      const mockBrowser = createMockBrowser(mockPage)
      vi.mocked(playwrightMock.chromium.launch).mockResolvedValue(mockBrowser as never)
      vi.mocked(getSleeperIdFromKTCMock).mockResolvedValue('4046')

      const result = await fetchKTCPlayerValues()

      expect(result['4046']?.updated_at).toBe('2026-01-31T12:00:00.000Z')
    })
  })

  describe('unmapped players', () => {
    it('skips players without Sleeper ID mapping', async () => {
      const mockPage = createMockPage([
        { name: 'Patrick Mahomes', ktcId: '1234', position: 'QB', value: 9500 },
        { name: 'Unknown Rookie', ktcId: '9999', position: 'WR', value: 2000 },
      ])
      const mockBrowser = createMockBrowser(mockPage)
      vi.mocked(playwrightMock.chromium.launch).mockResolvedValue(mockBrowser as never)
      vi.mocked(getSleeperIdFromKTCMock)
        .mockResolvedValueOnce('4046')
        .mockResolvedValueOnce(null)

      const result = await fetchKTCPlayerValues()

      expect(Object.keys(result)).toHaveLength(1)
      expect(result['4046']).toBeDefined()
      expect(Object.values(result).find((p) => p.dynasty_value === 2000)).toBeUndefined()
    })

    it('logs warning for unmapped players', async () => {
      const { logger } = await import('@/lib/logger')
      const warnSpy = vi.spyOn(logger, 'warn')
      const mockPage = createMockPage([
        { name: 'Unknown Player', ktcId: '9999', position: 'WR', value: 1000 },
      ])
      const mockBrowser = createMockBrowser(mockPage)
      vi.mocked(playwrightMock.chromium.launch).mockResolvedValue(mockBrowser as never)
      vi.mocked(getSleeperIdFromKTCMock).mockResolvedValue(null)

      await fetchKTCPlayerValues()

      expect(warnSpy).toHaveBeenCalledWith(
        'KTC-Players',
        expect.stringContaining('Unknown Player')
      )
    })
  })

  describe('caching', () => {
    it('returns cached data within 24-hour TTL', async () => {
      const mockPage = createMockPage([
        { name: 'Patrick Mahomes', ktcId: '1234', position: 'QB', value: 9500 },
      ])
      const mockBrowser = createMockBrowser(mockPage)
      vi.mocked(playwrightMock.chromium.launch).mockResolvedValue(mockBrowser as never)
      vi.mocked(getSleeperIdFromKTCMock).mockResolvedValue('4046')

      await fetchKTCPlayerValues()
      expect(playwrightMock.chromium.launch).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(23 * 60 * 60 * 1000)

      await fetchKTCPlayerValues()
      expect(playwrightMock.chromium.launch).toHaveBeenCalledTimes(1)
    })

    it('refreshes cache after 24-hour TTL expires', async () => {
      const mockPage = createMockPage([
        { name: 'Patrick Mahomes', ktcId: '1234', position: 'QB', value: 9500 },
      ])
      const mockBrowser = createMockBrowser(mockPage)
      vi.mocked(playwrightMock.chromium.launch).mockResolvedValue(mockBrowser as never)
      vi.mocked(getSleeperIdFromKTCMock).mockResolvedValue('4046')

      await fetchKTCPlayerValues()
      expect(playwrightMock.chromium.launch).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(25 * 60 * 60 * 1000)

      await fetchKTCPlayerValues()
      expect(playwrightMock.chromium.launch).toHaveBeenCalledTimes(2)
    })

    it('tracks cache status correctly', async () => {
      expect(getKTCPlayerCacheStatus()).toEqual({
        isValid: false,
        ageMs: null,
        playerCount: null,
      })

      const mockPage = createMockPage([
        { name: 'Patrick Mahomes', ktcId: '1234', position: 'QB', value: 9500 },
      ])
      const mockBrowser = createMockBrowser(mockPage)
      vi.mocked(playwrightMock.chromium.launch).mockResolvedValue(mockBrowser as never)
      vi.mocked(getSleeperIdFromKTCMock).mockResolvedValue('4046')

      await fetchKTCPlayerValues()

      const status = getKTCPlayerCacheStatus()
      expect(status.isValid).toBe(true)
      expect(status.playerCount).toBe(1)
      expect(status.ageMs).toBe(0)
    })
  })

  describe('rate limiting', () => {
    it('enforces 10-second delay between requests', async () => {
      const mockPage = createMockPage([
        { name: 'Patrick Mahomes', ktcId: '1234', position: 'QB', value: 9500 },
      ])
      const mockBrowser = createMockBrowser(mockPage)
      vi.mocked(playwrightMock.chromium.launch).mockResolvedValue(mockBrowser as never)
      vi.mocked(getSleeperIdFromKTCMock).mockResolvedValue('4046')

      await fetchKTCPlayerValues()
      clearKTCPlayerCache()

      vi.advanceTimersByTime(5000)

      const secondCallPromise = fetchKTCPlayerValues()
      expect(playwrightMock.chromium.launch).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(5000)
      await secondCallPromise

      expect(playwrightMock.chromium.launch).toHaveBeenCalledTimes(2)
    })

    it('proceeds immediately if 10+ seconds have passed', async () => {
      const mockPage = createMockPage([
        { name: 'Patrick Mahomes', ktcId: '1234', position: 'QB', value: 9500 },
      ])
      const mockBrowser = createMockBrowser(mockPage)
      vi.mocked(playwrightMock.chromium.launch).mockResolvedValue(mockBrowser as never)
      vi.mocked(getSleeperIdFromKTCMock).mockResolvedValue('4046')

      await fetchKTCPlayerValues()
      clearKTCPlayerCache()

      vi.advanceTimersByTime(11000)

      await fetchKTCPlayerValues()
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
          .mockResolvedValueOnce([{ name: 'Patrick Mahomes', ktcId: '1234', position: 'QB', value: 9500 }])
          .mockRejectedValueOnce(new Error('Page crashed')),
        waitForTimeout: vi.fn().mockResolvedValue(undefined),
      }
      const mockBrowser = createMockBrowser(mockPage)
      vi.mocked(playwrightMock.chromium.launch).mockResolvedValue(mockBrowser as never)
      vi.mocked(getSleeperIdFromKTCMock).mockResolvedValue('4046')

      const firstResult = await fetchKTCPlayerValues()
      expect(Object.keys(firstResult)).toHaveLength(1)

      vi.advanceTimersByTime(25 * 60 * 60 * 1000)

      const secondResult = await fetchKTCPlayerValues()
      expect(Object.keys(secondResult)).toHaveLength(1)
      expect(secondResult['4046']?.dynasty_value).toBe(9500)
    })

    it('returns empty object when no cache and scraping fails', async () => {
      vi.mocked(playwrightMock.chromium.launch).mockRejectedValue(new Error('Browser failed'))

      const result = await fetchKTCPlayerValues()
      expect(result).toEqual({})
    })

    it('returns empty object when no players found', async () => {
      const mockPage = createMockPage([])
      const mockBrowser = createMockBrowser(mockPage)
      vi.mocked(playwrightMock.chromium.launch).mockResolvedValue(mockBrowser as never)

      const result = await fetchKTCPlayerValues()
      expect(result).toEqual({})
    })
  })

  describe('browser configuration', () => {
    it('launches browser in headless mode', async () => {
      const mockPage = createMockPage([])
      const mockBrowser = createMockBrowser(mockPage)
      vi.mocked(playwrightMock.chromium.launch).mockResolvedValue(mockBrowser as never)

      await fetchKTCPlayerValues()

      expect(playwrightMock.chromium.launch).toHaveBeenCalledWith({ headless: true })
    })

    it('sets custom user agent', async () => {
      const mockPage = createMockPage([])
      const mockBrowser = createMockBrowser(mockPage)
      vi.mocked(playwrightMock.chromium.launch).mockResolvedValue(mockBrowser as never)

      await fetchKTCPlayerValues()

      expect(mockBrowser.newContext).toHaveBeenCalledWith({
        userAgent: expect.stringContaining('Quantasy'),
      })
    })

    it('closes browser after scraping', async () => {
      const mockPage = createMockPage([])
      const mockBrowser = createMockBrowser(mockPage)
      vi.mocked(playwrightMock.chromium.launch).mockResolvedValue(mockBrowser as never)

      await fetchKTCPlayerValues()

      expect(mockBrowser.close).toHaveBeenCalled()
    })
  })

  describe('dynasty-only values', () => {
    it('sets dynasty_value but leaves redraft_value null', async () => {
      const mockPage = createMockPage([
        { name: 'Ja\'Marr Chase', ktcId: '5678', position: 'WR', value: 9200 },
      ])
      const mockBrowser = createMockBrowser(mockPage)
      vi.mocked(playwrightMock.chromium.launch).mockResolvedValue(mockBrowser as never)
      vi.mocked(getSleeperIdFromKTCMock).mockResolvedValue('7564')

      const result = await fetchKTCPlayerValues()

      expect(result['7564']).toMatchObject({
        dynasty_value: 9200,
        redraft_value: null,
      })
    })
  })
})

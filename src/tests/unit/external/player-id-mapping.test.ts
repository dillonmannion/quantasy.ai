import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const MOCK_CSV_DATA = `mfl_id,sportradar_id,fantasypros_id,gsis_id,pff_id,sleeper_id,nfl_id,espn_id,yahoo_id,fleaflicker_id,cbs_id,pfr_id,cfbref_id,rotowire_id,rotoworld_id,ktc_id,stats_id,stats_global_id,fantasy_data_id,swish_id,name,merge_name,position,team,birthdate,age,draft_year,draft_round,draft_pick,draft_ovr,twitter_username,height,weight,college,db_season
17030,3c76cab3-3df2-43dd-acaa-57e055bd32d0,24755,00-0040676,133244,12522,58203,4688380,NA,NA,3168422,WardCa00,NA,16997,NA,1730,41786,0,25323,NA,Cam Ward,cam ward,QB,TEN,2002-05-25,23.7,2025,1,1,1,NA,74,219,Miami (FL),2025
17031,270e09bc-8bf8-44b0-87ed-1fd014de4ab7,25968,00-0040668,131396,12524,58349,4432762,NA,NA,26710004,SandSh00,NA,18479,NA,1731,41930,0,26079,NA,Shedeur Sanders,shedeur sanders,QB,CLE,2002-02-07,24,2025,5,6,144,NA,74,212,Colorado,2025
17032,53848cba-bcad-4cd0-bb35-0a1f6ed111d1,23160,00-0040691,146409,12508,58227,4689114,NA,NA,26694019,DartJa00,NA,18574,NA,1732,41810,0,26082,NA,Jaxson Dart,jaxson dart,QB,NYG,2003-05-13,22.7,2025,1,25,25,NA,74,223,Ole Miss,2025`

const MOCK_CSV_WITH_NA = `mfl_id,sportradar_id,fantasypros_id,gsis_id,pff_id,sleeper_id,nfl_id,espn_id,yahoo_id,fleaflicker_id,cbs_id,pfr_id,cfbref_id,rotowire_id,rotoworld_id,ktc_id,stats_id,stats_global_id,fantasy_data_id,swish_id,name,merge_name,position,team,birthdate,age,draft_year,draft_round,draft_pick,draft_ovr,twitter_username,height,weight,college,db_season
17030,abc,NA,00-0040676,133244,12522,58203,NA,NA,NA,3168422,WardCa00,NA,16997,NA,NA,41786,0,25323,NA,Cam Ward,cam ward,QB,TEN,2002-05-25,23.7,2025,1,1,1,NA,74,219,Miami (FL),2025
17031,abc,,00-0040668,131396,,58349,,NA,NA,26710004,SandSh00,NA,18479,NA,,41930,0,26079,NA,No Sleeper,no sleeper,QB,CLE,2002-02-07,24,2025,5,6,144,NA,74,212,Colorado,2025`

describe('Player ID Mapping', () => {
  let getKTCIdFromSleeper: typeof import('@/lib/external/player-id-mapping').getKTCIdFromSleeper
  let getSleeperIdFromKTC: typeof import('@/lib/external/player-id-mapping').getSleeperIdFromKTC
  let getFantasyProsIdFromSleeper: typeof import('@/lib/external/player-id-mapping').getFantasyProsIdFromSleeper
  let getESPNIdFromSleeper: typeof import('@/lib/external/player-id-mapping').getESPNIdFromSleeper
  let getPlayerIdMapping: typeof import('@/lib/external/player-id-mapping').getPlayerIdMapping
  let getPlayerIdMappingsBatch: typeof import('@/lib/external/player-id-mapping').getPlayerIdMappingsBatch
  let clearPlayerIdMappingCache: typeof import('@/lib/external/player-id-mapping').clearPlayerIdMappingCache
  let getPlayerIdMappingCacheStatus: typeof import('@/lib/external/player-id-mapping').getPlayerIdMappingCacheStatus

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-02T12:00:00Z'))

    vi.stubGlobal('fetch', vi.fn())

    const mod = await import('@/lib/external/player-id-mapping')
    getKTCIdFromSleeper = mod.getKTCIdFromSleeper
    getSleeperIdFromKTC = mod.getSleeperIdFromKTC
    getFantasyProsIdFromSleeper = mod.getFantasyProsIdFromSleeper
    getESPNIdFromSleeper = mod.getESPNIdFromSleeper
    getPlayerIdMapping = mod.getPlayerIdMapping
    getPlayerIdMappingsBatch = mod.getPlayerIdMappingsBatch
    clearPlayerIdMappingCache = mod.clearPlayerIdMappingCache
    getPlayerIdMappingCacheStatus = mod.getPlayerIdMappingCacheStatus

    clearPlayerIdMappingCache()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  describe('successful lookups', () => {
    it('maps sleeper ID to KTC ID', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(MOCK_CSV_DATA),
      } as Response)

      const ktcId = await getKTCIdFromSleeper('12522')
      expect(ktcId).toBe('1730')
    })

    it('maps KTC ID to sleeper ID', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(MOCK_CSV_DATA),
      } as Response)

      const sleeperId = await getSleeperIdFromKTC('1731')
      expect(sleeperId).toBe('12524')
    })

    it('maps sleeper ID to FantasyPros ID', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(MOCK_CSV_DATA),
      } as Response)

      const fpId = await getFantasyProsIdFromSleeper('12508')
      expect(fpId).toBe('23160')
    })

    it('maps sleeper ID to ESPN ID', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(MOCK_CSV_DATA),
      } as Response)

      const espnId = await getESPNIdFromSleeper('12522')
      expect(espnId).toBe('4688380')
    })

    it('returns full mapping record', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(MOCK_CSV_DATA),
      } as Response)

      const mapping = await getPlayerIdMapping('12522')
      expect(mapping).toEqual({
        sleeper_id: '12522',
        ktc_id: '1730',
        fantasypros_id: '24755',
        dynasty_process_id: null,
      })
    })

    it('returns multiple mappings in batch', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(MOCK_CSV_DATA),
      } as Response)

      const mappings = await getPlayerIdMappingsBatch(['12522', '12524', 'nonexistent'])
      expect(mappings.size).toBe(2)
      expect(mappings.get('12522')?.ktc_id).toBe('1730')
      expect(mappings.get('12524')?.ktc_id).toBe('1731')
      expect(mappings.has('nonexistent')).toBe(false)
    })
  })

  describe('missing mappings return null', () => {
    it('returns null for unknown sleeper ID', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(MOCK_CSV_DATA),
      } as Response)

      const ktcId = await getKTCIdFromSleeper('99999')
      expect(ktcId).toBeNull()
    })

    it('returns null for unknown KTC ID', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(MOCK_CSV_DATA),
      } as Response)

      const sleeperId = await getSleeperIdFromKTC('99999')
      expect(sleeperId).toBeNull()
    })

    it('returns null when CSV field is NA', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(MOCK_CSV_WITH_NA),
      } as Response)

      const ktcId = await getKTCIdFromSleeper('12522')
      expect(ktcId).toBeNull()

      const espnId = await getESPNIdFromSleeper('12522')
      expect(espnId).toBeNull()
    })

    it('returns null when CSV field is empty', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(MOCK_CSV_WITH_NA),
      } as Response)

      const fpId = await getFantasyProsIdFromSleeper('12522')
      expect(fpId).toBeNull()
    })

    it('skips rows without sleeper ID', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(MOCK_CSV_WITH_NA),
      } as Response)

      const mapping = await getPlayerIdMapping('')
      expect(mapping).toBeNull()
    })
  })

  describe('caching', () => {
    it('caches data and reuses within 24h TTL', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(MOCK_CSV_DATA),
      } as Response)

      await getKTCIdFromSleeper('12522')
      expect(fetch).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(23 * 60 * 60 * 1000)

      await getKTCIdFromSleeper('12524')
      expect(fetch).toHaveBeenCalledTimes(1)
    })

    it('refreshes cache after 24h TTL expires', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(MOCK_CSV_DATA),
      } as Response)

      await getKTCIdFromSleeper('12522')
      expect(fetch).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(25 * 60 * 60 * 1000)

      await getKTCIdFromSleeper('12522')
      expect(fetch).toHaveBeenCalledTimes(2)
    })

    it('clearPlayerIdMappingCache forces refresh', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(MOCK_CSV_DATA),
      } as Response)

      await getKTCIdFromSleeper('12522')
      expect(fetch).toHaveBeenCalledTimes(1)

      clearPlayerIdMappingCache()

      await getKTCIdFromSleeper('12522')
      expect(fetch).toHaveBeenCalledTimes(2)
    })

    it('reports cache status correctly', async () => {
      expect(getPlayerIdMappingCacheStatus()).toEqual({
        isValid: false,
        ageMs: null,
        playerCount: null,
      })

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(MOCK_CSV_DATA),
      } as Response)

      await getKTCIdFromSleeper('12522')

      const status = getPlayerIdMappingCacheStatus()
      expect(status.isValid).toBe(true)
      expect(status.ageMs).toBe(0)
      expect(status.playerCount).toBe(3)
    })

    it('prevents duplicate fetches with singleton promise', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(MOCK_CSV_DATA),
      } as Response)

      const [result1, result2, result3] = await Promise.all([
        getKTCIdFromSleeper('12522'),
        getKTCIdFromSleeper('12524'),
        getSleeperIdFromKTC('1730'),
      ])

      expect(fetch).toHaveBeenCalledTimes(1)
      expect(result1).toBe('1730')
      expect(result2).toBe('1731')
      expect(result3).toBe('12522')
    })
  })

  describe('CSV parsing edge cases', () => {
    it('handles quoted values with commas', async () => {
      const csvWithQuotes = `sleeper_id,ktc_id,name
12522,1730,"Ward, Cam"
12524,1731,"Sanders, Shedeur"`

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(csvWithQuotes),
      } as Response)

      const ktcId = await getKTCIdFromSleeper('12522')
      expect(ktcId).toBe('1730')
    })

    it('handles empty CSV gracefully', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(''),
      } as Response)

      const ktcId = await getKTCIdFromSleeper('12522')
      expect(ktcId).toBeNull()
    })

    it('handles CSV with only headers', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('sleeper_id,ktc_id,name'),
      } as Response)

      const ktcId = await getKTCIdFromSleeper('12522')
      expect(ktcId).toBeNull()
    })

    it('handles missing columns gracefully', async () => {
      const csvMissingColumns = `sleeper_id,name
12522,Cam Ward`

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(csvMissingColumns),
      } as Response)

      const ktcId = await getKTCIdFromSleeper('12522')
      expect(ktcId).toBeNull()

      const mapping = await getPlayerIdMapping('12522')
      expect(mapping).toEqual({
        sleeper_id: '12522',
        ktc_id: null,
        fantasypros_id: null,
        dynasty_process_id: null,
      })
    })
  })

  describe('error handling', () => {
    it('throws on fetch failure', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 404,
      } as Response)

      await expect(getKTCIdFromSleeper('12522')).rejects.toThrow('Failed to fetch player ID CSV: 404')
    })

    it('throws on network error', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

      await expect(getKTCIdFromSleeper('12522')).rejects.toThrow('Network error')
    })
  })
})

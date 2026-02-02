import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  fetchDynastyProcessPlayerValues,
  clearDynastyProcessPlayerCache,
  getDynastyProcessPlayerCacheStatus,
} from '@/lib/external/dynasty-process-players'

const MOCK_CSV = `"player","pos","team","age","draft_year","ecr_1qb","ecr_2qb","ecr_pos","value_1qb","value_2qb","scrape_date","fp_id","sleeper_id"
"Ja'Marr Chase","WR","CIN",25.9,2021,1.1,6,1.2,10232,9119,"2026-01-30","19788","4046"
"Jaxon Smith-Njigba","WR","SEA",24,2023,3.8,9.5,2.6,9603,8399,"2026-01-30","23070","9509"
"Bijan Robinson","RB","ATL",24,2023,4.4,11.8,1.2,9469,7957,"2026-01-30","23133","9226"
"No Sleeper ID","WR","DAL",26,2020,5.3,8.9,5.2,9270,8518,"2026-01-30","19202",""
"NA Sleeper ID","RB","MIN",27,2019,6.4,15.5,1.8,9034,7295,"2026-01-30","22968","NA"
"Zero Values","TE","DET",25,2021,7.5,16.3,3.4,0,0,"2026-01-30","19799","8888"`

const MOCK_CSV_HEADERS_ONLY = `"player","pos","team","age","draft_year","ecr_1qb","ecr_2qb","ecr_pos","value_1qb","value_2qb","scrape_date","fp_id","sleeper_id"`

const MOCK_CSV_MISSING_SLEEPER_COLUMN = `"player","pos","team","age","draft_year","ecr_1qb","ecr_2qb","ecr_pos","value_1qb","value_2qb","scrape_date","fp_id"
"Ja'Marr Chase","WR","CIN",25.9,2021,1.1,6,1.2,10232,9119,"2026-01-30","19788"`

describe('fetchDynastyProcessPlayerValues', () => {
  beforeEach(() => {
    clearDynastyProcessPlayerCache()
    vi.clearAllMocks()
  })

  it('fetches and parses player values successfully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => MOCK_CSV,
    })

    const result = await fetchDynastyProcessPlayerValues()

    expect(result).toBeDefined()
    expect(Object.keys(result)).toHaveLength(3)

    expect(result['4046']).toEqual({
      playerId: '4046',
      source: 'DynastyProcess',
      dynasty_value: 10232,
      redraft_value: 9119,
      updated_at: expect.any(String),
    })

    expect(result['9509']).toEqual({
      playerId: '9509',
      source: 'DynastyProcess',
      dynasty_value: 9603,
      redraft_value: 8399,
      updated_at: expect.any(String),
    })

    expect(result['9226']).toEqual({
      playerId: '9226',
      source: 'DynastyProcess',
      dynasty_value: 9469,
      redraft_value: 7957,
      updated_at: expect.any(String),
    })
  })

  it('skips players without Sleeper ID', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => MOCK_CSV,
    })

    const result = await fetchDynastyProcessPlayerValues()

    expect(result['4046']).toBeDefined()
    expect(result['']).toBeUndefined()
    expect(result['NA']).toBeUndefined()
  })

  it('skips players with zero values', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => MOCK_CSV,
    })

    const result = await fetchDynastyProcessPlayerValues()

    expect(result['8888']).toBeUndefined()
  })

  it('returns cached values on subsequent calls', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => MOCK_CSV,
    })

    const result1 = await fetchDynastyProcessPlayerValues()
    const result2 = await fetchDynastyProcessPlayerValues()

    expect(result1).toEqual(result2)
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('refetches after cache expiration', async () => {
    vi.useFakeTimers()

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => MOCK_CSV,
    })

    await fetchDynastyProcessPlayerValues()

    vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 1)

    await fetchDynastyProcessPlayerValues()

    expect(global.fetch).toHaveBeenCalledTimes(2)

    vi.useRealTimers()
  })

  it('deduplicates concurrent fetches', async () => {
    global.fetch = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                text: async () => MOCK_CSV,
              }),
            100
          )
        )
    )

    const [result1, result2, result3] = await Promise.all([
      fetchDynastyProcessPlayerValues(),
      fetchDynastyProcessPlayerValues(),
      fetchDynastyProcessPlayerValues(),
    ])

    expect(result1).toEqual(result2)
    expect(result2).toEqual(result3)
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('returns stale cache on HTTP error', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () => MOCK_CSV,
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

    const result1 = await fetchDynastyProcessPlayerValues()
    clearDynastyProcessPlayerCache()
    const result2 = await fetchDynastyProcessPlayerValues()

    expect(result1).toBeDefined()
    expect(Object.keys(result1)).toHaveLength(3)
    expect(result2).toEqual({})
  })

  it('returns empty object on network error with no cache', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    const result = await fetchDynastyProcessPlayerValues()

    expect(result).toEqual({})
  })

  it('returns stale cache on network error', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () => MOCK_CSV,
      })
      .mockRejectedValueOnce(new Error('Network error'))

    const result1 = await fetchDynastyProcessPlayerValues()

    vi.useFakeTimers()
    vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 1)

    const result2 = await fetchDynastyProcessPlayerValues()

    expect(result1).toEqual(result2)

    vi.useRealTimers()
  })

  it('handles empty CSV', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => '',
    })

    const result = await fetchDynastyProcessPlayerValues()

    expect(result).toEqual({})
  })

  it('handles CSV with headers only', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => MOCK_CSV_HEADERS_ONLY,
    })

    const result = await fetchDynastyProcessPlayerValues()

    expect(result).toEqual({})
  })

  it('handles CSV with missing sleeper_id column', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => MOCK_CSV_MISSING_SLEEPER_COLUMN,
    })

    const result = await fetchDynastyProcessPlayerValues()

    expect(result).toEqual({})
  })

  it('handles quoted values with commas', async () => {
    const csvWithCommas = `"player","pos","team","age","draft_year","ecr_1qb","ecr_2qb","ecr_pos","value_1qb","value_2qb","scrape_date","fp_id","sleeper_id"
"Smith, Jr.","WR","CIN",25.9,2021,1.1,6,1.2,10232,9119,"2026-01-30","19788","4046"`

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => csvWithCommas,
    })

    const result = await fetchDynastyProcessPlayerValues()

    expect(result['4046']).toBeDefined()
    expect(result['4046']!.playerId).toBe('4046')
  })

  it('handles NaN values gracefully', async () => {
    const csvWithNaN = `"player","pos","team","age","draft_year","ecr_1qb","ecr_2qb","ecr_pos","value_1qb","value_2qb","scrape_date","fp_id","sleeper_id"
"Test Player","WR","CIN",25.9,2021,1.1,6,1.2,invalid,9119,"2026-01-30","19788","4046"
"Test Player 2","RB","DAL",26,2020,5.3,8.9,5.2,9270,invalid,"2026-01-30","19202","9509"`

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => csvWithNaN,
    })

    const result = await fetchDynastyProcessPlayerValues()

    expect(result['4046']).toEqual({
      playerId: '4046',
      source: 'DynastyProcess',
      dynasty_value: null,
      redraft_value: 9119,
      updated_at: expect.any(String),
    })

    expect(result['9509']).toEqual({
      playerId: '9509',
      source: 'DynastyProcess',
      dynasty_value: 9270,
      redraft_value: null,
      updated_at: expect.any(String),
    })
  })

  it('skips players with both values NaN', async () => {
    const csvWithBothNaN = `"player","pos","team","age","draft_year","ecr_1qb","ecr_2qb","ecr_pos","value_1qb","value_2qb","scrape_date","fp_id","sleeper_id"
"Test Player","WR","CIN",25.9,2021,1.1,6,1.2,invalid,invalid,"2026-01-30","19788","4046"`

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => csvWithBothNaN,
    })

    const result = await fetchDynastyProcessPlayerValues()

    expect(result['4046']).toBeUndefined()
  })
})

describe('clearDynastyProcessPlayerCache', () => {
  it('clears the cache', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => MOCK_CSV,
    })

    await fetchDynastyProcessPlayerValues()
    clearDynastyProcessPlayerCache()

    const status = getDynastyProcessPlayerCacheStatus()
    expect(status.isValid).toBe(false)
    expect(status.ageMs).toBeNull()
    expect(status.playerCount).toBeNull()
  })
})

describe('getDynastyProcessPlayerCacheStatus', () => {
  beforeEach(() => {
    clearDynastyProcessPlayerCache()
  })

  it('returns invalid status when cache is empty', () => {
    const status = getDynastyProcessPlayerCacheStatus()

    expect(status.isValid).toBe(false)
    expect(status.ageMs).toBeNull()
    expect(status.playerCount).toBeNull()
  })

  it('returns valid status when cache is fresh', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => MOCK_CSV,
    })

    await fetchDynastyProcessPlayerValues()

    const status = getDynastyProcessPlayerCacheStatus()

    expect(status.isValid).toBe(true)
    expect(status.ageMs).toBeGreaterThanOrEqual(0)
    expect(status.ageMs).toBeLessThan(1000)
    expect(status.playerCount).toBe(3)
  })

  it('returns invalid status when cache is expired', async () => {
    vi.useFakeTimers()

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => MOCK_CSV,
    })

    await fetchDynastyProcessPlayerValues()

    vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 1)

    const status = getDynastyProcessPlayerCacheStatus()

    expect(status.isValid).toBe(false)
    expect(status.ageMs).toBeGreaterThan(24 * 60 * 60 * 1000)
    expect(status.playerCount).toBe(3)

    vi.useRealTimers()
  })
})

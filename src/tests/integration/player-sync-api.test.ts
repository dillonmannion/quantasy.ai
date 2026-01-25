import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/sleeper', () => ({
  syncAllPlayers: vi.fn(),
  shouldSyncPlayers: vi.fn(),
}))

import { POST, GET } from '@/app/api/players/sync/route'
import * as Supabase from '@/lib/supabase/server'
import * as SleeperCache from '@/lib/sleeper'

describe('POST /api/players/sync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    const mockGetUser = vi.fn().mockResolvedValue({ data: { user: null }, error: null })
    vi.mocked(Supabase.createClient).mockResolvedValue({
      auth: { getUser: mockGetUser },
    } as any)

    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toEqual({ error: 'Unauthorized' })
    expect(SleeperCache.shouldSyncPlayers).not.toHaveBeenCalled()
    expect(SleeperCache.syncAllPlayers).not.toHaveBeenCalled()
  })

  it('syncs players and returns count when needed', async () => {
    const mockGetUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    })
    vi.mocked(Supabase.createClient).mockResolvedValue({
      auth: { getUser: mockGetUser },
    } as any)
    vi.mocked(SleeperCache.shouldSyncPlayers).mockResolvedValue(true)
    vi.mocked(SleeperCache.syncAllPlayers).mockResolvedValue(500)

    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      success: true,
      count: 500,
      message: 'Synced 500 players',
    })
    expect(SleeperCache.shouldSyncPlayers).toHaveBeenCalledOnce()
    expect(SleeperCache.syncAllPlayers).toHaveBeenCalledOnce()
  })

  it('skips sync when players are current', async () => {
    const mockGetUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    })
    vi.mocked(Supabase.createClient).mockResolvedValue({
      auth: { getUser: mockGetUser },
    } as any)
    vi.mocked(SleeperCache.shouldSyncPlayers).mockResolvedValue(false)

    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      success: true,
      skipped: true,
      message: 'Players are up to date',
    })
    expect(SleeperCache.shouldSyncPlayers).toHaveBeenCalledOnce()
    expect(SleeperCache.syncAllPlayers).not.toHaveBeenCalled()
  })

  it('returns 500 on sync error', async () => {
    const mockGetUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    })
    vi.mocked(Supabase.createClient).mockResolvedValue({
      auth: { getUser: mockGetUser },
    } as any)
    vi.mocked(SleeperCache.shouldSyncPlayers).mockResolvedValue(true)
    vi.mocked(SleeperCache.syncAllPlayers).mockRejectedValue(new Error('Database connection failed'))

    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Failed to sync players' })
  })

  it('returns 500 when shouldSyncPlayers throws', async () => {
    const mockGetUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    })
    vi.mocked(Supabase.createClient).mockResolvedValue({
      auth: { getUser: mockGetUser },
    } as any)
    vi.mocked(SleeperCache.shouldSyncPlayers).mockRejectedValue(new Error('Database error'))

    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Failed to sync players' })
    expect(SleeperCache.syncAllPlayers).not.toHaveBeenCalled()
  })
})

describe('GET /api/players/sync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns needsSync: true when sync required', async () => {
    vi.mocked(SleeperCache.shouldSyncPlayers).mockResolvedValue(true)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      needsSync: true,
      message: 'Players need syncing',
    })
    expect(SleeperCache.shouldSyncPlayers).toHaveBeenCalledOnce()
  })

  it('returns needsSync: false when players are current', async () => {
    vi.mocked(SleeperCache.shouldSyncPlayers).mockResolvedValue(false)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      needsSync: false,
      message: 'Players are current',
    })
    expect(SleeperCache.shouldSyncPlayers).toHaveBeenCalledOnce()
  })

  it('returns 500 on error', async () => {
    vi.mocked(SleeperCache.shouldSyncPlayers).mockRejectedValue(new Error('Database connection failed'))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Failed to check player status' })
  })
})

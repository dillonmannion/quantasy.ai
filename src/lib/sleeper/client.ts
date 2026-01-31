import type {
  SleeperUser,
  SleeperLeague,
  SleeperRoster,
  SleeperMatchup,
  SleeperPlayer,
  SleeperNFLState,
  SleeperDraftPick,
  SleeperAPIError,
} from './types'
import { isSleeperAPIError } from './types'

const BASE_URL = 'https://api.sleeper.app/v1'
const DEBUG = process.env.NODE_ENV === 'development'

class RateLimiter {
  private requestTimes: number[] = []
  private readonly maxRequests: number
  private readonly windowMs: number

  constructor(maxRequests = 16, windowMs = 1000) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs
  }

  async throttle(): Promise<void> {
    const now = Date.now()

    this.requestTimes = this.requestTimes.filter(
      (time) => now - time < this.windowMs
    )

    if (this.requestTimes.length >= this.maxRequests) {
      const oldestRequest = this.requestTimes[0]!
      const waitTime = this.windowMs - (now - oldestRequest) + 10

      if (DEBUG) {
        console.log(`[Sleeper] Rate limited, waiting ${waitTime}ms`)
      }

      await new Promise((resolve) => setTimeout(resolve, waitTime))
      return this.throttle()
    }

    this.requestTimes.push(now)
  }
}

const rateLimiter = new RateLimiter()

export async function sleeperFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  await rateLimiter.throttle()

  const url = `${BASE_URL}${endpoint}`
  const startTime = Date.now()

  try {
    if (DEBUG) {
      console.log(`[Sleeper] GET ${endpoint}`)
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...options?.headers,
      },
      next: { revalidate: 60 },
    })

    const duration = Date.now() - startTime

    if (!response.ok) {
      const error: SleeperAPIError = {
        error: 'SleeperAPIError',
        message: `HTTP ${response.status}: ${response.statusText}`,
        statusCode: response.status,
      }

      if (DEBUG) {
        console.error(
          `[Sleeper] Error ${response.status} for ${endpoint} (${duration}ms)`
        )
      }

      throw error
    }

    const data = await response.json()

    if (DEBUG) {
      console.log(`[Sleeper] OK ${endpoint} (${duration}ms)`)
    }

    return data as T
  } catch (error) {
    if (isSleeperAPIError(error)) {
      throw error
    }

    console.error(`[Sleeper] Network error for ${endpoint}:`, error)
    throw {
      error: 'NetworkError',
      message: error instanceof Error ? error.message : 'Unknown error',
      statusCode: 0,
    } as SleeperAPIError
  }
}

export async function sleeperFetchNoCache<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  await rateLimiter.throttle()

  const url = `${BASE_URL}${endpoint}`
  const startTime = Date.now()

  try {
    if (DEBUG) {
      console.log(`[Sleeper] GET ${endpoint} (no-cache)`)
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...options?.headers,
      },
      cache: 'no-store',
      next: { revalidate: 0 },
    })

    const duration = Date.now() - startTime

    if (!response.ok) {
      const error: SleeperAPIError = {
        error: 'SleeperAPIError',
        message: `HTTP ${response.status}: ${response.statusText}`,
        statusCode: response.status,
      }

      if (DEBUG) {
        console.error(
          `[Sleeper] Error ${response.status} for ${endpoint} (${duration}ms)`
        )
      }

      throw error
    }

    const data = await response.json()

    if (DEBUG) {
      console.log(`[Sleeper] OK ${endpoint} (${duration}ms)`)
    }

    return data as T
  } catch (error) {
    if (isSleeperAPIError(error)) {
      throw error
    }

    console.error(`[Sleeper] Network error for ${endpoint}:`, error)
    throw {
      error: 'NetworkError',
      message: error instanceof Error ? error.message : 'Unknown error',
      statusCode: 0,
    } as SleeperAPIError
  }
}

export async function getNFLState(): Promise<SleeperNFLState> {
  return sleeperFetch<SleeperNFLState>('/state/nfl')
}

export async function getUserByUsername(
  username: string
): Promise<SleeperUser | null> {
  try {
    const user = await sleeperFetch<SleeperUser>(
      `/user/${encodeURIComponent(username)}`
    )
    return user
  } catch (error) {
    if (isSleeperAPIError(error) && error.statusCode === 404) {
      return null
    }
    throw error
  }
}

export async function getUserById(userId: string): Promise<SleeperUser | null> {
  try {
    return await sleeperFetch<SleeperUser>(`/user/${userId}`)
  } catch (error) {
    if (isSleeperAPIError(error) && error.statusCode === 404) {
      return null
    }
    throw error
  }
}

export async function getUserLeagues(
  userId: string,
  season: string
): Promise<SleeperLeague[]> {
  return sleeperFetch<SleeperLeague[]>(
    `/user/${userId}/leagues/nfl/${season}`
  )
}

export async function getLeague(leagueId: string): Promise<SleeperLeague> {
  return sleeperFetch<SleeperLeague>(`/league/${leagueId}`)
}

export async function getLeagueRosters(
  leagueId: string
): Promise<SleeperRoster[]> {
  return sleeperFetch<SleeperRoster[]>(`/league/${leagueId}/rosters`)
}

export async function getLeagueUsers(
  leagueId: string
): Promise<SleeperUser[]> {
  return sleeperFetch<SleeperUser[]>(`/league/${leagueId}/users`)
}

export async function getMatchups(
  leagueId: string,
  week: number
): Promise<SleeperMatchup[]> {
  return sleeperFetch<SleeperMatchup[]>(
    `/league/${leagueId}/matchups/${week}`
  )
}

export async function getAllPlayers(): Promise<Record<string, SleeperPlayer>> {
  return sleeperFetch<Record<string, SleeperPlayer>>('/players/nfl')
}

export async function getCurrentSeason(): Promise<string> {
  const state = await getNFLState()
  return state.season
}

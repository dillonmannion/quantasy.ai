/**
 * Request-level deduplication layer using React cache()
 * 
 * Wraps Sleeper API functions to deduplicate identical requests
 * within a single React Server Component render pass.
 * 
 * NOTE: React cache() only works in RSC context. Deduplication
 * is verified via server logs in Task 7, not unit tests.
 */

import { cache } from 'react'
import { getAllPlayers } from './client'
import { getCachedLeague, getCachedRosters } from './cache'
import type { SleeperPlayer, SleeperLeague, SleeperRoster } from './types'

/**
 * Deduplicated version of getAllPlayers()
 * 
 * Multiple calls within the same render pass will only execute once.
 * TTL: 24h (from Supabase cache in syncAllPlayers)
 */
export const getDedupedPlayers = cache(
  async (): Promise<Record<string, SleeperPlayer>> => {
    return getAllPlayers()
  }
)

/**
 * Deduplicated version of getCachedLeague()
 * 
 * Multiple calls with the same leagueId within the same render pass
 * will only execute once.
 * TTL: 1h (from Supabase cache in getCachedLeague)
 */
export const getDedupedLeague = cache(
  async (leagueId: string): Promise<SleeperLeague> => {
    return getCachedLeague(leagueId)
  }
)

/**
 * Deduplicated version of getCachedRosters()
 * 
 * Multiple calls with the same leagueId within the same render pass
 * will only execute once.
 * TTL: 15m (from Supabase cache in getCachedRosters)
 */
export const getDedupedRosters = cache(
  async (leagueId: string): Promise<SleeperRoster[]> => {
    return getCachedRosters(leagueId)
  }
)

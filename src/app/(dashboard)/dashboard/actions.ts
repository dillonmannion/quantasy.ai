'use server'

import { revalidatePath } from 'next/cache'
import {
  invalidateLeagueCache,
  getCachedLeague,
  getCachedRosters,
} from '@/lib/sleeper'

export async function refreshLeagueData(
  leagueId: string
): Promise<{ success: boolean }> {
  try {
    await invalidateLeagueCache(leagueId)
    await getCachedLeague(leagueId)
    await getCachedRosters(leagueId)
    revalidatePath('/dashboard')

    return { success: true }
  } catch (error) {
    console.error('[Dashboard] Refresh error:', error)
    return { success: false }
  }
}

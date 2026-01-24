'use server'

import { createClient } from '@/lib/supabase/server'
import {
  getUserByUsername,
  getUserLeagues,
  getCurrentSeason,
  getCachedLeague,
  getCachedRosters,
} from '@/lib/sleeper'
import type { SleeperLeague, SleeperUser } from '@/lib/sleeper/types'

interface SearchResult {
  success: boolean
  error?: string
  user?: SleeperUser
  leagues?: SleeperLeague[]
}

interface ConnectParams {
  leagueId: string
  sleeperUserId: string
  sleeperUsername: string
  sleeperAvatar: string | null
}

interface ConnectResult {
  success: boolean
  error?: string
}

export async function searchSleeperUser(username: string): Promise<SearchResult> {
  try {
    const sleeperUser = await getUserByUsername(username)

    if (!sleeperUser) {
      return {
        success: false,
        error: `No Sleeper user found with username "${username}"`,
      }
    }

    const season = await getCurrentSeason()
    const leagues = await getUserLeagues(sleeperUser.user_id, season)
    const nflLeagues = leagues.filter((l) => l.sport === 'nfl')

    return {
      success: true,
      user: sleeperUser,
      leagues: nflLeagues,
    }
  } catch (error) {
    console.error('[Connect] Search user error:', error)
    return {
      success: false,
      error: 'Failed to search for user. Please try again.',
    }
  }
}

export async function connectLeague(params: ConnectParams): Promise<ConnectResult> {
  const { leagueId, sleeperUserId, sleeperUsername, sleeperAvatar } = params

  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'You must be logged in to connect a league' }
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        sleeper_user_id: sleeperUserId,
        sleeper_username: sleeperUsername,
        sleeper_avatar: sleeperAvatar,
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', user.id)

    if (profileError) {
      console.error('[Connect] Profile update error:', profileError)
    }

    await getCachedLeague(leagueId)
    const rosters = await getCachedRosters(leagueId)
    const userRoster = rosters.find((r) => r.owner_id === sleeperUserId)

    const { data: existingConnection } = await supabase
      .from('user_leagues')
      .select('league_id')
      .eq('user_id', user.id)
      .eq('league_id', leagueId)
      .single()

    if (existingConnection) {
      await supabase
        .from('user_leagues')
        .update({ roster_id: userRoster?.roster_id ?? null } as never)
        .eq('user_id', user.id)
        .eq('league_id', leagueId)
    } else {
      const { error: connectError } = await supabase
        .from('user_leagues')
        .insert({
          user_id: user.id,
          league_id: leagueId,
          roster_id: userRoster?.roster_id ?? null,
          is_owner: false,
        } as never)

      if (connectError) {
        console.error('[Connect] Insert user_league error:', connectError)
        return { success: false, error: 'Failed to save league connection' }
      }
    }

    return { success: true }
  } catch (error) {
    console.error('[Connect] Connect league error:', error)
    return {
      success: false,
      error: 'Failed to connect league. Please try again.',
    }
  }
}

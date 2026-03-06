import { createServiceClient } from '@/lib/supabase/admin'
import {
  getUserByUsername,
  getUserLeagues,
  getCurrentSeason,
  getCachedLeague,
  getCachedRosters,
} from '@/lib/sleeper'
import { NextResponse } from 'next/server'

/**
 * Dev-only endpoint that generates a magic link token without sending an email.
 * Uses the Supabase admin client to create the user (if needed) and generate
 * a verification token, which the client redirects through /auth/callback.
 *
 * Also auto-connects the Sleeper account (ADMIN_SLEEPER_USERNAME) so the
 * dashboard has league data immediately after login.
 *
 * Gated by:
 *  1. NODE_ENV !== 'production'
 *  2. ADMIN_EMAIL env var must be set
 *  3. Request email must match ADMIN_EMAIL
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 })
  }

  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) {
    return NextResponse.json(
      { error: 'ADMIN_EMAIL not configured' },
      { status: 400 }
    )
  }

  const body = (await request.json()) as { email: string }
  if (body.email !== adminEmail) {
    return NextResponse.json({ error: 'Not an admin email' }, { status: 403 })
  }

  const admin = createServiceClient()

  const { error: createError } = await admin.auth.admin.createUser({
    email: adminEmail,
    email_confirm: true,
  })

  if (createError && !createError.message.includes('already been registered')) {
    console.error('[DevLogin] Failed to create user:', createError.message)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: adminEmail,
  })

  if (error || !data) {
    console.error('[DevLogin] Failed to generate link:', error?.message)
    return NextResponse.json(
      { error: error?.message ?? 'Failed to generate link' },
      { status: 500 }
    )
  }

  const userId = data.user.id
  await autoConnectSleeper(admin, userId)

  return NextResponse.json({
    hashed_token: data.properties.hashed_token,
    verification_type: data.properties.verification_type,
  })
}

async function autoConnectSleeper(
  admin: ReturnType<typeof createServiceClient>,
  userId: string
) {
  const sleeperUsername = process.env.ADMIN_SLEEPER_USERNAME
  if (!sleeperUsername) return

  const { data: profile } = await admin
    .from('profiles')
    .select('sleeper_user_id')
    .eq('id', userId)
    .single()

  if (profile?.sleeper_user_id) return

  try {
    const sleeperUser = await getUserByUsername(sleeperUsername)
    if (!sleeperUser) {
      console.error('[DevLogin] Sleeper user not found:', sleeperUsername)
      return
    }

    await admin
      .from('profiles')
      .update({
        sleeper_user_id: sleeperUser.user_id,
        sleeper_username: sleeperUser.username,
        sleeper_avatar: sleeperUser.avatar,
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', userId)

    const targetLeagueId = process.env.ADMIN_SLEEPER_LEAGUE_ID
    let nflLeague

    if (targetLeagueId) {
      nflLeague = await getCachedLeague(targetLeagueId)
    } else {
      const season = await getCurrentSeason()
      const leagues = await getUserLeagues(sleeperUser.user_id, season)
      nflLeague = leagues.find((l) => l.sport === 'nfl')
    }

    if (!nflLeague) return

    if (!targetLeagueId) await getCachedLeague(nflLeague.league_id)
    const rosters = await getCachedRosters(nflLeague.league_id)
    const userRoster = rosters.find((r) => r.owner_id === sleeperUser.user_id)

    const { data: existing } = await admin
      .from('user_leagues')
      .select('league_id')
      .eq('user_id', userId)
      .eq('league_id', nflLeague.league_id)
      .single()

    if (!existing) {
      await admin.from('user_leagues').insert({
        user_id: userId,
        league_id: nflLeague.league_id,
        roster_id: userRoster?.roster_id ?? null,
        is_owner: false,
      } as never)
    }

    console.log('[DevLogin] Auto-connected league:', nflLeague.name)
  } catch (err) {
    console.error('[DevLogin] Auto-connect failed:', err)
  }
}

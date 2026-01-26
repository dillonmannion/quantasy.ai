import { chromium, type FullConfig } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const TEST_EMAIL = 'e2e-test@quantasy.test'
const TEST_PASSWORD = 'test-password-123!'

export default async function globalSetup(config: FullConfig) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3000'

  if (!supabaseUrl || !serviceRoleKey) {
    console.log('[E2E Setup] Skipping auth setup - no Supabase credentials')
    return
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  console.log('[E2E Setup] Creating/verifying test user...')

  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  let testUser = existingUsers?.users?.find(u => u.email === TEST_EMAIL)

  if (!testUser) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    })
    if (error) {
      console.error('[E2E Setup] Failed to create test user:', error.message)
      return
    }
    testUser = data.user
    console.log('[E2E Setup] Created test user:', testUser.id)
  } else {
    console.log('[E2E Setup] Using existing test user:', testUser.id)
  }

  console.log('[E2E Setup] Seeding test data...')

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: testUser.id,
      sleeper_user_id: 'test-sleeper-user-123',
      sleeper_username: 'testuser',
    }, { onConflict: 'id' })

  if (profileError) {
    console.error('[E2E Setup] Failed to upsert profile:', profileError.message)
  }

  const { error: leagueInsertError } = await supabase
    .from('leagues')
    .upsert({
      id: '987654321',
      name: 'Test Fantasy League',
      season: '2025',
      status: 'in_season',
      total_rosters: 12,
      settings: { type: 0, playoff_week_start: 15, num_teams: 12, playoff_teams: 6, leg: 1 },
      scoring_settings: { rec: 1 },
      roster_positions: ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DEF'],
    }, { onConflict: 'id' })

  if (leagueInsertError) {
    console.error('[E2E Setup] Failed to upsert league:', leagueInsertError.message)
  }

  const { error: leagueError } = await supabase
    .from('user_leagues')
    .upsert({
      user_id: testUser.id,
      league_id: '987654321',
      roster_id: 1,
      is_owner: true,
    }, { onConflict: 'user_id,league_id' })

  if (leagueError) {
    console.error('[E2E Setup] Failed to upsert user_league:', leagueError.message)
  }

  const testPlayers = [
    { id: '4046', full_name: 'Patrick Mahomes', position: 'QB', team: 'KC', projected_points: 380, sleeper_data: { player_id: '4046' } },
    { id: '5850', full_name: 'Josh Allen', position: 'QB', team: 'BUF', projected_points: 370, sleeper_data: { player_id: '5850' } },
    { id: '4866', full_name: 'Saquon Barkley', position: 'RB', team: 'PHI', projected_points: 310, sleeper_data: { player_id: '4866' } },
    { id: '6797', full_name: 'Jonathan Taylor', position: 'RB', team: 'IND', projected_points: 290, sleeper_data: { player_id: '6797' } },
    { id: '6786', full_name: 'CeeDee Lamb', position: 'WR', team: 'DAL', projected_points: 280, sleeper_data: { player_id: '6786' } },
    { id: '4035', full_name: "Ja'Marr Chase", position: 'WR', team: 'CIN', projected_points: 275, sleeper_data: { player_id: '4035' } },
    { id: '4034', full_name: 'Travis Kelce', position: 'TE', team: 'KC', projected_points: 250, sleeper_data: { player_id: '4034' } },
    { id: '6794', full_name: 'Justin Herbert', position: 'QB', team: 'LAC', projected_points: 340, sleeper_data: { player_id: '6794' } },
    { id: '7564', full_name: 'Breece Hall', position: 'RB', team: 'NYJ', projected_points: 270, sleeper_data: { player_id: '7564' } },
    { id: '4199', full_name: 'Tyreek Hill', position: 'WR', team: 'MIA', projected_points: 265, sleeper_data: { player_id: '4199' } },
  ]

  for (const player of testPlayers) {
    const { error: playerError } = await supabase
      .from('players')
      .upsert(player, { onConflict: 'id' })

    if (playerError) {
      console.error(`[E2E Setup] Failed to upsert player ${player.id}:`, playerError.message)
    }
  }

  console.log('[E2E Setup] Seeded', testPlayers.length, 'test players')

  console.log('[E2E Setup] Generating session...')

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!anonKey) {
    console.error('[E2E Setup] Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')
    return
  }

  const anonClient = createClient(supabaseUrl, anonKey)
  const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  })

  if (signInError || !signInData.session) {
    console.error('[E2E Setup] Failed to sign in:', signInError?.message)
    return
  }

  console.log('[E2E Setup] Session created successfully')

  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  await page.goto(baseURL)

  const cookieBase = {
    domain: new URL(baseURL).hostname,
    path: '/',
    httpOnly: true,
    secure: false,
    sameSite: 'Lax' as const,
  }

  await context.addCookies([
    {
      name: `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`,
      value: JSON.stringify({
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
        expires_at: signInData.session.expires_at,
        expires_in: signInData.session.expires_in,
        token_type: 'bearer',
        user: signInData.session.user,
      }),
      ...cookieBase,
    },
  ])

  await page.goto(`${baseURL}/dashboard`, { waitUntil: 'networkidle', timeout: 30000 })
  
  const currentUrl = page.url()
  if (currentUrl.includes('/login')) {
    console.log('[E2E Setup] Warning: Still redirected to login after setting cookies')
  } else {
    console.log('[E2E Setup] Auth successful, on:', currentUrl)
  }

  await context.storageState({ path: 'tests/e2e/.auth/user.json' })
  await browser.close()

  console.log('[E2E Setup] Complete!')
}

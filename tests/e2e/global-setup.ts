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
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3000'

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    console.log('[E2E Setup] Skipping - missing Supabase credentials')
    return
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  console.log('[E2E Setup] Creating test user...')
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  let testUser = existingUsers?.users?.find(u => u.email === TEST_EMAIL)

  if (!testUser) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    })
    if (error) throw new Error(`Failed to create test user: ${error.message}`)
    testUser = data.user
  }

  await supabase.from('profiles').upsert({
    id: testUser.id,
    sleeper_user_id: 'test-sleeper-user-123',
    sleeper_username: 'testuser',
  }, { onConflict: 'id' })

  await supabase.from('user_leagues').upsert({
    user_id: testUser.id,
    league_id: '987654321',
    roster_id: 1,
    is_owner: true,
  }, { onConflict: 'user_id,league_id' })

  console.log('[E2E Setup] Generating session...')
  const anonClient = createClient(supabaseUrl, anonKey)
  const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  })
  if (signInError) throw new Error(`Failed to sign in: ${signInError.message}`)

  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto(baseURL)

  await context.addCookies([{
    name: `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`,
    value: JSON.stringify({
      access_token: signInData.session!.access_token,
      refresh_token: signInData.session!.refresh_token,
      expires_at: signInData.session!.expires_at,
      expires_in: signInData.session!.expires_in,
      token_type: 'bearer',
      user: signInData.session!.user,
    }),
    domain: new URL(baseURL).hostname,
    path: '/',
    httpOnly: true,
    secure: false,
    sameSite: 'Lax',
  }])

  await context.storageState({ path: 'tests/e2e/.auth/user.json' })
  await browser.close()

  console.log('[E2E Setup] Complete!')
}

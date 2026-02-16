import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY
  ?? process.env.SUPABASE_SERVICE_ROLE_KEY
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const TEST_EMAIL = 'e2e-test@quantasy.test'
const TEST_PASSWORD = 'test-password-123!'

const RLS_TEST_IDS = [
  'rls-test-league',
  'rls-test-direct-auth',
  'rls-test-direct-service',
  'rls-test-shared-cache-league',
  'rls-test-non-member-league',
]

async function cleanupRlsTestData() {
  if (!SECRET_KEY) {
    return
  }

  const serviceClient = createClient(SUPABASE_URL!, SECRET_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  await serviceClient.from('algorithm_outputs').delete().in('league_id', RLS_TEST_IDS)
  await serviceClient.from('user_leagues').delete().in('league_id', RLS_TEST_IDS)
  await serviceClient.from('rosters').delete().in('league_id', RLS_TEST_IDS)
  await serviceClient.from('leagues').delete().in('id', RLS_TEST_IDS)
}

test.describe('RLS Policy Verification', () => {
  test.beforeAll(async () => {
    await cleanupRlsTestData()

    if (!SECRET_KEY) {
      return
    }

    const serviceClient = createClient(SUPABASE_URL!, SECRET_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: leagueCheck } = await serviceClient
      .from('leagues')
      .select('id')
      .in('id', RLS_TEST_IDS)

    expect(leagueCheck).toEqual([])
  })

  test.afterAll(async () => {
    await cleanupRlsTestData()
  })

   test('connect flow succeeds for new league (cache write with service client)', async ({
     page,
   }) => {
     await page.goto('/connect')

     const input = page.locator('input#username')
     await input.click()
     await input.fill('testuser')
     await input.press('Tab')
     await page.click('button[type="submit"]')

     await expect(page.locator('text=Test Fantasy League')).toBeVisible({ timeout: 15000 })
     await expect(page.locator('text=RLS Test League')).toBeVisible()

     await page.click('text=RLS Test League')

     await expect(page.locator('text=League Connected!')).toBeVisible({
       timeout: 15000,
     })
   })

  test('authenticated client cannot write to leagues table (RLS policy blocks)', async () => {
    if (!SECRET_KEY) {
      test.skip()
      return
    }

    const anonClient = createClient(SUPABASE_URL!, PUBLISHABLE_KEY!)
    const {
      data: { session },
    } = await anonClient.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    })
    expect(session).not.toBeNull()

    const { error } = await anonClient.from('leagues').insert({
      id: 'rls-test-direct-auth',
      name: 'RLS Test Direct Auth',
      season: '2025',
    })

    expect(error).not.toBeNull()
    expect(error?.code).toBe('42501')
  })

  test('service role client CAN write to leagues table (RLS allows)', async () => {
    if (!SECRET_KEY) {
      test.skip()
      return
    }

    const serviceClient = createClient(SUPABASE_URL!, SECRET_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { error } = await serviceClient.from('leagues').insert({
      id: 'rls-test-direct-service',
      name: 'RLS Test Direct Service',
      season: '2025',
    })

    expect(error).toBeNull()

    await serviceClient.from('leagues').delete().eq('id', 'rls-test-direct-service')
  })

  test('shared VBD cache is readable by league members', async () => {
    if (!SECRET_KEY) {
      test.skip()
      return
    }

    const serviceClient = createClient(SUPABASE_URL!, SECRET_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const anonClient = createClient(SUPABASE_URL!, PUBLISHABLE_KEY!)
    const { data: authData } = await anonClient.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    })
    expect(authData.session).not.toBeNull()
    const userId = authData.session!.user.id

    await serviceClient.from('leagues').insert({
      id: 'rls-test-shared-cache-league',
      name: 'RLS Test Shared Cache League',
      season: '2025',
    })

    await serviceClient.from('user_leagues').insert({
      user_id: userId,
      league_id: 'rls-test-shared-cache-league',
      roster_id: 1,
      is_owner: false,
    })

    await serviceClient.from('algorithm_outputs').insert({
      algorithm_type: 'vbd',
      cache_key: 'vbd:rls-test-shared-cache-league:hash:hash:1',
      league_id: 'rls-test-shared-cache-league',
      user_id: null,
      input_params: { leagueId: 'rls-test-shared-cache-league' },
      output_data: { rankings: [], baselines: {} },
      explanation: {},
      expires_at: new Date(Date.now() + 3600000).toISOString(),
    })

    const { data: cacheRead, error: readError } = await anonClient
      .from('algorithm_outputs')
      .select('output_data')
      .eq('cache_key', 'vbd:rls-test-shared-cache-league:hash:hash:1')
      .single()

    expect(readError).toBeNull()
    expect(cacheRead).not.toBeNull()
    expect(cacheRead?.output_data).toHaveProperty('rankings')
  })

  test('shared VBD cache is NOT readable for non-member leagues', async () => {
    if (!SECRET_KEY) {
      test.skip()
      return
    }

    const serviceClient = createClient(SUPABASE_URL!, SECRET_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const anonClient = createClient(SUPABASE_URL!, PUBLISHABLE_KEY!)
    const { data: authData } = await anonClient.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    })
    expect(authData.session).not.toBeNull()

    await serviceClient.from('leagues').insert({
      id: 'rls-test-non-member-league',
      name: 'RLS Test Non-Member League',
      season: '2025',
    })

    await serviceClient.from('algorithm_outputs').insert({
      algorithm_type: 'vbd',
      cache_key: 'vbd:rls-test-non-member-league:hash:hash:1',
      league_id: 'rls-test-non-member-league',
      user_id: null,
      input_params: { leagueId: 'rls-test-non-member-league' },
      output_data: { rankings: [], baselines: {} },
      explanation: {},
      expires_at: new Date(Date.now() + 3600000).toISOString(),
    })

    const { data: cacheRead, error: readError } = await anonClient
      .from('algorithm_outputs')
      .select('output_data')
      .eq('cache_key', 'vbd:rls-test-non-member-league:hash:hash:1')
      .single()

    expect(readError).not.toBeNull()
    expect(cacheRead).toBeNull()
  })
})

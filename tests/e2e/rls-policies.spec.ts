import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const TEST_EMAIL = 'e2e-test@quantasy.test'
const TEST_PASSWORD = 'test-password-123!'

const RLS_TEST_IDS = [
  'rls-test-league',
  'rls-test-direct-auth',
  'rls-test-direct-service',
]

async function cleanupRlsTestData() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  await serviceClient.from('user_leagues').delete().eq('league_id', 'rls-test-league')
  await serviceClient.from('rosters').delete().eq('league_id', 'rls-test-league')
  await serviceClient.from('leagues').delete().in('id', RLS_TEST_IDS)
}

test.describe('RLS Policy Verification', () => {
  test.beforeAll(async () => {
    await cleanupRlsTestData()

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
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
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      test.skip()
      return
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const anonClient = createClient(supabaseUrl, anonKey)
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
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      test.skip()
      return
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
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
})

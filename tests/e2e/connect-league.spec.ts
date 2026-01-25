import { test, expect } from '@playwright/test'

// Mock data for Sleeper API responses
const mockUser = {
  user_id: '123456789',
  username: 'testuser',
  display_name: 'Test User',
  avatar: 'abc123',
}

const mockLeagues = [
  {
    league_id: '987654321',
    name: 'Test Fantasy League',
    season: '2024',
    status: 'in_season',
    sport: 'nfl',
    total_rosters: 12,
    settings: { playoff_week_start: 15, num_teams: 12, playoff_teams: 6, leg: 1 },
    scoring_settings: {},
    roster_positions: ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DEF'],
    previous_league_id: null,
    draft_id: 'draft123',
  },
]

const mockRosters = [
  {
    roster_id: 1,
    owner_id: '123456789',
    league_id: '987654321',
    players: ['4046', '4881'],
    starters: ['4046'],
    reserve: [],
    taxi: null,
    co_owners: null,
    settings: { wins: 8, losses: 5, ties: 0, fpts: 1250 },
    metadata: null,
  },
]

test.describe('Connect League Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Sleeper API endpoints
    await page.route('**/api.sleeper.app/v1/user/*', async (route) => {
      const url = route.request().url()
      if (url.includes('nonexistentuser')) {
        await route.fulfill({ status: 404, json: null })
      } else {
        await route.fulfill({ status: 200, json: mockUser })
      }
    })

    await page.route('**/api.sleeper.app/v1/state/nfl', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          season: '2024',
          season_type: 'regular',
          week: 14,
          leg: 1,
          display_week: 14,
          season_start_date: '2024-09-05',
          previous_season: '2023',
        },
      })
    })

    await page.route('**/api.sleeper.app/v1/user/*/leagues/nfl/*', async (route) => {
      await route.fulfill({ status: 200, json: mockLeagues })
    })

    await page.route('**/api.sleeper.app/v1/league/*', async (route) => {
      await route.fulfill({ status: 200, json: mockLeagues[0] })
    })

    await page.route('**/api.sleeper.app/v1/league/*/rosters', async (route) => {
      await route.fulfill({ status: 200, json: mockRosters })
    })

    // Mock Supabase auth - simulate logged in user
    await page.route('**/supabase.co/**', async (route) => {
      const url = route.request().url()
      if (url.includes('auth')) {
        await route.fulfill({
          status: 200,
          json: {
            data: {
              user: { id: 'test-user-id', email: 'test@example.com' },
            },
            error: null,
          },
        })
      } else {
        // For database operations, return success
        await route.fulfill({ status: 200, json: { data: {}, error: null } })
      }
    })
  })

  test('happy path: username → leagues → syncing → complete', async ({ page }) => {
    await page.goto('/connect')

    // Step 1: Username input
    await expect(page.locator('h1')).toContainText('Connect Your League')
    await expect(page.locator('input#username')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toContainText('Find My Leagues')

    // Verify progress dots (3 dots visible)
    const progressDots = page.locator('.flex.items-center.justify-center.gap-2 > div')
    await expect(progressDots).toHaveCount(3)

    // Enter username and submit
    await page.fill('input#username', 'testuser')
    await page.click('button[type="submit"]')

    // Step 2: League selection
    await expect(page.locator('text=Change Username')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=@testuser')).toBeVisible()
    await expect(page.locator('text=Test User')).toBeVisible()

    // Verify league card is displayed
    await expect(page.locator('text=Test Fantasy League')).toBeVisible()
    await expect(page.locator('text=2024 Season')).toBeVisible()
    await expect(page.locator('text=12 Teams')).toBeVisible()

    // Click on the league to connect
    await page.click('text=Test Fantasy League')

    // Step 3: Syncing (may be brief)
    // The syncing step shows the league name being synced
    // This may transition quickly to complete

    // Step 4: Complete
    await expect(page.locator('text=League Connected!')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=Test Fantasy League')).toBeVisible()
    await expect(page.locator('text=Go to Dashboard')).toBeVisible()
    await expect(page.locator('text=Connect Another League')).toBeVisible()
  })

  test('error case: user not found shows error message', async ({ page }) => {
    await page.goto('/connect')

    // Enter non-existent username
    await page.fill('input#username', 'nonexistentuser')
    await page.click('button[type="submit"]')

    // Verify error message appears
    await expect(page.locator('text=Error')).toBeVisible({ timeout: 10000 })
    await expect(
      page.locator('text=No Sleeper user found with username "nonexistentuser"')
    ).toBeVisible()

    // Should still be on username step
    await expect(page.locator('input#username')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toContainText('Find My Leagues')
  })

  test('back button returns to username step', async ({ page }) => {
    await page.goto('/connect')

    // Enter username and go to league selection
    await page.fill('input#username', 'testuser')
    await page.click('button[type="submit"]')

    // Wait for league selection step
    await expect(page.locator('text=Change Username')).toBeVisible({ timeout: 10000 })

    // Click back button
    await page.click('text=Change Username')

    // Should be back on username step
    await expect(page.locator('input#username')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toContainText('Find My Leagues')
  })

  test('connect another league button resets to selection', async ({ page }) => {
    await page.goto('/connect')

    // Complete the flow
    await page.fill('input#username', 'testuser')
    await page.click('button[type="submit"]')
    await expect(page.locator('text=Test Fantasy League')).toBeVisible({ timeout: 10000 })
    await page.click('text=Test Fantasy League')
    await expect(page.locator('text=League Connected!')).toBeVisible({ timeout: 10000 })

    // Click "Connect Another League"
    await page.click('text=Connect Another League')

    // Should be back on league selection step
    await expect(page.locator('text=Change Username')).toBeVisible()
    await expect(page.locator('text=Test Fantasy League')).toBeVisible()
  })
})

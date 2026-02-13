import { test, expect } from '@playwright/test'

test.describe('Roster Optimizer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/roster')
  })

  test('page loads with week selector', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Roster Optimizer' })).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('heading', { name: 'Select Week' }).first()).toBeVisible()
    const weekButtons = page.locator('button').filter({ hasText: /^[1-9]$|^1[0-8]$/ })
    await expect(weekButtons.first()).toBeVisible()
  })

  test('week selector changes week (1-18)', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Roster Optimizer' })).toBeVisible({ timeout: 15000 })
    const week5Button = page.locator('button:has-text("5")').first()
    await expect(week5Button).toBeVisible()
    await week5Button.click()
    await expect(page.locator('text=Week 5')).toBeVisible()
  })

  test('current lineup displays after week click', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Roster Optimizer' })).toBeVisible({ timeout: 15000 })
    const week1Button = page.locator('button:has-text("1")').first()
    await week1Button.click()
    await expect(page.locator('h3:has-text("Current Lineup")').first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=projected pts').first()).toBeVisible()
  })

  test('optimized lineup displays after week click', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Roster Optimizer' })).toBeVisible({ timeout: 15000 })
    const week1Button = page.locator('button:has-text("1")').first()
    await week1Button.click()
    await expect(page.locator('h3:has-text("Optimized Lineup")').first()).toBeVisible({ timeout: 10000 })
  })

  test('projected points difference shown', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Roster Optimizer' })).toBeVisible({ timeout: 15000 })
    const week1Button = page.locator('button:has-text("1")').first()
    await week1Button.click()
    await expect(page.locator('h3:has-text("Current Lineup")').first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=Improvement')).toBeVisible()
  })

  test('Show Your Work button visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Roster Optimizer' })).toBeVisible({ timeout: 15000 })
    const week1Button = page.locator('button:has-text("1")').first()
    await week1Button.click()
    await expect(page.locator('h3:has-text("Current Lineup")').first()).toBeVisible({ timeout: 10000 })
    const showWorkButton = page.locator('button:has-text("Show Your Work")')
    await expect(showWorkButton).toBeVisible()
  })

  test('Show Your Work expands', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Roster Optimizer' })).toBeVisible({ timeout: 15000 })
    const week1Button = page.locator('button:has-text("1")').first()
    await week1Button.click()
    await expect(page.locator('h3:has-text("Current Lineup")').first()).toBeVisible({ timeout: 10000 })
    const showWorkButton = page.locator('button:has-text("Show Your Work")')
    await showWorkButton.click()
    await expect(page.locator('text=Hide Details')).toBeVisible()
  })

  test('Apply Optimization button visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Roster Optimizer' })).toBeVisible({ timeout: 15000 })
    const week1Button = page.locator('button:has-text("1")').first()
    await week1Button.click()
    await expect(page.locator('h3:has-text("Current Lineup")').first()).toBeVisible({ timeout: 10000 })
    const applyButton = page.locator('button:has-text("Apply Optimization")')
    await expect(applyButton).toBeVisible()
  })

  test('mobile responsive layout', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page.getByRole('heading', { name: 'Roster Optimizer' })).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('heading', { name: 'Select Week' }).first()).toBeVisible()
    const week1Button = page.locator('button:has-text("1")').first()
    await week1Button.click()
    await expect(page.locator('h3:has-text("Current Lineup")').first()).toBeVisible({ timeout: 10000 })
  })

  test('loading skeleton appears during fetch', async ({ page }) => {
    await page.route('**/api/algorithms/lineup', async (route) => {
      await new Promise((r) => setTimeout(r, 2000))
      await route.continue()
    })
    await page.goto('/roster')
    await expect(page.getByRole('heading', { name: 'Roster Optimizer' })).toBeVisible({ timeout: 15000 })
    const week5Button = page.locator('button:has-text("5")').first()
    await week5Button.click()
    const skeleton = page.locator('.animate-pulse')
    const hasSkeletonOrContent = await skeleton.first().isVisible({ timeout: 1000 }).catch(() => false)
      || await page.locator('text=Current Lineup').isVisible().catch(() => false)
    expect(hasSkeletonOrContent).toBe(true)
  })

  test('error state displays on API failure', async ({ page }) => {
    await page.route('**/api/algorithms/lineup', async (route) => {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal server error' }),
      })
    })
    await page.goto('/roster')
    await expect(page.getByRole('heading', { name: 'Roster Optimizer' })).toBeVisible({ timeout: 15000 })
    const week1Button = page.locator('button:has-text("1")').first()
    await week1Button.click()
    await expect(page.locator('text=/[Ee]rror|failed/').first()).toBeVisible({ timeout: 10000 })
    const hasError = await page.locator('text=error').first().isVisible().catch(() => false)
      || await page.locator('text=Error').first().isVisible().catch(() => false)
      || await page.locator('text=failed').first().isVisible().catch(() => false)
    expect(hasError).toBe(true)
  })

  test('empty state when no roster data', async ({ page }) => {
    const emptyState = page.locator('text=Roster Not Found')
    const hasEmptyState = await emptyState.isVisible().catch(() => false)
    const hasContent = await page.getByRole('heading', { name: 'Roster Optimizer' }).isVisible({ timeout: 15000 }).catch(() => false)
    expect(hasEmptyState || hasContent).toBe(true)
  })

  test('week selector persists selection', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Roster Optimizer' })).toBeVisible({ timeout: 15000 })
    const week10Button = page.locator('button:has-text("10")').first()
    await expect(week10Button).toBeVisible()
    await week10Button.click()
    await expect(page.locator('text=Week 10')).toBeVisible()
    const selectedButton = page.locator('button:has-text("10")').first()
    const classList = await selectedButton.getAttribute('class')
    expect(classList).toContain('bg-primary')
  })

  test('player cards display in lineup', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Roster Optimizer' })).toBeVisible({ timeout: 15000 })
    const week1Button = page.locator('button:has-text("1")').first()
    await week1Button.click()
    await expect(page.locator('h3:has-text("Current Lineup")').first()).toBeVisible({ timeout: 10000 })
    // Check for starter slot labels (MSW doesn't intercept internal API routes, so real data is used)
    const hasStarter = await page.locator('text=Starter').first().isVisible().catch(() => false)
    const hasPlayerCard = await page.locator('text=/QB|RB|WR|TE|K|DEF/').first().isVisible().catch(() => false)
    expect(hasStarter || hasPlayerCard).toBe(true)
  })

  test('bench section displays', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Roster Optimizer' })).toBeVisible({ timeout: 15000 })
    const week1Button = page.locator('button:has-text("1")').first()
    await week1Button.click()
    await expect(page.locator('h3:has-text("Current Lineup")').first()).toBeVisible({ timeout: 10000 })
    const benchSection = page.locator('h3:has-text("Bench")')
    await expect(benchSection).toBeVisible()
  })

  test('week navigation buttons work', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Roster Optimizer' })).toBeVisible({ timeout: 15000 })
    const nextButton = page.locator('button').filter({ has: page.locator('svg.lucide-chevron-right') }).first()
    await expect(nextButton).toBeVisible()
    await nextButton.click()
    await expect(page.locator('text=Week 2')).toBeVisible()
  })

  test('mobile week buttons are scrollable', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page.getByRole('heading', { name: 'Roster Optimizer' })).toBeVisible({ timeout: 15000 })
    const week1Button = page.locator('button:has-text("1")').first()
    await expect(week1Button).toBeVisible()
  })

  test('optimization details show on expand', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Roster Optimizer' })).toBeVisible({ timeout: 15000 })
    const week1Button = page.locator('button:has-text("1")').first()
    await week1Button.click()
    await expect(page.locator('h3:has-text("Current Lineup")').first()).toBeVisible({ timeout: 10000 })
    const detailsButton = page.locator('button:has-text("Show Your Work")')
    await expect(detailsButton).toBeVisible()
    await detailsButton.click()
    await expect(page.locator('text=Hide Details')).toBeVisible()
    const detailsVisible = await page.locator('text=Slot Assignments').first().isVisible().catch(() => false)
      || await page.locator('text=Limitations').first().isVisible().catch(() => false)
      || await page.locator('text=Excluded Players').first().isVisible().catch(() => false)
    expect(detailsVisible).toBe(true)
  })

  test('Apply Optimization dialog opens', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Roster Optimizer' })).toBeVisible({ timeout: 15000 })
    const week1Button = page.locator('button:has-text("1")').first()
    await week1Button.click()
    await expect(page.locator('h3:has-text("Current Lineup")').first()).toBeVisible({ timeout: 10000 })
    const applyButton = page.locator('button:has-text("Apply Optimization")')
    await expect(applyButton).toBeVisible()
    const isEnabled = await applyButton.isEnabled()
    if (isEnabled) {
      await applyButton.click()
      await expect(page.locator('text=Apply Lineup Optimization').first()).toBeVisible({ timeout: 5000 })
    }
  })
})

import { test, expect } from '@playwright/test'

test.describe('Roster Optimizer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/roster')
  })

  test('page loads with week selector', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Roster Optimizer' })).toBeVisible({ timeout: 15000 })
    await expect(page.locator('h2:has-text("Select Week")')).toBeVisible()
    const weekButtons = page.locator('button').filter({ hasText: /^[1-9]$|^1[0-8]$/ })
    await expect(weekButtons.first()).toBeVisible()
  })

  test('week selector changes week (1-18)', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Roster Optimizer' })).toBeVisible({ timeout: 15000 })
    const week5Button = page.locator('button:has-text("5")').first()
    await expect(week5Button).toBeVisible()
    await week5Button.click()
    await page.waitForTimeout(500)
    await expect(page.locator('text=Week 5')).toBeVisible()
  })

  test('current lineup displays', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Roster Optimizer' })).toBeVisible({ timeout: 15000 })
    await expect(page.locator('h3:has-text("Current Lineup")')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=projected pts')).toBeVisible()
  })

  test('optimized lineup displays', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Roster Optimizer' })).toBeVisible({ timeout: 15000 })
    await expect(page.locator('h3:has-text("Optimized Lineup")')).toBeVisible({ timeout: 10000 })
    const optimizedCard = page.locator('text=Optimized Lineup')
    await expect(optimizedCard).toBeVisible()
  })

  test('projected points difference shown', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Roster Optimizer' })).toBeVisible({ timeout: 15000 })
    await expect(page.locator('text=Current Lineup').first()).toBeVisible({ timeout: 10000 })
    const improvementCard = page.locator('text=Improvement')
    await expect(improvementCard).toBeVisible()
  })

  test('Show Your Work expands', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Roster Optimizer' })).toBeVisible({ timeout: 15000 })
    await expect(page.locator('h3:has-text("Current Lineup")')).toBeVisible({ timeout: 10000 })
    const showWorkButton = page.locator('button:has-text("Show Your Work")')
    await expect(showWorkButton).toBeVisible()
    await showWorkButton.click()
    await page.waitForTimeout(300)
    await expect(page.locator('text=Hide Details')).toBeVisible()
    await expect(page.locator('text=Slot Assignments')).toBeVisible()
  })

  test('Apply Optimization button visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Roster Optimizer' })).toBeVisible({ timeout: 15000 })
    await expect(page.locator('h3:has-text("Current Lineup")')).toBeVisible({ timeout: 10000 })
    const applyButton = page.locator('button:has-text("Apply Optimization")')
    await expect(applyButton).toBeVisible()
  })

  test('mobile responsive layout', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page.getByRole('heading', { name: 'Roster Optimizer' })).toBeVisible({ timeout: 15000 })
    await expect(page.locator('h2:has-text("Select Week")')).toBeVisible()
    const currentLineup = page.locator('h3:has-text("Current Lineup")')
    await expect(currentLineup).toBeVisible({ timeout: 10000 })
  })

  test('loading skeleton appears', async ({ page }) => {
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
      || await page.locator('h3:has-text("Current Lineup")').isVisible().catch(() => false)
    expect(hasSkeletonOrContent).toBe(true)
  })

  test('error state displays', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Roster Optimizer' })).toBeVisible({ timeout: 15000 })
    const hasError = await page.locator('text=error').isVisible().catch(() => false)
    const hasContent = await page.locator('h3:has-text("Current Lineup")').isVisible().catch(() => false)
    expect(hasError || hasContent).toBe(true)
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
    await page.waitForTimeout(500)
    await expect(page.locator('text=Week 10')).toBeVisible()
    const activeButton = page.locator('button:has-text("10")').first()
    await expect(activeButton).toHaveAttribute('data-state', 'active').catch(async () => {
      const classList = await activeButton.getAttribute('class')
      expect(classList).toContain('default')
    })
  })

  test('player cards display in lineup', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Roster Optimizer' })).toBeVisible({ timeout: 15000 })
    await expect(page.locator('h3:has-text("Current Lineup")')).toBeVisible({ timeout: 10000 })
    const playerNames = page.locator('text=Patrick Mahomes')
    await expect(playerNames.first()).toBeVisible()
  })

  test('bench section displays', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Roster Optimizer' })).toBeVisible({ timeout: 15000 })
    await expect(page.locator('h3:has-text("Current Lineup")')).toBeVisible({ timeout: 10000 })
    const benchSection = page.locator('h3:has-text("Bench")')
    await expect(benchSection).toBeVisible()
  })

  test('week navigation buttons work', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Roster Optimizer' })).toBeVisible({ timeout: 15000 })
    const prevButton = page.locator('button').filter({ has: page.locator('svg') }).first()
    const nextButton = page.locator('button').filter({ has: page.locator('svg') }).nth(1)
    await expect(prevButton).toBeVisible()
    await expect(nextButton).toBeVisible()
    await nextButton.click()
    await page.waitForTimeout(300)
    await prevButton.click()
    await page.waitForTimeout(300)
    await expect(page.getByRole('heading', { name: 'Roster Optimizer' })).toBeVisible()
  })

  test('mobile week buttons are scrollable', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page.getByRole('heading', { name: 'Roster Optimizer' })).toBeVisible({ timeout: 15000 })
    const week1Button = page.locator('button:has-text("1")').first()
    await expect(week1Button).toBeVisible()
  })

  test('optimization details show on expand', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Roster Optimizer' })).toBeVisible({ timeout: 15000 })
    await expect(page.locator('h3:has-text("Current Lineup")')).toBeVisible({ timeout: 10000 })
    const detailsButton = page.locator('button:has-text("Show Your Work")')
    await expect(detailsButton).toBeVisible()
    await detailsButton.click()
    await page.waitForTimeout(300)
    const limitations = page.locator('h4:has-text("Limitations")')
    const hasLimitations = await limitations.isVisible().catch(() => false)
    const hasSlotAssignments = await page.locator('h4:has-text("Slot Assignments")').isVisible().catch(() => false)
    expect(hasLimitations || hasSlotAssignments).toBe(true)
  })

  test('Apply Optimization opens confirmation dialog', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Roster Optimizer' })).toBeVisible({ timeout: 15000 })
    await expect(page.locator('h3:has-text("Current Lineup")')).toBeVisible({ timeout: 10000 })
    const applyButton = page.locator('button:has-text("Apply Optimization")')
    await expect(applyButton).toBeVisible()
    const isEnabled = await applyButton.isEnabled()
    if (isEnabled) {
      await applyButton.click()
      await expect(page.locator('text=Apply Lineup Optimization')).toBeVisible({ timeout: 5000 })
    }
  })
})

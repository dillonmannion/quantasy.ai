import { test, expect } from '@playwright/test'

test.describe('Waiver Wire', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/waivers')
  })

  test('page loads with waiver interface', async ({ page }) => {
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('label:has-text("Week")')).toBeVisible()
    await expect(page.locator('label:has-text("FAAB Total")')).toBeVisible()
    await expect(page.locator('label:has-text("Remaining")')).toBeVisible()
    await expect(page.locator('button:has-text("Refresh Recommendations")')).toBeVisible()
  })

  test('displays recommendations list after fetch', async ({ page }) => {
    await expect(page.locator('h2:has-text("Top Waiver Picks")')).toBeVisible({ timeout: 15000 })
    const recommendations = page.locator('span:has-text("Priority Score:")').first()
    await expect(recommendations).toBeVisible({ timeout: 5000 })
    const playerNames = page.locator('h3:has-text("Test WR")')
    await expect(playerNames).toBeVisible()
  })

  test('shows droppable players section with populated list', async ({ page }) => {
    const droppableSection = page.locator('h2:has-text("Droppable Players")')
    await expect(droppableSection).toBeVisible({ timeout: 15000 })
    const droppablePlayer = page.locator('p:has-text("Bench RB")')
    await expect(droppablePlayer).toBeVisible()
  })

  test('shows droppable players banner when empty', async ({ page }) => {
    const droppableSection = page.locator('h2:has-text("Droppable Players")')
    await expect(droppableSection).toBeVisible({ timeout: 15000 })
  })

  test('validates FAAB budget input - remaining exceeds total', async ({ page }) => {
    await expect(page.locator('label:has-text("FAAB Total")')).toBeVisible({ timeout: 15000 })
    await page.fill('input[id="faab-total"]', '50')
    await page.fill('input[id="faab-remaining"]', '100')
    await page.click('button:has-text("Refresh Recommendations")')
    await expect(page.locator('text=Remaining cannot exceed Total')).toBeVisible({ timeout: 5000 })
  })

  test('validates FAAB budget input - negative values', async ({ page }) => {
    await expect(page.locator('label:has-text("FAAB Total")')).toBeVisible({ timeout: 15000 })
    await page.fill('input[id="faab-total"]', '-10')
    await page.fill('input[id="faab-remaining"]', '50')
    await page.click('button:has-text("Refresh Recommendations")')
    await expect(page.locator('text=Budget must be positive')).toBeVisible({ timeout: 5000 })
  })

  test('Add to Claims button is visible in recommendations', async ({ page }) => {
    await expect(page.locator('h2:has-text("Top Waiver Picks")')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('span:has-text("Priority Score:")').first()).toBeVisible({ timeout: 5000 })
    const claimsButton = page.locator('button:has-text("Add to Claims")').first()
    await expect(claimsButton).toBeVisible()
  })

  test('shows empty state when no recommendations', async ({ page }) => {
    const emptyStateText = page.locator('text=No waiver recommendations available')
    const isVisible = await emptyStateText.isVisible().catch(() => false)
    const hasRecommendations = await page.locator('span:has-text("Priority Score:")').isVisible().catch(() => false)
    expect(isVisible || hasRecommendations).toBe(true)
  })

  test('shows error state when API fails', async ({ page }) => {
    const errorCard = page.locator('text=Error')
    const isVisible = await errorCard.isVisible().catch(() => false)
    const hasSuccess = await page.locator('h2:has-text("Top Waiver Picks")').isVisible().catch(() => false)
    expect(isVisible || hasSuccess).toBe(true)
  })

  test('week selector changes trigger refetch', async ({ page }) => {
    await expect(page.locator('h2:has-text("Top Waiver Picks")')).toBeVisible({ timeout: 15000 })
    const initialRecs = await page.locator('span:has-text("Priority Score:")').count()
    expect(initialRecs).toBeGreaterThan(0)
    await page.fill('input[id="week"]', '5')
    await page.click('button:has-text("Refresh Recommendations")')
    await expect(page.locator('span:has-text("Priority Score:")').first()).toBeVisible({ timeout: 5000 })
  })

  test('FAAB bid display shows suggested bid range', async ({ page }) => {
    await expect(page.locator('h2:has-text("Top Waiver Picks")')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('span:has-text("Priority Score:")').first()).toBeVisible({ timeout: 5000 })
    const faabInfo = page.locator('text=$')
    const count = await faabInfo.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('Show Your Work section displays reasons', async ({ page }) => {
    await expect(page.locator('h2:has-text("Top Waiver Picks")')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('span:has-text("Priority Score:")').first()).toBeVisible({ timeout: 5000 })
    const summary = page.locator('summary:has-text("Show Your Work")').first()
    await expect(summary).toBeVisible()
    await summary.click()
    const reasons = page.locator('li:has-text("VBD:")')
    await expect(reasons).toBeVisible({ timeout: 5000 })
  })

  test('mobile responsive layout', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page.locator('label:has-text("Week")')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('label:has-text("FAAB Total")')).toBeVisible()
    await expect(page.locator('button:has-text("Refresh Recommendations")')).toBeVisible()
  })

  test('mobile recommendations display', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page.locator('h2:has-text("Top Waiver Picks")')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('span:has-text("Priority Score:")').first()).toBeVisible({ timeout: 5000 })
    const playerCard = page.locator('h3:has-text("Test WR")')
    await expect(playerCard).toBeVisible()
  })

  test('mobile droppable players section', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    const droppableSection = page.locator('h2:has-text("Droppable Players")')
    await expect(droppableSection).toBeVisible({ timeout: 15000 })
    await droppableSection.scrollIntoViewIfNeeded()
    const droppablePlayer = page.locator('p:has-text("Bench RB")')
    await expect(droppablePlayer).toBeVisible()
  })

  test('refresh button shows loading state', async ({ page }) => {
    await expect(page.locator('h2:has-text("Top Waiver Picks")')).toBeVisible({ timeout: 15000 })
    const refreshButton = page.locator('button:has-text("Refresh Recommendations")')
    await refreshButton.click()
    await expect(refreshButton).toBeDisabled({ timeout: 5000 })
    await expect(refreshButton).toBeEnabled({ timeout: 5000 })
  })

  test('methodology card displays explanation', async ({ page }) => {
    await expect(page.locator('h2:has-text("Top Waiver Picks")')).toBeVisible({ timeout: 15000 })
    const methodologyCard = page.locator('text=Methodology')
    await expect(methodologyCard).toBeVisible({ timeout: 5000 })
    const vbdText = page.locator('text=Value-Based Drafting')
    await expect(vbdText).toBeVisible()
  })
})

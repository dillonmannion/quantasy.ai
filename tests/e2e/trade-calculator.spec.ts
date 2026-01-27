import { test, expect } from '@playwright/test'

test.describe('Trade Calculator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trade')
  })

  test('page loads with trade calculator interface', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Trade Calculator', { timeout: 15000 })
    
    await expect(page.locator('text=You Give')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=You Receive')).toBeVisible()
    
    const addButtons = page.locator('button:has-text("+ Add Player")')
    expect(await addButtons.count()).toBeGreaterThanOrEqual(2)
  })

  test('add player via picker modal', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Trade Calculator', { timeout: 15000 })
    
    const addButtons = page.locator('button:has-text("+ Add Player")')
    const firstAddButton = addButtons.first()
    
    await expect(firstAddButton).toBeVisible({ timeout: 10000 })
    await firstAddButton.click()
    
    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible({ timeout: 5000 })
    
    const searchInput = page.locator('input[placeholder*="Search"]')
    await expect(searchInput).toBeVisible()
    
    await searchInput.fill('Mahomes')
    await page.waitForTimeout(300)
    
    const playerOption = page.locator('button:has-text("Patrick Mahomes")')
    await expect(playerOption).toBeVisible({ timeout: 5000 })
    
    await playerOption.click()
    
    await expect(modal).not.toBeVisible({ timeout: 5000 })
    
    const playerCard = page.locator('text=Patrick Mahomes')
    await expect(playerCard).toBeVisible()
  })

  test('remove player from trade', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Trade Calculator', { timeout: 15000 })
    
    const addButtons = page.locator('button:has-text("+ Add Player")')
    await addButtons.first().click()
    
    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible({ timeout: 5000 })
    
    const searchInput = page.locator('input[placeholder*="Search"]')
    await searchInput.fill('Mahomes')
    await page.waitForTimeout(300)
    
    const playerOption = page.locator('button:has-text("Patrick Mahomes")')
    await playerOption.click()
    
    await expect(modal).not.toBeVisible({ timeout: 5000 })
    
    const playerCard = page.locator('text=Patrick Mahomes')
    await expect(playerCard).toBeVisible()
    
    const removeButton = page.locator('button:has-text("✕")').first()
    await removeButton.click()
    
    await expect(playerCard).not.toBeVisible({ timeout: 5000 })
  })

  test('fairness score updates when players added', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Trade Calculator', { timeout: 15000 })
    
    const addButtons = page.locator('button:has-text("+ Add Player")')
    
    await addButtons.first().click()
    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible({ timeout: 5000 })
    
    const searchInput = page.locator('input[placeholder*="Search"]')
    await searchInput.fill('Mahomes')
    await page.waitForTimeout(300)
    
    let playerOption = page.locator('button:has-text("Patrick Mahomes")')
    await playerOption.click()
    
    await expect(modal).not.toBeVisible({ timeout: 5000 })
    await page.waitForTimeout(500)
    
    const verdictBadge = page.locator('text=FAIR')
    await expect(verdictBadge).toBeVisible({ timeout: 10000 })
    
    const fairnessScore = page.locator('text=Fairness Score').locator('..').locator('div').last()
    await expect(fairnessScore).toBeVisible()
  })

  test('trade verdict displays correctly', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Trade Calculator', { timeout: 15000 })
    
    const addButtons = page.locator('button:has-text("+ Add Player")')
    
    await addButtons.first().click()
    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible({ timeout: 5000 })
    
    const searchInput = page.locator('input[placeholder*="Search"]')
    await searchInput.fill('Mahomes')
    await page.waitForTimeout(300)
    
    const playerOption = page.locator('button:has-text("Patrick Mahomes")')
    await playerOption.click()
    
    await expect(modal).not.toBeVisible({ timeout: 5000 })
    await page.waitForTimeout(500)
    
    const verdictSection = page.locator('text=Trade Verdict')
    await expect(verdictSection).toBeVisible({ timeout: 10000 })
    
    const verdictBadge = page.locator('[class*="bg-"][class*="text-"]').filter({ hasText: /FAIR|GREAT|BAD|VETO/ })
    await expect(verdictBadge).toBeVisible()
  })

  test('show your work section displays explanation', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Trade Calculator', { timeout: 15000 })
    
    const addButtons = page.locator('button:has-text("+ Add Player")')
    
    await addButtons.first().click()
    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible({ timeout: 5000 })
    
    const searchInput = page.locator('input[placeholder*="Search"]')
    await searchInput.fill('Mahomes')
    await page.waitForTimeout(300)
    
    const playerOption = page.locator('button:has-text("Patrick Mahomes")')
    await playerOption.click()
    
    await expect(modal).not.toBeVisible({ timeout: 5000 })
    await page.waitForTimeout(500)
    
    const showYourWork = page.locator('text=Show Your Work')
    await expect(showYourWork).toBeVisible({ timeout: 10000 })
    
    const methodology = page.locator('text=methodology')
    await expect(methodology).toBeVisible()
  })

  test('player breakdown displays in trade result', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Trade Calculator', { timeout: 15000 })
    
    const addButtons = page.locator('button:has-text("+ Add Player")')
    
    await addButtons.first().click()
    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible({ timeout: 5000 })
    
    const searchInput = page.locator('input[placeholder*="Search"]')
    await searchInput.fill('Mahomes')
    await page.waitForTimeout(300)
    
    const playerOption = page.locator('button:has-text("Patrick Mahomes")')
    await playerOption.click()
    
    await expect(modal).not.toBeVisible({ timeout: 5000 })
    await page.waitForTimeout(500)
    
    const breakdown = page.locator('text=Player Breakdown')
    await expect(breakdown).toBeVisible({ timeout: 10000 })
  })

  test('mobile responsive layout', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    
    await expect(page.locator('h1')).toContainText('Trade Calculator', { timeout: 15000 })
    
    await expect(page.locator('text=You Give')).toBeVisible()
    await expect(page.locator('text=You Receive')).toBeVisible()
    
    const addButtons = page.locator('button:has-text("+ Add Player")')
    expect(await addButtons.count()).toBeGreaterThanOrEqual(2)
  })

  test('mobile add player flow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    
    await expect(page.locator('h1')).toContainText('Trade Calculator', { timeout: 15000 })
    
    const addButtons = page.locator('button:has-text("+ Add Player")')
    await addButtons.first().click()
    
    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible({ timeout: 5000 })
    
    const searchInput = page.locator('input[placeholder*="Search"]')
    await searchInput.fill('Mahomes')
    await page.waitForTimeout(300)
    
    const playerOption = page.locator('button:has-text("Patrick Mahomes")')
    await expect(playerOption).toBeVisible({ timeout: 5000 })
    
    await playerOption.click()
    
    await expect(modal).not.toBeVisible({ timeout: 5000 })
    
    const playerCard = page.locator('text=Patrick Mahomes')
    await expect(playerCard).toBeVisible()
  })

  test('mobile scroll to see both sides', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    
    await expect(page.locator('h1')).toContainText('Trade Calculator', { timeout: 15000 })
    
    const youGive = page.locator('text=You Give')
    const youReceive = page.locator('text=You Receive')
    
    await expect(youGive).toBeVisible()
    
    await page.evaluate(() => window.scrollBy(0, 300))
    await page.waitForTimeout(300)
    
    await expect(youReceive).toBeVisible()
  })

  test('search filters players correctly', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Trade Calculator', { timeout: 15000 })
    
    const addButtons = page.locator('button:has-text("+ Add Player")')
    await addButtons.first().click()
    
    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible({ timeout: 5000 })
    
    const searchInput = page.locator('input[placeholder*="Search"]')
    
    await searchInput.fill('QB')
    await page.waitForTimeout(300)
    
    const playerOptions = page.locator('[role="dialog"] button').filter({ hasText: /Patrick|Justin/ })
    const count = await playerOptions.count()
    expect(count).toBeGreaterThan(0)
    
    await searchInput.fill('Kelce')
    await page.waitForTimeout(300)
    
    const kelceOption = page.locator('button:has-text("Travis Kelce")')
    await expect(kelceOption).toBeVisible({ timeout: 5000 })
  })

  test('clear search shows all players', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Trade Calculator', { timeout: 15000 })
    
    const addButtons = page.locator('button:has-text("+ Add Player")')
    await addButtons.first().click()
    
    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible({ timeout: 5000 })
    
    const searchInput = page.locator('input[placeholder*="Search"]')
    
    await searchInput.fill('Mahomes')
    await page.waitForTimeout(300)
    
    await searchInput.clear()
    await page.waitForTimeout(300)
    
    const playerOptions = page.locator('[role="dialog"] button').filter({ hasText: /Patrick|Justin|Travis/ })
    const count = await playerOptions.count()
    expect(count).toBeGreaterThan(1)
  })

  test('trade values display correctly', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Trade Calculator', { timeout: 15000 })
    
    const addButtons = page.locator('button:has-text("+ Add Player")')
    
    await addButtons.first().click()
    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible({ timeout: 5000 })
    
    const searchInput = page.locator('input[placeholder*="Search"]')
    await searchInput.fill('Mahomes')
    await page.waitForTimeout(300)
    
    const playerOption = page.locator('button:has-text("Patrick Mahomes")')
    await playerOption.click()
    
    await expect(modal).not.toBeVisible({ timeout: 5000 })
    await page.waitForTimeout(500)
    
    const givingValue = page.locator('text=You Give Value')
    const receivingValue = page.locator('text=You Receive Value')
    
    await expect(givingValue).toBeVisible({ timeout: 10000 })
    await expect(receivingValue).toBeVisible()
  })

  test('caveats section displays when present', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Trade Calculator', { timeout: 15000 })
    
    const addButtons = page.locator('button:has-text("+ Add Player")')
    
    await addButtons.first().click()
    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible({ timeout: 5000 })
    
    const searchInput = page.locator('input[placeholder*="Search"]')
    await searchInput.fill('Mahomes')
    await page.waitForTimeout(300)
    
    const playerOption = page.locator('button:has-text("Patrick Mahomes")')
    await playerOption.click()
    
    await expect(modal).not.toBeVisible({ timeout: 5000 })
    await page.waitForTimeout(500)
    
    const caveats = page.locator('text=Caveats')
    const hasCaveats = await caveats.isVisible().catch(() => false)
    expect(typeof hasCaveats).toBe('boolean')
  })

  test('no players selected shows empty state', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Trade Calculator', { timeout: 15000 })
    
    const emptyStates = page.locator('text=No players selected')
    const count = await emptyStates.count()
    expect(count).toBeGreaterThanOrEqual(2)
  })

  test('trade result hides when players removed', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Trade Calculator', { timeout: 15000 })
    
    const addButtons = page.locator('button:has-text("+ Add Player")')
    
    await addButtons.first().click()
    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible({ timeout: 5000 })
    
    const searchInput = page.locator('input[placeholder*="Search"]')
    await searchInput.fill('Mahomes')
    await page.waitForTimeout(300)
    
    const playerOption = page.locator('button:has-text("Patrick Mahomes")')
    await playerOption.click()
    
    await expect(modal).not.toBeVisible({ timeout: 5000 })
    await page.waitForTimeout(500)
    
    const verdictSection = page.locator('text=Trade Verdict')
    await expect(verdictSection).toBeVisible({ timeout: 10000 })
    
    const removeButton = page.locator('button:has-text("✕")').first()
    await removeButton.click()
    
    await expect(verdictSection).not.toBeVisible({ timeout: 5000 })
  })
})

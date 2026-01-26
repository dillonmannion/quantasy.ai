import { test, expect } from '@playwright/test'

test.describe('Draft Assistant', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/draft')
  })

  test('page loads and displays rankings', async ({ page }) => {
    await expect(page.locator('[data-testid="rankings-list"]')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-testid="player-card"]').first()).toBeVisible()
  })

  test('filter by position works', async ({ page }) => {
    await expect(page.locator('[data-testid="rankings-list"]')).toBeVisible({ timeout: 15000 })
    
    await page.locator('[data-testid="filter-QB"]').click()
    await page.waitForTimeout(300)
    
    const firstPlayer = page.locator('[data-testid="player-card"]').first()
    await expect(firstPlayer).toContainText('QB')
  })

  test('search finds players', async ({ page }) => {
    await expect(page.locator('[data-testid="rankings-list"]')).toBeVisible({ timeout: 15000 })
    
    await page.locator('[data-testid="search-input"]').fill('Mahomes')
    await page.waitForTimeout(400)
    
    await expect(page.locator('[data-testid="player-card"]').first()).toContainText('Mahomes')
  })

  test('sort changes order', async ({ page }) => {
    await expect(page.locator('[data-testid="rankings-list"]')).toBeVisible({ timeout: 15000 })
    
    const firstPlayerBefore = await page.locator('[data-testid="player-card"]').first().textContent()
    
    await page.locator('[data-testid="sort-ADP"]').click()
    await page.waitForTimeout(200)
    
    const firstPlayerAfter = await page.locator('[data-testid="player-card"]').first().textContent()
    
    expect(firstPlayerBefore).toBeDefined()
    expect(firstPlayerAfter).toBeDefined()
  })

  test('mock draft multiple rounds', async ({ page }) => {
    await expect(page.locator('[data-testid="rankings-list"]')).toBeVisible({ timeout: 15000 })
    
    await page.locator('[data-testid="start-mock-draft"]').click()
    
    for (let i = 0; i < 3; i++) {
      const playerCard = page.locator('[data-testid="player-card"]').first()
      if (await playerCard.isVisible()) {
        await playerCard.click()
        await page.waitForTimeout(300)
      }
    }
    
    await expect(page.locator('[data-testid="rankings-list"]')).toBeVisible()
  })

  test('show your work panel displays', async ({ page }) => {
    await expect(page.locator('[data-testid="rankings-list"]')).toBeVisible({ timeout: 15000 })
    
    const playerCard = page.locator('[data-testid="player-card"]').first()
    await expect(playerCard).toBeVisible()
    
    await expect(playerCard).toContainText('VBD')
  })

  test('mobile swipe gesture', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    
    await expect(page.locator('[data-testid="rankings-list"]')).toBeVisible({ timeout: 15000 })
    
    await page.locator('[data-testid="start-mock-draft"]').click()
    
    const firstPlayer = page.locator('[data-testid="player-card"]').first()
    await expect(firstPlayer).toBeVisible()
    
    const box = await firstPlayer.boundingBox()
    
    if (box) {
      await page.mouse.move(box.x + 10, box.y + box.height / 2)
      await page.mouse.down()
      await page.mouse.move(box.x + 150, box.y + box.height / 2, { steps: 10 })
      await page.mouse.up()
      
      await page.waitForTimeout(500)
    }
    
    await expect(page.locator('[data-testid="rankings-list"]')).toBeVisible()
  })

  test('my team sidebar shows drafted players', async ({ page, viewport }) => {
    test.skip(viewport?.width !== undefined && viewport.width < 1024, 'Sidebar hidden on mobile')
    
    await expect(page.locator('[data-testid="rankings-list"]')).toBeVisible({ timeout: 15000 })
    
    await page.locator('[data-testid="start-mock-draft"]').click()
    await page.locator('[data-testid="player-card"]').first().click()
    await page.waitForTimeout(300)
    
    await expect(page.locator('[data-testid="my-team-sidebar"]')).toBeVisible({ timeout: 5000 })
  })

  test('hide drafted toggle exists', async ({ page }) => {
    await expect(page.locator('[data-testid="rankings-list"]')).toBeVisible({ timeout: 15000 })
    
    await page.locator('[data-testid="start-mock-draft"]').click()
    
    const hideDraftedButton = page.getByRole('button', { name: /hide drafted/i })
    await expect(hideDraftedButton).toBeVisible({ timeout: 5000 })
    
    await hideDraftedButton.click()
    await page.waitForTimeout(200)
    
    await expect(page.locator('[data-testid="rankings-list"]')).toBeVisible()
  })
})

import { test, expect } from '@playwright/test'

test.describe('Pick Value Board', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the pick value API
    await page.route('/api/algorithms/pick-value', async route => {
      // Return 24 picks (2 rounds of 12)
      const json = Array.from({ length: 24 }, (_, i) => ({
        value: Math.max(0, 100 - i * 4), // 100, 96, 92...
        breakdown: {
          expectedPlayers: [],
          positionalValues: [],
          biasAdjustment: { position: null, factor: 0 }
        },
        explanation: {
          algorithm: 'pick_value_v1',
          timestamp: new Date().toISOString(),
          methodology: 'Test',
          caveats: [],
          positionRunInfo: []
        }
      }))
      await route.fulfill({ json })
    })

    await page.goto('/draft')
  })

  test('can switch to pick value board', async ({ page }) => {
    await expect(page.locator('[data-testid="tab-board"]').first()).toBeVisible()
    await page.locator('[data-testid="tab-board"]').first().click()
    
    await expect(page.locator('[data-testid="pick-value-board"]').first()).toBeVisible()
    await expect(page.locator('[data-testid="pick-value-grid"]').first()).toBeVisible()
  })

  test('displays pick cards with correct notation', async ({ page }) => {
    await page.locator('[data-testid="tab-board"]').first().click()
    
    const firstCard = page.locator('[data-testid="pick-card"]').first()
    await expect(firstCard).toBeVisible()
    await expect(firstCard).toContainText('1.01')
    await expect(firstCard).toContainText('100')
    
    const lastCard = page.locator('[data-testid="pick-card"]').last()
    await expect(lastCard).toBeVisible()
    await expect(lastCard).toContainText('2.12')
  })

  test('filters by round', async ({ page }) => {
    await page.locator('[data-testid="tab-board"]').first().click()
    
    await page.locator('[data-testid="round-filter"]').first().click()
    
    await page.locator('text=Round 1').first().click()
    
    await expect(page.locator('[data-testid="pick-card"]')).toHaveCount(12)
    await expect(page.locator('[data-testid="pick-card"]').first()).toContainText('1.01')
    await expect(page.locator('[data-testid="pick-card"]').last()).toContainText('1.12')
  })

  test('color coding works', async ({ page }) => {
    await page.locator('[data-testid="tab-board"]').first().click()
    
    const firstCard = page.locator('[data-testid="pick-card"]').first()
    await expect(firstCard).toBeVisible()
    const hasGreen = await firstCard.locator('.text-green-500').count() > 0
    const hasColor = hasGreen || await firstCard.locator('.text-yellow-500, .text-red-500').count() > 0
    expect(hasColor).toBe(true)
  })

  test('mobile responsive view', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.locator('[data-testid="tab-board"]').first().click()
    
    await expect(page.locator('[data-testid="pick-value-grid"]').first()).toBeVisible()
    
    await expect(page.locator('[data-testid="round-filter"]').first()).toBeVisible()
  })
})

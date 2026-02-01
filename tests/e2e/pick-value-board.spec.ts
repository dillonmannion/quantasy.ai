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
    await expect(page.locator('[data-testid="tab-board"]')).toBeVisible()
    await page.click('[data-testid="tab-board"]')
    
    await expect(page.locator('[data-testid="pick-value-board"]')).toBeVisible()
    await expect(page.locator('[data-testid="pick-value-grid"]')).toBeVisible()
  })

  test('displays pick cards with correct notation', async ({ page }) => {
    await page.click('[data-testid="tab-board"]')
    
    // Check first pick (1.01)
    const firstCard = page.locator('[data-testid="pick-card"]').first()
    await expect(firstCard).toBeVisible()
    await expect(firstCard).toContainText('1.01')
    await expect(firstCard).toContainText('100') // Value
    
    // Check last pick (2.12)
    const lastCard = page.locator('[data-testid="pick-card"]').last()
    await expect(lastCard).toBeVisible()
    await expect(lastCard).toContainText('2.12')

    await page.screenshot({ path: '.sisyphus/evidence/pick-value-board.png' })
  })

  test('filters by round', async ({ page }) => {
    await page.click('[data-testid="tab-board"]')
    
    // Open round filter
    await page.click('[data-testid="round-filter"]')
    
    // Select Round 1
    await page.click('text=Round 1')
    
    // Should see 12 cards (assuming 12 team league from seeds)
    await expect(page.locator('[data-testid="pick-card"]')).toHaveCount(12)
    await expect(page.locator('[data-testid="pick-card"]').first()).toContainText('1.01')
    await expect(page.locator('[data-testid="pick-card"]').last()).toContainText('1.12')
  })

  test('color coding works', async ({ page }) => {
    await page.click('[data-testid="tab-board"]')
    
    // First pick (100) should be green
    const firstCardValue = page.locator('[data-testid="pick-card"] >> text=100').first()
    await expect(firstCardValue).toHaveClass(/text-green-500/)
    
    // Pick with value ~50 should be yellow
    // Index 12 (pick 13) -> 100 - 12*4 = 52
    const midCardValue = page.locator('[data-testid="pick-card"] >> text=52').first()
    await expect(midCardValue).toHaveClass(/text-yellow-500/)
    
    // Pick with low value
    // Index 20 -> 100 - 20*4 = 20
    const lowCardValue = page.locator('[data-testid="pick-card"] >> text=20').first()
    await expect(lowCardValue).toHaveClass(/text-red-500/)
  })

  test('mobile responsive view', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.click('[data-testid="tab-board"]')
    
    // Grid should be scrollable (implied by container visibility)
    await expect(page.locator('[data-testid="pick-value-grid"]')).toBeVisible()
    
    // Filters should still be accessible
    await expect(page.locator('[data-testid="round-filter"]')).toBeVisible()
  })
})

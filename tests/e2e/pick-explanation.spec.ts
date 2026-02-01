import { test, expect } from '@playwright/test'

test.describe('Pick Explanation', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the pick value API with rich data
    await page.route('/api/algorithms/pick-value', async route => {
      // Create 12 picks (1 round)
      const json = Array.from({ length: 12 }, (_, i) => ({
        value: Math.max(0, 100 - i * 4),
        breakdown: {
          expectedPlayers: [
            { playerId: 'p1', fullName: 'Patrick Mahomes', position: 'QB', probability: 0.8, projectedPoints: 300 },
            { playerId: 'p2', fullName: 'Christian McCaffrey', position: 'RB', probability: 0.6, projectedPoints: 280 },
            { playerId: 'p3', fullName: 'Justin Jefferson', position: 'WR', probability: 0.5, projectedPoints: 270 }
          ],
          positionalValues: [
            { position: 'QB', expectedValue: 50, scarcityMultiplier: 1.2 },
            { position: 'RB', expectedValue: 45, scarcityMultiplier: 1.1 }
          ],
          biasAdjustment: { position: 'RB', factor: 1.1 }
        },
        explanation: {
          algorithm: 'pick_value_v1',
          timestamp: new Date().toISOString(),
          methodology: 'Test methodology',
          caveats: ['Caveat 1', 'Caveat 2'],
          positionRunInfo: ['QB run expected']
        }
      }))
      await route.fulfill({ json })
    })

    await page.goto('/draft')
  })

  test('explanation panel appears on card click', async ({ page }) => {
    // Switch to board view
    await page.click('[data-testid="tab-board"]')
    
    // Click pick 1.05 (index 4)
    const card = page.locator('[data-testid="pick-card-1-05"]')
    await expect(card).toBeVisible()
    await card.click()
    
    // Verify dialog content
    const explanation = page.locator('[data-testid="pick-explanation"]')
    await expect(explanation).toBeVisible()
    await expect(explanation).toContainText('Pick #5 Analysis')
    
    // Verify sections
    await expect(page.locator('[data-testid="expected-players"]')).toBeVisible()
    await expect(page.locator('[data-testid="position-values"]')).toBeVisible()
    await expect(page.locator('[data-testid="vbd-breakdown"]')).toBeVisible()
    
    // Verify player content
    await expect(page.locator('text=Patrick Mahomes')).toBeVisible()
    
    // Verify bias info
    await expect(page.locator('text=Bias Active')).toBeVisible()
    
    // Screenshot
    await page.screenshot({ path: '.sisyphus/evidence/pick-explanation.png' })
  })

  test('mobile responsive explanation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.click('[data-testid="tab-board"]')
    
    // Use dispatchEvent for mobile click as per guidelines
    const card = page.locator('[data-testid="pick-card-1-05"]')
    await expect(card).toBeVisible()
    await card.dispatchEvent('click')
    
    await expect(page.locator('[data-testid="pick-explanation"]')).toBeVisible()
  })
})

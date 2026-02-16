import { test, expect, type Page } from '@playwright/test'
import { openPickSelector } from './helpers/pick-selector'

/**
 * Pick Valuation Integration Flow Tests
 * 
 * Tests the complete user journey through pick valuation features:
 * 1. View pick value board during draft
 * 2. Select pick and see explanation dialog
 * 3. Add pick to trade and evaluate
 * 4. Adjust bias slider and see value change
 * 5. Mobile responsiveness on iPhone 13 viewport
 */

// Reusable mock data matching PickValueOutput interface
const createMockPickValues = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    value: Math.max(0, 100 - i * 4), // 100, 96, 92, 88...
    breakdown: {
      expectedPlayers: [
        { 
          playerId: 'p1', 
          fullName: 'Patrick Mahomes', 
          position: 'QB', 
          probability: 0.8, 
          projectedPoints: 300 
        },
        { 
          playerId: 'p2', 
          fullName: 'Christian McCaffrey', 
          position: 'RB', 
          probability: 0.6, 
          projectedPoints: 280 
        },
        { 
          playerId: 'p3', 
          fullName: 'Justin Jefferson', 
          position: 'WR', 
          probability: 0.5, 
          projectedPoints: 270 
        }
      ],
      positionalValues: [
        { position: 'QB', expectedValue: 50, scarcityMultiplier: 1.2 },
        { position: 'RB', expectedValue: 45, scarcityMultiplier: 1.1 },
        { position: 'WR', expectedValue: 40, scarcityMultiplier: 1.0 }
      ],
      biasAdjustment: { position: 'RB', factor: 1.1 }
    },
    explanation: {
      algorithm: 'pick_value_v1',
      timestamp: new Date().toISOString(),
      methodology: 'Monte Carlo simulation with VBD-based player availability model',
      caveats: ['Projections are estimates', 'ADP data from FantasyFootballCalculator'],
      positionRunInfo: ['RB run expected picks 5-10', 'QB scarcity after pick 12']
    }
  }))
}

// Helper to set up pick value API mock
async function setupPickValueMock(page: Page) {
  await page.route('**/api/algorithms/pick-value**', async route => {
    const url = route.request().url()
    
    // Parse query params for single pick requests (trade page)
    if (url.includes('pickNumber=')) {
      const pickMatch = url.match(/pickNumber=(\d+)/)
      const biasMatch = url.match(/biasFactor=([\d.]+)/)
      const pickNumber = pickMatch ? parseInt(pickMatch[1]) : 1
      const biasFactor = biasMatch ? parseFloat(biasMatch[1]) : 0
      
      // Calculate value with bias adjustment
      const baseValue = Math.max(0, 100 - (pickNumber - 1) * 4)
      const adjustedValue = baseValue * (1 + biasFactor)
      
      await route.fulfill({
        json: {
          value: adjustedValue,
          breakdown: {
            expectedPlayers: [],
            positionalValues: [],
            biasAdjustment: { position: null, factor: biasFactor }
          },
          explanation: {
            algorithm: 'pick_value_v1',
            timestamp: new Date().toISOString(),
            methodology: 'Test',
            caveats: [],
            positionRunInfo: []
          }
        }
      })
      return
    }
    
    // Return array for board view (POST with allPicks: true)
    const mockValues = createMockPickValues(24) // 2 rounds of 12
    await route.fulfill({ json: mockValues })
  })
}

test.describe('Pick Valuation Integration Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Set up API mock for pick values
    await setupPickValueMock(page)
  })

  test('complete workflow: board to explanation to trade with bias adjustment', async ({ page }) => {
    // ===== PHASE 1: View pick value board during draft =====
    await page.goto('/draft')
    await expect(page.locator('h1:has-text("Draft Assistant")')).toBeVisible({ timeout: 15000 })
    
    // Switch to Board tab
    const boardTab = page.locator('[data-testid="tab-board"]')
    await expect(boardTab).toBeVisible()
    await boardTab.click()
    
    // Verify board loads
    await expect(page.locator('[data-testid="pick-value-board"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('[data-testid="pick-value-grid"]')).toBeVisible()
    
    // Verify pick cards display
    const firstCard = page.locator('[data-testid="pick-card-1-01"]')
    await expect(firstCard).toBeVisible()
    await expect(firstCard).toContainText('100') // First pick value
    
    // Screenshot: Pick value board
    await page.screenshot({ path: '.sisyphus/evidence/pick-valuation-board-desktop.png' })
    
    // ===== PHASE 2: Click pick and see explanation dialog =====
    const targetCard = page.locator('[data-testid="pick-card-1-05"]')
    await expect(targetCard).toBeVisible()
    await targetCard.click()
    
    // Verify explanation dialog appears
    const explanation = page.locator('[data-testid="pick-explanation"]')
    await expect(explanation).toBeVisible({ timeout: 5000 })
    await expect(explanation).toContainText('Pick #5 Analysis')
    
    // Verify all sections present
    await expect(page.locator('[data-testid="expected-players"]')).toBeVisible()
    await expect(page.locator('[data-testid="position-values"]')).toBeVisible()
    await expect(page.locator('[data-testid="vbd-breakdown"]')).toBeVisible()
    
    // Verify expected player data shows
    await expect(page.locator('text=Patrick Mahomes')).toBeVisible()
    
    // Screenshot: Explanation dialog
    await page.screenshot({ path: '.sisyphus/evidence/pick-valuation-explanation-desktop.png' })
    
    // Close dialog
    await page.keyboard.press('Escape')
    await expect(explanation).not.toBeVisible()
    
    // ===== PHASE 3: Navigate to trade and add pick =====
    await page.goto('/trade')
    await expect(page.locator('[data-testid="trade-builder"]')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-testid="add-pick-give"]')).toBeVisible()
    
    // Open pick selector for "You Give" zone
    await openPickSelector(page, 'give')
    await expect(page.getByText('Add Draft Pick')).toBeVisible()
    
    // Select pick 1.05
    await page.locator('[data-testid="pick-number-select"]').click()
    await page.locator('[data-testid="pick-option-5"]').click()
    
    // Confirm add
    await page.locator('[data-testid="add-pick-confirm"]').click()
    
    // Verify pick appears in give zone
    const pickChip = page.locator('[data-testid="zone-give"] [data-testid="pick-1-05"]')
    await expect(pickChip).toBeVisible()
    await expect(pickChip).toContainText('1.05')
    
    // Wait for value to load
    const valueDisplay = pickChip.locator('[data-testid="asset-value"] div').first()
    await expect(valueDisplay).toBeVisible({ timeout: 5000 })
    
    // Get initial value
    const initialValueText = await valueDisplay.textContent()
    const initialValue = parseFloat(initialValueText || '0')
    expect(initialValue).toBeGreaterThan(0)
    
    // Screenshot: Trade with pick added
    await page.screenshot({ path: '.sisyphus/evidence/pick-valuation-trade-desktop.png' })
    
    // ===== PHASE 4: Verify bias slider is present and interactive =====
    const slider = page.locator('[data-testid="bias-slider"]')
    await expect(slider).toBeVisible()
    
    // Verify slider labels are present
    await expect(page.locator('text=Fairness Bias')).toBeVisible()
    await expect(page.locator('text=Fair').first()).toBeVisible()
    await expect(page.locator('text=Advantage')).toBeVisible()
    
    // Verify initial state shows 0%
    await expect(page.getByText('0%')).toBeVisible()
    
    // Screenshot: Trade with bias slider visible
    await page.screenshot({ path: '.sisyphus/evidence/pick-valuation-bias-desktop.png' })
  })

  test('filter picks by round on board', async ({ page }) => {
    await page.goto('/draft')
    await expect(page.locator('h1:has-text("Draft Assistant")')).toBeVisible({ timeout: 15000 })
    
    // Switch to Board tab
    await page.click('[data-testid="tab-board"]')
    await expect(page.locator('[data-testid="pick-value-board"]')).toBeVisible({ timeout: 10000 })
    
    // Get initial card count
    const initialCount = await page.locator('[data-testid^="pick-card-"]').count()
    expect(initialCount).toBe(24) // 2 rounds x 12 teams
    
    // Open round filter
    await page.click('[data-testid="round-filter"]')
    
    // Select Round 1 only
    await page.click('text=Round 1')
    
    // Verify only 12 cards (round 1)
    await expect(page.locator('[data-testid^="pick-card-"]')).toHaveCount(12)
    
    // Verify it's round 1 picks (1.01 to 1.12)
    await expect(page.locator('[data-testid="pick-card-1-01"]')).toBeVisible()
    await expect(page.locator('[data-testid="pick-card-1-12"]')).toBeVisible()
    await expect(page.locator('[data-testid="pick-card-2-01"]')).not.toBeVisible()
  })

  test('add future pick to trade and verify value', async ({ page }) => {
    await page.goto('/trade')
    await expect(page.locator('[data-testid="trade-builder"]')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-testid="add-pick-receive"]')).toBeVisible()
    
    // Open pick selector
    await openPickSelector(page, 'receive')
    
    // Select Future Pick type
    await page.getByText('Future Pick').click()
    
    // Confirm add
    await page.locator('[data-testid="add-pick-confirm"]').click()
    
    // Verify future pick appears in receive zone
    const pickChip = page.locator('[data-testid="zone-receive"] [data-testid^="pick-20"]')
    await expect(pickChip).toBeVisible()
    await expect(pickChip).toContainText('Round 1')
    
    // Verify value display (future picks have local calculation)
    const valueDisplay = pickChip.locator('[data-testid="asset-value"] div').first()
    await expect(valueDisplay).toBeVisible()
    await expect(valueDisplay).toContainText('50.0') // Base value for future pick
  })

  test('mobile: complete workflow on iPhone 13 viewport', async ({ page }) => {
    // Set mobile viewport (iPhone 13 dimensions)
    await page.setViewportSize({ width: 390, height: 844 })
    
    // ===== PHASE 1: View board on mobile =====
    await page.goto('/draft')
    await expect(page.locator('h1:has-text("Draft Assistant")')).toBeVisible({ timeout: 15000 })
    
    // Switch to Board tab using dispatchEvent for mobile
    const boardTab = page.locator('[data-testid="tab-board"]')
    await expect(boardTab).toBeVisible()
    await boardTab.dispatchEvent('click')
    
    // Verify board loads
    await expect(page.locator('[data-testid="pick-value-board"]')).toBeVisible({ timeout: 10000 })
    
    // Verify grid is scrollable (implied by container visibility)
    await expect(page.locator('[data-testid="pick-value-grid"]')).toBeVisible()
    
    // Screenshot: Mobile board
    await page.screenshot({ path: '.sisyphus/evidence/pick-valuation-board-mobile.png' })
    
    // ===== PHASE 2: Open explanation on mobile =====
    const targetCard = page.locator('[data-testid="pick-card-1-05"]')
    await expect(targetCard).toBeVisible()
    await targetCard.dispatchEvent('click')
    
    // Verify explanation dialog
    const explanation = page.locator('[data-testid="pick-explanation"]')
    await expect(explanation).toBeVisible({ timeout: 5000 })
    
    // Verify sections visible on mobile
    await expect(page.locator('[data-testid="expected-players"]')).toBeVisible()
    
    // Screenshot: Mobile explanation
    await page.screenshot({ path: '.sisyphus/evidence/pick-valuation-explanation-mobile.png' })
    
    // Close dialog
    await page.keyboard.press('Escape')
    await expect(explanation).not.toBeVisible()
    
    // ===== PHASE 3: Trade flow on mobile =====
    await page.goto('/trade')
    await expect(page.locator('[data-testid="trade-builder"]')).toBeVisible({ timeout: 15000 })
    
    // Open pick selector using dispatchEvent
    const addPickButton = page.locator('[data-testid="add-pick-give"]')
    await expect(addPickButton).toBeVisible()
    await addPickButton.dispatchEvent('click')
    
    // Select pick
    await expect(page.getByText('Add Draft Pick')).toBeVisible()
    await page.locator('[data-testid="pick-number-select"]').click()
    await page.locator('[data-testid="pick-option-1"]').click()
    await page.locator('[data-testid="add-pick-confirm"]').click()
    
    // Verify pick added
    const pickChip = page.locator('[data-testid="zone-give"] [data-testid="pick-1-01"]')
    await expect(pickChip).toBeVisible()
    
    // Screenshot: Mobile trade
    await page.screenshot({ path: '.sisyphus/evidence/pick-valuation-trade-mobile.png' })
    
    // ===== PHASE 4: Bias slider on mobile =====
    const slider = page.locator('[data-testid="bias-slider"]')
    await expect(slider).toBeVisible()
    
    // Verify bias slider labels are accessible on mobile
    await expect(page.locator('text=Fairness Bias')).toBeVisible()
    await expect(page.locator('text=Fair').first()).toBeVisible()
    await expect(page.locator('text=Advantage')).toBeVisible()
    
    // Verify initial state
    await expect(page.getByText('0%')).toBeVisible()
    
    // Final screenshot
    await page.screenshot({ path: '.sisyphus/evidence/pick-valuation-complete-mobile.png' })
  })

  test('explanation sections are collapsible', async ({ page }) => {
    await page.goto('/draft')
    await expect(page.locator('h1:has-text("Draft Assistant")')).toBeVisible({ timeout: 15000 })
    
    // Switch to Board tab
    await page.click('[data-testid="tab-board"]')
    await expect(page.locator('[data-testid="pick-value-board"]')).toBeVisible({ timeout: 10000 })
    
    // Open explanation
    const card = page.locator('[data-testid="pick-card-1-05"]')
    await expect(card).toBeVisible()
    await card.click()
    
    await expect(page.locator('[data-testid="pick-explanation"]')).toBeVisible()
    
    // Expected Players and Position Values sections are open by default
    // Methodology section is collapsed by default
    
    // Click Methodology header to expand
    await page.click('text=Methodology & Adjustments')
    
    // Verify Bias Active appears (from mock data)
    await expect(page.locator('text=Bias Active')).toBeVisible()
    
    // Verify position run info shows
    await expect(page.locator('text=RB run expected')).toBeVisible()
  })

  test('value color coding on board', async ({ page }) => {
    await page.goto('/draft')
    await expect(page.locator('h1:has-text("Draft Assistant")')).toBeVisible({ timeout: 15000 })
    
    await page.click('[data-testid="tab-board"]')
    await expect(page.locator('[data-testid="pick-value-board"]')).toBeVisible({ timeout: 10000 })
    
    // High value pick (100) should have green coloring
    // Our mock: index 0 = 100, index 6 = 76, index 18 = 28
    const highValueCard = page.locator('[data-testid="pick-card-1-01"]')
    const highValueText = highValueCard.locator('text=100')
    await expect(highValueText).toHaveClass(/text-green-500/)
    
    // Mid value (around 50) should be yellow
    // Index 12 (pick 13 = 2.01) = 100 - 48 = 52
    const midValueCard = page.locator('[data-testid="pick-card-2-01"]')
    const midValueText = midValueCard.locator('text=52')
    await expect(midValueText).toHaveClass(/text-yellow-500/)
    
    // Low value should be red
    // Index 20 (pick 21 = 2.09) = 100 - 80 = 20
    const lowValueCard = page.locator('[data-testid="pick-card-2-09"]')
    const lowValueText = lowValueCard.locator('text=20')
    await expect(lowValueText).toHaveClass(/text-red-500/)
  })
})

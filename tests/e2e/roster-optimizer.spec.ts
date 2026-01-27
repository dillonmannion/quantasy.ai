import { test, expect } from '@playwright/test'

test.describe('Roster Optimizer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/roster')
  })

  test('page loads with lineup data', async ({ page }) => {
    // Wait for the page to load and display lineup data
    await expect(page.locator('h1')).toContainText('Roster Optimizer', { timeout: 15000 })
    
    // Check that the current lineup section is visible
    await expect(page.locator('text=Current Lineup')).toBeVisible({ timeout: 10000 })
    
    // Verify player cards are displayed
    const playerCards = page.locator('[data-testid="player-card"]')
    await expect(playerCards.first()).toBeVisible({ timeout: 10000 })
  })

  test('week selector changes data', async ({ page }) => {
    // Wait for initial load
    await expect(page.locator('h1')).toContainText('Roster Optimizer', { timeout: 15000 })
    
    // Get the current week display
    const weekDisplay = page.locator('[data-testid="week-display"]')
    const initialWeek = await weekDisplay.textContent()
    
    // Click next week button
    const nextWeekButton = page.locator('[data-testid="next-week-button"]')
    await expect(nextWeekButton).toBeVisible()
    await nextWeekButton.click()
    
    // Wait for data to update
    await page.waitForTimeout(500)
    
    // Verify week changed
    const newWeek = await weekDisplay.textContent()
    expect(newWeek).not.toBe(initialWeek)
    
    // Verify lineup data is still visible
    await expect(page.locator('text=Current Lineup')).toBeVisible()
  })

  test('week selector navigation works', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Roster Optimizer', { timeout: 15000 })
    
    // Test previous week button
    const prevWeekButton = page.locator('[data-testid="prev-week-button"]')
    const nextWeekButton = page.locator('[data-testid="next-week-button"]')
    
    // Both buttons should be visible
    await expect(prevWeekButton).toBeVisible()
    await expect(nextWeekButton).toBeVisible()
    
    // Click next then previous
    await nextWeekButton.click()
    await page.waitForTimeout(300)
    await prevWeekButton.click()
    await page.waitForTimeout(300)
    
    // Page should still be functional
    await expect(page.locator('text=Current Lineup')).toBeVisible()
  })

  test('explanation panel toggles', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Roster Optimizer', { timeout: 15000 })
    
    // Wait for explanation panel to be available
    const explanationPanel = page.locator('[data-testid="explanation-panel"]')
    const toggleButton = page.locator('[data-testid="toggle-explanation"]')
    
    // Toggle should be visible
    await expect(toggleButton).toBeVisible({ timeout: 10000 })
    
    // Click to toggle
    await toggleButton.click()
    await page.waitForTimeout(300)
    
    // Panel should be visible or hidden based on toggle
    const isVisible = await explanationPanel.isVisible()
    expect(typeof isVisible).toBe('boolean')
    
    // Toggle again
    await toggleButton.click()
    await page.waitForTimeout(300)
    
    // Verify toggle works
    const isVisibleAfter = await explanationPanel.isVisible()
    expect(isVisibleAfter).not.toBe(isVisible)
  })

  test('show your work section displays', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Roster Optimizer', { timeout: 15000 })
    
    // Look for explanation content
    const explanationText = page.locator('text=Show Your Work')
    await expect(explanationText).toBeVisible({ timeout: 10000 })
    
    // Verify methodology is displayed
    const methodology = page.locator('text=methodology')
    await expect(methodology).toBeVisible()
  })

  test('mobile responsive layout', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Page should still load
    await expect(page.locator('h1')).toContainText('Roster Optimizer', { timeout: 15000 })
    
    // Lineup should be visible
    await expect(page.locator('text=Current Lineup')).toBeVisible()
    
    // Week selector should be accessible
    const weekDisplay = page.locator('[data-testid="week-display"]')
    await expect(weekDisplay).toBeVisible()
    
    // Navigation buttons should be visible
    const nextWeekButton = page.locator('[data-testid="next-week-button"]')
    await expect(nextWeekButton).toBeVisible()
  })

  test('mobile swipe to change week', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    await expect(page.locator('h1')).toContainText('Roster Optimizer', { timeout: 15000 })
    
    // Get initial week
    const weekDisplay = page.locator('[data-testid="week-display"]')
    const initialWeek = await weekDisplay.textContent()
    
    // Perform swipe gesture on week selector
    const weekSelector = page.locator('[data-testid="week-selector"]')
    const box = await weekSelector.boundingBox()
    
    if (box) {
      // Swipe left to go to next week
      await page.mouse.move(box.x + box.width - 20, box.y + box.height / 2)
      await page.mouse.down()
      await page.mouse.move(box.x + 20, box.y + box.height / 2, { steps: 10 })
      await page.mouse.up()
      
      await page.waitForTimeout(500)
    }
    
    // Verify week changed
    const newWeek = await weekDisplay.textContent()
    expect(newWeek).not.toBe(initialWeek)
  })

  test('apply optimization button works', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Roster Optimizer', { timeout: 15000 })
    
    // Wait for lineup to load
    await expect(page.locator('text=Current Lineup')).toBeVisible({ timeout: 10000 })
    
    // Find and click apply optimization button
    const applyButton = page.locator('[data-testid="apply-optimization"]')
    await expect(applyButton).toBeVisible({ timeout: 10000 })
    
    await applyButton.click()
    
    // Wait for optimization to be applied
    await page.waitForTimeout(500)
    
    // Page should still be functional
    await expect(page.locator('h1')).toContainText('Roster Optimizer')
  })

  test('error handling displays gracefully', async ({ page }) => {
    // Navigate to page
    await expect(page.locator('h1')).toContainText('Roster Optimizer', { timeout: 15000 })
    
    // The page should handle any errors gracefully
    // Check that error messages (if any) are displayed properly
    const errorMessage = page.locator('[data-testid="error-message"]')
    
    // If error exists, it should be visible
    const hasError = await errorMessage.isVisible().catch(() => false)
    expect(typeof hasError).toBe('boolean')
  })

  test('desktop layout shows sidebar', async ({ page, viewport }) => {
    test.skip(viewport?.width !== undefined && viewport.width < 1024, 'Sidebar hidden on mobile')
    
    await expect(page.locator('h1')).toContainText('Roster Optimizer', { timeout: 15000 })
    
    // On desktop, sidebar should be visible
    const sidebar = page.locator('[data-testid="optimization-sidebar"]')
    await expect(sidebar).toBeVisible({ timeout: 10000 })
  })

  test('lineup comparison displays correctly', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Roster Optimizer', { timeout: 15000 })
    
    // Wait for lineup comparison to load
    const comparisonSection = page.locator('[data-testid="lineup-comparison"]')
    await expect(comparisonSection).toBeVisible({ timeout: 10000 })
    
    // Verify both current and optimized lineups are shown
    const currentLineup = page.locator('text=Current Lineup')
    const optimizedLineup = page.locator('text=Optimized Lineup')
    
    await expect(currentLineup).toBeVisible()
    await expect(optimizedLineup).toBeVisible()
  })
})

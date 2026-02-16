import { test, expect } from '@playwright/test'

test.describe('Trade Page Format Toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trade')
    await expect(page.locator('[data-testid="trade-builder"]')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-testid="dynasty-redraft-toggle"]')).toBeVisible({ timeout: 5000 })
  })

  test('format toggle (Dynasty/Redraft) is visible', async ({ page }) => {
    const toggle = page.locator('[data-testid="dynasty-redraft-toggle"]')
    await expect(toggle).toBeVisible({ timeout: 5000 })
  })

  test('can click format toggle and see visual feedback', async ({ page }) => {
    const toggle = page.locator('[data-testid="dynasty-redraft-toggle"]')
    
    // Get initial state
    const initialChecked = await toggle.isChecked()
    console.log(`Initial toggle state (checked): ${initialChecked}`)
    
    // Click the toggle
    await toggle.click()
    
    if (initialChecked) {
      await expect(toggle).not.toBeChecked()
    } else {
      await expect(toggle).toBeChecked()
    }
    
    // Get new state
    const newChecked = await toggle.isChecked()
    console.log(`New toggle state (checked): ${newChecked}`)
    
    // Verify state changed
    expect(newChecked).not.toBe(initialChecked)
  })

  test('format toggle provides visual feedback on click', async ({ page }) => {
    const toggle = page.locator('[data-testid="dynasty-redraft-toggle"]')
    
    // Verify toggle is visible
    await expect(toggle).toBeVisible({ timeout: 5000 })
    
    // Take screenshot before
    await page.screenshot({ path: '.sisyphus/evidence/task-10-format-toggle-before.png' })
    
    // Click toggle
    const beforeChecked = await toggle.isChecked()
    await toggle.click()
    if (beforeChecked) {
      await expect(toggle).not.toBeChecked()
    } else {
      await expect(toggle).toBeChecked()
    }
    
    // Take screenshot after
    await page.screenshot({ path: '.sisyphus/evidence/task-10-format-toggle.png' })
    
    // Verify visual state changed
    const afterChecked = await toggle.isChecked()
    expect(afterChecked).toBeDefined()
  })

  test('toggle switches between Dynasty and Redraft', async ({ page }) => {
    const toggle = page.locator('[data-testid="dynasty-redraft-toggle"]')
    
    // Get initial state
    const isChecked = await toggle.isChecked()
    console.log(`Initial state - Dynasty selected: ${isChecked}`)
    
    // Click to toggle
    await toggle.click()
    if (isChecked) {
      await expect(toggle).not.toBeChecked()
    } else {
      await expect(toggle).toBeChecked()
    }
    
    const afterFirstClick = await toggle.isChecked()
    console.log(`After first click - Dynasty selected: ${afterFirstClick}`)
    expect(afterFirstClick).not.toBe(isChecked)
    
    // Click again to toggle back
    await toggle.click()
    if (afterFirstClick) {
      await expect(toggle).not.toBeChecked()
    } else {
      await expect(toggle).toBeChecked()
    }
    
    const afterSecondClick = await toggle.isChecked()
    console.log(`After second click - Dynasty selected: ${afterSecondClick}`)
    expect(afterSecondClick).toBe(isChecked)
  })
})

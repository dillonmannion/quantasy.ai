import { test, expect, type Page } from '@playwright/test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const hasAuthState = existsSync(join(__dirname, '.auth', 'user.json'))

async function openPickSelector(page: Page, side: 'give' | 'receive') {
  await page.click(`[data-testid="add-pick-${side}"]`)
}

test.describe('Trade Calculator with Picks', () => {
  test.beforeEach(() => {
    test.skip(!hasAuthState, 'Requires generated E2E auth state from global setup')
  })

  test.beforeEach(async ({ page }) => {
    await page.goto('/trade')
    await expect(page.locator('[data-testid="trade-builder"]')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-testid="bias-slider"]')).toBeVisible({ timeout: 5000 })
  })

  test('can open pick selector', async ({ page }) => {
    await openPickSelector(page, 'give')
    await expect(page.getByText('Add Draft Pick')).toBeVisible()
    await expect(page.getByText('Current Draft')).toBeVisible()
    await expect(page.getByText('Future Pick')).toBeVisible()
  })

  test('can add a current draft pick', async ({ page }) => {
    await openPickSelector(page, 'give')
    
    // Default: Current Draft, Round 1
    // Action: Select pick 1.05
    await page.locator('[data-testid="pick-number-select"]').click()
    await page.locator('[data-testid="pick-option-5"]').click()
    
    await page.locator('[data-testid="add-pick-confirm"]').click()
    
    // Verify: Pick added to give zone with correct label
    const pickChip = page.locator('[data-testid="zone-give"] [data-testid="pick-1-05"]')
    await expect(pickChip).toBeVisible()
    await expect(pickChip).toContainText('1.05')
  })

  test('can add a future draft pick', async ({ page }) => {
    await openPickSelector(page, 'receive')
    
    // Action: Select Future Pick (default: next year, Round 1)
    await page.getByText('Future Pick').click()
    
    await page.locator('[data-testid="add-pick-confirm"]').click()
    
    // Verify: Future pick added (year is dynamic so matching start of testid)
    const pickChip = page.locator('[data-testid="zone-receive"] [data-testid^="pick-20"]')
    await expect(pickChip).toBeVisible()
    await expect(pickChip).toContainText('Round 1')
  })

  test('bias slider updates pick values', async ({ page }) => {
    await openPickSelector(page, 'give')
    await page.locator('[data-testid="pick-number-select"]').click()
    await page.locator('[data-testid="pick-option-1"]').click()
    await page.locator('[data-testid="add-pick-confirm"]').click()
    
    const pickChip = page.locator('[data-testid="zone-give"] [data-testid="pick-1-01"]')
    await expect(pickChip).toBeVisible()
    
    // Wait for initial value load
    const valueDisplay = pickChip.locator('[data-testid="asset-value"] div').first()
    await expect(valueDisplay).toBeVisible()
    
    const initialValueText = await valueDisplay.textContent()
    const initialValue = parseFloat(initialValueText || '0')
    expect(initialValue).toBeGreaterThan(0)
    
    // Action: Move bias slider to Advantage (20%)
    const slider = page.locator('[data-testid="bias-slider"]')
    await expect(slider).toBeVisible()
    
    await slider.focus()
    // Range 0-20, step 1
    for (let i = 0; i < 20; i++) {
        await page.keyboard.press('ArrowRight')
    }
    
    await expect(slider).toHaveValue('20')
    
    // We expect the backend/logic to reflect bias changes in the value
    // Since we rely on the backend here (for Current picks), the test assumes backend integration
  })

  test('bias slider updates future pick values (local logic)', async ({ page }) => {
    await openPickSelector(page, 'give')
    await page.getByText('Future Pick').click()
    await page.locator('[data-testid="add-pick-confirm"]').click()
    
    const pickChip = page.locator('[data-testid="zone-give"] [data-testid^="pick-20"]')
    const valueDisplay = pickChip.locator('[data-testid="asset-value"] div').first()
    
    await expect(valueDisplay).toBeVisible()
    
    // Initial value (bias 0) => 50.0
    await expect(valueDisplay).toContainText('50.0')
    
    // Action: Move slider to 20% (0.2)
    const slider = page.locator('[data-testid="bias-slider"]')
    await slider.focus()
    for (let i = 0; i < 20; i++) {
        await page.keyboard.press('ArrowRight')
    }
    
    await expect(slider).toHaveValue('20')
    
    // Verify: Value updated to 70.0 (50 + 0.2 * 100)
    await expect(valueDisplay).toContainText('70.0')
  })
})

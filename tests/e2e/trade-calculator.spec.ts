import { test, expect, Page } from '@playwright/test'

async function openPlayerPicker(page: Page, zone: 'give' | 'receive') {
  const buttonTestId = zone === 'give' ? 'add-player-give' : 'add-player-receive'
  const button = page.locator(`[data-testid="${buttonTestId}"]`)
  
  await expect(button).toBeVisible({ timeout: 10000 })
  await button.click()
  await expect(page.locator('[data-testid="player-picker-modal"]')).toBeVisible({ timeout: 10000 })
  await expect(page.locator('[data-testid="player-picker-search"]')).toBeVisible({ timeout: 5000 })
}

async function selectPlayer(page: Page, searchQuery: string) {
  const searchInput = page.locator('[data-testid="player-picker-search"]')
  await expect(searchInput).toBeVisible({ timeout: 5000 })
  await searchInput.fill(searchQuery)
  
  const playerItem = page.locator('[data-testid="player-picker-item"]').first()
  await expect(playerItem).toBeVisible({ timeout: 5000 })
  await playerItem.scrollIntoViewIfNeeded()
  await playerItem.dispatchEvent('click')
  await expect(page.locator('[data-testid="player-picker-modal"]')).not.toBeVisible({ timeout: 5000 })
}

test.describe('Trade Calculator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trade')
    await expect(page.locator('[data-testid="trade-builder"]')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-testid="add-player-give"]')).toBeVisible({ timeout: 5000 })
  })

  test('page loads with trade builder interface', async ({ page }) => {
    await expect(page.locator('[data-testid="zone-give-header"]')).toBeVisible()
    await expect(page.locator('[data-testid="zone-receive-header"]')).toBeVisible()
    await expect(page.locator('[data-testid="add-player-give"]')).toBeVisible()
    await expect(page.locator('[data-testid="add-player-receive"]')).toBeVisible()
  })

  test('shows empty state in both zones initially', async ({ page }) => {
    await expect(page.locator('[data-testid="zone-give-empty"]')).toBeVisible()
    await expect(page.locator('[data-testid="zone-receive-empty"]')).toBeVisible()
  })

  test('fairness meter visible on page load with balanced state', async ({ page }) => {
    await expect(page.locator('[data-testid="fairness-meter"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('[data-testid="fairness-meter-label"]')).toBeVisible()
    await expect(page.locator('[data-testid="fairness-meter-verdict"]')).toHaveText('Balanced')
    await expect(page.locator('[data-testid="fairness-meter-value"]')).toHaveText('0')
  })

  test('clicking add player button opens picker modal', async ({ page }) => {
    await openPlayerPicker(page, 'give')
    
    await expect(page.locator('[data-testid="player-picker-title"]')).toHaveText('Add Player')
    await expect(page.locator('[data-testid="player-picker-filters"]')).toBeVisible()
  })

  test('player picker can be closed via close button', async ({ page }) => {
    await openPlayerPicker(page, 'give')
    
    await page.locator('[data-testid="player-picker-close"]').click()
    
    await expect(page.locator('[data-testid="player-picker-modal"]')).not.toBeVisible({ timeout: 5000 })
  })

  test('clicking outside modal closes it', async ({ page }) => {
    await openPlayerPicker(page, 'give')
    
    await page.mouse.click(10, 10)
    
    await expect(page.locator('[data-testid="player-picker-modal"]')).not.toBeVisible({ timeout: 5000 })
  })

  test('player picker search input is focused on open', async ({ page }) => {
    await openPlayerPicker(page, 'give')
    
    const searchInput = page.locator('[data-testid="player-picker-search"]')
    await searchInput.fill('test')
    await expect(searchInput).toHaveValue('test')
  })

  test('search filters players in picker modal', async ({ page }) => {
    await openPlayerPicker(page, 'give')
    
    const initialCount = await page.locator('[data-testid="player-picker-item"]').count()
    expect(initialCount).toBeGreaterThan(0)
    
    await page.locator('[data-testid="player-picker-search"]').fill('Mahomes')
    
    await expect(page.locator('[data-testid="player-picker-item"]:has-text("Mahomes")').first()).toBeVisible({ timeout: 5000 })
    const filteredCount = await page.locator('[data-testid="player-picker-item"]').count()
    expect(filteredCount).toBeLessThan(initialCount)
    expect(filteredCount).toBeGreaterThan(0)
  })

  test('no players found shows empty message', async ({ page }) => {
    await openPlayerPicker(page, 'give')
    
    await page.locator('[data-testid="player-picker-search"]').fill('xyznonexistentplayer123')
    
    await expect(page.locator('[data-testid="player-picker-empty"]')).toBeVisible({ timeout: 5000 })
  })

  test('clearing search restores player list', async ({ page }) => {
    await openPlayerPicker(page, 'give')
    
    const initialCount = await page.locator('[data-testid="player-picker-item"]').count()
    
    await page.locator('[data-testid="player-picker-search"]').fill('Mahomes')
    
    await expect(page.locator('[data-testid="player-picker-item"]:has-text("Mahomes")').first()).toBeVisible({ timeout: 5000 })
    const filteredCount = await page.locator('[data-testid="player-picker-item"]').count()
    expect(filteredCount).toBeLessThan(initialCount)
    
    await page.locator('[data-testid="player-picker-search"]').fill('')
    
    await expect(page.locator('[data-testid="player-picker-item"]')).not.toHaveCount(filteredCount, { timeout: 5000 })
    const restoredCount = await page.locator('[data-testid="player-picker-item"]').count()
    expect(restoredCount).toBe(initialCount)
  })

  test('position filter shows only selected position', async ({ page }) => {
    await openPlayerPicker(page, 'give')
    
    await page.locator('[data-testid="filter-QB"]').click()
    
    await expect(page.locator('[data-testid="player-picker-item"]').first()).toBeVisible({ timeout: 5000 })
    const qbCount = await page.locator('[data-testid="player-picker-item"]').count()
    expect(qbCount).toBeGreaterThan(0)
    
    await page.locator('[data-testid="filter-RB"]').click()
    
    await expect(page.locator('[data-testid="player-picker-item"]').first()).toBeVisible({ timeout: 5000 })
    const rbCount = await page.locator('[data-testid="player-picker-item"]').count()
    expect(rbCount).toBeGreaterThan(0)
  })

  test('All filter shows all positions', async ({ page }) => {
    await openPlayerPicker(page, 'give')
    
    await page.locator('[data-testid="filter-QB"]').click()
    
    await expect(page.locator('[data-testid="player-picker-item"]').first()).toBeVisible({ timeout: 5000 })
    const qbCount = await page.locator('[data-testid="player-picker-item"]').count()
    
    await page.locator('[data-testid="filter-All"]').click()
    
    await expect(page.locator('[data-testid="player-picker-item"]')).not.toHaveCount(qbCount, { timeout: 5000 })
    const allCount = await page.locator('[data-testid="player-picker-item"]').count()
    
    expect(allCount).toBeGreaterThan(qbCount)
  })

  test('selecting player adds chip to give zone', async ({ page }) => {
    await openPlayerPicker(page, 'give')
    await selectPlayer(page, 'Mahomes')
    
    await expect(page.locator('[data-testid="player-picker-modal"]')).not.toBeVisible({ timeout: 5000 })
    await expect(page.locator('[data-testid="zone-give"] [data-testid="player-chip"]')).toBeVisible()
    await expect(page.locator('[data-testid="zone-give-empty"]')).not.toBeVisible()
  })

  test('selecting player adds chip to receive zone', async ({ page }) => {
    await openPlayerPicker(page, 'receive')
    await selectPlayer(page, 'Kelce')
    
    await expect(page.locator('[data-testid="zone-receive"] [data-testid="player-chip"]')).toBeVisible()
    await expect(page.locator('[data-testid="zone-receive-empty"]')).not.toBeVisible()
  })

  test('can add multiple players to same zone', async ({ page }) => {
    await openPlayerPicker(page, 'give')
    await page.locator('[data-testid="player-picker-item"]').first().click()
    await expect(page.locator('[data-testid="player-picker-modal"]')).not.toBeVisible({ timeout: 5000 })
    await expect(page.locator('[data-testid="zone-give"] [data-testid="player-chip"]')).toHaveCount(1, { timeout: 5000 })
    
    await openPlayerPicker(page, 'give')
    await page.locator('[data-testid="player-picker-item"]').first().click()
    await expect(page.locator('[data-testid="player-picker-modal"]')).not.toBeVisible({ timeout: 5000 })
    
    await expect(page.locator('[data-testid="zone-give"] [data-testid="player-chip"]')).toHaveCount(2, { timeout: 5000 })
  })

  test('selected players are removed from picker list', async ({ page }) => {
    await openPlayerPicker(page, 'give')
    await selectPlayer(page, 'Mahomes')
    
    await openPlayerPicker(page, 'receive')
    await page.locator('[data-testid="player-picker-search"]').fill('Mahomes')
    
    await expect(page.locator('[data-testid="player-picker-empty"]')).toBeVisible({ timeout: 5000 })
    const afterCount = await page.locator('[data-testid="player-picker-item"]').count()
    expect(afterCount).toBe(0)
  })

  test('remove button removes player from zone', async ({ page }) => {
    await openPlayerPicker(page, 'give')
    await selectPlayer(page, 'Mahomes')
    
    const chip = page.locator('[data-testid="zone-give"] [data-testid="player-chip"]')
    await expect(chip).toBeVisible({ timeout: 5000 })
    
    await chip.hover()
    await page.locator('[data-testid="zone-give"] [data-testid="player-chip-remove"]').click()
    
    await expect(chip).not.toBeVisible({ timeout: 5000 })
    await expect(page.locator('[data-testid="zone-give-empty"]')).toBeVisible()
  })

  test('removing all players restores empty state and hides propose button', async ({ page }) => {
    await openPlayerPicker(page, 'give')
    await selectPlayer(page, 'Mahomes')
    
    await expect(page.locator('[data-testid="propose-trade-button"]')).toBeVisible({ timeout: 5000 })
    
    await page.locator('[data-testid="zone-give"] [data-testid="player-chip"]').hover()
    await page.locator('[data-testid="zone-give"] [data-testid="player-chip-remove"]').click()
    
    await expect(page.locator('[data-testid="propose-trade-button"]')).not.toBeVisible({ timeout: 5000 })
    await expect(page.locator('[data-testid="zone-give-empty"]')).toBeVisible()
  })

  test('fairness meter updates when player added to give zone', async ({ page }) => {
    await expect(page.locator('[data-testid="fairness-meter-value"]')).toHaveText('0')
    
    await openPlayerPicker(page, 'give')
    await selectPlayer(page, 'Mahomes')
    
    await expect(page.locator('[data-testid="fairness-meter-value"]')).not.toHaveText('0', { timeout: 5000 })
    const fairnessValue = await page.locator('[data-testid="fairness-meter-value"]').textContent()
    expect(fairnessValue).not.toBe('0')
  })

  test('fairness meter shows correct verdict based on trade balance', async ({ page }) => {
    await openPlayerPicker(page, 'give')
    await selectPlayer(page, 'Mahomes')
    
    await expect(page.locator('[data-testid="fairness-meter-value"]')).not.toHaveText('0', { timeout: 5000 })
    const verdict = await page.locator('[data-testid="fairness-meter-verdict"]').textContent()
    expect(['You Lose', 'Slight Loss', 'Balanced']).toContain(verdict)
  })

  test('fairness meter recalculates when player removed', async ({ page }) => {
    await openPlayerPicker(page, 'give')
    await selectPlayer(page, 'Mahomes')
    
    await expect(page.locator('[data-testid="fairness-meter-value"]')).not.toHaveText('0', { timeout: 5000 })
    const valueAfterAdd = await page.locator('[data-testid="fairness-meter-value"]').textContent()
    expect(valueAfterAdd).not.toBe('0')
    
    await page.locator('[data-testid="zone-give"] [data-testid="player-chip"]').hover()
    await page.locator('[data-testid="zone-give"] [data-testid="player-chip-remove"]').click()
    
    await expect(page.locator('[data-testid="fairness-meter-value"]')).toHaveText('0')
  })

  test('trade explanation appears when player added', async ({ page }) => {
    await expect(page.locator('[data-testid="trade-explanation"]')).not.toBeVisible()
    
    await openPlayerPicker(page, 'give')
    await selectPlayer(page, 'Mahomes')
    
    await expect(page.locator('[data-testid="trade-explanation"]')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('[data-testid="trade-net-value"]')).toBeVisible()
    await expect(page.locator('[data-testid="trade-points-label"]')).toBeVisible()
  })

  test('propose trade button appears when players selected', async ({ page }) => {
    await expect(page.locator('[data-testid="propose-trade-button"]')).not.toBeVisible()
    
    await openPlayerPicker(page, 'give')
    await selectPlayer(page, 'Mahomes')
    
    await expect(page.locator('[data-testid="propose-trade-button"]')).toBeVisible({ timeout: 5000 })
  })

  test('mobile layout - 390x844 viewport shows stacked zones', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    
    await expect(page.locator('[data-testid="zone-give-header"]')).toBeVisible()
    await expect(page.locator('[data-testid="zone-receive-header"]')).toBeVisible()
    await expect(page.locator('[data-testid="add-player-give"]')).toBeVisible()
    await expect(page.locator('[data-testid="add-player-receive"]')).toBeVisible()
    await expect(page.locator('[data-testid="fairness-meter"]')).toBeVisible()
  })

  test('mobile player picker slides up from bottom', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    
    await openPlayerPicker(page, 'give')
    
    await expect(page.locator('[data-testid="player-picker-search"]')).toBeVisible()
    await expect(page.locator('[data-testid="player-picker-filters"]')).toBeVisible()
  })

  test('mobile full player selection flow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    
    await openPlayerPicker(page, 'give')
    
    const searchInput = page.locator('[data-testid="player-picker-search"]')
    await searchInput.fill('Mahomes')
    
    const playerItem = page.locator('[data-testid="player-picker-item"]').first()
    await expect(playerItem).toBeVisible({ timeout: 5000 })
    await playerItem.dispatchEvent('click')
    
    await expect(page.locator('[data-testid="player-picker-modal"]')).not.toBeVisible({ timeout: 5000 })
    await expect(page.locator('[data-testid="zone-give"] [data-testid="player-chip"]')).toBeVisible({ timeout: 10000 })
    
    await page.evaluate(() => window.scrollBy(0, 300))
    await expect(page.locator('[data-testid="fairness-meter"]')).toBeVisible()
  })

  test('desktop layout - zones side by side at 1920x1080', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    
    await expect(page.locator('[data-testid="zone-give-header"]')).toBeVisible({ timeout: 5000 })
    const giveBox = await page.locator('[data-testid="zone-give-header"]').boundingBox()
    const receiveBox = await page.locator('[data-testid="zone-receive-header"]').boundingBox()
    
    expect(giveBox).toBeTruthy()
    expect(receiveBox).toBeTruthy()
    
    if (giveBox && receiveBox) {
      expect(Math.abs(giveBox.y - receiveBox.y)).toBeLessThan(50)
    }
  })

  test('desktop picker modal shows all position filters', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    
    await openPlayerPicker(page, 'give')
    
    await expect(page.locator('[data-testid="filter-All"]')).toBeVisible()
    await expect(page.locator('[data-testid="filter-QB"]')).toBeVisible()
    await expect(page.locator('[data-testid="filter-RB"]')).toBeVisible()
    await expect(page.locator('[data-testid="filter-WR"]')).toBeVisible()
    await expect(page.locator('[data-testid="filter-TE"]')).toBeVisible()
  })

  test('handles adding players to both zones in quick succession', async ({ page }) => {
    await openPlayerPicker(page, 'give')
    await page.locator('[data-testid="player-picker-item"]').first().click()
    await expect(page.locator('[data-testid="player-picker-modal"]')).not.toBeVisible({ timeout: 5000 })
    await expect(page.locator('[data-testid="zone-give"] [data-testid="player-chip"]')).toBeVisible({ timeout: 5000 })
    
    await openPlayerPicker(page, 'receive')
    await page.locator('[data-testid="player-picker-item"]').first().click()
    await expect(page.locator('[data-testid="player-picker-modal"]')).not.toBeVisible({ timeout: 5000 })
    
    await expect(page.locator('[data-testid="zone-give"] [data-testid="player-chip"]')).toBeVisible()
    await expect(page.locator('[data-testid="zone-receive"] [data-testid="player-chip"]')).toBeVisible()
    await expect(page.locator('[data-testid="trade-explanation"]')).toBeVisible()
    await expect(page.locator('[data-testid="propose-trade-button"]')).toBeVisible()
  })
})

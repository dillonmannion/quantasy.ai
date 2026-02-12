import { test, expect } from '@playwright/test'

test.describe('PWA Offline Mode', () => {
  test('offline indicator visible when offline', async ({ page, context }) => {
    await page.goto('/draft')
    await expect(page.locator('[data-testid="rankings-list"]').first()).toBeVisible({ timeout: 15000 })
    
    await context.setOffline(true)
    await page.evaluate(() => window.dispatchEvent(new Event('offline')))
    
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('[data-testid="offline-indicator"]')).toContainText('Offline Mode')
  })

  test('offline indicator hidden when online', async ({ page, context }) => {
    await page.goto('/draft')
    await expect(page.locator('[data-testid="rankings-list"]').first()).toBeVisible({ timeout: 15000 })
    
    await context.setOffline(true)
    await page.evaluate(() => window.dispatchEvent(new Event('offline')))
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible({ timeout: 5000 })
    
    await context.setOffline(false)
    await page.evaluate(() => window.dispatchEvent(new Event('online')))
    await expect(page.locator('[data-testid="offline-indicator"]')).not.toBeVisible({ timeout: 5000 })
  })

  test('rankings visible before going offline', async ({ page, context }) => {
    await page.goto('/draft')
    await expect(page.locator('[data-testid="rankings-list"]').first()).toBeVisible({ timeout: 15000 })
    
    await context.setOffline(true)
    await page.evaluate(() => window.dispatchEvent(new Event('offline')))
    
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('[data-testid="rankings-list"]').first()).toBeVisible()
  })

  test('mock draft works fully offline', async ({ page, context }) => {
    await page.goto('/draft')
    await expect(page.locator('[data-testid="rankings-list"]').first()).toBeVisible({ timeout: 15000 })
    
    await context.setOffline(true)
    await page.evaluate(() => window.dispatchEvent(new Event('offline')))
    
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible({ timeout: 5000 })
    
    await page.locator('[data-testid="start-mock-draft"]').click()
    
    const firstPlayer = page.locator('[data-testid="player-card"]').first()
    await expect(firstPlayer).toBeVisible()
    await firstPlayer.click()
    
    await expect(page.locator('[data-testid="rankings-list"]').first()).toBeVisible()
  })
})

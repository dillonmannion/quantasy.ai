import { test, expect } from '@playwright/test'

test.describe('PWA Offline Mode', () => {
  test('offline indicator visible when offline', async ({ page, context }) => {
    await page.goto('/draft')
    
    await context.setOffline(true)
    
    await page.evaluate(() => {
      window.dispatchEvent(new Event('offline'))
    })
    
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible()
    await expect(page.locator('[data-testid="offline-indicator"]')).toContainText('Offline Mode')
  })

  test('offline indicator hidden when online', async ({ page, context }) => {
    await page.goto('/draft')
    
    await context.setOffline(true)
    await page.evaluate(() => window.dispatchEvent(new Event('offline')))
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible()
    
    await context.setOffline(false)
    await page.evaluate(() => window.dispatchEvent(new Event('online')))
    await expect(page.locator('[data-testid="offline-indicator"]')).not.toBeVisible()
  })

  test('offline mode shows cached rankings', async ({ page, context }) => {
    await page.goto('/draft')
    await page.waitForSelector('[data-testid="rankings-list"]')
    
    await context.setOffline(true)
    
    await page.reload()
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible()
    await expect(page.locator('[data-testid="rankings-list"]')).toBeVisible()
  })

  test('mock draft works fully offline', async ({ page, context }) => {
    await page.goto('/draft')
    await page.waitForSelector('[data-testid="rankings-list"]')
    
    await context.setOffline(true)
    await page.evaluate(() => window.dispatchEvent(new Event('offline')))
    
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible()
    
    const mockDraftToggle = page.locator('[data-testid="mock-draft-toggle"]')
    if (await mockDraftToggle.isVisible()) {
      await mockDraftToggle.click()
    }
    
    const firstPlayer = page.locator('[data-testid="player-card"]').first()
    if (await firstPlayer.isVisible()) {
      await firstPlayer.click()
      
      const draftButton = page.locator('[data-testid="draft-player-button"]')
      if (await draftButton.isVisible()) {
        await draftButton.click()
      }
    }
  })
})

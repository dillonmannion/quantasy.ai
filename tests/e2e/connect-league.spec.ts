import { test, expect } from '@playwright/test'

async function fillUsername(page: import('@playwright/test').Page, username: string) {
  const input = page.locator('input#username')
  await input.click()
  await input.fill(username)
  await input.press('Tab')
}

test.describe('Connect League Flow', () => {
  test('happy path: username -> leagues -> syncing -> complete', async ({ page }) => {
    await page.goto('/connect')

    await expect(page.getByRole('heading', { name: 'Connect Your League' })).toBeVisible()
    await expect(page.locator('input#username')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toContainText('Find My Leagues')

    const progressDots = page.locator('.flex.items-center.justify-center.gap-2 > div')
    await expect(progressDots).toHaveCount(3)

    await fillUsername(page, 'testuser')
    await page.click('button[type="submit"]')

    await expect(page.locator('text=Change Username')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('text=@testuser')).toBeVisible()
    await expect(page.locator('text=Test User')).toBeVisible()

    await expect(page.locator('text=Test Fantasy League')).toBeVisible()
    await expect(page.locator('text=2025 Season')).toBeVisible()
    await expect(page.locator('text=12 Teams')).toBeVisible()

    await page.click('text=Test Fantasy League')

    await expect(page.locator('text=League Connected!')).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('button', { name: 'Go to Dashboard' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Connect Another League' })).toBeVisible()
  })

  test('error case: user not found shows error message', async ({ page }) => {
    await page.goto('/connect')

    await fillUsername(page, 'nonexistentuser')
    await page.click('button[type="submit"]')

    await expect(page.locator('text=Error')).toBeVisible({ timeout: 15000 })
    await expect(
      page.locator('text=No Sleeper user found with username "nonexistentuser"')
    ).toBeVisible()

    await expect(page.locator('input#username')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toContainText('Find My Leagues')
  })

  test('back button returns to username step', async ({ page }) => {
    await page.goto('/connect')

    await fillUsername(page, 'testuser')
    await page.click('button[type="submit"]')

    await expect(page.locator('text=Change Username')).toBeVisible({ timeout: 15000 })

    await page.click('text=Change Username')

    await expect(page.locator('input#username')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toContainText('Find My Leagues')
  })

  test('connect another league button resets to selection', async ({ page }) => {
    await page.goto('/connect')

    await fillUsername(page, 'testuser')
    await page.click('button[type="submit"]')
    await expect(page.locator('text=Test Fantasy League')).toBeVisible({ timeout: 15000 })
    await page.click('text=Test Fantasy League')
    await expect(page.locator('text=League Connected!')).toBeVisible({ timeout: 15000 })

    await page.click('text=Connect Another League')

    await expect(page.locator('text=Change Username')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Test Fantasy League' })).toBeVisible()
  })
})

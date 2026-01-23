import { test, expect } from '@playwright/test'

test('auth flow', async ({ page }) => {
  await page.goto('/login')

  await expect(page.locator('h1')).toContainText('Welcome to Quantasy')

  await page.fill('input[type="email"]', 'test@example.com')
  await page.click('button[type="submit"]')

  await expect(page.locator('text=Check your email')).toBeVisible()
})

test('protected routes redirect to login', async ({ page }) => {
  await page.goto('/dashboard')

  await expect(page).toHaveURL('/login')
})

test('landing page renders correctly', async ({ page }) => {
  await page.goto('/')

  await expect(page.locator('h1')).toContainText('Quantasy')

  await expect(page.locator('text=Draft Assistant')).toBeVisible()
  await expect(page.locator('text=Roster Optimizer')).toBeVisible()
  await expect(page.locator('text=Trade Calculator')).toBeVisible()
  await expect(page.locator('text=Waiver Wire Tool')).toBeVisible()
})

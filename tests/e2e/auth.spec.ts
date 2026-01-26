import { test, expect } from '@playwright/test'

test.describe('auth', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login')
    
    await expect(page.locator('h1')).toContainText('Welcome to Quantasy')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toContainText('Send Magic Link')
  })

  test('protected routes redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard')
    
    await expect(page).toHaveURL(/\/login/)
  })

  test('landing page renders correctly', async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('h1')).toContainText('Quantasy')

    await expect(page.locator('text=Draft Assistant')).toBeVisible()
    await expect(page.locator('text=Roster Optimizer')).toBeVisible()
    await expect(page.locator('text=Trade Calculator')).toBeVisible()
    await expect(page.locator('text=Waiver Wire Tool')).toBeVisible()
  })
})

test.describe('authenticated user', () => {
  test('dashboard is accessible when logged in', async ({ page }) => {
    await page.goto('/dashboard')
    
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('draft page is accessible when logged in', async ({ page }) => {
    await page.goto('/draft')
    
    await expect(page).not.toHaveURL(/\/login/)
  })
})

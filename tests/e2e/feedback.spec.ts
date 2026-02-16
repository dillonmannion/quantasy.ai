import { test, expect } from '@playwright/test'

test.describe('Feedback Form', () => {
  test('authenticated user can submit feedback successfully', async ({ page }) => {
    await page.goto('/feedback')

    // Verify page loaded
    await expect(page.getByRole('heading', { name: 'Feedback' })).toBeVisible()

    // Select feature from dropdown
    await page.getByRole('combobox').click()
    await page.getByRole('option', { name: 'Draft Assistant' }).click()

    // Click 4th star (rating = 4)
    const starButtons = page.locator('button').filter({ has: page.locator('svg.lucide-star') })
    await starButtons.nth(3).click()

    // Fill text area
    await page.getByRole('textbox').fill('The VBD calculations are super helpful!')

    // Submit form
    await page.getByRole('button', { name: /submit/i }).click()

    // Wait for success toast
    await expect(page.getByText(/thank you/i)).toBeVisible()

    // Verify form reset
    await expect(page.getByRole('textbox')).toHaveValue('')
  })

  test('shows validation error when submitting without feature', async ({ page }) => {
    await page.goto('/feedback')

    // Try to submit without selecting feature
    await page.getByRole('button', { name: /submit/i }).click()

    // Should show error toast
    await expect(page.getByText(/please select/i)).toBeVisible()
  })

  test('shows validation error when submitting without rating', async ({ page }) => {
    await page.goto('/feedback')

    // Select feature
    await page.getByRole('combobox').click()
    await page.getByRole('option', { name: 'Roster Optimizer' }).click()

    // Try to submit without rating
    await page.getByRole('button', { name: /submit/i }).click()

    // Should show error toast
    await expect(page.getByText(/please select/i)).toBeVisible()
  })

  test('can submit feedback with all fields filled', async ({ page }) => {
    await page.goto('/feedback')

    // Select feature
    await page.getByRole('combobox').click()
    await page.getByRole('option', { name: 'Trade Calculator' }).click()

    // Click 5th star (rating = 5)
    const starButtons = page.locator('button').filter({ has: page.locator('svg.lucide-star') })
    await starButtons.nth(4).click()

    // Fill text area
    await page.getByRole('textbox').fill('Excellent tool for evaluating trades!')

    // Submit form
    await page.getByRole('button', { name: /submit/i }).click()

    // Wait for success toast
    await expect(page.getByText(/thank you/i)).toBeVisible()
  })

  test('can submit feedback without optional text', async ({ page }) => {
    await page.goto('/feedback')

    // Select feature
    await page.getByRole('combobox').click()
    await page.getByRole('option', { name: 'Waiver Wire' }).click()

    // Click 3rd star (rating = 3)
    const starButtons = page.locator('button').filter({ has: page.locator('svg.lucide-star') })
    await starButtons.nth(2).click()

    // Don't fill text area - it's optional

    // Submit form
    await page.getByRole('button', { name: /submit/i }).click()

    // Wait for success toast
    await expect(page.getByText(/thank you/i)).toBeVisible()
  })

  test('star rating updates correctly on click', async ({ page }) => {
    await page.goto('/feedback')

    const starButtons = page.locator('button').filter({ has: page.locator('svg.lucide-star') })

    // Click 2nd star
    await starButtons.nth(1).click()

    // Verify first 2 stars are filled (yellow)
    const stars = page.locator('svg.lucide-star')
    const firstStar = stars.nth(0)
    const secondStar = stars.nth(1)
    const thirdStar = stars.nth(2)

    await expect(firstStar).toHaveClass(/fill-yellow-400/)
    await expect(secondStar).toHaveClass(/fill-yellow-400/)
    await expect(thirdStar).not.toHaveClass(/fill-yellow-400/)

    // Click 4th star
    await starButtons.nth(3).click()

    // Verify first 4 stars are filled
    await expect(firstStar).toHaveClass(/fill-yellow-400/)
    await expect(secondStar).toHaveClass(/fill-yellow-400/)
    await expect(stars.nth(2)).toHaveClass(/fill-yellow-400/)
    await expect(stars.nth(3)).toHaveClass(/fill-yellow-400/)
    await expect(stars.nth(4)).not.toHaveClass(/fill-yellow-400/)
  })
})

test.describe('Feedback Form - Unauthenticated', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/feedback')

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/)
  })
})

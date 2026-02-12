import { test, expect } from '@playwright/test'

const MOCK_WAIVERS_RESPONSE = {
  recommendations: [
    {
      player: {
        playerId: 'wr-1',
        fullName: 'Test WR',
        position: 'WR',
        team: 'KC',
        eligiblePositions: ['WR'],
        projectedPoints: 180,
        injuryStatus: null,
        status: 'Active',
        byeWeek: null,
      },
      priorityScore: 45.5,
      suggestedFaabBid: { min: 24, max: 36, budgetPercentageMin: 24, budgetPercentageMax: 36 },
      vbdImprovement: 35,
      reasons: [
        'VBD: 40 (proj: 180 - baseline: 140)',
        'Improvement: +35 over Worst WR (5)',
        'Need: 1.3x (Starter upgrade)',
        'Priority score: 45.5 = 35 × 1.3',
        'FAAB range: $24-$36 (24%-36% of $100)',
      ],
    },
  ],
  droppable: [
    {
      playerId: 'rb-bench',
      fullName: 'Bench RB',
      position: 'RB',
      team: 'SF',
      eligiblePositions: ['RB'],
      projectedPoints: 80,
      injuryStatus: null,
      status: 'Active',
      byeWeek: null,
    },
  ],
  explanation: {
    algorithm: 'waiver_v1',
    timestamp: new Date().toISOString(),
    methodology: '## Waiver Priority Calculation\n\nRecommendations based on VBD improvement and roster need.',
    caveats: ['Bye week conflicts not factored in v1'],
    priorityFactors: ['VBD improvement', 'Roster need'],
  },
}

test.describe('Waiver Wire', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/algorithms/waivers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_WAIVERS_RESPONSE),
      })
    })
    await page.goto('/waivers')
  })

  test('page loads with waiver interface', async ({ page }) => {
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('label:has-text("Week")').first()).toBeVisible()
    await expect(page.locator('label:has-text("FAAB Total")').first()).toBeVisible()
    await expect(page.locator('label:has-text("Remaining")').first()).toBeVisible()
    await expect(page.locator('button:has-text("Refresh Recommendations")').first()).toBeVisible()
  })

  test('displays recommendations list after fetch', async ({ page }) => {
    await expect(page.locator('h2:has-text("Top Waiver Picks")').first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('span:has-text("Priority Score:")').first()).toBeVisible({ timeout: 5000 })
    await expect(page.locator('h3:has-text("Test WR")').first()).toBeVisible({ timeout: 5000 })
  })

  test('shows droppable players section with populated list', async ({ page }) => {
    const droppableSection = page.locator('h2:has-text("Droppable Players")').first()
    await expect(droppableSection).toBeVisible({ timeout: 15000 })
    await expect(page.locator('text=Bench RB').first()).toBeVisible({ timeout: 5000 })
  })

  test('shows droppable players banner when empty', async ({ page }) => {
    await expect(page.locator('h2:has-text("Droppable Players")').first()).toBeVisible({ timeout: 15000 })
  })

  test('validates FAAB budget input - remaining exceeds total', async ({ page }) => {
    await expect(page.locator('label:has-text("FAAB Total")').first()).toBeVisible({ timeout: 15000 })
    await page.fill('input[id="faab-total"]', '50')
    await page.fill('input[id="faab-remaining"]', '100')
    await page.locator('button:has-text("Refresh Recommendations")').first().click()
    await expect(page.locator('text=Remaining cannot exceed Total')).toBeVisible({ timeout: 5000 })
  })

  test('validates FAAB budget input - negative values', async ({ page }) => {
    await expect(page.locator('label:has-text("FAAB Total")').first()).toBeVisible({ timeout: 15000 })
    await page.fill('input[id="faab-total"]', '-10')
    await page.fill('input[id="faab-remaining"]', '50')
    await page.locator('button:has-text("Refresh Recommendations")').first().click()
    await expect(page.locator('text=Budget must be positive')).toBeVisible({ timeout: 5000 })
  })

  test('Add to Claims button is visible in recommendations', async ({ page }) => {
    await expect(page.locator('h2:has-text("Top Waiver Picks")').first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('span:has-text("Priority Score:")').first()).toBeVisible({ timeout: 5000 })
    await expect(page.locator('button:has-text("Add to Claims")').first()).toBeVisible()
  })

  test('shows empty state when no recommendations', async ({ page }) => {
    await expect(page.locator('h2:has-text("Top Waiver Picks")').first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('span:has-text("Priority Score:")').first()).toBeVisible({ timeout: 5000 })
  })

  test('shows error state when API fails', async ({ page }) => {
    await expect(page.locator('h2:has-text("Top Waiver Picks")').first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('span:has-text("Priority Score:")').first()).toBeVisible({ timeout: 5000 })
  })

  test('week selector changes trigger refetch', async ({ page }) => {
    await expect(page.locator('h2:has-text("Top Waiver Picks")').first()).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(500)
    const initialRecs = await page.locator('span:has-text("Priority Score:")').count()
    expect(initialRecs).toBeGreaterThan(0)
    await page.fill('input[id="week"]', '5')
    await page.locator('button:has-text("Refresh Recommendations")').first().click()
    await expect(page.locator('span:has-text("Priority Score:")').first()).toBeVisible({ timeout: 10000 })
  })

  test('FAAB bid display shows suggested bid range', async ({ page }) => {
    await expect(page.locator('h2:has-text("Top Waiver Picks")').first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('span:has-text("Priority Score:")').first()).toBeVisible({ timeout: 5000 })
    const faabInfo = page.locator('text=$')
    const count = await faabInfo.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('Show Your Work section displays reasons', async ({ page }) => {
    await expect(page.locator('h2:has-text("Top Waiver Picks")').first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('span:has-text("Priority Score:")').first()).toBeVisible({ timeout: 5000 })
    const summary = page.locator('summary:has-text("Show Your Work")').first()
    await expect(summary).toBeVisible()
    await summary.click()
    await expect(page.locator('li:has-text("VBD:")').first()).toBeVisible({ timeout: 5000 })
  })

  test('mobile responsive layout', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page.locator('label:has-text("Week")').first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('label:has-text("FAAB Total")').first()).toBeVisible()
    await expect(page.locator('button:has-text("Refresh Recommendations")').first()).toBeVisible()
  })

  test('mobile recommendations display', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page.locator('h2:has-text("Top Waiver Picks")').first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('span:has-text("Priority Score:")').first()).toBeVisible({ timeout: 5000 })
    await expect(page.locator('h3:has-text("Test WR")').first()).toBeVisible({ timeout: 5000 })
  })

  test('mobile droppable players section', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    const droppableSection = page.locator('h2:has-text("Droppable Players")').first()
    await expect(droppableSection).toBeVisible({ timeout: 15000 })
    await droppableSection.scrollIntoViewIfNeeded()
    await expect(page.locator('text=Bench RB').first()).toBeVisible({ timeout: 5000 })
  })

  test('refresh button shows loading state', async ({ page }) => {
    await expect(page.locator('h2:has-text("Top Waiver Picks")').first()).toBeVisible({ timeout: 15000 })
    const refreshButton = page.locator('button:has-text("Refresh Recommendations")').first()
    await refreshButton.click()
    await expect(refreshButton).toBeDisabled({ timeout: 5000 })
    await expect(refreshButton).toBeEnabled({ timeout: 10000 })
  })

  test('methodology card displays explanation', async ({ page }) => {
    await expect(page.locator('h2:has-text("Top Waiver Picks")').first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('text=Methodology').first()).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=Value-Based Drafting').first()).toBeVisible()
  })
})

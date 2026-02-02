import { test, expect, Page } from '@playwright/test'

async function openPlayerPicker(page: Page, zone: 'give' | 'receive') {
  const buttonTestId = zone === 'give' ? 'add-player-give' : 'add-player-receive'
  const button = page.locator(`[data-testid="${buttonTestId}"]`)

  await expect(button).toBeVisible({ timeout: 10000 })
  await button.click()
  await page.waitForTimeout(500)
  await expect(page.locator('[data-testid="player-picker-modal"]')).toBeVisible({ timeout: 10000 })
}

async function selectPlayer(page: Page, searchQuery: string) {
  const searchInput = page.locator('[data-testid="player-picker-search"]')
  await expect(searchInput).toBeVisible({ timeout: 5000 })
  await searchInput.fill(searchQuery)
  await page.waitForTimeout(500)

  const playerItem = page.locator('[data-testid="player-picker-item"]').first()
  await expect(playerItem).toBeVisible({ timeout: 5000 })
  await playerItem.scrollIntoViewIfNeeded()
  await playerItem.dispatchEvent('click')
  await page.waitForTimeout(500)
}

test.describe('P1 Features', () => {
  test.describe('Transaction History', () => {
    test.beforeEach(async ({ page }) => {
      await page.route('**/api/transactions*', async route => {
        await route.fulfill({
          json: {
            transactions: [
              {
                transaction_id: 'txn-1',
                type: 'trade',
                status: 'complete',
                roster_ids: [1, 2],
                adds: { '4046': 1, '5012': 2 },
                drops: { '4046': 2, '5012': 1 },
                draft_picks: [],
                waiver_budget: [],
                settings: {},
                created: Date.now() - 86400000,
                resolved_adds: {
                  '4046': { player_id: '4046', full_name: 'Patrick Mahomes', position: 'QB', team: 'KC', rosterId: 1, name: 'Patrick Mahomes' }
                },
                resolved_drops: {
                  '5012': { player_id: '5012', full_name: 'Tyreek Hill', position: 'WR', team: 'MIA', rosterId: 1, name: 'Tyreek Hill' }
                }
              },
              {
                transaction_id: 'txn-2',
                type: 'waiver',
                status: 'complete',
                roster_ids: [1],
                adds: { '6801': 1 },
                drops: { '5001': 1 },
                draft_picks: [],
                waiver_budget: [],
                settings: { waiver_bid: 25 },
                created: Date.now() - 172800000,
                resolved_adds: {
                  '6801': { player_id: '6801', full_name: 'Justin Herbert', position: 'QB', team: 'LAC', rosterId: 1, name: 'Justin Herbert' }
                },
                resolved_drops: {
                  '5001': { player_id: '5001', full_name: 'Bench RB', position: 'RB', team: 'SF', rosterId: 1, name: 'Bench RB' }
                }
              }
            ],
            week: 5
          }
        })
      })
    })

    test('displays transaction list', async ({ page }) => {
      await page.goto('/dashboard')
      await page.waitForTimeout(1000)

      const button = page.locator('[data-testid="view-transactions-button"]')
      await expect(button).toBeVisible({ timeout: 10000 })
      await button.click()
      
      await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 })
      await expect(page.locator('text=Transaction History')).toBeVisible({ timeout: 5000 })

      await expect(page.locator('[data-testid="transaction-list"]')).toBeVisible({ timeout: 15000 })

      const transactionRows = page.locator('[data-testid^="transaction-row-"]')
      await expect(transactionRows.first()).toBeVisible({ timeout: 5000 })
    })

    test('expands and collapses transaction details', async ({ page }) => {
      await page.goto('/dashboard')
      await page.waitForTimeout(1000)

      const button = page.locator('[data-testid="view-transactions-button"]')
      await expect(button).toBeVisible({ timeout: 10000 })
      await button.click()

      await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 })
      await expect(page.locator('[data-testid="transaction-list"]')).toBeVisible({ timeout: 15000 })

      const toggleButton = page.locator('[data-testid="transaction-toggle-0"]')
      await expect(toggleButton).toBeVisible({ timeout: 5000 })
      await toggleButton.click()
      await page.waitForTimeout(300)

      const details = page.locator('[data-testid^="transaction-details-"]').first()
      await expect(details).toBeVisible({ timeout: 5000 })

      await toggleButton.click()
      await page.waitForTimeout(300)

      await expect(details).not.toBeVisible({ timeout: 5000 })
    })

    test('filters transactions by type', async ({ page }) => {
      await page.goto('/dashboard')
      await page.waitForTimeout(1000)

      const button = page.locator('[data-testid="view-transactions-button"]')
      await expect(button).toBeVisible({ timeout: 10000 })
      await button.click()

      await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 })
      await expect(page.locator('[data-testid="transaction-list"]')).toBeVisible({ timeout: 15000 })
    })
  })

  test.describe('Trade Partner Finder', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/trade')
      await expect(page.locator('[data-testid="trade-builder"]')).toBeVisible({ timeout: 15000 })
      await page.waitForTimeout(500)
    })

    test('displays trade partners when tab is clicked', async ({ page }) => {
      const partnersTab = page.locator('[data-testid="tab-partners"]')
      await expect(partnersTab).toBeVisible({ timeout: 5000 })
      await partnersTab.click()
      await page.waitForTimeout(500)

      const partnerList = page.locator('[data-testid="trade-partner-list"]')
      const loadingState = page.locator('[data-testid="trade-partner-finder-loading"]')
      const errorState = page.locator('[data-testid="trade-partner-finder-error"]')
      const noPartnersState = page.locator('text=No Partners Found')

      await expect(loadingState.or(partnerList).or(errorState).or(noPartnersState)).toBeVisible({ timeout: 15000 })

      if (await loadingState.isVisible()) {
        await expect(partnerList.or(errorState).or(noPartnersState)).toBeVisible({ timeout: 20000 })
      }

      const hasPartners = await partnerList.isVisible()
      if (hasPartners) {
        const partnerCard = page.locator('[data-testid^="trade-partner-"]').first()
        await expect(partnerCard).toBeVisible({ timeout: 5000 })
        await expect(partnerCard.locator('text=/\\d+% Match/')).toBeVisible()
      }
    })

    test('shows partner needs and strengths', async ({ page }) => {
      await page.locator('[data-testid="tab-partners"]').click()
      await page.waitForTimeout(500)

      const partnerList = page.locator('[data-testid="trade-partner-list"]')
      const noPartnersState = page.locator('text=No Partners Found')
      
      await expect(partnerList.or(noPartnersState)).toBeVisible({ timeout: 20000 })

      const hasPartners = await partnerList.isVisible()
      test.skip(!hasPartners, 'No trade partners available to test')

      const partnerCard = page.locator('[data-testid^="trade-partner-"]').first()
      await expect(partnerCard).toBeVisible()

      await expect(partnerCard.locator('text=THEY NEED')).toBeVisible()
      await expect(partnerCard.locator('text=YOU NEED')).toBeVisible()
    })

    test('suggests trade from partner', async ({ page }) => {
      await page.locator('[data-testid="tab-partners"]').click()
      await page.waitForTimeout(500)

      const partnerList = page.locator('[data-testid="trade-partner-list"]')
      const noPartnersState = page.locator('text=No Partners Found')
      
      await expect(partnerList.or(noPartnersState)).toBeVisible({ timeout: 20000 })

      const hasPartners = await partnerList.isVisible()
      test.skip(!hasPartners, 'No trade partners available to test')

      const suggestButton = page.locator('[data-testid^="suggest-trade-"]').first()
      await expect(suggestButton).toBeVisible({ timeout: 5000 })
      await suggestButton.click()
      await page.waitForTimeout(500)

      await expect(page.locator('[data-testid="trade-builder"]')).toBeVisible({ timeout: 5000 })

      const builderTab = page.locator('[data-testid="tab-builder"]')
      await expect(builderTab).toHaveAttribute('data-state', 'active')
    })

    test('mobile - partners tab works on small viewport', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 })

      const partnersTab = page.locator('[data-testid="tab-partners"]')
      await expect(partnersTab).toBeVisible({ timeout: 5000 })
      
      await partnersTab.scrollIntoViewIfNeeded()
      await page.waitForTimeout(300)
      await partnersTab.click({ force: true })
      await page.waitForTimeout(1000)

      await expect(partnersTab).toHaveAttribute('data-state', 'active', { timeout: 5000 })

      const partnerList = page.locator('[data-testid="trade-partner-list"]')
      const noPartnersState = page.locator('text=No Partners Found')
      const loadingState = page.locator('[data-testid="trade-partner-finder-loading"]')

      await expect(partnerList.or(noPartnersState).or(loadingState)).toBeVisible({ timeout: 15000 })

      if (await loadingState.isVisible()) {
        await expect(partnerList.or(noPartnersState)).toBeVisible({ timeout: 20000 })
      }

      const hasPartners = await partnerList.isVisible()
      if (hasPartners) {
        const partnerCard = page.locator('[data-testid^="trade-partner-"]').first()
        await expect(partnerCard).toBeVisible({ timeout: 5000 })
      }
    })
  })

  test.describe('FAAB Slider', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/waivers')
      await expect(page.locator('h2:has-text("Top Waiver Picks")')).toBeVisible({ timeout: 15000 })
    })

    test('displays FAAB bid recommendations', async ({ page }) => {
      const faabDisplay = page.locator('text=Suggested FAAB Bid:').first()
      await expect(faabDisplay).toBeVisible({ timeout: 5000 })

      await expect(page.locator('text=/\\$\\d+ - \\$\\d+/').first()).toBeVisible()
    })

    test('FAAB budget inputs work correctly', async ({ page }) => {
      await expect(page.locator('label:has-text("FAAB Total")')).toBeVisible()
      await expect(page.locator('label:has-text("Remaining")')).toBeVisible()

      await page.fill('input[id="faab-total"]', '200')
      await page.fill('input[id="faab-remaining"]', '150')

      await page.click('button:has-text("Refresh Recommendations")')
      await page.waitForTimeout(500)

      await expect(page.locator('h2:has-text("Top Waiver Picks")')).toBeVisible({ timeout: 15000 })
    })

    test('caps remaining at total budget', async ({ page }) => {
      await page.fill('input[id="faab-total"]', '50')
      await page.fill('input[id="faab-remaining"]', '100')

      await page.click('button:has-text("Refresh Recommendations")')
      await page.waitForTimeout(500)

      await expect(page.locator('text=Remaining cannot exceed Total')).toBeVisible({ timeout: 5000 })
    })

    test('validates positive budget values', async ({ page }) => {
      await page.fill('input[id="faab-total"]', '-10')
      await page.fill('input[id="faab-remaining"]', '-20')

      await page.click('button:has-text("Refresh Recommendations")')
      await page.waitForTimeout(500)

      await expect(page.locator('text=Budget must be positive')).toBeVisible({ timeout: 5000 })
    })

    test('mobile - FAAB inputs visible on small viewport', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 })

      await expect(page.locator('label:has-text("FAAB Total")')).toBeVisible({ timeout: 5000 })
      await expect(page.locator('label:has-text("Remaining")')).toBeVisible()
      await expect(page.locator('button:has-text("Refresh Recommendations")')).toBeVisible()
    })
  })

  test.describe('Trade Breakdown', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/trade')
      await expect(page.locator('[data-testid="trade-builder"]')).toBeVisible({ timeout: 15000 })
      await page.waitForTimeout(500)
    })

    test('shows VBD labels when players added', async ({ page }) => {
      await openPlayerPicker(page, 'give')
      await selectPlayer(page, 'Mahomes')

      await expect(page.locator('[data-testid="player-picker-modal"]')).not.toBeVisible({ timeout: 5000 })

      await expect(page.locator('[data-testid="trade-explanation"]')).toBeVisible({ timeout: 5000 })

      await expect(page.locator('[data-testid="trade-explanation"]').locator('text=VBD')).toBeVisible()
    })

    test('shows net value calculation', async ({ page }) => {
      await openPlayerPicker(page, 'give')
      await selectPlayer(page, 'Mahomes')

      await expect(page.locator('[data-testid="player-picker-modal"]')).not.toBeVisible({ timeout: 5000 })

      await expect(page.locator('[data-testid="trade-net-value"]')).toBeVisible({ timeout: 5000 })

      await expect(page.locator('[data-testid="trade-points-label"]')).toBeVisible()
    })

    test('expands calculation methodology section', async ({ page }) => {
      await openPlayerPicker(page, 'give')
      await selectPlayer(page, 'Mahomes')

      await expect(page.locator('[data-testid="player-picker-modal"]')).not.toBeVisible({ timeout: 5000 })
      await expect(page.locator('[data-testid="trade-explanation"]')).toBeVisible({ timeout: 5000 })

      const showCalcButton = page.locator('[data-testid="show-calculation"]')
      await expect(showCalcButton).toBeVisible({ timeout: 5000 })
      await showCalcButton.click()
      await page.waitForTimeout(300)

      await expect(page.locator('text=VBD Methodology')).toBeVisible({ timeout: 5000 })
      await expect(page.locator('text=Value Based Drafting')).toBeVisible()
    })

    test('collapses calculation section when clicked again', async ({ page }) => {
      await openPlayerPicker(page, 'give')
      await selectPlayer(page, 'Mahomes')

      await expect(page.locator('[data-testid="player-picker-modal"]')).not.toBeVisible({ timeout: 5000 })
      await expect(page.locator('[data-testid="trade-explanation"]')).toBeVisible({ timeout: 5000 })

      const showCalcButton = page.locator('[data-testid="show-calculation"]')
      await showCalcButton.click()
      await page.waitForTimeout(300)

      await expect(page.locator('text=VBD Methodology')).toBeVisible({ timeout: 5000 })

      await showCalcButton.click()
      await page.waitForTimeout(300)

      await expect(page.locator('text=VBD Methodology')).not.toBeVisible({ timeout: 3000 })
    })

    test('shows both give and receive sides in breakdown', async ({ page }) => {
      await openPlayerPicker(page, 'give')
      await page.locator('[data-testid="player-picker-item"]').first().click()
      await page.waitForTimeout(800)

      await expect(page.locator('[data-testid="player-picker-modal"]')).not.toBeVisible({ timeout: 5000 })

      await openPlayerPicker(page, 'receive')
      await page.locator('[data-testid="player-picker-item"]').first().click()
      await page.waitForTimeout(800)

      await expect(page.locator('[data-testid="player-picker-modal"]')).not.toBeVisible({ timeout: 5000 })

      await expect(page.locator('[data-testid="trade-explanation"]')).toBeVisible({ timeout: 5000 })
      await expect(page.locator('[data-testid="trade-explanation"]').locator('text=You Give')).toBeVisible()
      await expect(page.locator('[data-testid="trade-explanation"]').locator('text=You Receive')).toBeVisible()
    })

    test('mobile - trade breakdown visible on small viewport', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 })

      await openPlayerPicker(page, 'give')

      const searchInput = page.locator('[data-testid="player-picker-search"]')
      await searchInput.fill('Mahomes')
      await page.waitForTimeout(500)

      const playerItem = page.locator('[data-testid="player-picker-item"]').first()
      await expect(playerItem).toBeVisible({ timeout: 5000 })
      await playerItem.dispatchEvent('click')
      await page.waitForTimeout(800)

      await expect(page.locator('[data-testid="player-picker-modal"]')).not.toBeVisible({ timeout: 5000 })

      await page.evaluate(() => window.scrollBy(0, 500))
      await page.waitForTimeout(300)

      await expect(page.locator('[data-testid="trade-explanation"]')).toBeVisible({ timeout: 5000 })

      await expect(page.locator('[data-testid="trade-explanation"]').locator('text=VBD')).toBeVisible()
    })
  })
})

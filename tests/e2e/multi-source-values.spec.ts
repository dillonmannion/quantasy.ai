import { test, expect, Page } from '@playwright/test'

// Mock data for multi-source player values
const MOCK_TRADE_WITH_EXTERNAL_VALUES = {
  verdict: 'fair',
  fairnessScore: 2.5,
  givingValue: 45.2,
  receivingValue: 47.7,
  explanation: {
    methodology: 'Trade evaluated using VBD-based fairness scoring with multi-source consensus.',
    playerBreakdown: [
      {
        playerId: '4046',
        name: 'Patrick Mahomes',
        position: 'QB',
        vbdValue: 25.5,
        isGiving: true,
        externalValues: {
          consensus: 1.85,
          sources: [
            { source: 'KTC', value: 9500, originalScale: '0-10000' },
            { source: 'FantasyCalc', value: 34.2, originalScale: '0-50' },
            { source: 'DynastyProcess', value: 8.7, originalScale: '0-10' },
          ],
        },
      },
      {
        playerId: '4034',
        name: 'Travis Kelce',
        position: 'TE',
        vbdValue: 22.2,
        isGiving: false,
        externalValues: {
          consensus: 1.42,
          sources: [
            { source: 'KTC', value: 8200, originalScale: '0-10000' },
            { source: 'FantasyCalc', value: 28.5, originalScale: '0-50' },
            { source: 'DynastyProcess', value: 7.2, originalScale: '0-10' },
          ],
        },
      },
    ],
    caveats: ['Projections subject to change', 'External values may be stale'],
  },
}

const MOCK_TRADE_WITH_MISSING_SOURCE = {
  verdict: 'fair',
  fairnessScore: 1.8,
  givingValue: 40.0,
  receivingValue: 41.8,
  explanation: {
    methodology: 'Trade evaluated using VBD-based fairness scoring with partial external data.',
    playerBreakdown: [
      {
        playerId: '4046',
        name: 'Patrick Mahomes',
        position: 'QB',
        vbdValue: 25.5,
        isGiving: true,
        externalValues: {
          consensus: 1.45,
          sources: [
            { source: 'KTC', value: 9500, originalScale: '0-10000' },
            // FantasyCalc missing - simulating N/A
            { source: 'DynastyProcess', value: 8.7, originalScale: '0-10' },
          ],
        },
      },
    ],
    caveats: ['Some external sources unavailable'],
  },
}

const MOCK_TRADE_VBD_ONLY = {
  verdict: 'fair',
  fairnessScore: 3.0,
  givingValue: 42.0,
  receivingValue: 45.0,
  explanation: {
    methodology: 'Trade evaluated using VBD-based fairness scoring.',
    playerBreakdown: [
      {
        playerId: '4046',
        name: 'Patrick Mahomes',
        position: 'QB',
        vbdValue: 25.5,
        isGiving: true,
        // No externalValues - VBD-only mode (graceful degradation)
      },
      {
        playerId: '4034',
        name: 'Travis Kelce',
        position: 'TE',
        vbdValue: 22.2,
        isGiving: false,
        // No externalValues - VBD-only mode
      },
    ],
    caveats: ['External value sources unavailable, using VBD only'],
  },
}

const MOCK_TRADE_REDRAFT_VALUES = {
  verdict: 'fair',
  fairnessScore: 2.0,
  givingValue: 38.0,
  receivingValue: 40.0,
  explanation: {
    methodology: 'Trade evaluated using redraft VBD-based fairness scoring.',
    playerBreakdown: [
      {
        playerId: '4046',
        name: 'Patrick Mahomes',
        position: 'QB',
        vbdValue: 20.0, // Lower redraft value
        isGiving: true,
        externalValues: {
          consensus: 0.95, // Lower consensus in redraft
          sources: [
            { source: 'KTC', value: 6500, originalScale: '0-10000' },
            { source: 'FantasyCalc', value: 22.0, originalScale: '0-50' },
          ],
        },
      },
    ],
    caveats: ['Redraft values used'],
  },
}

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

async function proposeTradeWithMock(page: Page, mockResponse: unknown) {
  // Intercept the trade API and return mock
  await page.route('**/api/algorithms/trade', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockResponse),
    })
  })

  // Click propose trade button
  const proposeButton = page.locator('[data-testid="propose-trade-button"]')
  await expect(proposeButton).toBeVisible({ timeout: 5000 })
  await proposeButton.click()
  await page.waitForTimeout(500)

  // Wait for dialog to open
  await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 10000 })
}

test.describe('Multi-Source Player Values', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trade')
    await expect(page.locator('[data-testid="trade-builder"]')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(500)
  })

  test.describe('Consensus Value Display', () => {
    test('displays consensus Z-score for trade players', async ({ page }) => {
      // Add a player to give
      await openPlayerPicker(page, 'give')
      await selectPlayer(page, 'Mahomes')
      await expect(page.locator('[data-testid="player-picker-modal"]')).not.toBeVisible({ timeout: 5000 })

      // Add a player to receive
      await openPlayerPicker(page, 'receive')
      await selectPlayer(page, 'Kelce')
      await expect(page.locator('[data-testid="player-picker-modal"]')).not.toBeVisible({ timeout: 5000 })

      // Propose trade with mock containing external values
      await proposeTradeWithMock(page, MOCK_TRADE_WITH_EXTERNAL_VALUES)

      // Verify consensus values are displayed
      const consensusGive = page.locator('[data-testid="consensus-value-4046"]')
      await expect(consensusGive).toBeVisible({ timeout: 5000 })
      await expect(consensusGive).toContainText('1.85')

      const consensusReceive = page.locator('[data-testid="consensus-value-4034"]')
      await expect(consensusReceive).toBeVisible({ timeout: 5000 })
      await expect(consensusReceive).toContainText('1.42')

      // Verify Z-Score label is shown (use first() as there are multiple players)
      await expect(page.locator('text=Z-Score').first()).toBeVisible()
    })
  })

  test.describe('Value Dropdown', () => {
    test('shows explanation and individual sources when dropdown clicked', async ({ page }) => {
      // Add a player
      await openPlayerPicker(page, 'give')
      await selectPlayer(page, 'Mahomes')
      await expect(page.locator('[data-testid="player-picker-modal"]')).not.toBeVisible({ timeout: 5000 })

      // Propose trade
      await proposeTradeWithMock(page, MOCK_TRADE_WITH_EXTERNAL_VALUES)

      const dialog = page.locator('[role="dialog"]')
      const dropdownTrigger = dialog.locator('[data-testid="value-dropdown-4046"]')
      await dropdownTrigger.scrollIntoViewIfNeeded()
      await expect(dropdownTrigger).toBeVisible({ timeout: 5000 })
      await dropdownTrigger.click()
      await page.waitForTimeout(800)

      await expect(dialog.locator('text=Z-scores')).toBeVisible({ timeout: 5000 })
      await expect(dialog.locator('text=normalization')).toBeVisible()
      await expect(dialog.getByText("market's collective opinion")).toBeVisible()

      await expect(dialog.locator('[data-testid="source-KTC-4046"]')).toHaveCount(1)
      await expect(dialog.locator('[data-testid="source-FantasyCalc-4046"]')).toHaveCount(1)
      await expect(dialog.locator('[data-testid="source-DynastyProcess-4046"]')).toHaveCount(1)

      await expect(dialog.locator('text=0-10000')).toHaveCount(1)
      await expect(dialog.locator('text=0-50')).toHaveCount(1)
    })

    test('shows N/A for missing source', async ({ page }) => {
      await openPlayerPicker(page, 'give')
      await selectPlayer(page, 'Mahomes')
      await expect(page.locator('[data-testid="player-picker-modal"]')).not.toBeVisible({ timeout: 5000 })

      // This mock has only 2 sources (KTC, DynastyProcess - FantasyCalc missing)
      await proposeTradeWithMock(page, MOCK_TRADE_WITH_MISSING_SOURCE)

      // Open dropdown
      const dropdownTrigger = page.locator('[data-testid="value-dropdown-4046"]')
      await expect(dropdownTrigger).toBeVisible({ timeout: 5000 })
      await dropdownTrigger.click()
      await page.waitForTimeout(300)

      // Verify available sources are shown
      await expect(page.locator('[data-testid="source-KTC-4046"]')).toBeVisible({ timeout: 5000 })
      await expect(page.locator('[data-testid="source-DynastyProcess-4046"]')).toBeVisible()

      // FantasyCalc should not be present in the grid (it's missing from sources)
      await expect(page.locator('[data-testid="source-FantasyCalc-4046"]')).not.toBeVisible()
    })
  })

  test.describe('Dynasty/Redraft Toggle', () => {
    test('toggle changes displayed values', async ({ page }) => {
      const requestFormats: string[] = []

      await page.route('**/api/algorithms/trade', async (route, request) => {
        const postData = request.postDataJSON()
        const format = postData?.format || 'unknown'
        requestFormats.push(format)

        if (format === 'redraft') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_TRADE_REDRAFT_VALUES),
          })
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_TRADE_WITH_EXTERNAL_VALUES),
          })
        }
      })

      await openPlayerPicker(page, 'give')
      await selectPlayer(page, 'Mahomes')
      await expect(page.locator('[data-testid="player-picker-modal"]')).not.toBeVisible({ timeout: 5000 })

      const proposeButton = page.locator('[data-testid="propose-trade-button"]')
      await expect(proposeButton).toBeVisible({ timeout: 5000 })
      await proposeButton.click()
      await page.waitForTimeout(500)

      await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 10000 })

      const firstConsensus = page.locator('[data-testid="consensus-value-4046"]')
      await expect(firstConsensus).toBeVisible({ timeout: 5000 })
      const firstValue = await firstConsensus.textContent()

      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)

      const toggle = page.locator('[data-testid="dynasty-redraft-toggle"]')
      await expect(toggle).toBeVisible({ timeout: 5000 })
      await toggle.click()
      await page.waitForTimeout(500)

      await proposeButton.click()
      await page.waitForTimeout(500)

      await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 10000 })

      const secondConsensus = page.locator('[data-testid="consensus-value-4046"]')
      await expect(secondConsensus).toBeVisible({ timeout: 5000 })
      const secondValue = await secondConsensus.textContent()

      expect(firstValue).not.toBe(secondValue)
      expect(requestFormats.length).toBe(2)
      expect(requestFormats[0]).not.toBe(requestFormats[1])
    })
  })

  test.describe('Graceful Degradation', () => {
    test('works with VBD-only when all external sources fail', async ({ page }) => {
      // Add players
      await openPlayerPicker(page, 'give')
      await selectPlayer(page, 'Mahomes')
      await expect(page.locator('[data-testid="player-picker-modal"]')).not.toBeVisible({ timeout: 5000 })

      await openPlayerPicker(page, 'receive')
      await selectPlayer(page, 'Kelce')
      await expect(page.locator('[data-testid="player-picker-modal"]')).not.toBeVisible({ timeout: 5000 })

      // Propose trade with VBD-only mock (no external values)
      await proposeTradeWithMock(page, MOCK_TRADE_VBD_ONLY)

      const dialog = page.locator('[role="dialog"]')
      await expect(dialog).toBeVisible({ timeout: 10000 })

      await expect(dialog.getByText('FAIR', { exact: true })).toBeVisible({ timeout: 5000 })

      await expect(dialog.locator('[data-testid="trade-explanation"]')).toBeVisible()
      await expect(dialog.locator('text=VBD').first()).toBeVisible()

      await expect(dialog.locator('[data-testid="consensus-value-4046"]')).not.toBeVisible()
      await expect(dialog.locator('[data-testid="consensus-value-4034"]')).not.toBeVisible()

      await expect(dialog.locator('[data-testid="value-dropdown-4046"]')).not.toBeVisible()
      await expect(dialog.locator('[data-testid="value-dropdown-4034"]')).not.toBeVisible()

      await expect(dialog.locator('text=External value sources unavailable')).toBeVisible()
    })
  })

  test.describe('Mobile Safari', () => {
    test('consensus value displays on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 })

      // Add a player using dispatchEvent for mobile
      await openPlayerPicker(page, 'give')

      const searchInput = page.locator('[data-testid="player-picker-search"]')
      await searchInput.fill('Mahomes')
      await page.waitForTimeout(500)

      const playerItem = page.locator('[data-testid="player-picker-item"]').first()
      await expect(playerItem).toBeVisible({ timeout: 5000 })
      await playerItem.dispatchEvent('click')
      await page.waitForTimeout(800)

      await expect(page.locator('[data-testid="player-picker-modal"]')).not.toBeVisible({ timeout: 5000 })

      // Propose trade
      await proposeTradeWithMock(page, MOCK_TRADE_WITH_EXTERNAL_VALUES)

      // Scroll to see content on mobile
      await page.evaluate(() => window.scrollBy(0, 200))
      await page.waitForTimeout(300)

      // Verify consensus value is visible on mobile
      const consensusValue = page.locator('[data-testid="consensus-value-4046"]')
      await expect(consensusValue).toBeVisible({ timeout: 5000 })
      await expect(consensusValue).toContainText('1.85')
    })

    test('dropdown works on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 })

      await openPlayerPicker(page, 'give')
      const searchInput = page.locator('[data-testid="player-picker-search"]')
      await searchInput.fill('Mahomes')
      await page.waitForTimeout(500)

      const playerItem = page.locator('[data-testid="player-picker-item"]').first()
      await playerItem.dispatchEvent('click')
      await page.waitForTimeout(800)

      await expect(page.locator('[data-testid="player-picker-modal"]')).not.toBeVisible({ timeout: 5000 })

      await proposeTradeWithMock(page, MOCK_TRADE_WITH_EXTERNAL_VALUES)

      const dialog = page.locator('[role="dialog"]')
      const dropdownTrigger = dialog.locator('[data-testid="value-dropdown-4046"]')
      await dropdownTrigger.scrollIntoViewIfNeeded()
      await page.waitForTimeout(300)
      await expect(dropdownTrigger).toBeVisible({ timeout: 5000 })
      await dropdownTrigger.dispatchEvent('click')
      await page.waitForTimeout(800)

      await expect(dialog.locator('[data-testid="source-KTC-4046"]')).toHaveCount(1)
    })
  })
})

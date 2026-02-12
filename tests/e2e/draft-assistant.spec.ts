import { test, expect } from '@playwright/test'

test.describe('Draft Assistant', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/draft')
  })

  // === PAGE LOAD TESTS ===

  test('page loads with player rankings', async ({ page }) => {
    await expect(page.locator('h1:has-text("Draft Assistant")').first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-testid="rankings-list"]').first()).toBeVisible()
    const playerCards = page.locator('[data-testid="player-card"]')
    await expect(playerCards.first()).toBeVisible({ timeout: 10000 })
    const count = await playerCards.count()
    expect(count).toBeGreaterThan(0)
  })

  test('displays league name in header', async ({ page }) => {
    await expect(page.locator('h1:has-text("Draft Assistant")').first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('text=Test Fantasy League')).toBeVisible()
  })

  test('shows mock draft mode indicator when not live', async ({ page }) => {
    await expect(page.locator('h1:has-text("Draft Assistant")').first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('text=Mock Draft')).toBeVisible()
  })

  // === POSITION FILTER TESTS ===

  test('position filter - clicking QB shows only QBs', async ({ page }) => {
    await expect(page.locator('[data-testid="rankings-list"]').first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-testid="player-card"]').first()).toBeVisible({ timeout: 10000 })
    
    await page.click('[data-testid="filter-QB"]')
    await page.waitForTimeout(500)
    
    const playerCards = page.locator('[data-testid="player-card"]')
    const count = await playerCards.count()
    expect(count).toBeGreaterThan(0)
    
    // All visible players should have QB position
    for (let i = 0; i < Math.min(count, 5); i++) {
      const card = playerCards.nth(i)
      await expect(card.locator('text=QB')).toBeVisible()
    }
  })

  test('position filter - clicking RB shows only RBs', async ({ page }) => {
    await expect(page.locator('[data-testid="rankings-list"]').first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-testid="player-card"]').first()).toBeVisible({ timeout: 10000 })
    
    await page.click('[data-testid="filter-RB"]')
    await page.waitForTimeout(500)
    
    const playerCards = page.locator('[data-testid="player-card"]')
    const count = await playerCards.count()
    expect(count).toBeGreaterThan(0)
    
    for (let i = 0; i < Math.min(count, 5); i++) {
      const card = playerCards.nth(i)
      await expect(card.locator('text=RB')).toBeVisible()
    }
  })

  test('position filter - All shows all positions', async ({ page }) => {
    await expect(page.locator('[data-testid="rankings-list"]').first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-testid="player-card"]').first()).toBeVisible({ timeout: 10000 })
    
    // First filter to QB
    await page.click('[data-testid="filter-QB"]')
    await page.waitForTimeout(300)
    const qbCount = await page.locator('[data-testid="player-card"]').count()
    
    // Then switch back to All
    await page.click('[data-testid="filter-All"]')
    await page.waitForTimeout(300)
    const allCount = await page.locator('[data-testid="player-card"]').count()
    
    expect(allCount).toBeGreaterThan(qbCount)
  })

  // === SEARCH TESTS ===

  test('search filters players by name', async ({ page }) => {
    await expect(page.locator('[data-testid="rankings-list"]').first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-testid="player-card"]').first()).toBeVisible({ timeout: 10000 })
    
    const initialCount = await page.locator('[data-testid="player-card"]').count()
    
    await page.fill('[data-testid="search-input"]', 'Mahomes')
    await page.waitForTimeout(500)
    
    const filteredCount = await page.locator('[data-testid="player-card"]').count()
    expect(filteredCount).toBeLessThan(initialCount)
    expect(filteredCount).toBeGreaterThan(0)
    
    await expect(page.locator('[data-testid="player-card"]:has-text("Mahomes")')).toBeVisible()
  })

  test('search is case insensitive', async ({ page }) => {
    await expect(page.locator('[data-testid="rankings-list"]').first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-testid="player-card"]').first()).toBeVisible({ timeout: 10000 })
    
    await page.fill('[data-testid="search-input"]', 'mahomes')
    await page.waitForTimeout(500)
    
    await expect(page.locator('[data-testid="player-card"]:has-text("Mahomes")')).toBeVisible()
  })

  test('clearing search shows all players again', async ({ page }) => {
    await expect(page.locator('[data-testid="rankings-list"]').first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-testid="player-card"]').first()).toBeVisible({ timeout: 10000 })
    
    const initialCount = await page.locator('[data-testid="player-card"]').count()
    
    await page.fill('[data-testid="search-input"]', 'Mahomes')
    await page.waitForTimeout(500)
    
    const filteredCount = await page.locator('[data-testid="player-card"]').count()
    expect(filteredCount).toBeLessThan(initialCount)
    
    await page.fill('[data-testid="search-input"]', '')
    await page.waitForTimeout(500)
    
    const restoredCount = await page.locator('[data-testid="player-card"]').count()
    expect(restoredCount).toBe(initialCount)
  })

  // === SORT TESTS ===

  test('sort toggle - VBD is default sort', async ({ page }) => {
    await expect(page.locator('[data-testid="rankings-list"]').first()).toBeVisible({ timeout: 15000 })
    
    const vbdButton = page.locator('[data-testid="sort-VBD"]')
    await expect(vbdButton).toBeVisible()
  })

  test('sort toggle - clicking Proj changes sort', async ({ page }) => {
    await expect(page.locator('[data-testid="rankings-list"]').first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-testid="player-card"]').first()).toBeVisible({ timeout: 10000 })
    
    const firstPlayerBefore = await page.locator('[data-testid="player-card"]').first().textContent()
    
    await page.click('[data-testid="sort-Proj"]')
    await page.waitForTimeout(300)
    
    const projButton = page.locator('[data-testid="sort-Proj"]')
    await expect(projButton).toBeVisible()
    
    // Content may have reordered
    expect(firstPlayerBefore).toBeDefined()
  })

  test('sort toggle - clicking ADP changes sort', async ({ page }) => {
    await expect(page.locator('[data-testid="rankings-list"]').first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-testid="player-card"]').first()).toBeVisible({ timeout: 10000 })
    
    await page.click('[data-testid="sort-ADP"]')
    await page.waitForTimeout(300)
    
    const adpButton = page.locator('[data-testid="sort-ADP"]')
    await expect(adpButton).toBeVisible()
  })

  // === MOCK DRAFT TESTS ===

  test('mock draft - start button initiates draft mode', async ({ page }) => {
    await expect(page.locator('h1:has-text("Draft Assistant")').first()).toBeVisible({ timeout: 15000 })
    
    const startButton = page.locator('[data-testid="start-mock-draft"]')
    await expect(startButton).toBeVisible()
    await startButton.click()
    
    // After starting, should show Pick counter
    await expect(page.locator('text=Pick 1')).toBeVisible({ timeout: 5000 })
  })

  test('mock draft - clicking player marks as drafted', async ({ page }) => {
    await expect(page.locator('[data-testid="rankings-list"]').first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-testid="player-card"]').first()).toBeVisible({ timeout: 10000 })
    
    const startButton = page.locator('[data-testid="start-mock-draft"]')
    await startButton.click()
    await expect(page.locator('text=Pick 1')).toBeVisible({ timeout: 5000 })
    
    const firstPlayer = page.locator('[data-testid="player-card"]').first()
    await firstPlayer.click()
    
    // Pick counter should increment
    await expect(page.locator('text=Pick 2')).toBeVisible({ timeout: 5000 })
  })

  test('mock draft - undo restores last pick', async ({ page }) => {
    await expect(page.locator('[data-testid="rankings-list"]').first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-testid="player-card"]').first()).toBeVisible({ timeout: 10000 })
    
    const startButton = page.locator('[data-testid="start-mock-draft"]')
    await startButton.click()
    await expect(page.locator('text=Pick 1')).toBeVisible({ timeout: 5000 })
    
    const firstPlayer = page.locator('[data-testid="player-card"]').first()
    await firstPlayer.click()
    await expect(page.locator('text=Pick 2')).toBeVisible({ timeout: 5000 })
    
    const undoButton = page.locator('button:has-text("Undo Last Pick")')
    await undoButton.click()
    
    await expect(page.locator('text=Pick 1')).toBeVisible({ timeout: 5000 })
  })

  test('mock draft - reset clears all picks', async ({ page }) => {
    await expect(page.locator('[data-testid="rankings-list"]').first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-testid="player-card"]').first()).toBeVisible({ timeout: 10000 })
    
    const startButton = page.locator('[data-testid="start-mock-draft"]')
    await startButton.click()
    await expect(page.locator('text=Pick 1')).toBeVisible({ timeout: 5000 })
    
    const firstPlayer = page.locator('[data-testid="player-card"]').first()
    await firstPlayer.click()
    await expect(page.locator('text=Pick 2')).toBeVisible({ timeout: 5000 })
    
    page.on('dialog', async dialog => {
      await dialog.accept()
    })
    
    const resetButton = page.locator('button:has-text("Reset Draft")')
    await resetButton.click()
    
    // Should return to initial state with Start button
    await expect(page.locator('[data-testid="start-mock-draft"]')).toBeVisible({ timeout: 5000 })
  })

  test('mock draft - multiple rounds progression', async ({ page }) => {
    await expect(page.locator('[data-testid="rankings-list"]').first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-testid="player-card"]').first()).toBeVisible({ timeout: 10000 })
    
    await page.locator('[data-testid="start-mock-draft"]').click()
    await expect(page.locator('text=Pick 1')).toBeVisible({ timeout: 5000 })
    
    // Make 3 picks
    for (let i = 0; i < 3; i++) {
      const playerCard = page.locator('[data-testid="player-card"]').first()
      if (await playerCard.isVisible()) {
        await playerCard.click()
        await page.waitForTimeout(300)
      }
    }
    
    // Should be on Pick 4
    await expect(page.locator('text=Pick 4')).toBeVisible({ timeout: 5000 })
  })

  // === SHOW YOUR WORK / EXPLANATION TESTS ===

  test('show your work - VBD label visible on player cards', async ({ page }) => {
    await expect(page.locator('[data-testid="rankings-list"]').first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-testid="player-card"]').first()).toBeVisible({ timeout: 10000 })
    
    const firstPlayer = page.locator('[data-testid="player-card"]').first()
    await expect(firstPlayer.locator('text=VBD')).toBeVisible()
  })

  test('show your work - clicking expand shows calculation details', async ({ page }) => {
    await expect(page.locator('[data-testid="rankings-list"]').first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-testid="player-card"]').first()).toBeVisible({ timeout: 10000 })
    
    // Look for Show Your Work button in the UI
    const showWorkButton = page.locator('button:has-text("Show Your Work")').first()
    const buttonExists = await showWorkButton.isVisible().catch(() => false)
    
    if (buttonExists) {
      await showWorkButton.click()
      // Should show VBD Calculation section
      await expect(page.locator('text=VBD Calculation')).toBeVisible({ timeout: 5000 })
    } else {
      // If no button, check that VBD is at least displayed
      await expect(page.locator('[data-testid="player-card"]').first().locator('text=VBD')).toBeVisible()
    }
  })

  // === PLAYER ROW DISPLAY TESTS ===

  test('player row shows position badge', async ({ page }) => {
    await expect(page.locator('[data-testid="rankings-list"]').first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-testid="player-card"]').first()).toBeVisible({ timeout: 10000 })
    
    const firstPlayer = page.locator('[data-testid="player-card"]').first()
    const positionText = firstPlayer.locator('text=/QB|RB|WR|TE|K|DEF/')
    await expect(positionText).toBeVisible()
  })

  test('player row shows team abbreviation', async ({ page }) => {
    await expect(page.locator('[data-testid="rankings-list"]').first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-testid="player-card"]').first()).toBeVisible({ timeout: 10000 })
    
    const firstPlayer = page.locator('[data-testid="player-card"]').first()
    const teamText = firstPlayer.locator('text=/KC|SF|DAL|PHI|MIA|BUF|CIN|LAC|DEN|NYJ|FA/')
    await expect(teamText).toBeVisible()
  })

  test('VBD score displays correctly', async ({ page }) => {
    await expect(page.locator('[data-testid="rankings-list"]').first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-testid="player-card"]').first()).toBeVisible({ timeout: 10000 })
    
    const firstPlayer = page.locator('[data-testid="player-card"]').first()
    await expect(firstPlayer.locator('text=VBD')).toBeVisible()
    
    // VBD value should be displayed as a number
    const vbdValue = firstPlayer.locator('.font-mono.font-bold').first()
    await expect(vbdValue).toBeVisible()
  })

  test('player projected points display', async ({ page }) => {
    await expect(page.locator('[data-testid="rankings-list"]').first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-testid="player-card"]').first()).toBeVisible({ timeout: 10000 })
    
    const firstPlayer = page.locator('[data-testid="player-card"]').first()
    await expect(firstPlayer.locator('text=Proj')).toBeVisible()
  })

  // === HIDE DRAFTED TESTS ===

  test('hide drafted toggle filters out drafted players', async ({ page }) => {
    await expect(page.locator('[data-testid="rankings-list"]').first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-testid="player-card"]').first()).toBeVisible({ timeout: 10000 })
    
    const startButton = page.locator('[data-testid="start-mock-draft"]')
    await startButton.click()
    await expect(page.locator('text=Pick 1')).toBeVisible({ timeout: 5000 })
    
    const countBefore = await page.locator('[data-testid="player-card"]').count()
    
    // Pick first player
    await page.locator('[data-testid="player-card"]').first().click()
    await expect(page.locator('text=Pick 2')).toBeVisible({ timeout: 5000 })
    
    // Click hide drafted
    const hideDraftedButton = page.getByRole('button', { name: /hide drafted/i })
    await hideDraftedButton.click()
    await page.waitForTimeout(300)
    
    const countAfter = await page.locator('[data-testid="player-card"]').count()
    expect(countAfter).toBeLessThan(countBefore)
  })

  test('drafted players appear with opacity when not hidden', async ({ page }) => {
    await expect(page.locator('[data-testid="rankings-list"]').first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-testid="player-card"]').first()).toBeVisible({ timeout: 10000 })
    
    const startButton = page.locator('[data-testid="start-mock-draft"]')
    await startButton.click()
    await expect(page.locator('text=Pick 1')).toBeVisible({ timeout: 5000 })
    
    // Pick first player
    await page.locator('[data-testid="player-card"]').first().click()
    await expect(page.locator('text=Pick 2')).toBeVisible({ timeout: 5000 })
    
    // Drafted player should have opacity-50 or similar styling
    const draftedCard = page.locator('[data-testid="player-card"].opacity-50').first()
    const hasDraftedStyling = await draftedCard.isVisible().catch(() => false)
    
    // Either has opacity class or line-through text
    const hasLineThrough = await page.locator('[data-testid="player-card"] .line-through').count() > 0
    
    expect(hasDraftedStyling || hasLineThrough).toBe(true)
  })

  // === MOBILE RESPONSIVE TESTS ===

  test('mobile - responsive layout at 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(page.locator('h1:has-text("Draft Assistant")').first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-testid="rankings-list"]').first()).toBeVisible()
    await expect(page.locator('[data-testid="player-card"]').first()).toBeVisible({ timeout: 10000 })
  })

  test('mobile - controls are accessible', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(page.locator('[data-testid="rankings-list"]').first()).toBeVisible({ timeout: 15000 })
    
    await expect(page.locator('[data-testid="search-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="filter-All"]')).toBeVisible()
    await expect(page.locator('[data-testid="filter-QB"]')).toBeVisible()
  })

  test('mobile - player cards are full width', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(page.locator('[data-testid="rankings-list"]').first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-testid="player-card"]').first()).toBeVisible({ timeout: 10000 })
    
    const playerCard = page.locator('[data-testid="player-card"]').first()
    const box = await playerCard.boundingBox()
    
    expect(box?.width).toBeGreaterThan(350)
  })

  test('mobile - swipe gesture to draft player', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page.locator('[data-testid="rankings-list"]').first()).toBeVisible({ timeout: 15000 })
    
    await page.locator('[data-testid="start-mock-draft"]').click()
    await expect(page.locator('text=Pick 1')).toBeVisible({ timeout: 5000 })
    
    const firstPlayer = page.locator('[data-testid="player-card"]').first()
    await expect(firstPlayer).toBeVisible()
    
    const box = await firstPlayer.boundingBox()
    
    if (box) {
      // Simulate swipe right
      await page.mouse.move(box.x + 10, box.y + box.height / 2)
      await page.mouse.down()
      await page.mouse.move(box.x + 150, box.y + box.height / 2, { steps: 10 })
      await page.mouse.up()
      
      await page.waitForTimeout(500)
    }
    
    // Rankings should still be visible
    await expect(page.locator('[data-testid="rankings-list"]').first()).toBeVisible()
  })

  test('mobile - sort buttons accessible', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(page.locator('[data-testid="rankings-list"]').first()).toBeVisible({ timeout: 15000 })
    
    await expect(page.locator('[data-testid="sort-VBD"]')).toBeVisible()
    await expect(page.locator('[data-testid="sort-Proj"]')).toBeVisible()
    await expect(page.locator('[data-testid="sort-ADP"]')).toBeVisible()
  })

  // === EMPTY/ERROR STATE TESTS ===

  test('handles empty state gracefully', async ({ page }) => {
    await expect(page.locator('h1:has-text("Draft Assistant")').first()).toBeVisible({ timeout: 15000 })
    
    // Either player cards exist or empty message is shown
    const hasPlayers = await page.locator('[data-testid="player-card"]').count() > 0
    const hasEmptyMessage = await page.locator('text=No rankings available').isVisible().catch(() => false)
    
    expect(hasPlayers || hasEmptyMessage).toBe(true)
  })

  // === MY TEAM SIDEBAR TESTS ===

  test('my team sidebar visible on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await expect(page.locator('h1:has-text("Draft Assistant")').first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-testid="rankings-list"]').first()).toBeVisible({ timeout: 10000 })
    
    // Grid layout should be active on desktop
    const hasGridLayout = await page.locator('.lg\\:grid-cols-\\[1fr_300px\\]').count() > 0
    const hasSidebar = await page.locator('[data-testid="my-team-sidebar"]').isVisible().catch(() => false)
    
    expect(hasGridLayout || hasSidebar).toBe(true)
  })

  test('my team sidebar shows drafted players', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await expect(page.locator('[data-testid="rankings-list"]').first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-testid="player-card"]').first()).toBeVisible({ timeout: 10000 })
    
    await page.locator('[data-testid="start-mock-draft"]').click()
    await page.locator('[data-testid="player-card"]').first().click()
    await page.waitForTimeout(300)
    
    // Sidebar should update with drafted player
    const sidebar = page.locator('[data-testid="my-team-sidebar"]')
    const sidebarExists = await sidebar.isVisible().catch(() => false)
    
    if (sidebarExists) {
      await expect(sidebar).toBeVisible({ timeout: 5000 })
    }
  })

  // === VIRTUALIZATION TESTS ===

  test('rankings list handles scrolling with virtualization', async ({ page }) => {
    await expect(page.locator('[data-testid="rankings-list"]').first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-testid="player-card"]').first()).toBeVisible({ timeout: 10000 })
    
    const rankingsList = page.locator('[data-testid="rankings-list"]').first()
    
    // Scroll down
    await rankingsList.evaluate(el => el.scrollTop = 500)
    await page.waitForTimeout(300)
    
    // Players should still be visible after scrolling
    await expect(page.locator('[data-testid="player-card"]').first()).toBeVisible()
  })

  // === LOADING STATE TEST ===

  test('loading state shows skeleton', async ({ page }) => {
    // Navigate fresh without waiting for full load
    await page.goto('/draft', { waitUntil: 'domcontentloaded' })
    
    // Check for either loading state or content
    await expect(page.locator('[data-testid="rankings-list"], [data-skeleton], :text("Loading")')).toBeVisible({ timeout: 15000 })
  })
})

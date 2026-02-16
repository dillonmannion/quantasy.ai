import type { Page } from '@playwright/test'

/**
 * Open the draft pick selector dialog
 * @param page - Playwright page object
 * @param side - 'give' or 'receive' side of trade
 */
export async function openPickSelector(page: Page, side: 'give' | 'receive'): Promise<void> {
  await page.click(`[data-testid="add-pick-${side}"]`)
}

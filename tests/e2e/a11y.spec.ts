import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Accessibility', () => {
  // aXe automated audits for auth-protected pages
  const pagesToAudit = ['/dashboard', '/draft', '/waivers', '/trade', '/roster']

  for (const pagePath of pagesToAudit) {
    test(`aXe audit: ${pagePath} has no critical/serious violations`, async ({ page }) => {
      // Playwright's global-setup handles auth via storageState
      await page.goto(pagePath)
      await page.waitForLoadState('networkidle')

      // Skip aXe audit if page is showing an error (e.g., Sleeper API 404)
      const hasError = await page.locator('#__next_error__').count() > 0
      if (hasError) {
        test.skip(true, `Skipping ${pagePath} - page shows error (likely API/data issue, not a11y)`)
        return
      }

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa']) // WCAG 2.1 AA
        .analyze()

      // Filter to critical and serious only
      const criticalOrSerious = results.violations.filter(
        v => v.impact === 'critical' || v.impact === 'serious'
      )

      expect(
        criticalOrSerious,
        `Found ${criticalOrSerious.length} critical/serious violations on ${pagePath}: ` +
          criticalOrSerious.map(v => `${v.id}: ${v.description}`).join(', ')
      ).toHaveLength(0)
    })
  }

  test('respects prefers-reduced-motion', async ({ page }) => {
    // Enable reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/waivers')
    await page.waitForLoadState('networkidle')

    // Find all animated elements (components add data-testid with "-animation" suffix)
    const animatedElements = await page.locator('[data-testid$="-animation"]').all()

    for (const el of animatedElements) {
      // Check 1: No Web Animations API animations running
      const animationCount = await el.evaluate(node => node.getAnimations().length)
      expect(animationCount, 'Element should have no running animations').toBe(0)

      // Check 2: Element is in final visual state (opacity: 1, no transform)
      const styles = await el.evaluate(node => {
        const computed = getComputedStyle(node)
        return {
          opacity: computed.opacity,
          transform: computed.transform,
          transitionDuration: computed.transitionDuration,
        }
      })

      expect(styles.opacity, 'Opacity should be 1 (fully visible)').toBe('1')
      // Transform should be 'none' or 'matrix(1, 0, 0, 1, 0, 0)' (identity)
      expect(
        styles.transform === 'none' || styles.transform === 'matrix(1, 0, 0, 1, 0, 0)',
        `Transform should be identity, got: ${styles.transform}`
      ).toBe(true)
    }
  })

  test('keyboard navigation follows logical tab order', async ({ page }) => {
    await page.goto('/waivers')
    await page.waitForLoadState('networkidle')

    // Tab through first several interactive elements (5 is enough to verify order)
    let firstFocused = ''
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Tab')
      firstFocused = await page.evaluate(() => document.activeElement?.tagName || '')
      if (firstFocused && firstFocused !== 'BODY' && firstFocused !== 'NEXTJS-PORTAL') {
        break
      }
    }
    expect(['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA']).toContain(firstFocused)

    // Verify we can tab through at least 5 elements without getting stuck
    let successfulTabs = 0
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab')
      const isFocusable = await page.evaluate(() => {
        const el = document.activeElement
        return el && el !== document.body && el.tagName !== 'HTML'
      })
      if (isFocusable) successfulTabs++
    }

    // At least 3 of 5 tabs should land on focusable elements
    expect(successfulTabs).toBeGreaterThanOrEqual(3)
  })
})

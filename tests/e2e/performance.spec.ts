import { test, expect, type Page } from '@playwright/test'

/**
 * Measure warm load time using median of N runs
 * Warm = browser context already initialized, caches populated
 */
async function measureWarmLoadTime(
  page: Page,
  url: string,
  runs: number = 5
): Promise<number> {
  const times: number[] = []
  
  for (let i = 0; i < runs; i++) {
    // Navigate to blank page to reset state
    await page.goto('about:blank')
    
    // Measure navigation time
    const start = Date.now()
    await page.goto(url, { waitUntil: 'networkidle' })
    const loadTime = Date.now() - start
    
    times.push(loadTime)
  }
  
  // Sort and return median
  times.sort((a, b) => a - b)
  return times[Math.floor(times.length / 2)]
}

/**
 * Measure cold load time with fresh browser context
 * Cold = new context, no caches, simulates first visit
 */
async function measureColdLoadTime(
  page: Page,
  url: string
): Promise<number> {
  const browser = page.context().browser()!
  
  // Create fresh context with auth state
  const context = await browser.newContext({
    storageState: 'tests/e2e/.auth/user.json',
  })
  
  const freshPage = await context.newPage()
  
  // Measure navigation time
  const start = Date.now()
  await freshPage.goto(url, { waitUntil: 'networkidle' })
  const loadTime = Date.now() - start
  
  await context.close()
  
  return loadTime
}

test.describe('Performance Regression Tests', () => {
  test('draft page - cold load time', async ({ page, baseURL }) => {
    const url = `${baseURL}/draft`
    
    const coldLoadTime = await measureColdLoadTime(page, url)
    
    console.log(`[Performance] Draft cold load: ${coldLoadTime}ms`)
    
    // CI-safe threshold: 5s (local target is 3s, verified in Task 13)
    expect(coldLoadTime).toBeLessThan(5000)
  })

  test('draft page - warm load time', async ({ page, baseURL }) => {
    const url = `${baseURL}/draft`
    
    const medianLoadTime = await measureWarmLoadTime(page, url, 5)
    
    console.log(`[Performance] Draft warm load (median of 5): ${medianLoadTime}ms`)
    
    // CI-safe threshold: 2s (local target is 1s, verified in Task 13)
    expect(medianLoadTime).toBeLessThan(2000)
  })

  test('trade page - load time', async ({ page, baseURL }) => {
    const url = `${baseURL}/trade`
    
    const medianLoadTime = await measureWarmLoadTime(page, url, 5)
    
    console.log(`[Performance] Trade load (median of 5): ${medianLoadTime}ms`)
    
    // CI-safe threshold: 3s
    expect(medianLoadTime).toBeLessThan(3000)
  })

  test('waivers page - load time', async ({ page, baseURL }) => {
    const url = `${baseURL}/waivers`
    
    const medianLoadTime = await measureWarmLoadTime(page, url, 5)
    
    console.log(`[Performance] Waivers load (median of 5): ${medianLoadTime}ms`)
    
    // CI-safe threshold: 3s
    expect(medianLoadTime).toBeLessThan(3000)
  })
})

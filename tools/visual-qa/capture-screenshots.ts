/**
 * Playwright-based screenshot capture for visual QA.
 *
 * Full pipeline: discover routes -> setup directories -> authenticate ->
 * capture all routes at all viewports -> scaffold report.
 *
 * Usage:
 *   bun tools/visual-qa/capture-screenshots.ts [--base-url <url>] [--route <path>]
 *
 * --route filters to a single route path (e.g. --route /dashboard)
 * for quick QA during development.
 */

import * as path from 'node:path';
import { chromium, type Browser, type BrowserContext } from 'playwright';
import { main as discoverRoutes } from './discover-routes';
import { main as setup } from './setup';
import { main as scaffoldReport } from './scaffold-report';
import { authenticatePlaywright } from './authenticate';
import {
  VIEWPORTS,
  BASE_URL,
  SCREENSHOTS_DIR,
  AUTH_STATE_FILE,
  CAPTURE_SETTLE_MS,
  CAPTURE_TIMEOUT_MS,
} from './config';
import type { Route, Viewport, CaptureResult, Manifest } from './types';
import { getArg } from './args';

function timestamp(): string {
  return new Date().toISOString().slice(11, 19);
}

function log(msg: string): void {
  console.log(`[capture] ${msg}`);
}

function filterRoutes(routes: Route[], routeFilter?: string): Route[] {
  if (!routeFilter) return routes;
  const normalized = routeFilter.startsWith('/') ? routeFilter : `/${routeFilter}`;
  return routes.filter((r) => r.path === normalized);
}

async function captureRoute(
  page: Awaited<ReturnType<BrowserContext['newPage']>>,
  route: Route,
  viewport: Viewport,
  baseUrl: string,
): Promise<CaptureResult> {
  const filePath = path.join(SCREENSHOTS_DIR, route.dirName, viewport.fileName);
  const url = `${baseUrl}${route.path}`;

  try {
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: CAPTURE_TIMEOUT_MS,
    });
    await page.waitForLoadState('load', { timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(CAPTURE_SETTLE_MS);

    const finalUrl = page.url();
    const authFailed = finalUrl.includes('/login') && !route.path.includes('/login');

    await page.screenshot({ path: filePath, fullPage: true, animations: 'disabled' });

    return { route, viewport, success: true, filePath, finalUrl, authFailed };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { route, viewport, success: false, filePath, finalUrl: '', error: message };
  }
}

async function capturePhase(
  browser: Browser,
  routes: Route[],
  viewports: Viewport[],
  baseUrl: string,
  storageStatePath?: string,
): Promise<CaptureResult[]> {
  const contextOptions = storageStatePath ? { storageState: storageStatePath } : {};
  const context = await browser.newContext(contextOptions);

  const pages = await Promise.all(
    viewports.map(async (vp) => {
      const page = await context.newPage();
      await page.setViewportSize({ width: vp.width, height: vp.height });
      return page;
    }),
  );

  const results: CaptureResult[] = [];

  try {
    for (const route of routes) {
      const routeResults = await Promise.all(
        viewports.map((vp, i) => captureRoute(pages[i], route, vp, baseUrl)),
      );
      results.push(...routeResults);

      const statuses = routeResults.map((r) => {
        if (!r.success) return '\u2717';
        if (r.authFailed) return 'auth\u2717';
        return '\u2713';
      });
      const label = `${route.dirName} \u2014 ${viewports.map((v, i) => `${v.name}:${statuses[i]}`).join(', ')}`;
      log(`  ${label}`);
    }
  } finally {
    await Promise.all(pages.map((p) => p.close()));
    await context.close();
  }

  return results;
}

function printSummary(results: CaptureResult[]): void {
  const total = results.length;
  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  const authFailures = results.filter((r) => r.authFailed).length;

  log(`  Total: ${succeeded}/${total} captured (${failed} failed, ${authFailures} auth failures)`);

  if (failed > 0) {
    log('  Failed captures:');
    for (const r of results.filter((r) => !r.success)) {
      log(`    ${r.route.dirName}/${r.viewport.name}: ${r.error}`);
    }
  }
}

export async function captureScreenshots(
  baseUrl: string = BASE_URL,
  routeFilter?: string,
): Promise<CaptureResult[]> {
  log(`Pipeline started at ${timestamp()}`);
  log(`Base URL: ${baseUrl}`);
  if (routeFilter) log(`Route filter: ${routeFilter}`);
  console.log();

  log(`Step 1/7: Discovering routes... (${timestamp()})`);
  const manifest: Manifest = await discoverRoutes();
  const allPublic = filterRoutes(manifest.routes.public, routeFilter);
  const allProtected = filterRoutes(manifest.routes.protected, routeFilter);
  const totalRoutes = allPublic.length + allProtected.length;

  if (routeFilter && totalRoutes === 0) {
    const all = [...manifest.routes.public, ...manifest.routes.protected];
    throw new Error(
      `Route "${routeFilter}" not found. Available: ${all.map((r) => r.path).join(', ')}`,
    );
  }
  log(`  Found ${totalRoutes} routes (${allPublic.length} public, ${allProtected.length} protected)`);
  console.log();

  log(`Step 2/7: Setting up directories... (${timestamp()})`);
  await setup({ manifest, baseUrl });
  console.log();

  log(`Step 3/7: Launching browser... (${timestamp()})`);
  const browser = await chromium.launch({ headless: true });
  const allResults: CaptureResult[] = [];

  try {
    let authStatePath: string | undefined;
    if (allProtected.length > 0) {
      log(`Step 4/7: Authenticating... (${timestamp()})`);
      try {
        await authenticatePlaywright(browser, baseUrl);
        authStatePath = AUTH_STATE_FILE;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[capture] \u26a0\ufe0f  Auth failed: ${msg}`);
        console.warn('[capture] Continuing without auth \u2014 protected routes will show login redirect');
      }
      console.log();
    } else {
      log(`Step 4/7: Authenticating... (skipped — no protected routes)`);
      console.log();
    }

    if (allPublic.length > 0) {
      log(`Step 5/7: Capturing public routes (${allPublic.length} routes x ${VIEWPORTS.length} viewports)... (${timestamp()})`);
      const publicResults = await capturePhase(browser, allPublic, VIEWPORTS, baseUrl);
      allResults.push(...publicResults);
      console.log();
    } else {
      log(`Step 5/7: Capturing public routes... (skipped — none match filter)`);
      console.log();
    }

    if (allProtected.length > 0) {
      log(`Step 6/7: Capturing protected routes (${allProtected.length} routes x ${VIEWPORTS.length} viewports)... (${timestamp()})`);
      const protectedResults = await capturePhase(
        browser,
        allProtected,
        VIEWPORTS,
        baseUrl,
        authStatePath,
      );
      allResults.push(...protectedResults);
      console.log();
    } else {
      log(`Step 6/7: Capturing protected routes... (skipped — none match filter)`);
      console.log();
    }
  } finally {
    await browser.close();
  }

  log(`Step 7/7: Scaffolding report... (${timestamp()})`);
  await scaffoldReport();
  console.log();

  log(`Results (${timestamp()}):`);
  printSummary(allResults);
  console.log();

  const failCount = allResults.filter((r) => !r.success).length;
  if (failCount === allResults.length && allResults.length > 0) {
    throw new Error('All captures failed — check the dev server and auth state.');
  }

  log(`Done! (${timestamp()})`);
  return allResults;
}

export async function main(): Promise<void> {
  const baseUrl = getArg('base-url') ?? BASE_URL;
  const routeFilter = getArg('route');
  await captureScreenshots(baseUrl, routeFilter);
}

if (import.meta.main) {
  main().catch((err) => {
    console.error(`\n[capture] Pipeline failed:`, err);
    process.exit(1);
  });
}

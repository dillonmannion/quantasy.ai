/**
 * Playwright-based authentication for visual QA screenshots.
 *
 * Pipeline:
 *   1. Read ADMIN_EMAIL from env (bun auto-loads .env.local)
 *   2. POST /api/auth/dev-login -> get hashed_token + verification_type
 *   3. Launch Playwright browser, navigate to callback URL
 *   4. Supabase verifies OTP, redirects to /dashboard
 *   5. Save browser storageState to AUTH_STATE_FILE
 */

import { chromium, type Browser } from 'playwright';
import { BASE_URL, AUTH_STATE_FILE } from './config';
import { getArg } from './args';

interface DevLoginResponse {
  hashed_token: string;
  verification_type: string;
  error?: string;
}

export async function authenticatePlaywright(
  browser: Browser,
  baseUrl: string,
): Promise<string> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    throw new Error('ADMIN_EMAIL not set. Add it to .env.local.');
  }

  console.log(`[authenticate] POST ${baseUrl}/api/auth/dev-login`);
  const res = await fetch(`${baseUrl}/api/auth/dev-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`dev-login failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as DevLoginResponse;
  if (!data.hashed_token || !data.verification_type) {
    throw new Error(`Unexpected dev-login response: ${JSON.stringify(data)}`);
  }

  const callbackUrl =
    `${baseUrl}/auth/callback` +
    `?token_hash=${encodeURIComponent(data.hashed_token)}` +
    `&type=${encodeURIComponent(data.verification_type)}`;

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('[authenticate] Opening callback URL in Playwright...');
    await page.goto(callbackUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load', { timeout: 5_000 }).catch(() => {});

    const currentUrl = page.url();
    console.log(`[authenticate] Landed on: ${currentUrl}`);

    if (currentUrl.includes('/login')) {
      throw new Error('Auth failed — redirected to /login');
    }

    if (!currentUrl.includes('/dashboard')) {
      throw new Error(`Unexpected URL after auth: ${currentUrl}`);
    }

    await context.storageState({ path: AUTH_STATE_FILE });
    console.log(`[authenticate] Auth state saved to ${AUTH_STATE_FILE}`);

    return AUTH_STATE_FILE;
  } finally {
    await context.close();
  }
}

export async function main(): Promise<void> {
  const baseUrl = getArg('base-url') ?? BASE_URL;
  const browser = await chromium.launch({ headless: true });

  try {
    await authenticatePlaywright(browser, baseUrl);
  } finally {
    await browser.close();
  }
}

if (import.meta.main) {
  main().catch((err) => {
    console.error('[authenticate] Fatal:', err);
    process.exit(1);
  });
}

/**
 * Automated authentication for visual QA screenshots.
 *
 * Pipeline:
 *   1. Read ADMIN_EMAIL from env (bun auto-loads .env.local)
 *   2. Preflight: verify agent-browser is installed
 *   3. POST /api/auth/dev-login → get hashed_token + verification_type
 *   4. Open callback URL in agent-browser → Supabase verifies OTP
 *   5. Verify redirect landed on /dashboard
 *   6. Save browser auth state to AUTH_STATE_FILE
 *   7. Close browser (always, even on error)
 */

import { execSync } from 'node:child_process';
import { BASE_URL, AUTH_STATE_FILE } from './config';

interface DevLoginResponse {
  hashed_token: string;
  verification_type: string;
  error?: string;
}

function parseArgs(): { baseUrl: string } {
  const args = process.argv.slice(2);
  const idx = args.indexOf('--base-url');
  const baseUrl = idx !== -1 && args[idx + 1] ? args[idx + 1] : BASE_URL;
  return { baseUrl };
}

function exec(cmd: string): string {
  return execSync(cmd, { encoding: 'utf-8', timeout: 30_000 }).trim();
}

export async function main(): Promise<void> {
  const { baseUrl } = parseArgs();

  // 1. Check ADMIN_EMAIL
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.error(
      '[authenticate] ADMIN_EMAIL not set. Add it to .env.local.'
    );
    process.exit(1);
  }

  // 2. Preflight: agent-browser must be on PATH
  try {
    exec('which agent-browser');
  } catch {
    console.error(
      '[authenticate] agent-browser not found. Install it first:\n' +
        '  npm install -g @anthropic-ai/agent-browser'
    );
    process.exit(1);
  }

  // 3. Call dev-login API
  console.log(`[authenticate] POST ${baseUrl}/api/auth/dev-login`);
  const res = await fetch(`${baseUrl}/api/auth/dev-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(
      `[authenticate] dev-login failed (${res.status}): ${text}`
    );
    process.exit(1);
  }

  const data = (await res.json()) as DevLoginResponse;
  if (!data.hashed_token || !data.verification_type) {
    console.error('[authenticate] Unexpected response:', data);
    process.exit(1);
  }

  // 4–7. Open browser, verify, save state, close
  const callbackUrl =
    `${baseUrl}/auth/callback` +
    `?token_hash=${encodeURIComponent(data.hashed_token)}` +
    `&type=${encodeURIComponent(data.verification_type)}`;

  try {
    console.log('[authenticate] Opening callback URL in agent-browser…');
    exec(`agent-browser open "${callbackUrl}"`);
    exec('agent-browser wait --load networkidle');

    // 5. Verify redirect
    const currentUrl = exec('agent-browser get url');
    console.log(`[authenticate] Landed on: ${currentUrl}`);

    if (currentUrl.includes('/login')) {
      console.error('[authenticate] Auth failed — redirected to /login');
      process.exit(1);
    }

    if (!currentUrl.includes('/dashboard')) {
      console.error(
        `[authenticate] Unexpected URL after auth: ${currentUrl}`
      );
      process.exit(1);
    }

    // 6. Save auth state
    exec(`agent-browser state save "${AUTH_STATE_FILE}"`);
    console.log(`[authenticate] Auth state saved to ${AUTH_STATE_FILE}`);
  } finally {
    // 7. Always close browser
    try {
      exec('agent-browser close');
    } catch {
      // Swallow — browser may already be closed
    }
  }
}

// CLI entry point
if (import.meta.main) {
  main().catch((err) => {
    console.error('[authenticate] Fatal:', err);
    process.exit(1);
  });
}

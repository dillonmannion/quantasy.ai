/**
 * Visual QA CLI — sequential pipeline runner
 *
 * Chains all visual QA scripts in order, stopping on first failure:
 *   1. discover-routes → build route manifest
 *   2. setup → archive previous + create directories + health check
 *   3. authenticate → dev-login + browser auth flow
 *   4. generate-prompts → hydrated prompt files + batch manifest
 *   5. scaffold-report → CHANGES-NEEDED.md skeleton
 *
 * Usage:
 *   bun tools/visual-qa/cli.ts [--base-url <url>]
 *
 * The --base-url arg is passed through to setup and authenticate
 * via process.argv (those scripts parse it themselves).
 */

import { main as discoverRoutes } from './discover-routes';
import { main as setup } from './setup';
import { main as authenticate } from './authenticate';
import { main as generatePrompts } from './generate-prompts';
import { main as scaffoldReport } from './scaffold-report';
import { BASE_URL } from './config';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timestamp(): string {
  return new Date().toISOString().slice(11, 19);
}

function log(msg: string): void {
  console.log(`[visual-qa] ${msg}`);
}

function parseBaseUrl(): string {
  const args = process.argv.slice(2);
  const idx = args.indexOf('--base-url');
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : BASE_URL;
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

export async function main(): Promise<void> {
  const baseUrl = parseBaseUrl();

  log(`Pipeline started at ${timestamp()}`);
  log(`Base URL: ${baseUrl}`);
  console.log();

  // Step 1: Discover routes
  log(`Step 1/5: Discovering routes... (${timestamp()})`);
  const manifest = await discoverRoutes();
  const publicCount = manifest.routes.public.length;
  const protectedCount = manifest.routes.protected.length;
  const totalRoutes = publicCount + protectedCount;
  log(`  Found ${totalRoutes} routes (${publicCount} public, ${protectedCount} protected)`);
  console.log();

  // Step 2: Setup directories + health check
  log(`Step 2/5: Setting up directories... (${timestamp()})`);
  await setup();
  log(`  Archived previous run, created ${totalRoutes} directories`);
  console.log();

  // Step 3: Authenticate
  log(`Step 3/5: Authenticating... (${timestamp()})`);
  await authenticate();
  log(`  Auth state saved to .visual-qa-auth.json`);
  console.log();

  log('Capture phase ready. The orchestrator should now run capture agents using the generated prompts.');
  console.log();

  // Step 4: Generate prompts
  log(`Step 4/5: Generating prompts... (${timestamp()})`);
  await generatePrompts();
  console.log();

  log('Prompts generated. After captures complete, run: bun tools/visual-qa/verify-captures.ts');
  console.log();

  // Step 5: Scaffold report
  log(`Step 5/5: Scaffolding report... (${timestamp()})`);
  await scaffoldReport();
  log(`  Report skeleton at screenshots/CHANGES-NEEDED.md`);
  console.log();

  log(`Done! Ready for capture phase. (${timestamp()})`);
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

if (import.meta.main) {
  main().catch((err) => {
    console.error(`\n[visual-qa] Pipeline failed:`, err);
    process.exit(1);
  });
}

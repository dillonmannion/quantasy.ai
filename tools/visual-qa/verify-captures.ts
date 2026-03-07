/**
 * Screenshot freshness validator for visual QA pipeline
 *
 * Verifies all expected screenshots exist and were created AFTER
 * the run started (mtime > startedAt). Reports stale/missing files.
 *
 * Usage:
 *   bun tools/visual-qa/verify-captures.ts
 *   bun tools/visual-qa/verify-captures.ts --manifest path/to/metadata.json
 *
 * Exit 0: All screenshots are fresh
 * Exit 1: Some screenshots are stale or missing
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Route, RunMetadata } from './types';
import { SCREENSHOTS_DIR } from './config';
import { getArg, loadRunMetadata } from './args';

export interface VerifyResult {
  total: number;
  fresh: number;
  stale: number;
  missing: number;
  staleFiles: string[];
  missingFiles: string[];
}

function classify(
  filePath: string,
  startedAtMs: number
): 'FRESH' | 'STALE' | 'MISSING' {
  if (!fs.existsSync(filePath)) {
    return 'MISSING';
  }
  const stat = fs.statSync(filePath);
  return stat.mtimeMs > startedAtMs ? 'FRESH' : 'STALE';
}

export async function main(): Promise<VerifyResult> {
  const metadata = loadRunMetadata(getArg('manifest'));
  const startedAtMs = new Date(metadata.startedAt).getTime();
  const { manifest } = metadata;

  const allRoutes: Route[] = [
    ...manifest.routes.public,
    ...manifest.routes.protected,
  ];

  const result: VerifyResult = {
    total: allRoutes.length * manifest.viewports.length,
    fresh: 0,
    stale: 0,
    missing: 0,
    staleFiles: [],
    missingFiles: [],
  };

  for (const route of allRoutes) {
    for (const viewport of manifest.viewports) {
      const filePath = path.join(
        SCREENSHOTS_DIR,
        route.dirName,
        viewport.fileName
      );
      const status = classify(filePath, startedAtMs);

      switch (status) {
        case 'FRESH':
          result.fresh++;
          break;
        case 'STALE':
          result.stale++;
          result.staleFiles.push(filePath);
          break;
        case 'MISSING':
          result.missing++;
          result.missingFiles.push(filePath);
          break;
      }
    }
  }

  // Print summary
  console.log('\n📸 Screenshot Freshness Report');
  console.log('─'.repeat(40));
  console.log(`  Total expected:  ${result.total}`);
  console.log(`  Fresh:           ${result.fresh}`);
  console.log(`  Stale:           ${result.stale}`);
  console.log(`  Missing:         ${result.missing}`);

  if (result.staleFiles.length > 0) {
    console.log('\n⚠️  Stale files (mtime <= startedAt):');
    for (const f of result.staleFiles) {
      console.log(`    ${f}`);
    }
  }

  if (result.missingFiles.length > 0) {
    console.log('\n❌ Missing files:');
    for (const f of result.missingFiles) {
      console.log(`    ${f}`);
    }
  }

  if (result.stale === 0 && result.missing === 0) {
    console.log('\n✅ All screenshots are fresh.\n');
  } else {
    console.log(
      `\n🚫 ${result.stale + result.missing} issue(s) found. Re-run capture for affected routes.\n`
    );
  }

  return result;
}

if (import.meta.main) {
  const result = await main();
  if (result.stale > 0 || result.missing > 0) {
    process.exit(1);
  }
}

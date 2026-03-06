/**
 * Visual QA Setup — directory manager, archiver, and health check
 *
 * Archives previous screenshots, creates fresh directories per route,
 * writes run metadata, and verifies the dev server is reachable.
 *
 * Usage:
 *   bun tools/visual-qa/setup.ts [--manifest <path>] [--base-url <url>]
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Manifest, RunMetadata } from './types';
import {
  SCREENSHOTS_DIR,
  PREVIOUS_DIR,
  METADATA_FILE,
  BASE_URL,
} from './config';
import { getArg } from './args';

async function loadManifest(manifestPath?: string): Promise<Manifest> {
  if (manifestPath) {
    const raw = fs.readFileSync(manifestPath, 'utf-8');
    return JSON.parse(raw) as Manifest;
  }

  const { main: discoverRoutes } = await import('./discover-routes');
  return discoverRoutes();
}

// ---------------------------------------------------------------------------
// Step 1 — Archive current screenshots
// ---------------------------------------------------------------------------

function archiveScreenshots(): boolean {
  if (!fs.existsSync(SCREENSHOTS_DIR)) return false;

  // Check for .png files inside subdirectories (not dotfiles like .previous/)
  const entries = fs.readdirSync(SCREENSHOTS_DIR, { withFileTypes: true });
  const hasScreenshots = entries.some((entry) => {
    if (!entry.isDirectory() || entry.name.startsWith('.')) return false;
    const children = fs.readdirSync(path.join(SCREENSHOTS_DIR, entry.name));
    return children.some((f) => f.endsWith('.png'));
  });

  if (!hasScreenshots) return false;

  // Remove old .previous/
  if (fs.existsSync(PREVIOUS_DIR)) {
    fs.rmSync(PREVIOUS_DIR, { recursive: true });
  }

  // Create fresh .previous/
  fs.mkdirSync(PREVIOUS_DIR, { recursive: true });

  // Move screenshot subdirectories into .previous/
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    fs.renameSync(
      path.join(SCREENSHOTS_DIR, entry.name),
      path.join(PREVIOUS_DIR, entry.name),
    );
  }

  // Copy CHANGES-NEEDED.md if it exists
  const changesFile = path.join(SCREENSHOTS_DIR, 'CHANGES-NEEDED.md');
  if (fs.existsSync(changesFile)) {
    fs.copyFileSync(changesFile, path.join(PREVIOUS_DIR, 'CHANGES-NEEDED.md'));
    fs.rmSync(changesFile);
  }

  return true;
}

// ---------------------------------------------------------------------------
// Step 2 — Create fresh directories
// ---------------------------------------------------------------------------

function createDirectories(manifest: Manifest): number {
  const allRoutes = [...manifest.routes.public, ...manifest.routes.protected];

  for (const route of allRoutes) {
    fs.mkdirSync(path.join(SCREENSHOTS_DIR, route.dirName), {
      recursive: true,
    });
  }

  return allRoutes.length;
}

// ---------------------------------------------------------------------------
// Step 3 — Write run metadata
// ---------------------------------------------------------------------------

function writeMetadata(manifest: Manifest, baseUrl: string): void {
  const metadata: RunMetadata = {
    startedAt: new Date().toISOString(),
    baseUrl,
    manifest,
  };

  fs.mkdirSync(path.dirname(METADATA_FILE), { recursive: true });
  fs.writeFileSync(METADATA_FILE, JSON.stringify(metadata, null, 2));
}

// ---------------------------------------------------------------------------
// Step 4 — Health check
// ---------------------------------------------------------------------------

async function healthCheck(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(baseUrl, { signal: AbortSignal.timeout(5000) });
    return response.ok;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function main(
  options?: { manifest?: Manifest; baseUrl?: string },
): Promise<Manifest> {
  const baseUrl = options?.baseUrl ?? getArg('base-url') ?? BASE_URL;

  console.log('🔧 Visual QA Setup\n');

  const manifest = options?.manifest ?? (await loadManifest(getArg('manifest')));
  const totalRoutes =
    manifest.routes.public.length + manifest.routes.protected.length;
  console.log(
    `  Routes:      ${totalRoutes} (${manifest.routes.public.length} public, ${manifest.routes.protected.length} protected)`,
  );

  // Archive previous run
  const archived = archiveScreenshots();
  console.log(
    `  Archive:     ${archived ? 'moved to .previous/' : 'nothing to archive'}`,
  );

  // Create directories
  const dirCount = createDirectories(manifest);
  console.log(`  Directories: ${dirCount} created`);

  // Write metadata
  writeMetadata(manifest, baseUrl);
  console.log(`  Metadata:    ${METADATA_FILE}`);

  // Health check
  const healthy = await healthCheck(baseUrl);
  console.log(
    `  App status:  ${healthy ? '✅ running' : '❌ not responding'} (${baseUrl})`,
  );

  if (!healthy) {
    console.error('\n❌ Health check failed — is the dev server running?');
    process.exit(1);
  }

  console.log(`\n✅ Ready — ${dirCount} directories, app healthy`);

  return manifest;
}

// Run when invoked directly
if (import.meta.main) {
  main().catch((err) => {
    console.error('❌ Setup failed:', err);
    process.exit(1);
  });
}

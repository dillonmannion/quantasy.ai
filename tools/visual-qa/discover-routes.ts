/**
 * Filesystem scanner that discovers all Next.js App Router routes
 * and outputs a typed JSON manifest for visual QA tooling.
 *
 * Usage:
 *   bun tools/visual-qa/discover-routes.ts              # stdout
 *   bun tools/visual-qa/discover-routes.ts --out m.json  # write to file
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import type { Route, Manifest } from './types';
import {
  VIEWPORTS,
  PROTECTED_ROUTE_GROUPS,
  ROOT_DIR_NAME_MAP,
  ANALYSIS_BATCH_SIZE,
  ANALYSIS_CATEGORY,
} from './config';

const APP_DIR = path.resolve('src', 'app');
const PAGE_FILE = 'page.tsx';
const ROUTE_GROUP_RE = /\([^)]+\)/g;

/**
 * Recursively walk a directory and return all file paths.
 */
function walkDir(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath));
    } else if (entry.isFile()) {
      results.push(fullPath);
    }
  }

  return results;
}

/**
 * Extract the route group name from a single directory segment.
 * e.g. "(dashboard)" → "dashboard", "login" → null
 */
function extractGroup(segment: string): string | null {
  const match = segment.match(/^\(([^)]+)\)$/);
  return match ? match[1] : null;
}

/**
 * Convert a dirName to a display name.
 * e.g. "draft-sandbox" → "Draft Sandbox", "dashboard" → "Dashboard"
 */
function toDisplayName(dirName: string): string {
  return dirName
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Given an absolute page.tsx path, derive the Route object.
 */
function deriveRoute(pagePath: string): Route {
  // Get the relative path from app dir to the page's directory
  const pageDir = path.dirname(pagePath);
  const relDir = path.relative(APP_DIR, pageDir);

  // Split into segments and extract groups
  const segments = relDir === '' ? [] : relDir.split(path.sep);
  const groups = segments.map(extractGroup).filter(Boolean) as string[];

  // Strip route groups to derive URL path
  const urlSegments = segments.filter((s) => !ROUTE_GROUP_RE.test(s));
  // Reset the regex lastIndex since it's global
  ROUTE_GROUP_RE.lastIndex = 0;
  const urlPath = '/' + urlSegments.join('/');

  // Derive dirName
  const dirName =
    urlPath === '/'
      ? (ROOT_DIR_NAME_MAP['/'] ?? 'home')
      : urlSegments[urlSegments.length - 1];

  // Derive display name
  const name = urlPath === '/' ? 'Landing Page' : toDisplayName(dirName);

  // Determine primary group (first group found, or 'root')
  const group = groups.length > 0 ? groups[0] : 'root';

  return { path: urlPath, dirName, name, group };
}

/**
 * Discover all Next.js routes and build a Manifest.
 */
export async function main(): Promise<Manifest> {
  // Find all page.tsx files
  const allFiles = walkDir(APP_DIR);
  const pageFiles = allFiles.filter((f) => path.basename(f) === PAGE_FILE);

  // Derive routes
  const routes = pageFiles.map(deriveRoute);

  // Classify into public/protected
  const publicRoutes: Route[] = [];
  const protectedRoutes: Route[] = [];

  for (const route of routes) {
    if (PROTECTED_ROUTE_GROUPS.has(route.group)) {
      protectedRoutes.push(route);
    } else {
      publicRoutes.push(route);
    }
  }

  // Sort alphabetically by path for deterministic output
  publicRoutes.sort((a, b) => a.path.localeCompare(b.path));
  protectedRoutes.sort((a, b) => a.path.localeCompare(b.path));

  const manifest: Manifest = {
    routes: {
      public: publicRoutes,
      protected: protectedRoutes,
    },
    viewports: VIEWPORTS,
    analysis: {
      batchSize: ANALYSIS_BATCH_SIZE,
      recommendedCategory: ANALYSIS_CATEGORY,
    },
  };

  return manifest;
}

// --- CLI entrypoint ---
if (import.meta.main || import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then((manifest) => {
      const json = JSON.stringify(manifest, null, 2);

      // Handle --out <path> argument
      const outIdx = process.argv.indexOf('--out');
      if (outIdx !== -1 && process.argv[outIdx + 1]) {
        const outPath = process.argv[outIdx + 1];
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        fs.writeFileSync(outPath, json + '\n', 'utf-8');
        console.error(`Manifest written to ${outPath}`);
      } else {
        console.log(json);
      }

      process.exit(0);
    })
    .catch((err) => {
      console.error('Failed to discover routes:', err);
      process.exit(1);
    });
}

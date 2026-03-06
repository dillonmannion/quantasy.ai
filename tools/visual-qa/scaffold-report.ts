/**
 * Scaffold CHANGES-NEEDED.md skeleton for visual QA report
 *
 * Generates the report structure with TBD placeholders.
 * Analysis agents fill in actual findings later.
 *
 * Usage:
 *   bun tools/visual-qa/scaffold-report.ts [--manifest <path>]
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { Manifest, Route, RunMetadata } from './types';
import { SCREENSHOTS_DIR, PREVIOUS_DIR, METADATA_FILE, BASE_URL, VIEWPORTS } from './config';

function parseArgs(args: string[]): { manifestPath: string } {
  let manifestPath = METADATA_FILE;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--manifest' && args[i + 1]) {
      manifestPath = args[i + 1];
    }
  }

  return { manifestPath };
}

function loadManifest(manifestPath: string): Manifest {
  const resolved = resolve(manifestPath);
  if (!existsSync(resolved)) {
    throw new Error(`Manifest not found: ${resolved}`);
  }

  const raw = readFileSync(resolved, 'utf-8');
  const parsed = JSON.parse(raw) as RunMetadata | Manifest;

  // Support both RunMetadata wrapper and raw Manifest
  if ('manifest' in parsed) {
    return parsed.manifest;
  }
  return parsed as Manifest;
}

function getAllRoutes(manifest: Manifest): Route[] {
  return [...manifest.routes.public, ...manifest.routes.protected];
}

function viewportLabel(vp: { name: string; width: number; height: number }): string {
  const capitalized = vp.name.charAt(0).toUpperCase() + vp.name.slice(1);
  return `${capitalized} (${vp.width}x${vp.height})`;
}

function hasPreviousRun(): boolean {
  return existsSync(resolve(PREVIOUS_DIR));
}

function buildHeader(routes: Route[]): string {
  const viewportLabels = VIEWPORTS.map(viewportLabel).join(', ');
  const now = new Date().toISOString();

  return [
    '# Visual QA Report',
    '',
    `**Generated:** ${now}`,
    `**Base URL:** ${BASE_URL}`,
    `**Viewports:** ${viewportLabels}`,
    '',
  ].join('\n');
}

function buildSummary(routes: Route[]): string {
  const lines: string[] = [
    '## Summary',
    '',
    `- **Pages screenshotted:** ${routes.length}/10`,
    '- **Total issues found:** _TBD_',
    '- **Critical:** _TBD_',
    '- **Warning:** _TBD_',
    '- **Info:** _TBD_',
    '',
    '### Issues by Page',
    '',
    '| Page | Mobile | Tablet | Desktop | Total |',
    '|------|--------|--------|---------|-------|',
  ];

  for (const route of routes) {
    lines.push(`| ${route.name} | _TBD_ | _TBD_ | _TBD_ | _TBD_ |`);
  }

  lines.push('');
  return lines.join('\n');
}

function buildRouteSection(routes: Route[]): string {
  const lines: string[] = [];

  for (const route of routes) {
    lines.push(`### ${route.name} (${route.path})`);
    for (const vp of VIEWPORTS) {
      lines.push(`#### ${viewportLabel(vp)}`);
      lines.push('_Pending analysis..._');
    }
    lines.push('');
  }

  return lines.join('\n');
}

function buildFirstRunBody(routes: Route[]): string {
  const lines: string[] = [
    '---',
    '',
    '## Detailed Findings',
    '',
    '_All findings from this initial run._',
    '',
  ];

  lines.push(buildRouteSection(routes));

  lines.push('---');
  lines.push('');

  return lines.join('\n');
}

function buildSubsequentRunBody(routes: Route[]): string {
  const sections = [
    {
      title: 'New Issues (regressions since previous run)',
      description: '_Issues found in current run that were NOT present in previous run._',
    },
    {
      title: 'Resolved Issues (fixed since previous run)',
      description: '_Issues present in previous run that are NO LONGER found._',
    },
    {
      title: 'Persistent Issues (unchanged)',
      description: '_Issues found in BOTH current and previous runs._',
    },
  ];

  const lines: string[] = [];

  for (const section of sections) {
    lines.push('---');
    lines.push('');
    lines.push(`## ${section.title}`);
    lines.push('');
    lines.push(section.description);
    lines.push('');
    lines.push(buildRouteSection(routes));
  }

  lines.push('---');
  lines.push('');

  return lines.join('\n');
}

function buildNotes(): string {
  return [
    '## Notes',
    '',
    '- Auth state: _TBD_',
    '- Missing captures: _TBD_',
    '- Agent errors: _TBD_',
    '',
  ].join('\n');
}

function generateReport(manifest: Manifest): string {
  const routes = getAllRoutes(manifest);
  const isPreviousRun = hasPreviousRun();

  const parts: string[] = [
    buildHeader(routes),
    buildSummary(routes),
  ];

  if (isPreviousRun) {
    parts.push(buildSubsequentRunBody(routes));
  } else {
    parts.push(buildFirstRunBody(routes));
  }

  parts.push(buildNotes());

  return parts.join('\n');
}

export async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const { manifestPath } = parseArgs(args);

  const manifest = loadManifest(manifestPath);
  const report = generateReport(manifest);

  const outputPath = resolve(SCREENSHOTS_DIR, 'CHANGES-NEEDED.md');
  const outputDir = dirname(outputPath);

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  writeFileSync(outputPath, report, 'utf-8');
  console.log(outputPath);
}

// CLI entry point
if (import.meta.main) {
  main().then(
    () => process.exit(0),
    (err) => {
      console.error('scaffold-report failed:', err instanceof Error ? err.message : err);
      process.exit(1);
    },
  );
}

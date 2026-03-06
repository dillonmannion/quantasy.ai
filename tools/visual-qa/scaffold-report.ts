/**
 * Scaffold CHANGES-NEEDED.md skeleton for visual QA report
 *
 * Generates the report structure with TBD placeholders.
 * Analysis agents fill in actual findings later.
 *
 * Usage:
 *   bun tools/visual-qa/scaffold-report.ts [--manifest <path>]
 */

import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { Manifest, Route } from './types';
import { SCREENSHOTS_DIR, PREVIOUS_DIR } from './config';
import { getArg, loadRunMetadata } from './args';

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

function buildHeader(routes: Route[], baseUrl: string, viewports: { name: string; width: number; height: number }[]): string {
  const viewportLabels = viewports.map(viewportLabel).join(', ');
  const now = new Date().toISOString();

  return [
    '# Visual QA Report',
    '',
    `**Generated:** ${now}`,
    `**Base URL:** ${baseUrl}`,
    `**Viewports:** ${viewportLabels}`,
    '',
  ].join('\n');
}

function buildSummary(routes: Route[]): string {
  const lines: string[] = [
    '## Summary',
    '',
    `- **Pages screenshotted:** ${routes.length}`,
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

function buildRouteSection(routes: Route[], viewports: { name: string; width: number; height: number }[]): string {
  const lines: string[] = [];

  for (const route of routes) {
    lines.push(`### ${route.name} (${route.path})`);
    for (const vp of viewports) {
      lines.push(`#### ${viewportLabel(vp)}`);
      lines.push('_Pending analysis..._');
    }
    lines.push('');
  }

  return lines.join('\n');
}

function buildFirstRunBody(routes: Route[], viewports: { name: string; width: number; height: number }[]): string {
  const lines: string[] = [
    '---',
    '',
    '## Detailed Findings',
    '',
    '_All findings from this initial run._',
    '',
  ];

  lines.push(buildRouteSection(routes, viewports));

  lines.push('---');
  lines.push('');

  return lines.join('\n');
}

function buildSubsequentRunBody(routes: Route[], viewports: { name: string; width: number; height: number }[]): string {
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
    lines.push(buildRouteSection(routes, viewports));
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

function generateReport(manifest: Manifest, baseUrl: string): string {
  const routes = getAllRoutes(manifest);
  const viewports = manifest.viewports;
  const isPreviousRun = hasPreviousRun();

  const parts: string[] = [
    buildHeader(routes, baseUrl, viewports),
    buildSummary(routes),
  ];

  if (isPreviousRun) {
    parts.push(buildSubsequentRunBody(routes, viewports));
  } else {
    parts.push(buildFirstRunBody(routes, viewports));
  }

  parts.push(buildNotes());

  return parts.join('\n');
}

export async function main(): Promise<void> {
  const metadata = loadRunMetadata(getArg('manifest'));
  const report = generateReport(metadata.manifest, metadata.baseUrl);

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

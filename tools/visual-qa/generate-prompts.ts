/**
 * Analysis prompt generator with batching
 *
 * Reads a manifest (from --manifest or screenshots/.run-metadata.json),
 * then generates:
 *   - 1 analysis prompt per route
 *   - batch-manifest.json with routing metadata
 *
 * Usage:
 *   bun tools/visual-qa/generate-prompts.ts [--manifest <path>]
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import type { Route, Viewport } from './types';
import {
  GENERATED_PROMPTS_DIR,
  VIEWPORTS,
  ANALYSIS_BATCH_SIZE,
  ANALYSIS_CATEGORY,
  SCREENSHOTS_DIR,
  PREVIOUS_DIR,
} from './config';
import { getArg, loadRunMetadata } from './args';

// ---------------------------------------------------------------------------
// Template: Analysis prompt (per route)
// ---------------------------------------------------------------------------

function generateAnalysisPrompt(
  route: Route,
  viewports: Viewport[],
  batchIndex: number,
  totalBatches: number,
  hasPrevious: boolean,
): string {
  const screenshotList = viewports
    .map((v) => `  - ${SCREENSHOTS_DIR}/${route.dirName}/${v.fileName} (${v.name.charAt(0).toUpperCase() + v.name.slice(1)}: ${v.width}x${v.height})`)
    .join('\n');

  const lookAtGoals = viewports
    .map((v) => {
      const vpLabel = v.name.charAt(0).toUpperCase() + v.name.slice(1);
      return `For ${SCREENSHOTS_DIR}/${route.dirName}/${v.fileName}, use look_at() with this goal:

"Analyze this screenshot of the ${route.name} page at ${vpLabel} viewport (${v.width}x${v.height}) for visual QA issues. Check for:

1. LAYOUT: horizontal overflow, overlapping elements, content cut off, broken stacking
2. RESPONSIVE: does the layout properly adapt to this viewport? Touch targets sized appropriately? Text readable?
3. VISUAL: spacing consistency, alignment, color contrast, font rendering issues
4. CONTENT: empty states, placeholder text, broken images, text truncation
5. NAVIGATION: is the nav adapted to this viewport? Any fixed elements overlapping content?
6. ACCESSIBILITY: color contrast concerns, missing labels, icon-only buttons without labels

Report each issue with:
- What the issue is (specific, not vague)
- Where on the page it occurs (top/middle/bottom, left/right, which component)
- Severity: CRITICAL (broken/unusable), WARNING (degraded experience), INFO (minor polish)

If no issues found, say 'No issues detected.'"`;
    })
    .join('\n\n');

  // Previous-run comparison block
  let comparisonBlock = '';
  if (hasPrevious) {
    const previousPaths = viewports
      .map((v) => `  - ${PREVIOUS_DIR}/${route.dirName}/${v.fileName}`)
      .join('\n');

    comparisonBlock = `
PREVIOUS RUN COMPARISON:
Previous screenshots exist at:
${previousPaths}

After analyzing the current screenshots, compare against the previous run:
- For each current screenshot, also look_at() the corresponding previous screenshot.
- Classify each issue found as:
  - NEW: Issue exists in current but NOT in previous
  - RESOLVED: Issue existed in previous but NOT in current
  - PERSISTENT: Issue exists in BOTH current and previous
- Include the classification tag in your output for each issue.
`;
  }

  // Viewport-specific focus guidance
  const viewportFocus = `
VIEWPORT-SPECIFIC FOCUS:
- MOBILE: Pay extra attention to touch targets (must be >=44px), text readability (>=14px effective), horizontal overflow, navigation collapse/hamburger behavior, bottom nav interference with content.
- TABLET: Check layout transitions — are grids adapting from mobile single-column to multi-column? Sidebar behavior? Is the layout using tablet space effectively or just stretching mobile?
- DESKTOP: Check for excessive whitespace, content not filling available width, hover state affordances, wide table/grid layouts, whether navigation uses full horizontal space.`;

  const outputFormat = `
OUTPUT FORMAT (use exactly this structure):

## ${route.name} (${route.path})

### Mobile (${viewports[0].width}x${viewports[0].height})
Screenshot: \`${route.dirName}/mobile.png\`

- **[SEVERITY]** Description of issue
  - Location: where on the page
  - Impact: what is broken or degraded

_No issues detected._ (if clean)

### Tablet (${viewports[1].width}x${viewports[1].height})
Screenshot: \`${route.dirName}/tablet.png\`

[same format]

### Desktop (${viewports[2].width}x${viewports[2].height})
Screenshot: \`${route.dirName}/desktop.png\`

[same format]

CROSS-VIEWPORT NOTES:
After analyzing all ${viewports.length} viewports, note any cross-viewport patterns (e.g., "Element X overflows on mobile but is correctly contained on tablet/desktop — confirms responsive breakpoint issue").`;

  return `# Category: ${ANALYSIS_CATEGORY} | Skills: [] | Background: true | Batch: ${batchIndex} of ${totalBatches}

TASK: Analyze screenshots of the ${route.name} page (${route.path}) for visual QA issues.
SCREENSHOTS:
${screenshotList}

${lookAtGoals}
${comparisonBlock}${viewportFocus}
${outputFormat}

RULES:
- Be SPECIFIC. "Layout looks off" is unacceptable. "The player card grid overflows horizontally by ~50px on mobile, causing a horizontal scrollbar" is acceptable.
- CRITICAL = broken/unusable. WARNING = degraded but functional. INFO = minor polish.
- If a screenshot shows a login page instead of the expected route, note it as "UNAUTHENTICATED — showing login redirect, not actual page content."
- If a screenshot shows skeleton/shimmer loading placeholders instead of real content, classify it as "LOADING STATE — captured before data loaded" at INFO severity. Skeleton states are transient and NOT visual bugs. Still report any layout issues visible in the skeleton structure (overflow, overlap, broken stacking) at their appropriate severity.
- Do NOT suggest fixes. Detection and reporting only.
`;
}

// ---------------------------------------------------------------------------
// Batch helper
// ---------------------------------------------------------------------------

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function main(routeFilter?: string): Promise<void> {
  console.log('📝 Generate Prompts\n');

  const { manifest } = loadRunMetadata(getArg('manifest'));
  let allRoutes = [...manifest.routes.public, ...manifest.routes.protected];

  if (routeFilter) {
    const normalized = routeFilter.startsWith('/') ? routeFilter : `/${routeFilter}`;
    allRoutes = allRoutes.filter((r) => r.path === normalized);
    if (allRoutes.length === 0) {
      throw new Error(`Route "${routeFilter}" not found in manifest.`);
    }
    console.log(`  Route filter: ${normalized}\n`);
  }
  const viewports = manifest.viewports ?? VIEWPORTS;

  console.log(
    `  Routes:     ${allRoutes.length} (${manifest.routes.public.length} public, ${manifest.routes.protected.length} protected)`,
  );

  // Create output directory
  fs.mkdirSync(GENERATED_PROMPTS_DIR, { recursive: true });

  let fileCount = 0;

  // --- Analysis prompts (batched) ---

  const batches = chunkArray(allRoutes, ANALYSIS_BATCH_SIZE);
  const totalBatches = batches.length;

  interface BatchEntry {
    batch: number;
    routes: string[];
    prompts: string[];
  }
  const batchEntries: BatchEntry[] = [];

  for (let bi = 0; bi < batches.length; bi++) {
    const batch = batches[bi];
    const batchNum = bi + 1;
    const batchRouteNames: string[] = [];
    const batchPromptFiles: string[] = [];

    for (const route of batch) {
      const hasPrevious = fs.existsSync(path.join(PREVIOUS_DIR, route.dirName));
      const promptContent = generateAnalysisPrompt(route, viewports, batchNum, totalBatches, hasPrevious);
      const fileName = `${route.dirName}-analysis-prompt.txt`;

      fs.writeFileSync(path.join(GENERATED_PROMPTS_DIR, fileName), promptContent);
      fileCount++;
      console.log(`  ✓ ${fileName}${hasPrevious ? ' (with previous-run comparison)' : ''}`);

      batchRouteNames.push(route.dirName);
      batchPromptFiles.push(fileName);
    }

    batchEntries.push({
      batch: batchNum,
      routes: batchRouteNames,
      prompts: batchPromptFiles,
    });
  }

  // --- Batch manifest ---

  const batchManifest = {
    batchSize: ANALYSIS_BATCH_SIZE,
    batches: batchEntries,
    recommendedCategory: ANALYSIS_CATEGORY,
  };

  const manifestFile = 'batch-manifest.json';
  fs.writeFileSync(
    path.join(GENERATED_PROMPTS_DIR, manifestFile),
    JSON.stringify(batchManifest, null, 2) + '\n',
  );
  fileCount++;
  console.log(`  ✓ ${manifestFile}`);

  console.log(
    `\n✅ Generated ${fileCount} files in ${GENERATED_PROMPTS_DIR}/` +
      ` (${allRoutes.length} analysis + 1 manifest)`,
  );
}

// Run when invoked directly
if (import.meta.main) {
  main().catch((err) => {
    console.error('❌ Prompt generation failed:', err);
    process.exit(1);
  });
}

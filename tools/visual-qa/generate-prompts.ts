/**
 * Hydrated prompt file generator with batching
 *
 * Reads a manifest (from --manifest or screenshots/.run-metadata.json),
 * then generates:
 *   - 2 capture prompts (public + protected)
 *   - 1 analysis prompt per route (10 total for default routes)
 *   - batch-manifest.json with routing metadata
 *
 * Usage:
 *   bun tools/visual-qa/generate-prompts.ts [--manifest <path>]
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import type { Manifest, Route, Viewport, RunMetadata } from './types';
import {
  GENERATED_PROMPTS_DIR,
  VIEWPORTS,
  BASE_URL,
  ANALYSIS_BATCH_SIZE,
  ANALYSIS_CATEGORY,
  CAPTURE_CATEGORY,
  SCREENSHOTS_DIR,
  PREVIOUS_DIR,
  METADATA_FILE,
  AUTH_STATE_FILE,
} from './config';

// ---------------------------------------------------------------------------
// CLI arg parsing
// ---------------------------------------------------------------------------

function parseArgs(): { manifestPath?: string } {
  const args = process.argv.slice(2);
  let manifestPath: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--manifest' && args[i + 1]) {
      manifestPath = args[i + 1];
      i++;
    }
  }

  return { manifestPath };
}

// ---------------------------------------------------------------------------
// Manifest loading
// ---------------------------------------------------------------------------

function loadManifest(manifestPath?: string): Manifest {
  if (manifestPath) {
    const raw = fs.readFileSync(manifestPath, 'utf-8');
    return JSON.parse(raw) as Manifest;
  }

  // Fall back to run-metadata written by setup.ts
  if (!fs.existsSync(METADATA_FILE)) {
    throw new Error(
      `No manifest found at ${METADATA_FILE}. Run setup.ts first or provide --manifest <path>.`,
    );
  }

  const raw = fs.readFileSync(METADATA_FILE, 'utf-8');
  const metadata = JSON.parse(raw) as RunMetadata;
  return metadata.manifest;
}

// ---------------------------------------------------------------------------
// Template: Public capture prompt
// ---------------------------------------------------------------------------

function generatePublicCapturePrompt(routes: Route[], viewports: Viewport[]): string {
  const routeList = routes
    .map((r, i) => `  ${i + 1}. ${r.name.padEnd(16)} — path: ${r.path.padEnd(18)} — output: ${SCREENSHOTS_DIR}/${r.dirName}/`)
    .join('\n');

  const viewportSteps = viewports
    .map((v, vi) => {
      const label = vi === 0 ? 'a' : vi === 1 ? 'b' : 'c';
      const upper = v.name.toUpperCase();
      const nav = vi === 0 ? `agent-browser open {BASE_URL}{PATH}` : `agent-browser reload`;
      const getUrl = vi === 0 ? `\n      agent-browser get url` : '';
      return `   ${label}) ${upper} (${v.width}x${v.height}):
      agent-browser set viewport ${v.width} ${v.height}
      ${nav}
      agent-browser wait --load networkidle
      agent-browser wait 500${getUrl}
      agent-browser screenshot ${SCREENSHOTS_DIR}/{DIR_NAME}/${v.fileName} --full`.trim();
    })
    .join('\n\n');

  return `# Category: ${CAPTURE_CATEGORY} | Skills: agent-browser | Background: false

TASK: Screenshot ALL public routes at all ${viewports.length} viewports in a single browser session.
BASE_URL: ${BASE_URL}

ROUTES (process in this order):
${routeList}

STEPS:
1. Open the browser:
   agent-browser open ${BASE_URL}
   agent-browser wait --load networkidle

2. For EACH route listed above, do the following (keep the same browser session open):

${viewportSteps.replace(/\{BASE_URL\}/g, BASE_URL).replace(/\{PATH\}/g, '{PATH}').replace(/\{DIR_NAME\}/g, '{DIR_NAME}')}

   Then move to the next route. Do NOT close the browser between routes.

3. After ALL ${routes.length} routes are captured, close the browser:
   agent-browser close

READINESS CHECKS:
- After networkidle, wait 500ms for animations/hydration to settle.
- After each screenshot, verify the file was created.

ERROR HANDLING:
- If a page fails to load, screenshot whatever is shown (error state) and continue to the next route.
- If a screenshot command fails, retry once. If it fails again, report the error and continue.
- Do NOT stop on a single route failure — complete all ${routes.length} routes.

OUTPUT: For each route, report:
- Which screenshots were saved (file paths)
- Final URL for each viewport
- Any errors encountered
Format as a per-route summary so the orchestrator can verify each route independently.
`;
}

// ---------------------------------------------------------------------------
// Template: Protected capture prompt
// ---------------------------------------------------------------------------

function generateProtectedCapturePrompt(routes: Route[], viewports: Viewport[]): string {
  const routeList = routes
    .map((r, i) => `  ${i + 1}. ${r.name.padEnd(20)} — path: ${r.path.padEnd(14)} — output: ${SCREENSHOTS_DIR}/${r.dirName}/`)
    .join('\n');

  const viewportSteps = viewports
    .map((v, vi) => {
      const label = vi === 0 ? 'a' : vi === 1 ? 'b' : 'c';
      const upper = v.name.toUpperCase();
      return `   ${label}) ${upper} (${v.width}x${v.height}):
      agent-browser set viewport ${v.width} ${v.height}
      agent-browser open ${BASE_URL}{PATH}
      agent-browser wait --load networkidle
      agent-browser wait 500
      agent-browser get url
      agent-browser screenshot ${SCREENSHOTS_DIR}/{DIR_NAME}/${v.fileName} --full`;
    })
    .join('\n\n');

  return `# Category: ${CAPTURE_CATEGORY} | Skills: agent-browser | Background: false

TASK: Screenshot ALL protected routes at all ${viewports.length} viewports in a single authenticated browser session.
BASE_URL: ${BASE_URL}
AUTH_STATE_FILE: ${AUTH_STATE_FILE}

ROUTES (process in this order):
${routeList}

IMPORTANT: \`state load\` MUST be called BEFORE any \`open\` command. It launches
a new browser context with the auth cookies/localStorage injected. If the browser
is already running, \`state load\` will error.

STEPS:
1. Load auth state (this launches the browser with auth cookies injected):
   agent-browser state load ${AUTH_STATE_FILE}

2. Verify auth by navigating to the first route:
   agent-browser open ${BASE_URL}${routes[0]?.path ?? '/dashboard'}
   agent-browser wait --load networkidle
   agent-browser get url
   → If URL contains "/login", report AUTH_INVALID. The auth state file is expired.
     Continue capturing anyway (will screenshot login redirects for all routes).

3. For EACH route listed above, do the following (keep the same browser session open):

${viewportSteps}

   Then move to the next route. Do NOT close the browser between routes.

4. After ALL ${routes.length} routes are captured, close the browser:
   agent-browser close

AUTH VERIFICATION:
- After navigating to each route, check the URL is NOT "/login".
- If auth drops mid-run, note which route it dropped on but continue screenshotting.
- If the FIRST route (${routes[0]?.dirName ?? 'dashboard'}) redirects to /login, report AUTH_INVALID prominently —
  all subsequent routes will also fail auth.

ERROR HANDLING:
- If a page fails to load, screenshot whatever is shown and continue to the next route.
- If a screenshot command fails, retry once then report the error.
- Do NOT stop on a single route failure — complete all ${routes.length} routes.

OUTPUT: For each route, report:
- Which screenshots were saved (file paths)
- Final URL for each viewport (to detect auth redirects)
- Whether auth was maintained
- Any errors encountered
Format as a per-route summary. Flag AUTH_INVALID prominently if any route redirected to /login.
`;
}

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

export async function main(): Promise<void> {
  const { manifestPath } = parseArgs();

  console.log('📝 Generate Prompts\n');

  // Load manifest
  const manifest = loadManifest(manifestPath);
  const allRoutes = [...manifest.routes.public, ...manifest.routes.protected];
  const viewports = manifest.viewports ?? VIEWPORTS;

  console.log(
    `  Routes:     ${allRoutes.length} (${manifest.routes.public.length} public, ${manifest.routes.protected.length} protected)`,
  );

  // Create output directory
  fs.mkdirSync(GENERATED_PROMPTS_DIR, { recursive: true });

  let fileCount = 0;

  // --- Capture prompts ---

  const publicPromptFile = 'public-capture-prompt.txt';
  const publicPrompt = generatePublicCapturePrompt(manifest.routes.public, viewports);
  fs.writeFileSync(path.join(GENERATED_PROMPTS_DIR, publicPromptFile), publicPrompt);
  fileCount++;
  console.log(`  ✓ ${publicPromptFile}`);

  const protectedPromptFile = 'protected-capture-prompt.txt';
  const protectedPrompt = generateProtectedCapturePrompt(manifest.routes.protected, viewports);
  fs.writeFileSync(path.join(GENERATED_PROMPTS_DIR, protectedPromptFile), protectedPrompt);
  fileCount++;
  console.log(`  ✓ ${protectedPromptFile}`);

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
    capturePrompts: {
      public: publicPromptFile,
      protected: protectedPromptFile,
    },
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
      ` (2 capture + ${allRoutes.length} analysis + 1 manifest)`,
  );
}

// Run when invoked directly
if (import.meta.main) {
  main().catch((err) => {
    console.error('❌ Prompt generation failed:', err);
    process.exit(1);
  });
}

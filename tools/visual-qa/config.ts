/**
 * Static configuration for visual QA helper scripts
 * All constants are hardcoded (no env var overrides)
 */

import type { Viewport, AnalysisConfig } from './types.ts';

// Viewport configurations (static, not discovered)
export const VIEWPORTS: Viewport[] = [
  {
    name: 'mobile',
    width: 390,
    height: 844,
    fileName: 'mobile.png',
  },
  {
    name: 'tablet',
    width: 768,
    height: 1024,
    fileName: 'tablet.png',
  },
  {
    name: 'desktop',
    width: 1440,
    height: 900,
    fileName: 'desktop.png',
  },
];

// Route group classification
export const PROTECTED_ROUTE_GROUPS = new Set(['dashboard']);

// Root route mapping (/ → 'home')
export const ROOT_DIR_NAME_MAP: Record<string, string> = {
  '/': 'home',
};

// Base URL for screenshot capture
export const BASE_URL = 'http://localhost:3000';

// Directory paths
export const SCREENSHOTS_DIR = 'screenshots';
export const PREVIOUS_DIR = 'screenshots/.previous';
export const METADATA_FILE = 'screenshots/.run-metadata.json';
export const AUTH_STATE_FILE = '.visual-qa-auth.json';
export const GENERATED_PROMPTS_DIR = 'tools/visual-qa/generated-prompts';

// Analysis configuration
export const ANALYSIS_BATCH_SIZE = 4;
export const ANALYSIS_CATEGORY = 'multi-modal';

// Capture timing
export const CAPTURE_SETTLE_MS = 500;
export const CAPTURE_TIMEOUT_MS = 30_000;

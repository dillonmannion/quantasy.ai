/**
 * Shared TypeScript types for visual QA helper scripts
 * Used across capture, analysis, and report generation
 */

export interface Route {
  path: string;
  dirName: string;
  name: string;
  group: string;
}

export interface Viewport {
  name: string;
  width: number;
  height: number;
  fileName: string;
}

export interface AnalysisConfig {
  batchSize: number;
  recommendedCategory: string;
}

export interface Manifest {
  routes: {
    public: Route[];
    protected: Route[];
  };
  viewports: Viewport[];
  analysis: AnalysisConfig;
}

export interface RunMetadata {
  startedAt: string;
  baseUrl: string;
  manifest: Manifest;
}

export interface CaptureResult {
  route: Route;
  viewport: Viewport;
  success: boolean;
  filePath: string;
  finalUrl: string;
  error?: string;
  authFailed?: boolean;
}

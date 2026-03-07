import { captureScreenshots } from './capture-screenshots';
import { main as generatePrompts } from './generate-prompts';
import { spawnServer } from './serve';
import { getArg } from './args';

const DEFAULT_SERVE_PORT = 6969;

function timestamp(): string {
  return new Date().toISOString().slice(11, 19);
}

function log(msg: string): void {
  console.log(`[visual-qa] ${msg}`);
}

function parseServeMode(): 'dev' | 'preview' {
  const mode = getArg('serve');
  if (!mode) return 'preview';
  if (mode !== 'dev' && mode !== 'preview') {
    throw new Error(`--serve must be "dev" or "preview", got "${mode}"`);
  }
  return mode;
}

function parsePort(): number {
  const raw = getArg('port');
  if (!raw) return DEFAULT_SERVE_PORT;
  const port = parseInt(raw, 10);
  if (isNaN(port)) throw new Error(`--port must be a number, got "${raw}"`);
  return port;
}

export async function main(): Promise<void> {
  const routeFilter = getArg('route');
  const serve = parseServeMode();
  const port = parsePort();

  const server = await spawnServer(serve, port);
  const baseUrl = server.baseUrl;

  try {
    log(`Pipeline started at ${timestamp()}`);
    log(`Base URL: ${baseUrl}`);
    if (routeFilter) log(`Route filter: ${routeFilter}`);
    log(`Server mode: ${serve} (port ${port})`);
    console.log();

    log(`Phase 1/2: Capture screenshots (${timestamp()})`);
    await captureScreenshots(baseUrl, routeFilter);
    console.log();

    log(`Phase 2/2: Generating analysis prompts... (${timestamp()})`);
    await generatePrompts(routeFilter);
    console.log();

    log('Ready for analysis phase. Run: bun tools/visual-qa/verify-captures.ts');
    log(`Done! (${timestamp()})`);
  } finally {
    await server.cleanup();
  }
}

if (import.meta.main) {
  main().catch((err) => {
    console.error(`\n[visual-qa] Pipeline failed:`, err);
    process.exit(1);
  });
}

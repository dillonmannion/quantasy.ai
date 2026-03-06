import { captureScreenshots } from './capture-screenshots';
import { main as generatePrompts } from './generate-prompts';
import { spawnServer, type ServerHandle } from './serve';
import { BASE_URL } from './config';
import { getArg } from './args';

const DEFAULT_SERVE_PORT = 6969;

function timestamp(): string {
  return new Date().toISOString().slice(11, 19);
}

function log(msg: string): void {
  console.log(`[visual-qa] ${msg}`);
}

function parseServeMode(): 'dev' | 'preview' | undefined {
  const mode = getArg('serve');
  if (!mode) return undefined;
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
  const baseUrl = getArg('base-url') ?? BASE_URL;
  const routeFilter = getArg('route');
  const serve = parseServeMode();
  const port = parsePort();

  let server: ServerHandle | undefined;
  let effectiveBaseUrl = baseUrl;

  if (serve) {
    server = await spawnServer(serve, port);
    effectiveBaseUrl = server.baseUrl;
  }

  try {
    log(`Pipeline started at ${timestamp()}`);
    log(`Base URL: ${effectiveBaseUrl}`);
    if (routeFilter) log(`Route filter: ${routeFilter}`);
    if (serve) log(`Server mode: ${serve} (port ${port})`);
    console.log();

    log(`Phase 1/2: Capture screenshots (${timestamp()})`);
    await captureScreenshots(effectiveBaseUrl, routeFilter);
    console.log();

    log(`Phase 2/2: Generating analysis prompts... (${timestamp()})`);
    await generatePrompts(routeFilter);
    console.log();

    log('Ready for analysis phase. Run: bun tools/visual-qa/verify-captures.ts');
    log(`Done! (${timestamp()})`);
  } finally {
    if (server) await server.cleanup();
  }
}

if (import.meta.main) {
  main().catch((err) => {
    console.error(`\n[visual-qa] Pipeline failed:`, err);
    process.exit(1);
  });
}

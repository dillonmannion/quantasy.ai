import { spawn, execSync, type ChildProcess } from 'node:child_process';

export interface ServerHandle {
  process: ChildProcess;
  baseUrl: string;
  cleanup: () => Promise<void>;
}

const HEALTH_POLL_MS = 1_000;
const HEALTH_TIMEOUT_MS = 120_000;

async function waitForHealth(url: string): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < HEALTH_TIMEOUT_MS) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2_000) });
      if (res.ok) return;
    } catch { }
    await new Promise((r) => setTimeout(r, HEALTH_POLL_MS));
  }
  throw new Error(`Server not healthy at ${url} within ${HEALTH_TIMEOUT_MS / 1_000}s`);
}

function killProcessGroup(pid: number): void {
  try {
    process.kill(-pid, 'SIGTERM');
  } catch {
    try { process.kill(pid, 'SIGTERM'); } catch { }
  }
}

export async function spawnServer(
  mode: 'dev' | 'preview',
  port: number,
): Promise<ServerHandle> {
  const baseUrl = `http://localhost:${port}`;

  if (mode === 'preview') {
    console.log('[serve] Building production bundle...');
    execSync('pnpm build', { stdio: 'inherit' });
  }

  const cmd =
    mode === 'dev'
      ? ['dev', '--turbo', '--port', String(port)]
      : ['start', '--port', String(port)];

  console.log(`[serve] Starting ${mode} server on port ${port}...`);
  const proc = spawn('pnpm', cmd, { stdio: 'inherit', detached: true });

  proc.on('error', (err) => {
    console.error(`[serve] Process error: ${err.message}`);
  });

  let cleaned = false;
  const cleanup = async () => {
    if (cleaned || proc.killed) return;
    cleaned = true;
    killProcessGroup(proc.pid!);
    await new Promise<void>((resolve) => {
      proc.on('exit', resolve);
      setTimeout(resolve, 5_000);
    });
    console.log('[serve] Server stopped');
  };

  process.once('exit', () => { if (!cleaned) killProcessGroup(proc.pid!); });
  process.once('SIGINT', async () => { await cleanup(); process.exit(130); });
  process.once('SIGTERM', async () => { await cleanup(); process.exit(143); });

  await waitForHealth(baseUrl);
  console.log(`[serve] Server ready at ${baseUrl}`);

  return { process: proc, baseUrl, cleanup };
}

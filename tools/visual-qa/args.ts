import * as fs from 'node:fs';
import type { Manifest, RunMetadata } from './types';
import { METADATA_FILE, BASE_URL } from './config';

export function getArg(name: string, argv = process.argv.slice(2)): string | undefined {
  const idx = argv.indexOf(`--${name}`);
  return idx !== -1 && idx + 1 < argv.length ? argv[idx + 1] : undefined;
}

export function loadRunMetadata(metadataPath?: string): RunMetadata {
  const filePath = metadataPath ?? METADATA_FILE;
  if (!fs.existsSync(filePath)) {
    throw new Error(`Metadata not found: ${filePath}. Run the capture pipeline first.`);
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(raw) as RunMetadata | Manifest;

  if ('manifest' in parsed && 'startedAt' in parsed) {
    return parsed as RunMetadata;
  }

  return {
    startedAt: '',
    baseUrl: BASE_URL,
    manifest: parsed as Manifest,
  };
}

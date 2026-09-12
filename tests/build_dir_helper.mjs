import { cpSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('..', import.meta.url)));

// These specs need `npm run build:next` output; on a fresh checkout they
// skip like verify_content_delivery instead of failing on a missing dir.
export const buildMissing = !existsSync(join(root, 'build-next'))
  ? 'build-next fehlt — zuerst npm run build:next'
  : false;

export function makeBuildDir() {
  const dir = mkdtempSync(join(tmpdir(), 'ki-public-'));
  cpSync(join(root, 'build-next'), dir, { recursive: true });
  return dir;
}

export function runValidator(dir) {
  try {
    const out = execFileSync(process.execPath, [join(root, 'tools/validate_content.mjs'), '--dir', dir], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, out };
  } catch (error) {
    return { code: error.status || 1, out: `${error.stdout || ''}${error.stderr || ''}` };
  }
}

export function cleanupDir(dir) {
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
}

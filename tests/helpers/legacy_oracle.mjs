import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
export const legacyOracle = JSON.parse(
  readFileSync(join(root, 'tests/fixtures/legacy-oracle.json'), 'utf8'),
);

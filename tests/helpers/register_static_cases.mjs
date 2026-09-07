import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerStaticCases } from '../../assets/js/domain/family_registry.mjs';

const root = join(fileURLToPath(new URL('../..', import.meta.url)));
const docs = readdirSync(join(root, 'content/families'))
  .filter((name) => name.endsWith('.json'))
  .map((name) => JSON.parse(readFileSync(join(root, 'content/families', name), 'utf8')));
for (const doc of docs) registerStaticCases(doc.familyId, doc.cases);

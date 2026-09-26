import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { configureExerciseFamilies } from '../assets/js/domain/exercise_registry.mjs';
import { registerStaticCases } from '../assets/js/domain/family_registry.mjs';
import { compileContent } from '../tools/compile_content.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const familyDocs = readdirSync(join(root, 'content/families'))
  .filter((name) => name.endsWith('.json'))
  .sort()
  .map((name) => JSON.parse(readFileSync(join(root, 'content/families', name), 'utf8')));

for (const document of familyDocs) registerStaticCases(document.familyId, document.cases);
const registry = configureExerciseFamilies(familyDocs);
const registeredFamilyIds = compileContent({ projectRoot: root, profile: 'public' }).families
  .map((family) => family.familyId)
  .filter((familyId) => {
    try {
      registry.get(familyId);
      return true;
    } catch {
      return false;
    }
  })
  .sort();

const canonical = (value) => JSON.parse(JSON.stringify(value));
const sortedKeys = (value) => {
  if (Array.isArray(value)) return value.map(sortedKeys);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortedKeys(value[key])]));
};
// Seeds 0..63 plus edge seeds (negative, beyond 32 bit, max safe integer).
const SEEDS = [...Array.from({ length: 64 }, (_, seed) => seed), -1, -1000, 2 ** 31, Number.MAX_SAFE_INTEGER];
// The whole contract (minus functions and the kit handle) and every instance
// field plus the solver output are pinned: a refactor that changes a
// solution text, hint, feedback rule, grader or mastery flag fails here.
const digestFamily = (familyId) => {
  const family = registry.get(familyId);
  const { kit: _kit, ...contract } = family;
  const records = [{ contract: sortedKeys(canonical(contract)) }];
  for (const caseType of family.caseTypes) {
    const profiles = family.difficultyProfiles.filter((difficulty) => {
      try {
        registry.instantiate(familyId, 0, difficulty, caseType.caseId);
        return true;
      } catch {
        return false;
      }
    });
    for (const difficulty of profiles) {
      for (const seed of SEEDS) {
        let instance;
        try {
          instance = registry.instantiate(familyId, seed, difficulty, caseType.caseId);
        } catch (error) {
          throw new Error(`${familyId}:${caseType.caseId}:${difficulty}:${seed}: ${error.message}`);
        }
        records.push({ instance: canonical(instance), solved: canonical(family.solve(instance.parameters)) });
      }
    }
  }
  const serialized = JSON.stringify(records);
  return createHash('sha256').update(serialized).digest('hex');
};

export function familyDigests() {
  return Object.fromEntries(registeredFamilyIds.map((familyId) => [familyId, digestFamily(familyId)]));
}

if (process.argv.includes('--write-family-golden')) {
  writeFileSync(
    join(root, 'tests/fixtures/family-golden-corpus.json'),
    `${JSON.stringify({ schemaVersion: 2, families: familyDigests() }, null, 2)}\n`,
  );
}

test('family golden corpus has no behavioural differences', () => {
  const fixture = JSON.parse(readFileSync(join(root, 'tests/fixtures/family-golden-corpus.json'), 'utf8'));
  const current = familyDigests();
  const changed = Object.keys({ ...fixture.families, ...current })
    .filter((familyId) => fixture.families[familyId] !== current[familyId]);
  assert.deepEqual(changed, [], `families with changed golden digest: ${changed.join(', ')}`);
});

test('golden corpus coverage delta against canonical families is explicit', () => {
  // Die Differenz golden ↔ canonical ist bekannt und hier explizit gepinnt;
  // jede stille Drift scheitert (fehlende/überschüssige Familien).
  const canonicalIds = JSON.parse(
    readFileSync(join(root, 'tests/fixtures/canonical-families.json'), 'utf8'),
  ).families.map((family) => family.familyId).sort();
  const goldenIds = Object.keys(
    JSON.parse(readFileSync(join(root, 'tests/fixtures/family-golden-corpus.json'), 'utf8')).families,
  ).sort();
  const missing = canonicalIds.filter((familyId) => !goldenIds.includes(familyId));
  const extra = goldenIds.filter((familyId) => !canonicalIds.includes(familyId));
  assert.deepEqual(missing, [
    'reflect-error-journal-rationale',
  ], `stille Drift im Golden-Korpus, fehlend: ${missing.join(', ')}`);
  assert.deepEqual(extra, ['classify-shape-contract', 'construct-error-journal-order'], `stille Drift im Golden-Korpus, extra: ${extra.join(', ')}`);
});

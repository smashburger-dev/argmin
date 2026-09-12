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
const digestFamily = (familyId) => {
  const family = registry.get(familyId);
  const records = [];
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
      for (let seed = 0; seed < 64; seed += 1) {
        let instance;
        try {
          instance = registry.instantiate(familyId, seed, difficulty, caseType.caseId);
        } catch (error) {
          throw new Error(`${familyId}:${caseType.caseId}:${difficulty}: ${error.message}`);
        }
        records.push({
          caseId: caseType.caseId,
          difficulty,
          seed,
          prompt: canonical(instance.prompt),
          parameters: canonical(instance.parameters),
          expectedAnswer: canonical(instance.expectedAnswer),
          choices: canonical(instance.choices || null),
        });
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
    `${JSON.stringify({ schemaVersion: 1, generatedFrom: '3af6534', families: familyDigests() }, null, 2)}\n`,
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
  // Fixture: 107 Familien, canonical-families.json: 132. Die Differenz ist
  // bekannt und hier explizit gepinnt; jede stille Drift scheitert.
  const canonicalIds = JSON.parse(
    readFileSync(join(root, 'tests/fixtures/canonical-families.json'), 'utf8'),
  ).families.map((family) => family.familyId).sort();
  const goldenIds = Object.keys(
    JSON.parse(readFileSync(join(root, 'tests/fixtures/family-golden-corpus.json'), 'utf8')).families,
  ).sort();
  const missing = canonicalIds.filter((familyId) => !goldenIds.includes(familyId));
  const extra = goldenIds.filter((familyId) => !canonicalIds.includes(familyId));
  assert.deepEqual(missing, [
    'aggregate-accumulator-count', 'aggregate-majority-rule-count', 'aggregate-topk-relevance-arithmetic',
    'classify-control-construct', 'classify-error-hypothesis', 'classify-exception-placement',
    'classify-git-operation', 'classify-python-collection-choice', 'classify-set-operation-semantics',
    'classify-string-immutability', 'classify-test-attitude', 'construct-guarded-loop',
    'construct-regression-test-suite', 'construct-safe-bugfix-workflow', 'construct-test-structure-aaa',
    'count-remaining-rows-cleaning-rule', 'formula-count-from-construction', 'formula-det2-independence',
    'formula-metric-spread-range', 'optimize-backprop-path-sum', 'reflect-error-journal-rationale',
    'trace-collection-state', 'trace-dict-state-update', 'trace-exception-path',
    'transform-expression-simplify-canonical', 'transform-power-log-exponent',
  ], `stille Drift im Golden-Korpus, fehlend: ${missing.join(', ')}`);
  assert.deepEqual(extra, ['classify-shape-contract', 'construct-error-journal-order'], `stille Drift im Golden-Korpus, extra: ${extra.join(', ')}`);
});

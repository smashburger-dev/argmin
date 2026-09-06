import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DATA_ML_FAMILY_SPECS, generateCountRemainingRowsFamily, solveCountRemainingRows } from '../assets/js/core/data_ml_families.mjs';
import { genCompleteRows, genDedupRows } from '../assets/js/core/data_ml_generators.mjs';
import { EXERCISE_FAMILIES, configureExerciseFamilies } from '../assets/js/domain/exercise_registry.mjs';
import { registerStaticCases } from '../assets/js/domain/family_registry.mjs';

const root = join(new URL('..', import.meta.url).pathname);
const traceDoc = JSON.parse(readFileSync(join(root, 'content/families/trace-library-api-output.json'), 'utf8'));
registerStaticCases(traceDoc.familyId, traceDoc.cases);
configureExerciseFamilies([traceDoc]);

const seededSpec = DATA_ML_FAMILY_SPECS[0];
const cases = ['missing-target-rows', 'duplicate-rows'];
const profiles = ['intro', 'core', 'stretch'];

function expectedFromParameters(parameters) {
  if (parameters.caseId === 'missing-target-rows') return parameters.rows - parameters.missing;
  return parameters.dropKey
    ? parameters.rows - parameters.exactDups - parameters.keyConflicts
    : parameters.rows - parameters.exactDups;
}

test('data-cleaning family derives expected values independently over 200 seeds per case/profile', () => {
  for (const caseId of cases) {
    for (const difficulty of profiles) {
      for (let seed = 0; seed < 200; seed += 1) {
        const generated = seededSpec.generate({ seed, caseId, difficulty });
        assert.equal(generated.expected.value, expectedFromParameters(generated.parameters));
        assert.equal(solveCountRemainingRows(generated.parameters).value, generated.expected.value);
        if (caseId === 'missing-target-rows' && difficulty === 'intro') assert.equal(generated.parameters.framing, 'drop');
        if (caseId === 'missing-target-rows' && difficulty === 'stretch') assert.equal(generated.parameters.framing, 'rate');
        if (caseId === 'duplicate-rows' && difficulty === 'intro') {
          assert.equal(generated.parameters.dropKey, false);
          assert.equal(generated.parameters.keyConflicts, 0);
        }
        if (caseId === 'duplicate-rows' && difficulty === 'stretch') assert.equal(generated.parameters.dropKey, true);
      }
    }
  }
});

test('data-cleaning family preserves the W06 default generator answers', () => {
  assert.equal(
    generateCountRemainingRowsFamily({
      seed: 6001,
      caseId: 'missing-target-rows',
      difficulty: 'core',
    }).expected.value,
    genCompleteRows(6001).expected,
  );
  assert.equal(
    generateCountRemainingRowsFamily({
      seed: 6002,
      caseId: 'duplicate-rows',
      difficulty: 'core',
    }).expected.value,
    genDedupRows(6002).expected,
  );
});

test('predict-output data-cleaning case grades through the real registry path', async () => {
  const instance = EXERCISE_FAMILIES.instantiate(
    'trace-library-api-output',
    0,
    'core',
    'pandas-dedup-isna-lines',
  );
  assert.deepEqual(instance.expectedAnswer, { kind: 'output-lines', output: '3\n1' });
  assert.equal((await EXERCISE_FAMILIES.grade(instance, '3\n1')).correct, true);
  assert.equal((await EXERCISE_FAMILIES.grade(instance, '3\n2')).correct, false);
});

test('data-cleaning family corpus matches its fixture', () => {
  const fixture = JSON.parse(readFileSync(join(root, 'tests/fixtures/data-ml-family-golden-corpus.json'), 'utf8'));
  const instances = [];
  for (const caseId of cases) {
    for (const difficulty of profiles) {
      for (let seed = fixture.seedRange[0]; seed <= fixture.seedRange[1]; seed += 1) {
        instances.push(generateCountRemainingRowsFamily({ seed, caseId, difficulty }));
      }
    }
  }
  const digest = createHash('sha256').update(instances.map(JSON.stringify).join('\n')).digest('hex');
  assert.equal(digest, fixture.digest);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DATA_ML_FAMILY_SPECS,
  generateCountRemainingRowsFamily,
  generateMseGradientClosedFormFamily,
  generateFormulaRatioPercentMetricFamily,
  solveCountRemainingRows,
  solveMseGradientClosedForm,
  solveFormulaRatioPercentMetric,
} from '../assets/js/core/data_ml_families.mjs';
import { genCompleteRows, genDedupRows, genMseGradient } from '../assets/js/core/data_ml_generators.mjs';
import { EXERCISE_FAMILIES, configureExerciseFamilies } from '../assets/js/domain/exercise_registry.mjs';
import { registerStaticCases } from '../assets/js/domain/family_registry.mjs';

const root = join(new URL('..', import.meta.url).pathname);
const traceDoc = JSON.parse(readFileSync(join(root, 'content/families/trace-library-api-output.json'), 'utf8'));
const traceAssignmentDoc = JSON.parse(readFileSync(join(root, 'content/families/trace-assignment-state.json'), 'utf8'));
const gradientUpdateDoc = JSON.parse(readFileSync(join(root, 'content/families/optimize-gradient-update-rule.json'), 'utf8'));
const mseGradientDoc = JSON.parse(readFileSync(join(root, 'content/families/optimize-mse-gradient-closed-form.json'), 'utf8'));
registerStaticCases(traceDoc.familyId, traceDoc.cases);
registerStaticCases(traceAssignmentDoc.familyId, traceAssignmentDoc.cases);
registerStaticCases(gradientUpdateDoc.familyId, gradientUpdateDoc.cases);
registerStaticCases(mseGradientDoc.familyId, mseGradientDoc.cases);
const familyDocs = [
  traceDoc,
  traceAssignmentDoc,
  gradientUpdateDoc,
  mseGradientDoc,
  JSON.parse(readFileSync(join(root, 'content/families/classify-confounding.json'), 'utf8')),
  JSON.parse(readFileSync(join(root, 'content/families/formula-descriptive-stats-numpy.json'), 'utf8')),
  JSON.parse(readFileSync(join(root, 'content/families/aggregate-grouped-metrics-report.json'), 'utf8')),
];
for (const doc of familyDocs.slice(1)) registerStaticCases(doc.familyId, doc.cases);
configureExerciseFamilies(familyDocs);

const seededSpec = DATA_ML_FAMILY_SPECS[0];
const cases = ['missing-target-rows', 'duplicate-rows'];
const profiles = ['intro', 'core', 'stretch'];
const conditionalCase = 'conditional-count-percent';

function expectedFromParameters(parameters) {
  if (parameters.caseId === 'missing-target-rows') return parameters.rows - parameters.missing;
  return parameters.dropKey
    ? parameters.rows - parameters.exactDups - parameters.keyConflicts
    : parameters.rows - parameters.exactDups;
}

function expectedMseGradient(parameters) {
  const { n, w, b, points } = parameters;
  return (2 / n) * points.reduce((sum, [x, y]) => sum + x * (w * x + b - y), 0);
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

test('conditional-count family derives values independently over 200 seeds per profile', () => {
  for (const difficulty of profiles) {
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = DATA_ML_FAMILY_SPECS[1].generate({ seed, caseId: conditionalCase, difficulty });
      assert.equal(generated.expected.value, solveFormulaRatioPercentMetric(generated.parameters).value);
      if (difficulty === 'intro') assert.equal(generated.parameters.direction, 'count');
      if (difficulty === 'stretch') assert.equal(generated.parameters.direction, 'percent');
    }
  }
});

test('conditional-count core preserves the canonical W07 generator', () => {
  assert.equal(
    generateFormulaRatioPercentMetricFamily({ seed: 7001, caseId: conditionalCase, difficulty: 'core' }).expected.value,
    42,
  );
});

test('MSE gradient family preserves seeded generation and independent solving', () => {
  const spec = DATA_ML_FAMILY_SPECS[2];
  for (const difficulty of profiles) {
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = spec.generate({ seed, caseId: 'mse-gradient-wrt-w', difficulty });
      assert.equal(generated.expected.value, expectedMseGradient(generated.parameters));
      assert.equal(solveMseGradientClosedForm(generated.parameters).value, generated.expected.value);
      if (difficulty === 'intro') assert.equal(generated.parameters.n, 2);
      if (difficulty === 'stretch') assert.equal(generated.parameters.n, 4);
    }
  }
  assert.equal(
    generateMseGradientClosedFormFamily({
      seed: 8001,
      caseId: 'mse-gradient-wrt-w',
      difficulty: 'core',
    }).expected.value,
    genMseGradient(8001).expected,
  );
  assert.equal(
    generateMseGradientClosedFormFamily({
      seed: 8001,
      caseId: 'mse-gradient-wrt-w',
      difficulty: 'core',
    }).expected.value,
    -20,
  );
});

test('MSE gradient static case enforces profile and competency override', () => {
  const instance = EXERCISE_FAMILIES.instantiate(
    'optimize-mse-gradient-closed-form',
    0,
    'core',
    'grad-mse-numpy-reference',
  );
  assert.deepEqual(instance.competencyIds, ['c-grad-regression', 'c-numpy-basics']);
  assert.equal(instance.parameters.packages[0], 'numpy');
  assert.throws(
    () => EXERCISE_FAMILIES.instantiate(
      'optimize-mse-gradient-closed-form',
      0,
      'stretch',
      'grad-mse-numpy-reference',
    ),
    /Unbekanntes Profil/,
  );
});

test('gradient trace static case grades through the real registry path', async () => {
  const instance = EXERCISE_FAMILIES.instantiate(
    'trace-assignment-state',
    0,
    'core',
    'gradient-loop-two-updates',
  );
  assert.deepEqual(instance.competencyIds, ['c-grad-regression', 'c-python-reading']);
  assert.equal(instance.expectedAnswer.output, '1.55 4.9');
  assert.equal(instance.traceTable, undefined);
  assert.equal((await EXERCISE_FAMILIES.grade(instance, '1.55 4.9')).correct, true);
  assert.equal((await EXERCISE_FAMILIES.grade(instance, '1.7 4.6')).correct, false);
});

test('NumPy trace grades and exposes case competency override', async () => {
  const numpy = EXERCISE_FAMILIES.instantiate(
    'trace-library-api-output',
    0,
    'core',
    'numpy-median-histogram-corrcoef',
  );
  assert.deepEqual(numpy.competencyIds, ['c-eda-viz', 'c-numpy-basics']);
  assert.equal((await EXERCISE_FAMILIES.grade(numpy, '4.5\n[1 7]\n0.97')).correct, true);
  const pandas = EXERCISE_FAMILIES.instantiate(
    'trace-library-api-output',
    0,
    'core',
    'pandas-dedup-isna-lines',
  );
  assert.deepEqual(pandas.competencyIds, ['c-pandas-cleaning', 'c-python-reading']);
});

test('conditional-count corpus matches its fixture', () => {
  const fixture = JSON.parse(readFileSync(join(root, 'tests/fixtures/data-ml-family-golden-corpus.json'), 'utf8'));
  const instances = [];
  for (const difficulty of profiles) {
    for (let seed = fixture.seedRange[0]; seed <= fixture.seedRange[1]; seed += 1) {
      instances.push(generateFormulaRatioPercentMetricFamily({ seed, caseId: conditionalCase, difficulty }));
    }
  }
  const digest = createHash('sha256').update(instances.map(JSON.stringify).join('\n')).digest('hex');
  assert.equal(digest, fixture.families['formula-ratio-percent-metric'].digest);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DATA_ML_FAMILY_SPECS,
  generateAggregateMajorityRuleCountFamily,
  generateAggregateConfusionMetricFamily,
  generateFormulaMetricSpreadRangeFamily,
  generateCountRemainingRowsFamily,
  generateFormulaQuadraticErrorMetricFamily,
  generateMseGradientClosedFormFamily,
  generateFormulaRatioPercentMetricFamily,
  solveFormulaQuadraticErrorMetric,
  solveAggregateMajorityRuleCount,
  solveAggregateConfusionMetric,
  solveFormulaMetricSpreadRange,
  solveCountRemainingRows,
  solveMseGradientClosedForm,
  solveFormulaRatioPercentMetric,
} from '../assets/js/core/data_ml_families.mjs';
import {
  genBaselineCorrect,
  genConfusionCount,
  genCvSpread,
  genCompleteRows,
  genDedupRows,
  genMseFromResiduals,
  genMseGradient,
  genR2Share,
} from '../assets/js/core/data_ml_generators.mjs';
import { EXERCISE_FAMILIES, configureExerciseFamilies } from '../assets/js/domain/exercise_registry.mjs';
import { registerStaticCases } from '../assets/js/domain/family_registry.mjs';

const root = join(new URL('..', import.meta.url).pathname);
const traceDoc = JSON.parse(readFileSync(join(root, 'content/families/trace-library-api-output.json'), 'utf8'));
const traceAssignmentDoc = JSON.parse(readFileSync(join(root, 'content/families/trace-assignment-state.json'), 'utf8'));
const gradientUpdateDoc = JSON.parse(readFileSync(join(root, 'content/families/optimize-gradient-update-rule.json'), 'utf8'));
const mseGradientDoc = JSON.parse(readFileSync(join(root, 'content/families/optimize-mse-gradient-closed-form.json'), 'utf8'));
const taskTypeDoc = JSON.parse(readFileSync(join(root, 'content/families/classify-task-type.json'), 'utf8'));
const splitDoc = JSON.parse(readFileSync(join(root, 'content/families/reproduce-seeded-split.json'), 'utf8'));
const metricsDoc = JSON.parse(readFileSync(join(root, 'content/families/fit-predict-metrics.json'), 'utf8'));
const quadraticErrorDoc = JSON.parse(readFileSync(join(root, 'content/families/formula-quadratic-error-metric.json'), 'utf8'));
const confusionMetricDoc = JSON.parse(readFileSync(join(root, 'content/families/aggregate-confusion-metric.json'), 'utf8'));
const sigmoidDoc = JSON.parse(readFileSync(join(root, 'content/families/classify-sigmoid-regime.json'), 'utf8'));
const parameterOriginDoc = JSON.parse(readFileSync(join(root, 'content/families/classify-parameter-origin.json'), 'utf8'));
const cvLeakageDoc = JSON.parse(readFileSync(join(root, 'content/families/classify-cv-leakage.json'), 'utf8'));
const leakageAuditDoc = JSON.parse(readFileSync(join(root, 'content/families/validate-leakage-rule-audit.json'), 'utf8'));
registerStaticCases(traceDoc.familyId, traceDoc.cases);
registerStaticCases(traceAssignmentDoc.familyId, traceAssignmentDoc.cases);
registerStaticCases(gradientUpdateDoc.familyId, gradientUpdateDoc.cases);
registerStaticCases(mseGradientDoc.familyId, mseGradientDoc.cases);
registerStaticCases(taskTypeDoc.familyId, taskTypeDoc.cases);
registerStaticCases(splitDoc.familyId, splitDoc.cases);
registerStaticCases(metricsDoc.familyId, metricsDoc.cases);
registerStaticCases(quadraticErrorDoc.familyId, quadraticErrorDoc.cases);
registerStaticCases(parameterOriginDoc.familyId, parameterOriginDoc.cases);
registerStaticCases(cvLeakageDoc.familyId, cvLeakageDoc.cases);
registerStaticCases(leakageAuditDoc.familyId, leakageAuditDoc.cases);
const familyDocs = [
  traceDoc,
  traceAssignmentDoc,
  gradientUpdateDoc,
  mseGradientDoc,
  taskTypeDoc,
  splitDoc,
  metricsDoc,
  quadraticErrorDoc,
  confusionMetricDoc,
  sigmoidDoc,
  JSON.parse(readFileSync(join(root, 'content/families/classify-confounding.json'), 'utf8')),
  JSON.parse(readFileSync(join(root, 'content/families/formula-descriptive-stats-numpy.json'), 'utf8')),
  JSON.parse(readFileSync(join(root, 'content/families/aggregate-grouped-metrics-report.json'), 'utf8')),
  parameterOriginDoc,
  cvLeakageDoc,
  leakageAuditDoc,
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

test('majority baseline family preserves seeded generation and profile predicates', () => {
  const spec = DATA_ML_FAMILY_SPECS[3];
  for (const difficulty of profiles) {
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = spec.generate({ seed, caseId: 'majority-baseline-errors', difficulty });
      const counts = [...generated.parameters.counts].sort((a, b) => b - a);
      assert.equal(
        generated.expected.value,
        counts.reduce((sum, count) => sum + count, 0) - counts[0],
      );
      assert.equal(
        solveAggregateMajorityRuleCount(generated.parameters).value,
        generated.expected.value,
      );
      if (difficulty === 'intro') assert.ok(counts[0] >= 2 * counts[1]);
      if (difficulty === 'stretch') assert.ok(counts[0] - counts[1] <= 10);
    }
  }
  assert.equal(
    generateAggregateMajorityRuleCountFamily({
      seed: 9001,
      caseId: 'majority-baseline-errors',
      difficulty: 'core',
    }).expected.value,
    genBaselineCorrect(9001).expected,
  );
  assert.equal(
    generateAggregateMajorityRuleCountFamily({
      seed: 9001,
      caseId: 'majority-baseline-errors',
      difficulty: 'core',
    }).expected.value,
    149,
  );
});

test('majority baseline family corpus matches its fixture', () => {
  const fixture = JSON.parse(readFileSync(join(root, 'tests/fixtures/data-ml-family-golden-corpus.json'), 'utf8'));
  const instances = [];
  for (const difficulty of profiles) {
    for (let seed = fixture.seedRange[0]; seed <= fixture.seedRange[1]; seed += 1) {
      instances.push(generateAggregateMajorityRuleCountFamily({
        seed,
        caseId: 'majority-baseline-errors',
        difficulty,
      }));
    }
  }
  const digest = createHash('sha256').update(instances.map(JSON.stringify).join('\n')).digest('hex');
  assert.equal(digest, fixture.families['aggregate-majority-rule-count'].digest);
});

test('quadratic error family preserves seeded generation, profiles and solver', () => {
  const spec = DATA_ML_FAMILY_SPECS[4];
  for (const difficulty of profiles) {
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = spec.generate({ seed, caseId: 'mse-from-residuals', difficulty });
      assert.equal(
        generated.expected.value,
        generated.parameters.residuals.reduce((sum, residual) => sum + residual ** 2, 0) / generated.parameters.n,
      );
      assert.equal(
        solveFormulaQuadraticErrorMetric(generated.parameters).value,
        generated.expected.value,
      );
      if (difficulty === 'intro') assert.ok(generated.parameters.n <= 3);
      if (difficulty === 'stretch') assert.ok(generated.parameters.n >= 5);
    }
  }
  assert.equal(
    generateFormulaQuadraticErrorMetricFamily({
      seed: 10001,
      caseId: 'mse-from-residuals',
      difficulty: 'core',
    }).expected.value,
    genMseFromResiduals(10001).expected,
  );
  assert.equal(
    generateFormulaQuadraticErrorMetricFamily({
      seed: 10001,
      caseId: 'mse-from-residuals',
      difficulty: 'core',
    }).expected.value,
    31,
  );
});

test('R2 family case preserves seeded generation, profiles and solver', () => {
  for (const difficulty of profiles) {
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = DATA_ML_FAMILY_SPECS[1].generate({
        seed,
        caseId: 'r2-explained-share',
        difficulty,
      });
      assert.equal(
        generated.expected.value,
        100 - (100 * generated.parameters.ssRes) / generated.parameters.ssTot,
      );
      assert.equal(
        solveFormulaRatioPercentMetric(generated.parameters).value,
        generated.expected.value,
      );
      if (difficulty === 'intro') assert.equal(generated.parameters.phrasing, 'r2');
      if (difficulty === 'stretch') assert.equal(generated.parameters.phrasing, 'context');
    }
  }
  assert.equal(
    generateFormulaRatioPercentMetricFamily({
      seed: 10002,
      caseId: 'r2-explained-share',
      difficulty: 'core',
    }).expected.value,
    genR2Share(10002).expected,
  );
  assert.equal(
    generateFormulaRatioPercentMetricFamily({
      seed: 10002,
      caseId: 'r2-explained-share',
      difficulty: 'core',
    }).expected.value,
    84,
  );
});

test('W10 seeded family corpora match their fixtures', () => {
  const fixture = JSON.parse(readFileSync(join(root, 'tests/fixtures/data-ml-family-golden-corpus.json'), 'utf8'));
  for (const [fixtureId, generate, caseId] of [
    [
      'formula-quadratic-error-metric',
      generateFormulaQuadraticErrorMetricFamily,
      'mse-from-residuals',
    ],
    [
      'formula-ratio-percent-metric-r2',
      generateFormulaRatioPercentMetricFamily,
      'r2-explained-share',
    ],
  ]) {
    const instances = [];
    for (const difficulty of profiles) {
      for (let seed = fixture.seedRange[0]; seed <= fixture.seedRange[1]; seed += 1) {
        instances.push(generate({ seed, caseId, difficulty }));
      }
    }
    const digest = createHash('sha256').update(instances.map(JSON.stringify).join('\n')).digest('hex');
    assert.equal(digest, fixture.families[fixtureId].digest);
  }
});

test('W10 static cases enforce profiles and competency overrides', () => {
  const rmse = EXERCISE_FAMILIES.instantiate(
    'formula-quadratic-error-metric',
    0,
    'intro',
    'rmse-unit-from-mse',
  );
  assert.equal(rmse.masteryEligible, false);
  assert.deepEqual(rmse.competencyIds, ['c-ml-linear']);
  assert.throws(
    () => EXERCISE_FAMILIES.instantiate(
      'formula-quadratic-error-metric',
      0,
      'core',
      'rmse-unit-from-mse',
    ),
    /Unbekanntes Profil/,
  );
  const r2 = EXERCISE_FAMILIES.instantiate(
    'formula-ratio-percent-metric',
    10002,
    'core',
    'r2-explained-share',
  );
  assert.deepEqual(r2.competencyIds, ['c-ml-linear']);
  const fit = EXERCISE_FAMILIES.instantiate(
    'fit-predict-metrics',
    0,
    'core',
    'linear-fit-lstsq',
  );
  assert.deepEqual(fit.competencyIds, ['c-ml-linear', 'c-numpy-basics']);
  const report = EXERCISE_FAMILIES.instantiate(
    'fit-predict-metrics',
    0,
    'stretch',
    'regression-report',
  );
  assert.deepEqual(report.competencyIds, ['c-ml-linear']);
});

test('confusion metric family preserves seeded generation, profiles and solver', () => {
  const spec = DATA_ML_FAMILY_SPECS.find((item) => item.familyId === 'aggregate-confusion-metric');
  for (const difficulty of profiles) {
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = spec.generate({
        seed,
        caseId: 'confusion-marginal-count',
        difficulty,
      });
      const { metric, tp, fp, fn, tn } = generated.parameters;
      const expected = metric === 'actual-neg'
        ? tn + fp
        : metric === 'predicted-pos'
          ? tp + fp
          : tp + fn;
      assert.equal(generated.expected.value, expected);
      assert.equal(solveAggregateConfusionMetric(generated.parameters).value, expected);
      if (difficulty === 'intro') assert.equal(metric, 'predicted-pos');
      if (difficulty === 'stretch') assert.equal(metric, 'actual-neg');
    }
  }
  assert.equal(
    generateAggregateConfusionMetricFamily({
      seed: 11001,
      caseId: 'confusion-marginal-count',
      difficulty: 'core',
    }).expected.value,
    genConfusionCount(11001).expected,
  );
  assert.equal(
    generateAggregateConfusionMetricFamily({
      seed: 11001,
      caseId: 'confusion-marginal-count',
      difficulty: 'core',
    }).expected.value,
    117,
  );
});

test('W11 static cases enforce profiles and logistic competency', () => {
  const sigmoid = EXERCISE_FAMILIES.instantiate(
    'classify-sigmoid-regime',
    0,
    'intro',
    'sigmoid-large-z',
  );
  assert.equal(sigmoid.masteryEligible, false);
  assert.deepEqual(sigmoid.competencyIds, ['c-ml-logistic']);
  assert.throws(
    () => EXERCISE_FAMILIES.instantiate(
      'classify-sigmoid-regime',
      0,
      'core',
      'sigmoid-large-z',
    ),
    /Unbekanntes Profil/,
  );
  for (const [caseId, difficulty] of [
    ['threshold-under-asymmetric-cost', 'core'],
    ['sigmoid-predict-numpy', 'core'],
    ['confusion-cost-report', 'stretch'],
  ]) {
    const instance = EXERCISE_FAMILIES.instantiate(
      'aggregate-confusion-metric',
      0,
      difficulty,
      caseId,
    );
    assert.deepEqual(instance.competencyIds, ['c-ml-logistic']);
    assert.throws(
      () => EXERCISE_FAMILIES.instantiate(
        'aggregate-confusion-metric',
        0,
        difficulty === 'core' ? 'stretch' : 'core',
        caseId,
      ),
      /Unbekanntes Profil/,
    );
  }
});

test('W11 seeded confusion corpus matches its fixture', () => {
  const fixture = JSON.parse(readFileSync(join(root, 'tests/fixtures/data-ml-family-golden-corpus.json'), 'utf8'));
  const instances = [];
  for (const difficulty of profiles) {
    for (let seed = fixture.seedRange[0]; seed <= fixture.seedRange[1]; seed += 1) {
      instances.push(generateAggregateConfusionMetricFamily({
        seed,
        caseId: 'confusion-marginal-count',
        difficulty,
      }));
    }
  }
  const digest = createHash('sha256').update(instances.map(JSON.stringify).join('\n')).digest('hex');
  assert.equal(digest, fixture.families['aggregate-confusion-metric'].digest);
});

test('CV spread family preserves seeded generation, profiles and solver', () => {
  const spec = DATA_ML_FAMILY_SPECS.find((item) => item.familyId === 'formula-metric-spread-range');
  for (const difficulty of profiles) {
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = spec.generate({
        seed,
        caseId: 'cv-fold-accuracy-spread',
        difficulty,
      });
      const expected = Math.max(...generated.parameters.scores) - Math.min(...generated.parameters.scores);
      assert.equal(generated.expected.value, expected);
      assert.equal(solveFormulaMetricSpreadRange(generated.parameters).value, expected);
      if (difficulty === 'intro') assert.equal(generated.parameters.k, 4);
      if (difficulty === 'stretch') assert.equal(generated.parameters.k, 10);
    }
  }
  assert.equal(
    generateFormulaMetricSpreadRangeFamily({
      seed: 12001,
      caseId: 'cv-fold-accuracy-spread',
      difficulty: 'core',
    }).expected.value,
    genCvSpread(12001).expected,
  );
  assert.equal(
    generateFormulaMetricSpreadRangeFamily({
      seed: 12001,
      caseId: 'cv-fold-accuracy-spread',
      difficulty: 'core',
    }).expected.value,
    32,
  );
});

test('W12 static cases enforce profiles and competency overrides', () => {
  const parameterOrigin = EXERCISE_FAMILIES.instantiate(
    'classify-parameter-origin',
    0,
    'intro',
    'hyperparameter-vs-parameter',
  );
  assert.equal(parameterOrigin.masteryEligible, false);
  assert.deepEqual(parameterOrigin.competencyIds, ['c-ml-cv']);
  assert.throws(
    () => EXERCISE_FAMILIES.instantiate(
      'classify-parameter-origin',
      0,
      'core',
      'hyperparameter-vs-parameter',
    ),
    /Unbekanntes Profil/,
  );
  const leakage = EXERCISE_FAMILIES.instantiate(
    'classify-cv-leakage',
    0,
    'core',
    'impute-before-split',
  );
  assert.equal(leakage.masteryEligible, true);
  assert.deepEqual(leakage.competencyIds, ['c-ml-cv']);
  const kfold = EXERCISE_FAMILIES.instantiate(
    'reproduce-seeded-split',
    0,
    'core',
    'kfold-indices-numpy',
  );
  assert.deepEqual(kfold.competencyIds, ['c-ml-cv', 'c-numpy-basics']);
  assert.equal(kfold.parameters.packages[0], 'numpy');
  const audit = EXERCISE_FAMILIES.instantiate(
    'validate-leakage-rule-audit',
    0,
    'stretch',
    'pipeline-leakage-audit',
  );
  assert.deepEqual(audit.competencyIds, ['c-ml-cv']);
  for (const [familyId, caseId, difficulty, wrongDifficulty] of [
    ['classify-cv-leakage', 'impute-before-split', 'core', 'stretch'],
    ['reproduce-seeded-split', 'kfold-indices-numpy', 'core', 'stretch'],
    ['validate-leakage-rule-audit', 'pipeline-leakage-audit', 'stretch', 'core'],
  ]) {
    assert.throws(
      () => EXERCISE_FAMILIES.instantiate(familyId, 0, wrongDifficulty, caseId),
      /Unbekanntes Profil/,
    );
    assert.ok(difficulty);
  }
});

test('W12 seeded CV spread corpus matches its fixture', () => {
  const fixture = JSON.parse(readFileSync(join(root, 'tests/fixtures/data-ml-family-golden-corpus.json'), 'utf8'));
  const instances = [];
  for (const difficulty of profiles) {
    for (let seed = fixture.seedRange[0]; seed <= fixture.seedRange[1]; seed += 1) {
      instances.push(generateFormulaMetricSpreadRangeFamily({
        seed,
        caseId: 'cv-fold-accuracy-spread',
        difficulty,
      }));
    }
  }
  const digest = createHash('sha256').update(instances.map(JSON.stringify).join('\n')).digest('hex');
  assert.equal(digest, fixture.families['formula-metric-spread-range'].digest);
});

test('sklearn trace case grades and exposes the ML-baseline competency override', async () => {
  const instance = EXERCISE_FAMILIES.instantiate(
    'trace-library-api-output',
    0,
    'core',
    'sklearn-split-no-shuffle',
  );
  assert.deepEqual(instance.competencyIds, ['c-ml-baseline', 'c-python-reading']);
  assert.equal((await EXERCISE_FAMILIES.grade(instance, '[7, 8, 9]')).correct, true);
  assert.equal((await EXERCISE_FAMILIES.grade(instance, '[0, 1, 2]')).correct, false);
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

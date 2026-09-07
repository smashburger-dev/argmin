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
  generateFormulaCountFromConstructionFamily,
  generateOptimizeBackpropPathSumFamily,
  solveFormulaQuadraticErrorMetric,
  solveAggregateMajorityRuleCount,
  solveAggregateConfusionMetric,
  solveFormulaMetricSpreadRange,
  solveCountRemainingRows,
  solveMseGradientClosedForm,
  solveFormulaRatioPercentMetric,
  solveFormulaCountFromConstruction,
  solveOptimizeBackpropPathSum,
} from '../assets/js/core/data_ml_families.mjs';
import {
  genBaselineCorrect,
  genConfusionCount,
  genCvSpread,
  genCompleteRows,
  genDedupRows,
  genEnsembleAccuracy,
  genMseFromResiduals,
  genMseGradient,
  genPcaVariancePercent,
  genSeedSpread,
  genR2Share,
  genShrinkagePercent,
  genSubgroupGapPp,
} from '../assets/js/core/data_ml_generators.mjs';
import {
  genBackpropChain,
  genDropoutCount,
  genLinearParamCount,
  genSgdSteps,
} from '../assets/js/core/deep_learning_generators.mjs';
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
const fairnessAggregationDoc = JSON.parse(readFileSync(join(root, 'content/families/classify-fairness-aggregation.json'), 'utf8'));
const errorDriftDoc = JSON.parse(readFileSync(join(root, 'content/families/classify-error-drift.json'), 'utf8'));
const groupedMetricsDoc = JSON.parse(readFileSync(join(root, 'content/families/aggregate-grouped-metrics-report.json'), 'utf8'));
const regularizerEffectDoc = JSON.parse(readFileSync(join(root, 'content/families/classify-regularizer-effect.json'), 'utf8'));
const ridgeLassoDoc = JSON.parse(readFileSync(join(root, 'content/families/formula-ridge-lasso-closed-form.json'), 'utf8'));
const ensembleEffectDoc = JSON.parse(readFileSync(join(root, 'content/families/classify-ensemble-effect.json'), 'utf8'));
const treeSplitDoc = JSON.parse(readFileSync(join(root, 'content/families/optimize-tree-best-split.json'), 'utf8'));
const ensembleComparisonDoc = JSON.parse(readFileSync(join(root, 'content/families/construct-ensemble-predictor-comparison.json'), 'utf8'));
const svmMarginDoc = JSON.parse(readFileSync(join(root, 'content/families/classify-svm-margin.json'), 'utf8'));
const supervisionScalingDoc = JSON.parse(readFileSync(join(root, 'content/families/classify-supervision-scaling.json'), 'utf8'));
const pcaKmeansDoc = JSON.parse(readFileSync(join(root, 'content/families/fit-pca-kmeans-pipeline.json'), 'utf8'));
const reproContractDoc = JSON.parse(readFileSync(join(root, 'content/families/classify-repro-contract.json'), 'utf8'));
const reproReportDoc = JSON.parse(readFileSync(join(root, 'content/families/reproduce-seeded-experiment-report.json'), 'utf8'));
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
registerStaticCases(fairnessAggregationDoc.familyId, fairnessAggregationDoc.cases);
registerStaticCases(errorDriftDoc.familyId, errorDriftDoc.cases);
registerStaticCases(groupedMetricsDoc.familyId, groupedMetricsDoc.cases);
registerStaticCases(regularizerEffectDoc.familyId, regularizerEffectDoc.cases);
registerStaticCases(ridgeLassoDoc.familyId, ridgeLassoDoc.cases);
registerStaticCases(ensembleEffectDoc.familyId, ensembleEffectDoc.cases);
registerStaticCases(treeSplitDoc.familyId, treeSplitDoc.cases);
registerStaticCases(ensembleComparisonDoc.familyId, ensembleComparisonDoc.cases);
registerStaticCases(svmMarginDoc.familyId, svmMarginDoc.cases);
registerStaticCases(supervisionScalingDoc.familyId, supervisionScalingDoc.cases);
registerStaticCases(pcaKmeansDoc.familyId, pcaKmeansDoc.cases);
registerStaticCases(reproContractDoc.familyId, reproContractDoc.cases);
registerStaticCases(reproReportDoc.familyId, reproReportDoc.cases);
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
  groupedMetricsDoc,
  parameterOriginDoc,
  cvLeakageDoc,
  leakageAuditDoc,
  fairnessAggregationDoc,
  errorDriftDoc,
  regularizerEffectDoc,
  ridgeLassoDoc,
  ensembleEffectDoc,
  treeSplitDoc,
  ensembleComparisonDoc,
  svmMarginDoc,
  supervisionScalingDoc,
  pcaKmeansDoc,
  reproContractDoc,
  reproReportDoc,
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








test('W17 static cases expose competency overrides and stdout trace output', () => {
  const spread = EXERCISE_FAMILIES.instantiate(
    'formula-metric-spread-range',
    17002,
    'core',
    'seed-rerun-accuracy-spread',
  );
  assert.deepEqual(spread.competencyIds, ['c-ml-repro', 'c-ml-cv']);
  const trace = EXERCISE_FAMILIES.instantiate(
    'trace-assignment-state',
    0,
    'core',
    'rng-stream-reseed-trace',
  );
  assert.deepEqual(trace.competencyIds, ['c-ml-repro', 'c-numpy-basics']);
  assert.deepEqual(trace.expectedAnswer, { kind: 'output-lines', output: '26' });
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

test('static data-ml choice cases without generators honor seeded variants', () => {
  const base = EXERCISE_FAMILIES.instantiate(
    'formula-quadratic-error-metric',
    0,
    'intro',
    'rmse-unit-from-mse',
  );
  const next = EXERCISE_FAMILIES.instantiate(
    'formula-quadratic-error-metric',
    1,
    'intro',
    'rmse-unit-from-mse',
  );
  assert.equal(base.parameters.variant, 0);
  assert.equal(next.parameters.variant, 1);
  assert.notEqual(base.prompt, next.prompt);
  assert.equal(base.choices.find((choice) => choice.correct).id, 'b');
  assert.equal(next.choices.find((choice) => choice.correct).id, 'a');
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

test('W13 static cases enforce profiles and competency overrides', () => {
  const fairness = EXERCISE_FAMILIES.instantiate(
    'classify-fairness-aggregation',
    0,
    'intro',
    'overall-accuracy-hides-subgroups',
  );
  assert.equal(fairness.masteryEligible, false);
  assert.deepEqual(fairness.competencyIds, ['c-ml-erroranalysis']);
  assert.throws(
    () => EXERCISE_FAMILIES.instantiate(
      'classify-fairness-aggregation',
      0,
      'core',
      'overall-accuracy-hides-subgroups',
    ),
    /Unbekanntes Profil/,
  );
  const drift = EXERCISE_FAMILIES.instantiate(
    'classify-error-drift',
    0,
    'core',
    'accuracy-drop-without-code-change',
  );
  assert.equal(drift.masteryEligible, true);
  assert.deepEqual(drift.competencyIds, ['c-ml-erroranalysis']);
  const gap = EXERCISE_FAMILIES.instantiate(
    'formula-ratio-percent-metric',
    13001,
    'core',
    'subgroup-error-gap-pp',
  );
  assert.deepEqual(gap.competencyIds, ['c-ml-erroranalysis']);
  for (const [caseId, difficulty] of [
    ['subgroup-error-rates-numpy', 'core'],
    ['categorize-errors-report', 'stretch'],
  ]) {
    const instance = EXERCISE_FAMILIES.instantiate(
      'aggregate-grouped-metrics-report',
      0,
      difficulty,
      caseId,
    );
    assert.deepEqual(instance.competencyIds, ['c-ml-erroranalysis']);
    assert.equal(instance.parameters.packages[0], 'numpy');
    assert.throws(
      () => EXERCISE_FAMILIES.instantiate(
        'aggregate-grouped-metrics-report',
        0,
        difficulty === 'core' ? 'stretch' : 'core',
        caseId,
      ),
      /Unbekanntes Profil/,
    );
  }
});

test('W14 static cases enforce profiles and competency overrides', () => {
  const regularizer = EXERCISE_FAMILIES.instantiate(
    'classify-regularizer-effect',
    0,
    'intro',
    'l1-vs-l2-effect',
  );
  assert.equal(regularizer.masteryEligible, false);
  assert.deepEqual(regularizer.competencyIds, ['c-ml-regularization']);
  assert.throws(
    () => EXERCISE_FAMILIES.instantiate(
      'classify-regularizer-effect',
      0,
      'core',
      'l1-vs-l2-effect',
    ),
    /Unbekanntes Profil/,
  );
  const leakage = EXERCISE_FAMILIES.instantiate(
    'classify-cv-leakage',
    0,
    'core',
    'target-encoding-leakage',
  );
  assert.equal(leakage.masteryEligible, true);
  assert.deepEqual(leakage.competencyIds, ['c-ml-regularization']);
  for (const [caseId, difficulty] of [
    ['ridge-normal-equation', 'core'],
    ['lasso-soft-threshold', 'stretch'],
  ]) {
    const instance = EXERCISE_FAMILIES.instantiate(
      'formula-ridge-lasso-closed-form',
      0,
      difficulty,
      caseId,
    );
    assert.deepEqual(instance.competencyIds, ['c-ml-regularization', 'c-numpy-basics']);
    assert.equal(instance.parameters.packages[0], 'numpy');
    assert.throws(
      () => EXERCISE_FAMILIES.instantiate(
        'formula-ridge-lasso-closed-form',
        0,
        difficulty === 'core' ? 'stretch' : 'core',
        caseId,
      ),
      /Unbekanntes Profil/,
    );
  }
});

test('W15 static cases enforce profiles and competency overrides', () => {
  const effect = EXERCISE_FAMILIES.instantiate(
    'classify-ensemble-effect',
    0,
    'intro',
    'bagging-variance-reduction',
  );
  assert.equal(effect.masteryEligible, false);
  assert.deepEqual(effect.competencyIds, ['c-ml-ensembles']);
  assert.throws(
    () => EXERCISE_FAMILIES.instantiate(
      'classify-ensemble-effect',
      0,
      'core',
      'bagging-variance-reduction',
    ),
    /Unbekanntes Profil/,
  );
  const trace = EXERCISE_FAMILIES.instantiate(
    'trace-assignment-state',
    0,
    'core',
    'tree-majority-vote-trace',
  );
  assert.equal(trace.masteryEligible, true);
  assert.deepEqual(trace.competencyIds, ['c-ml-ensembles', 'c-python-reading']);
  for (const [familyId, caseId, difficulty] of [
    ['optimize-tree-best-split', 'gini-best-binary-split', 'core'],
    ['construct-ensemble-predictor-comparison', 'voting-tree-linear-rmse', 'stretch'],
  ]) {
    const instance = EXERCISE_FAMILIES.instantiate(familyId, 0, difficulty, caseId);
    assert.deepEqual(instance.competencyIds, ['c-ml-ensembles', 'c-numpy-basics']);
    assert.equal(instance.parameters.packages[0], 'numpy');
    assert.throws(
      () => EXERCISE_FAMILIES.instantiate(
        familyId,
        0,
        difficulty === 'core' ? 'stretch' : 'core',
        caseId,
      ),
      /Unbekanntes Profil/,
    );
  }
});

test('W16 static cases enforce profiles and competency overrides', () => {
  const margin = EXERCISE_FAMILIES.instantiate(
    'classify-svm-margin',
    0,
    'intro',
    'hard-margin-width',
  );
  assert.equal(margin.masteryEligible, false);
  assert.deepEqual(margin.competencyIds, ['c-ml-svm-pca']);
  assert.throws(
    () => EXERCISE_FAMILIES.instantiate(
      'classify-svm-margin',
      0,
      'core',
      'hard-margin-width',
    ),
    /Unbekanntes Profil/,
  );
  const pca = EXERCISE_FAMILIES.instantiate(
    'formula-ratio-percent-metric',
    16001,
    'core',
    'pca-explained-variance-percent',
  );
  assert.deepEqual(pca.competencyIds, ['c-ml-svm-pca']);
  const supervision = EXERCISE_FAMILIES.instantiate(
    'classify-supervision-scaling',
    0,
    'core',
    'supervised-vs-unsupervised-scaling',
  );
  assert.deepEqual(supervision.competencyIds, ['c-ml-svm-pca']);
  for (const [caseId, difficulty] of [
    ['pca-eigh-projection', 'core'],
    ['standardize-pca-kmeans', 'stretch'],
  ]) {
    const instance = EXERCISE_FAMILIES.instantiate('fit-pca-kmeans-pipeline', 0, difficulty, caseId);
    assert.deepEqual(instance.competencyIds, ['c-ml-svm-pca', 'c-numpy-basics']);
    assert.equal(instance.parameters.packages[0], 'numpy');
  }
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

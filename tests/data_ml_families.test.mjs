import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { EXERCISE_FAMILIES, configureExerciseFamilies } from '../assets/js/domain/exercise_registry.mjs';
import { registerStaticCases } from '../assets/js/domain/family_registry.mjs';

const root = join(new URL('..', import.meta.url).pathname);
const familyDocs = readdirSync(join(root, 'content/families'))
  .filter((name) => name.endsWith('.json'))
  .sort()
  .map((name) => JSON.parse(readFileSync(join(root, 'content/families', name), 'utf8')));
for (const doc of familyDocs) registerStaticCases(doc.familyId, doc.cases);
configureExerciseFamilies(familyDocs);

// Jedes Element: [familyId, caseId, difficulty, competencyIds, opts]
// opts: { seed, masteryEligible, packages, wrongDifficulty, throws }
const CASES = [
  // W10
  ['formula-quadratic-error-metric', 'rmse-unit-from-mse', 'intro', ['c-ml-linear'], { masteryEligible: false, wrongDifficulty: 'core', throws: 'Unbekanntes Profil' }],
  ['formula-ratio-percent-metric', 'r2-explained-share', 'core', ['c-ml-linear'], { seed: 10002 }],
  ['fit-predict-metrics', 'linear-fit-lstsq', 'core', ['c-ml-linear', 'c-numpy-basics']],
  ['fit-predict-metrics', 'regression-report', 'stretch', ['c-ml-linear']],
  // W11
  ['classify-sigmoid-regime', 'sigmoid-large-z', 'intro', ['c-ml-logistic'], { masteryEligible: false, wrongDifficulty: 'core', throws: 'Unbekannter Fall' }],
  ['classify-sigmoid-regime', 'sigmoid-threshold', 'core', ['c-ml-logistic'], { masteryEligible: false, wrongDifficulty: 'intro', throws: 'Unbekannter Fall' }],
  ['classify-sigmoid-regime', 'sigmoid-log-odds', 'stretch', ['c-ml-logistic'], { masteryEligible: false, wrongDifficulty: 'intro', throws: 'Unbekannter Fall' }],
  ['aggregate-confusion-metric', 'threshold-under-asymmetric-cost', 'core', ['c-ml-logistic'], { wrongDifficulty: 'stretch', throws: 'Unbekanntes Profil' }],
  ['aggregate-confusion-metric', 'sigmoid-predict-numpy', 'core', ['c-ml-logistic'], { wrongDifficulty: 'stretch', throws: 'Unbekanntes Profil' }],
  ['aggregate-confusion-metric', 'confusion-cost-report', 'stretch', ['c-ml-logistic'], { wrongDifficulty: 'core', throws: 'Unbekanntes Profil' }],
  // W12
  ['classify-parameter-origin', 'hyperparameter-vs-parameter', 'intro', ['c-ml-cv'], { masteryEligible: false, wrongDifficulty: 'core', throws: 'Unbekanntes Profil' }],
  ['classify-cv-leakage', 'impute-before-split', 'core', ['c-ml-cv'], { masteryEligible: true, wrongDifficulty: 'stretch', throws: 'Unbekanntes Profil' }],
  ['reproduce-seeded-split', 'kfold-indices-numpy', 'core', ['c-ml-cv', 'c-numpy-basics'], { packages: ['numpy'], wrongDifficulty: 'stretch', throws: 'Unbekanntes Profil' }],
  ['validate-leakage-rule-audit', 'pipeline-leakage-audit', 'stretch', ['c-ml-cv'], { wrongDifficulty: 'core', throws: 'Unbekanntes Profil' }],
  // W13
  ['classify-fairness-aggregation', 'overall-accuracy-hides-subgroups', 'intro', ['c-ml-erroranalysis'], { masteryEligible: false, wrongDifficulty: 'core', throws: 'Unbekanntes Profil' }],
  ['classify-error-drift', 'accuracy-drop-without-code-change', 'core', ['c-ml-erroranalysis'], { masteryEligible: true }],
  ['formula-ratio-percent-metric', 'subgroup-error-gap-pp', 'core', ['c-ml-erroranalysis'], { seed: 13001 }],
  ['aggregate-grouped-metrics-report', 'subgroup-error-rates-numpy', 'core', ['c-ml-erroranalysis'], { packages: ['numpy'], wrongDifficulty: 'stretch', throws: 'Unbekanntes Profil|Unbekannter Fall' }],
  ['aggregate-grouped-metrics-report', 'categorize-errors-report', 'stretch', ['c-ml-erroranalysis'], { packages: ['numpy'], wrongDifficulty: 'core', throws: 'Unbekanntes Profil|Unbekannter Fall' }],
  // W14
  ['classify-regularizer-effect', 'l1-vs-l2-effect', 'intro', ['c-ml-regularization'], { masteryEligible: false, wrongDifficulty: 'core', throws: 'Unbekanntes Profil' }],
  ['classify-cv-leakage', 'target-encoding-leakage', 'core', ['c-ml-regularization'], { masteryEligible: true }],
  ['formula-ridge-lasso-closed-form', 'ridge-normal-equation', 'core', ['c-ml-regularization', 'c-numpy-basics'], { packages: ['numpy'], wrongDifficulty: 'stretch', throws: 'Unbekannter Fall' }],
  ['formula-ridge-lasso-closed-form', 'lasso-soft-threshold', 'stretch', ['c-ml-regularization', 'c-numpy-basics'], { packages: ['numpy'], wrongDifficulty: 'core', throws: 'Unbekannter Fall' }],
  // W15
  ['classify-ensemble-effect', 'bagging-variance-reduction', 'intro', ['c-ml-ensembles'], { masteryEligible: false, wrongDifficulty: 'core', throws: 'Unbekanntes Profil' }],
  ['trace-assignment-state', 'tree-majority-vote-trace', 'core', ['c-ml-ensembles', 'c-python-reading'], { masteryEligible: true }],
  ['optimize-tree-best-split', 'gini-best-binary-split', 'core', ['c-ml-ensembles', 'c-numpy-basics'], { packages: ['numpy'], wrongDifficulty: 'stretch', throws: 'Unbekannt' }],
  ['construct-ensemble-predictor-comparison', 'voting-tree-linear-rmse', 'stretch', ['c-ml-ensembles', 'c-numpy-basics'], { packages: ['numpy'], wrongDifficulty: 'core', throws: 'Unbekannt' }],
  // W16
  ['classify-svm-margin', 'hard-margin-width', 'intro', ['c-ml-svm-pca'], { masteryEligible: false, wrongDifficulty: 'core', throws: 'Unbekannter Fall' }],
  ['formula-ratio-percent-metric', 'pca-explained-variance-percent', 'core', ['c-ml-svm-pca'], { seed: 16001 }],
  ['classify-supervision-scaling', 'supervised-vs-unsupervised-scaling', 'core', ['c-ml-svm-pca']],
  ['fit-pca-kmeans-pipeline', 'pca-eigh-projection', 'core', ['c-ml-svm-pca', 'c-numpy-basics'], { packages: ['numpy'] }],
  ['fit-pca-kmeans-pipeline', 'standardize-pca-kmeans', 'stretch', ['c-ml-svm-pca', 'c-numpy-basics'], { packages: ['numpy'] }],
  // MSE gradient + W17
  ['optimize-mse-gradient-closed-form', 'grad-mse-numpy-reference', 'core', ['c-grad-regression', 'c-numpy-basics'], { packages: ['numpy'], wrongDifficulty: 'stretch', throws: 'Unbekanntes Profil' }],
  ['formula-metric-spread-range', 'seed-rerun-accuracy-spread', 'core', ['c-ml-repro', 'c-ml-cv'], { seed: 17002 }],
  ['trace-assignment-state', 'rng-stream-reseed-trace', 'core', ['c-ml-repro', 'c-numpy-basics']],
];

for (const [familyId, caseId, difficulty, competencyIds, opts = {}] of CASES) {
  test(`${familyId}/${caseId}: Profil + Kompetenz`, () => {
    const instance = EXERCISE_FAMILIES.instantiate(familyId, opts.seed ?? 0, difficulty, caseId);
    assert.deepEqual(instance.competencyIds, competencyIds);
    if (opts.masteryEligible !== undefined) assert.equal(instance.masteryEligible, opts.masteryEligible);
    if (opts.packages) assert.deepEqual(instance.parameters.packages, opts.packages);
    if (opts.wrongDifficulty) {
      assert.throws(
        () => EXERCISE_FAMILIES.instantiate(familyId, 0, opts.wrongDifficulty, caseId),
        new RegExp(opts.throws || 'Unbekannt'),
      );
    }
  });
}

test('rng-stream-reseed-trace liefert die erwartete Ausgabe', () => {
  const trace = EXERCISE_FAMILIES.instantiate('trace-assignment-state', 0, 'core', 'rng-stream-reseed-trace');
  assert.deepEqual(trace.expectedAnswer, { kind: 'output-lines', output: '26' });
});

test('static data-ml choice cases honor seeded variants', () => {
  const base = EXERCISE_FAMILIES.instantiate('formula-quadratic-error-metric', 0, 'intro', 'rmse-unit-from-mse');
  const next = EXERCISE_FAMILIES.instantiate('formula-quadratic-error-metric', 1, 'intro', 'rmse-unit-from-mse');
  assert.equal(base.parameters.variant, 0);
  assert.equal(next.parameters.variant, 1);
  assert.notEqual(base.prompt, next.prompt);
  assert.equal(base.choices.find((choice) => choice.correct).id, 'b');
  assert.equal(next.choices.find((choice) => choice.correct).id, 'a');
});

test('sklearn trace case grades and exposes the ML-baseline competency override', async () => {
  const instance = EXERCISE_FAMILIES.instantiate(
    'trace-library-api-output',
    0,
    'core',
    'sklearn-split-no-shuffle',
  );
  assert.deepEqual(instance.competencyIds, ['c-ml-baseline', 'c-python-reading']);
  assert.equal(
    (await EXERCISE_FAMILIES.grade(instance, instance.expectedAnswer.output)).correct,
    true,
  );
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
  assert.equal(
    (await EXERCISE_FAMILIES.grade(numpy, numpy.expectedAnswer.output)).correct,
    true,
  );
  assert.equal((await EXERCISE_FAMILIES.grade(numpy, '4.5\n[1 7]\n0.97')).correct, false);
  const pandas = EXERCISE_FAMILIES.instantiate(
    'trace-library-api-output',
    0,
    'core',
    'pandas-dedup-isna-lines',
  );
  assert.deepEqual(pandas.competencyIds, ['c-pandas-cleaning', 'c-python-reading']);
});

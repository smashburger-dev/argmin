// Procedural family fit-predict-metrics: the task text, starter code and
// reference solver stay fixed; the seed draws fresh target vectors, design
// matrices and experiment seeds that get appended to the curated base test
// block as literal __check lines. Expected values are asserted inline against
// np.* reference expressions (default_rng permutation for the baseline split,
// np.linalg.lstsq on a drawn design matrix for the linear cases) with the same
// tolerances as the base checks, so the grading contract cannot drift.
// Mirrors formula-descriptive-stats-numpy.mjs.

import { pyNum, pyList } from './py_test_kit.mjs';
import { makeCaseFamily } from './case_family_kit.mjs';

import { pick, randInt } from '../generator_draw_kit.mjs';
import doc from '../../../../content/families/fit-predict-metrics.json' with { type: 'json' };

const PACKAGES = ['numpy'];

const pyColumn = (values) => `[${values.map((v) => `[${pyNum(v)}]`).join(', ')}]`;

// Draw domains: integer-valued single-column design matrices and integer
// targets keep the literals short. Columns that feed a fit are redrawn until
// they carry at least two distinct values (a constant x makes the lstsq
// problem rank-deficient); the r2 target must be non-constant as well or the
// inline ss_tot would divide by zero.
function drawColumn(r, n) {
  const col = Array.from({ length: n }, () => randInt(r, -6, 10));
  if (new Set(col).size < 2) col[col.length - 1] = col[0] + 1;
  return col;
}

function drawTargets(r, n) {
  const y = Array.from({ length: n }, () => randInt(r, -15, 35));
  if (new Set(y).size < 2) y[y.length - 1] = y[0] + 1;
  return y;
}

const isIntList = (v) => Array.isArray(v) && v.length > 0 && v.every(Number.isInteger);

// Appends the seeded literal checks: every draw is concrete in the test
// string, expected values via np.* reference expressions (same tolerances as
// the base block).
function baselineChecks(entry, index) {
  const x = pyColumn(entry.X);
  const y = pyList(entry.y);
  return [
    `__X${index} = ${x}`,
    `__y${index} = ${y}`,
    `__r${index} = make_experiment(__X${index}, __y${index}, ${entry.seed})`,
    `__r${index}b = make_experiment(__X${index}, __y${index}, ${entry.seed})`,
    `__check('seeded experiment keys ${index}', isinstance(__r${index}, dict) and set(__r${index}.keys()) == {'test_indices', 'baseline_score', 'metric_name'})`,
    `__check('seeded experiment metric ${index}', __r${index}['metric_name'] == 'mse')`,
    `__check('seeded experiment deterministic ${index}', __r${index} == __r${index}b)`,
    `__perm${index} = np.random.default_rng(${entry.seed}).permutation(${entry.n})`,
    `__nt${index} = int(round(0.25 * ${entry.n}))`,
    `__check('seeded experiment indices ${index}', [int(v) for v in __r${index}['test_indices']] == sorted(int(v) for v in __perm${index}[:__nt${index}]))`,
    `__tr${index} = [int(v) for v in __perm${index}[__nt${index}:]]`,
    `__base${index} = float(np.mean([__y${index}[i] for i in __tr${index}]))`,
    `__exp${index} = float(np.mean([(__y${index}[i] - __base${index}) ** 2 for i in __r${index}['test_indices']]))`,
    `__check('seeded experiment mse ${index}', abs(float(__r${index}['baseline_score']) - __exp${index}) < 1e-9)`,
  ].join('\n');
}

function lstsqChecks(entry, index) {
  const x = pyColumn(entry.X);
  const y = pyList(entry.y);
  const yv = pyList(entry.yv);
  const yh = pyList(entry.yh);
  return [
    `__X${index} = ${x}`,
    `__y${index} = ${y}`,
    `__w${index} = [float(v) for v in np.asarray(fit_linear(__X${index}, __y${index})).ravel()]`,
    `__A${index} = np.hstack([np.ones((${entry.n}, 1)), np.asarray(__X${index}, dtype=float)])`,
    `__we${index} = np.linalg.lstsq(__A${index}, np.asarray(__y${index}, dtype=float), rcond=None)[0]`,
    `__check('seeded lstsq coef ${index}', np.allclose(np.asarray(__w${index}), np.asarray([float(v) for v in np.asarray(__we${index}).ravel()]), atol=1e-8))`,
    `try:`,
    `    fit_linear(__X${index}, __y${index} + [0.0])`,
    `    __check('seeded lstsq mismatch ${index}', False, 'kein ValueError')`,
    `except ValueError:`,
    `    __check('seeded lstsq mismatch ${index}', True)`,
    `except Exception as e:`,
    `    __check('seeded lstsq mismatch ${index}', False, type(e).__name__)`,
    `__yv${index} = ${yv}`,
    `__yh${index} = ${yh}`,
    `__check('seeded rmse ${index}', abs(rmse(__yv${index}, __yh${index}) - float(np.sqrt(np.mean((np.asarray(__yv${index}, dtype=float) - np.asarray(__yh${index}, dtype=float)) ** 2)))) < 1e-9)`,
    `__check('seeded r2 ${index}', abs(r2(__yv${index}, __yh${index}) - float(1.0 - np.sum((np.asarray(__yv${index}, dtype=float) - np.asarray(__yh${index}, dtype=float)) ** 2) / np.sum((np.asarray(__yv${index}, dtype=float) - np.mean(np.asarray(__yv${index}, dtype=float))) ** 2))) < 1e-9)`,
  ].join('\n');
}

function reportChecks(entry, index) {
  const x = pyColumn(entry.X);
  const y = pyList(entry.y);
  const xt = pyColumn(entry.Xt);
  const yt = pyList(entry.yt);
  return [
    `__X${index} = ${x}`,
    `__y${index} = ${y}`,
    `__Xt${index} = ${xt}`,
    `__yt${index} = ${yt}`,
    `__rep${index} = regression_report(__X${index}, __y${index}, __Xt${index}, __yt${index})`,
    `__check('seeded report keys ${index}', set(__rep${index}.keys()) == {'coefficients', 'rmse_train', 'rmse_test', 'residuals_mean', 'residual_mean_near_zero'})`,
    `__A${index} = np.hstack([np.ones((len(__X${index}), 1)), np.asarray(__X${index}, dtype=float)])`,
    `__w${index} = np.linalg.lstsq(__A${index}, np.asarray(__y${index}, dtype=float), rcond=None)[0]`,
    `__At${index} = np.hstack([np.ones((len(__Xt${index}), 1)), np.asarray(__Xt${index}, dtype=float)])`,
    `__ptr${index} = __A${index} @ __w${index}`,
    `__pte${index} = __At${index} @ __w${index}`,
    `__check('seeded report coef ${index}', np.allclose(np.asarray([float(v) for v in np.asarray(__rep${index}['coefficients']).ravel()]), __w${index}, atol=1e-8))`,
    `__check('seeded report rmse_train ${index}', abs(float(__rep${index}['rmse_train']) - float(np.sqrt(np.mean((np.asarray(__y${index}, dtype=float) - __ptr${index}) ** 2)))) < 1e-8)`,
    `__check('seeded report rmse_test ${index}', abs(float(__rep${index}['rmse_test']) - float(np.sqrt(np.mean((np.asarray(__yt${index}, dtype=float) - __pte${index}) ** 2)))) < 1e-8)`,
    `__resm${index} = float(np.mean(np.asarray(__yt${index}, dtype=float) - __pte${index}))`,
    `__check('seeded report residmean ${index}', abs(float(__rep${index}['residuals_mean']) - __resm${index}) < 1e-8)`,
    `__check('seeded report flag ${index}', __rep${index}['residual_mean_near_zero'] == bool(abs(__resm${index}) < 1e-8))`,
    `try:`,
    `    regression_report(__X${index}, __y${index} + [0.0], __Xt${index}, __yt${index})`,
    `    __check('seeded report mismatch ${index}', False, 'kein ValueError')`,
    `except ValueError:`,
    `    __check('seeded report mismatch ${index}', True)`,
    `except Exception as e:`,
    `    __check('seeded report mismatch ${index}', False, type(e).__name__)`,
  ].join('\n');
}

export const PREDICT_METRICS_CASES = {
  'baseline-experiment-report': {
    difficulty: 'stretch',
    checks: baselineChecks,
    draw(r) {
      const n = randInt(r, 8, 20);
      return {
        n,
        X: Array.from({ length: n }, () => randInt(r, -10, 20)),
        y: drawTargets(r, n),
        seed: randInt(r, 0, 99),
      };
    },
    validEntry: (entry) =>
      !!entry &&
      Number.isInteger(entry.n) &&
      isIntList(entry.X) && entry.X.length === entry.n &&
      isIntList(entry.y) && entry.y.length === entry.n &&
      Number.isInteger(entry.seed),
    extraCount: 3,
  },
  'linear-fit-lstsq': {
    difficulty: 'core',
    competencyIds: ['c-ml-linear', 'c-numpy-basics'],
    checks: lstsqChecks,
    draw(r) {
      const n = randInt(r, 4, 8);
      const m = randInt(r, 3, 6);
      return {
        n,
        X: drawColumn(r, n),
        y: drawTargets(r, n),
        yv: drawTargets(r, m),
        yh: Array.from({ length: m }, () => randInt(r, -15, 35)),
      };
    },
    validEntry: (entry) =>
      !!entry &&
      Number.isInteger(entry.n) &&
      isIntList(entry.X) && entry.X.length === entry.n &&
      isIntList(entry.y) && entry.y.length === entry.n &&
      isIntList(entry.yv) && isIntList(entry.yh) && entry.yv.length === entry.yh.length,
    extraCount: 3,
  },
  'regression-report': {
    difficulty: 'stretch',
    competencyIds: ['c-ml-linear'],
    checks: reportChecks,
    draw(r) {
      const n = randInt(r, 4, 8);
      const m = pick(r, [2, 3]);
      return {
        X: drawColumn(r, n),
        y: drawTargets(r, n),
        Xt: Array.from({ length: m }, () => randInt(r, -6, 12)),
        yt: drawTargets(r, m),
      };
    },
    validEntry: (entry) =>
      !!entry &&
      isIntList(entry.X) && isIntList(entry.y) && entry.X.length === entry.y.length &&
      isIntList(entry.Xt) && isIntList(entry.yt) && entry.Xt.length === entry.yt.length,
    extraCount: 3,
  },
};

export const PREDICT_METRICS_CONTRACT = {
  familyId: 'fit-predict-metrics',
  familyGroup: 'fit-model',
  summary: 'Fittet ein Modell, sagt auf Testdaten voraus und berechnet die Fehlermetriken.',
  taskArchetype: 'code-tests',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'baseline-experiment-report', propertyTest: false },
    { caseId: 'linear-fit-lstsq', propertyTest: false },
    { caseId: 'regression-report', propertyTest: false },
  ],
  difficultyProfiles: ['core', 'stretch'],
  competencyIds: ['c-ml-baseline'],
};

// Capsule shape: parameters carry starterCode/tests/seedCases; tests must be
// the verbatim base block plus the seeded extras derived from seedCases.
export const FAMILY_SPEC = makeCaseFamily({
  doc,
  contract: PREDICT_METRICS_CONTRACT,
  cases: PREDICT_METRICS_CASES,
  shapeError: 'Predict-Metrics-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, _caseId, seedCases) =>
    `# seeded extra cases\n${seedCases.map((entry, i) => caseDef.checks(entry, i + 1)).join('\n\n')}`,
  defaultPackages: PACKAGES,
});


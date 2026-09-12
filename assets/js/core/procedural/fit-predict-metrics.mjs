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

const PACKAGES = ['numpy'];

const BASELINE_STARTER = `import numpy as np

def make_experiment(X, y, seed):
    # fixed test fraction 0.25 -> n_test = int(round(0.25 * n)), n = len(y)
    # test_indices: sorted int list of the first n_test permutation entries
    # model: mean of the TRAIN targets; metric: MSE on the TEST targets
    # return {'test_indices': [...], 'baseline_score': float, 'metric_name': 'mse'}
    ...
`;

const LSTSQ_STARTER = `import numpy as np

def fit_linear(X, y):
    # prepend a ones column for the intercept, then np.linalg.lstsq(A, y, rcond=None)
    # return [intercept, w1, ...] as list of float; ValueError on row mismatch
    ...

def rmse(y, yhat):
    # sqrt of the mean squared error
    ...

def r2(y, yhat):
    # 1 - ss_res / ss_tot
    ...
`;

const REPORT_STARTER = `import numpy as np

def regression_report(X, y, X_test, y_test):
    # fit on train with intercept (ones column + np.linalg.lstsq, rcond=None)
    # predict on train and test with the SAME coefficients
    # return {'coefficients': [...], 'rmse_train': float, 'rmse_test': float,
    #         'residuals_mean': float, 'residual_mean_near_zero': bool}
    # residuals_mean is the mean TEST residual; flag is abs(value) < 1e-8
    ...
`;

const BASELINE_BASE_TESTS = `import numpy as np

X9 = [[1.0], [2.0], [3.0], [4.0], [5.0], [6.0], [7.0], [8.0]]
y9 = [3.0, 5.0, 2.0, 8.0, 6.0, 4.0, 7.0, 1.0]
r1 = make_experiment(X9, y9, 5)
r2 = make_experiment(X9, y9, 5)
__check('Ergebnis ist ein dict mit genau den drei Schluesseln', isinstance(r1, dict) and set(r1.keys()) == {'test_indices', 'baseline_score', 'metric_name'})
__check('metric_name ist mse', r1['metric_name'] == 'mse')
__check('zwei Aufrufe -> identisches Ergebnis (stabil)', r1 == r2)
__check('test_indices: 2 von 8, aufsteigend sortiert', len(r1['test_indices']) == 2 and [int(v) for v in r1['test_indices']] == sorted(int(v) for v in r1['test_indices']))
perm = np.random.default_rng(5).permutation(8)
__check('test_indices = erste 2 der Seed-Permutation, sortiert', [int(v) for v in r1['test_indices']] == sorted(int(v) for v in perm[:2]))
train_idx = [int(i) for i in perm[2:]]
baseline = float(np.mean([y9[i] for i in train_idx]))
score = float(np.mean([(y9[i] - baseline) ** 2 for i in r1['test_indices']]))
__check('baseline_score = Test-MSE des Train-Mittelwerts', abs(float(r1['baseline_score']) - score) < 1e-9)
r3 = make_experiment(X9, y9, 9)
__check('anderer Seed -> andere test_indices', [int(v) for v in r3['test_indices']] != [int(v) for v in r1['test_indices']])
`;

const LSTSQ_BASE_TESTS = `import numpy as np

w = [float(v) for v in np.asarray(fit_linear([[1], [2], [3], [4]], [3, 5, 7, 9])).ravel()]
__check('exakte Gerade: Intercept 1', abs(w[0] - 1.0) < 1e-8)
__check('exakte Gerade: Steigung 2', abs(w[1] - 2.0) < 1e-8)
w2 = [float(v) for v in np.asarray(fit_linear([[1], [2], [3]], [2, 2, 5])).ravel()]
__check('Handrechnung: Intercept 0', abs(w2[0]) < 1e-8)
__check('Handrechnung: Steigung 1.5', abs(w2[1] - 1.5) < 1e-8)
__check('rmse: Wurzel aus dem mittleren Residuenquadrat', abs(rmse([1, 2], [2, 4]) - np.sqrt(2.5)) < 1e-9)
__check('rmse-Formel am Beispiel: sqrt(1.5)', abs(rmse([2, 2, 5], [2.5, 4.0, 5.5]) - np.sqrt(1.5)) < 1e-9)
__check('r2-Formel am Beispiel: 0.25', abs(r2([2, 2, 5], [2.5, 4.0, 5.5]) - 0.25) < 1e-9)
__check('perfekte Vorhersage: r2 = 1', abs(r2([1.0, 2.0, 3.0], [1.0, 2.0, 3.0]) - 1.0) < 1e-12)
yhat = [w[0] + w[1] * x for x in [1, 2, 3, 4]]
__check('fit + rmse spielen zusammen', rmse([3, 5, 7, 9], yhat) < 1e-8)
try:
    fit_linear([[1], [2]], [1, 2, 3])
    __check('ValueError bei Zeilen-Mismatch', False, 'kein ValueError geworfen')
except ValueError:
    __check('ValueError bei Zeilen-Mismatch', True)
except Exception as e:
    __check('ValueError bei Zeilen-Mismatch', False, 'falscher Fehlertyp: ' + type(e).__name__)
`;

const REPORT_BASE_TESTS = `import numpy as np

rep_a = regression_report([[1], [2], [3], [4]], [3, 5, 7, 9], [[5], [6]], [10, 14])
__check('dict mit genau den fuenf Schluesseln', set(rep_a.keys()) == {'coefficients', 'rmse_train', 'rmse_test', 'residuals_mean', 'residual_mean_near_zero'})
coef_a = [float(v) for v in np.asarray(rep_a['coefficients']).ravel()]
__check('Koeffizienten [1, 2]', abs(coef_a[0] - 1.0) < 1e-8 and abs(coef_a[1] - 2.0) < 1e-8)
__check('rmse_train ~ 0 auf der exakten Geraden', abs(float(rep_a['rmse_train'])) < 1e-8)
__check('rmse_test = 1 (Residuen -1 und +1)', abs(float(rep_a['rmse_test']) - 1.0) < 1e-8)
__check('residuals_mean = 0 -> Flag wahr', abs(float(rep_a['residuals_mean'])) < 1e-8 and rep_a['residual_mean_near_zero'] is True)
rep_b = regression_report([[1], [2], [3]], [2, 2, 5], [[4], [5]], [4, 7])
coef_b = [float(v) for v in np.asarray(rep_b['coefficients']).ravel()]
__check('zweite Anpassung: Intercept 0, Steigung 1.5', abs(coef_b[0]) < 1e-8 and abs(coef_b[1] - 1.5) < 1e-8)
__check('rmse_train = sqrt(0.5) (Vorhersagen 1.5, 3.0, 4.5)', abs(float(rep_b['rmse_train']) - np.sqrt(0.5)) < 1e-8)
__check('rmse_test = sqrt(2.125)', abs(float(rep_b['rmse_test']) - np.sqrt(2.125)) < 1e-8)
__check('residuals_mean = -1.25 -> Flag falsch', abs(float(rep_b['residuals_mean']) + 1.25) < 1e-8 and rep_b['residual_mean_near_zero'] is False)
try:
    regression_report([[1], [2]], [1, 2, 3], [[1]], [1])
    __check('ValueError bei Zeilen-Mismatch', False, 'kein ValueError geworfen')
except ValueError:
    __check('ValueError bei Zeilen-Mismatch', True)
except Exception as e:
    __check('ValueError bei Zeilen-Mismatch', False, 'falscher Fehlertyp: ' + type(e).__name__)
`;

const BASELINE_REFERENCE = `import numpy as np

def make_experiment(X, y, seed):
    '''Deterministic baseline experiment with fixed test fraction 0.25.'''
    n = len(y)
    perm = np.random.default_rng(seed).permutation(n)
    n_test = int(round(0.25 * n))
    test_indices = sorted(int(i) for i in perm[:n_test])
    train_indices = [int(i) for i in perm[n_test:]]
    baseline = float(np.mean([y[i] for i in train_indices]))
    baseline_score = float(np.mean([(y[i] - baseline) ** 2 for i in test_indices]))
    return {
        'test_indices': test_indices,
        'baseline_score': baseline_score,
        'metric_name': 'mse',
    }
`;

const LSTSQ_REFERENCE = `import numpy as np

def fit_linear(X, y):
    '''Least-squares fit with intercept via np.linalg.lstsq.'''
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    if X.ndim != 2 or X.shape[0] != y.shape[0]:
        raise ValueError('X and y must have the same number of rows')
    A = np.hstack([np.ones((X.shape[0], 1)), X])
    w, _, _, _ = np.linalg.lstsq(A, y, rcond=None)
    return [float(v) for v in w]

def rmse(y, yhat):
    y = np.asarray(y, dtype=float)
    yhat = np.asarray(yhat, dtype=float)
    return float(np.sqrt(np.mean((y - yhat) ** 2)))

def r2(y, yhat):
    y = np.asarray(y, dtype=float)
    yhat = np.asarray(yhat, dtype=float)
    ss_res = float(np.sum((y - yhat) ** 2))
    ss_tot = float(np.sum((y - np.mean(y)) ** 2))
    return float(1.0 - ss_res / ss_tot)
`;

const REPORT_REFERENCE = `import numpy as np

def regression_report(X, y, X_test, y_test):
    '''Fit on train with intercept, report train/test quality.'''
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    X_test = np.asarray(X_test, dtype=float)
    y_test = np.asarray(y_test, dtype=float)
    if X.shape[0] != y.shape[0] or X_test.shape[0] != y_test.shape[0]:
        raise ValueError('row counts of X and y must match')
    A = np.hstack([np.ones((X.shape[0], 1)), X])
    w, _, _, _ = np.linalg.lstsq(A, y, rcond=None)
    A_test = np.hstack([np.ones((X_test.shape[0], 1)), X_test])
    pred_train = A @ w
    pred_test = A_test @ w
    rmse_train = float(np.sqrt(np.mean((y - pred_train) ** 2)))
    rmse_test = float(np.sqrt(np.mean((y_test - pred_test) ** 2)))
    residuals_mean = float(np.mean(y_test - pred_test))
    return {
        'coefficients': [float(v) for v in w],
        'rmse_train': rmse_train,
        'rmse_test': rmse_test,
        'residuals_mean': residuals_mean,
        'residual_mean_near_zero': bool(abs(residuals_mean) < 1e-8),
    }
`;

const BASELINE_PROMPT = "Final Boss: Baue ein reproduzierbares Mini-Experiment. Vertrag für `make_experiment(X, y, seed)`: `n = len(y)`; `perm = np.random.default_rng(seed).permutation(n)`; fester Testanteil 0,25, also `n_test = int(round(0.25 * n))`. `test_indices` ist die aufsteigend sortierte Liste der ersten `n_test` Permutationseinträge (Liste von int). Das Modell ist die Mean-Baseline: der Mittelwert der Train-Ziele (alle übrigen Indizes). Bewerte es mit dem MSE auf den Test-Zielen. Rückgabe: `{'test_indices': [...], 'baseline_score': float, 'metric_name': 'mse'}`. Zwei Aufrufe mit denselben Argumenten müssen exakt dasselbe dict liefern. `X` geht nur über die Zeilenzahl in den Versuch ein.";

const LSTSQ_PROMPT = "Implementiere die Bewertungswerkzeuge der linearen Regression. `fit_linear(X, y)`: X ist eine Liste von Zeilen (oder 2-d-Array), y das stetige Ziel. Hänge vor die Zeilen von X eine Einsen-Spalte für den Intercept und löse mit `np.linalg.lstsq(A, y, rcond=None)`; Rückgabe ist eine Liste von floats `[intercept, w1, ...]`. Wenn X nicht 2-dimensional ist oder die Zeilenzahl nicht zu y passt, wirf `ValueError`. `rmse(y, yhat)` = Quadratwurzel des mittleren quadrierten Fehlers. `r2(y, yhat)` = 1 − SS_res/SS_tot, mit SS_tot um den Mittelwert von y. Handrechnung als Kontrolle: X = [[1],[2],[3]], y = [2, 2, 5] ergibt Intercept 0 und Steigung 1,5.";

const REPORT_PROMPT = "Final Boss: `regression_report(X, y, X_test, y_test)` fasst eine Regression zusammen. Vertrag: Fit wie in w10-e4 (Design-Matrix mit Einsen-Spalte, `np.linalg.lstsq(..., rcond=None)`) — nur auf Train. Rückgabe: dict mit `'coefficients'` (Liste `[intercept, w1, ...]`), `'rmse_train'`, `'rmse_test'`, `'residuals_mean'` (Mittelwert der TEST-Residuen) und `'residual_mean_near_zero'` (bool: `abs(residuals_mean) < 1e-8`). Bei Zeilen-Mismatch in Train oder Test wirf `ValueError`. Kontrolle: Train X = [[1],[2],[3],[4]], y = [3,5,7,9] liegt exakt auf y = 1 + 2x; Test X = [[5],[6]], y_test = [10,14] → Test-Residuen −1 und +1.";

const BASELINE_SOLUTION = `import numpy as np

def make_experiment(X, y, seed):
    '''Deterministic baseline experiment with fixed test fraction 0.25.'''
    n = len(y)
    perm = np.random.default_rng(seed).permutation(n)
    n_test = int(round(0.25 * n))
    test_indices = sorted(int(i) for i in perm[:n_test])
    train_indices = [int(i) for i in perm[n_test:]]
    baseline = float(np.mean([y[i] for i in train_indices]))
    baseline_score = float(np.mean([(y[i] - baseline) ** 2 for i in test_indices]))
    return {
        'test_indices': test_indices,
        'baseline_score': baseline_score,
        'metric_name': 'mse',
    }
`;

const LSTSQ_SOLUTION = `import numpy as np

def fit_linear(X, y):
    '''Least-squares fit with intercept via np.linalg.lstsq.'''
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    if X.ndim != 2 or X.shape[0] != y.shape[0]:
        raise ValueError('X and y must have the same number of rows')
    A = np.hstack([np.ones((X.shape[0], 1)), X])
    w, _, _, _ = np.linalg.lstsq(A, y, rcond=None)
    return [float(v) for v in w]

def rmse(y, yhat):
    y = np.asarray(y, dtype=float)
    yhat = np.asarray(yhat, dtype=float)
    return float(np.sqrt(np.mean((y - yhat) ** 2)))

def r2(y, yhat):
    y = np.asarray(y, dtype=float)
    yhat = np.asarray(yhat, dtype=float)
    ss_res = float(np.sum((y - yhat) ** 2))
    ss_tot = float(np.sum((y - np.mean(y)) ** 2))
    return float(1.0 - ss_res / ss_tot)
`;

const REPORT_SOLUTION = `import numpy as np

def regression_report(X, y, X_test, y_test):
    '''Fit on train with intercept, report train/test quality.'''
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    X_test = np.asarray(X_test, dtype=float)
    y_test = np.asarray(y_test, dtype=float)
    if X.shape[0] != y.shape[0] or X_test.shape[0] != y_test.shape[0]:
        raise ValueError('row counts of X and y must match')
    A = np.hstack([np.ones((X.shape[0], 1)), X])
    w, _, _, _ = np.linalg.lstsq(A, y, rcond=None)
    A_test = np.hstack([np.ones((X_test.shape[0], 1)), X_test])
    pred_train = A @ w
    pred_test = A_test @ w
    rmse_train = float(np.sqrt(np.mean((y - pred_train) ** 2)))
    rmse_test = float(np.sqrt(np.mean((y_test - pred_test) ** 2)))
    residuals_mean = float(np.mean(y_test - pred_test))
    return {
        'coefficients': [float(v) for v in w],
        'rmse_train': rmse_train,
        'rmse_test': rmse_test,
        'residuals_mean': residuals_mean,
        'residual_mean_near_zero': bool(abs(residuals_mean) < 1e-8),
    }
`;

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
    starterCode: BASELINE_STARTER,
    baseTests: BASELINE_BASE_TESTS,
    referenceSolver: BASELINE_REFERENCE,
    prompt: BASELINE_PROMPT,
    fullSolution: BASELINE_SOLUTION,
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
    starterCode: LSTSQ_STARTER,
    baseTests: LSTSQ_BASE_TESTS,
    referenceSolver: LSTSQ_REFERENCE,
    prompt: LSTSQ_PROMPT,
    fullSolution: LSTSQ_SOLUTION,
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
    starterCode: REPORT_STARTER,
    baseTests: REPORT_BASE_TESTS,
    referenceSolver: REPORT_REFERENCE,
    prompt: REPORT_PROMPT,
    fullSolution: REPORT_SOLUTION,
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
const FAMILY = makeCaseFamily({
  contract: PREDICT_METRICS_CONTRACT,
  cases: PREDICT_METRICS_CASES,
  shapeError: 'Predict-Metrics-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, _caseId, seedCases) =>
    `# seeded extra cases\n${seedCases.map((entry, i) => caseDef.checks(entry, i + 1)).join('\n\n')}`,
  defaultPackages: PACKAGES,
});

export const predictMetricsCaseOk = FAMILY.caseOk;
export const genPredictMetricsCase = FAMILY.genCase;
export const solvePredictMetricsFamily = FAMILY.solve;
export const generatePredictMetricsFamily = FAMILY.generate;
export const FAMILY_SPEC = FAMILY.spec;

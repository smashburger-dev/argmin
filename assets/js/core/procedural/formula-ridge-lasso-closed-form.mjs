// Procedural family formula-ridge-lasso-closed-form: the task text, starter
// code and reference solver stay fixed; the seed draws fresh design matrices,
// targets and lambda values that get appended to the curated base test block
// as literal __check lines. Expected values are asserted inline against the
// np.linalg.solve reference (or a __ref_-copy of it for the coefficient-path
// case) with the same tolerances as the base checks, so the grading contract
// cannot drift. Mirrors formula-descriptive-stats-numpy.mjs.

import { makeCaseFamily } from './case_family_kit.mjs';

import { randInt } from '../generator_draw_kit.mjs';

const PACKAGES = ['numpy'];

const CORE_STARTER = `import numpy as np

def ridge_fit(X, y, lam):
    """Return (X^T X + lam I)^-1 X^T y as ndarray; lam < 0 raises ValueError."""
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    # 1) lam pruefen, 2) geschlossene Formel mit np.linalg.solve
    ...

def lasso_1d(c, lam):
    """Return sign(c) * max(|c| - lam, 0); lam < 0 raises ValueError."""
    c = float(c)
    ...
`;

const STRETCH_STARTER = `import numpy as np

def ridge_fit(X, y, lam):
    """Return (X^T X + lam I)^-1 X^T y; lam < 0 raises ValueError."""
    ...

def coefficient_path(X, y, lams):
    """Return [{'lam': float, 'w': coefficients, 'rmse': float}, ...] in der Reihenfolge von lams."""
    for lam in lams:
        # w berechnen, Vorhersage X @ w, rmse als float
        ...
    ...
`;

const CORE_BASE_TESTS = `import numpy as np

__X = [[1, 1], [1, 2], [1, 3]]
__y = [2, 2, 4]
__check('Ridge lam=1 exakt', np.allclose(ridge_fit(__X, __y, 1.0), np.array([0.5, 1.0])))
__check('Ridge lam=0 ist OLS', np.allclose(ridge_fit(__X, __y, 0.0), np.array([2.0 / 3.0, 1.0])))
__check('Ridge schrumpft mit lambda', bool(np.all(np.abs(ridge_fit(__X, __y, 1.0)) <= np.abs(ridge_fit(__X, __y, 0.0)) + 1e-12)))
__check('Diagonalfall lam=1', np.allclose(ridge_fit([[1.0, 0.0], [0.0, 2.0]], [3.0, 4.0], 1.0), np.array([1.5, 1.6])))
__check('Lasso: c=5, lam=2', lasso_1d(5.0, 2.0) == 3.0)
__check('Lasso: exakt null', lasso_1d(1.0, 2.0) == 0.0)
__check('Lasso: negativ', lasso_1d(-4.5, 1.5) == -3.0)
try:
    ridge_fit(__X, __y, -1.0)
    __check('Ridge: negatives lam abgelehnt', False, 'kein ValueError')
except ValueError:
    __check('Ridge: negatives lam abgelehnt', True)
except Exception as e:
    __check('Ridge: negatives lam abgelehnt', False, type(e).__name__)
try:
    lasso_1d(3.0, -2.0)
    __check('Lasso: negatives lam abgelehnt', False, 'kein ValueError')
except ValueError:
    __check('Lasso: negatives lam abgelehnt', True)
except Exception as e:
    __check('Lasso: negatives lam abgelehnt', False, type(e).__name__)`;

const STRETCH_BASE_TESTS = `import numpy as np

__X = [[1.0], [2.0], [3.0]]
__y = [2.0, 4.0, 7.0]
__path = coefficient_path(__X, __y, [0.0, 1.0, 5.0, 20.0])
__check('Pfad-Laenge', len(__path) == 4)
__check('lam in Reihenfolge zurueckgegeben', [p['lam'] for p in __path] == [0.0, 1.0, 5.0, 20.0])
__w0 = [abs(p['w'][0]) for p in __path]
__check('|w| faellt mit lambda', all(__w0[i + 1] <= __w0[i] + 1e-12 for i in range(3)), str(__w0))
__check('OLS-Wert im Pfad', abs(__path[0]['w'][0] - 31.0 / 14.0) < 1e-9)
__rmses = [p['rmse'] for p in __path]
__check('Trainings-rmse steigt mit lambda', all(__rmses[i + 1] >= __rmses[i] - 1e-12 for i in range(3)), str(__rmses))
__check('rmse ist Zahl >= 0', all(float(p['rmse']) >= 0.0 for p in __path))
__path2 = coefficient_path([[1.0, 1.0], [1.0, 2.0], [1.0, 3.0]], [2.0, 2.0, 4.0], [1.0])
__check('2-Feature-Pfad lam=1', np.allclose(__path2[0]['w'], np.array([0.5, 1.0])))
try:
    coefficient_path(__X, __y, [-1.0])
    __check('negatives lam abgelehnt', False, 'kein ValueError')
except ValueError:
    __check('negatives lam abgelehnt', True)
except Exception as e:
    __check('negatives lam abgelehnt', False, type(e).__name__)`;

const CORE_REFERENCE = `import numpy as np

def ridge_fit(X, y, lam):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    if lam < 0:
        raise ValueError("lam must be >= 0")
    d = X.shape[1]
    return np.linalg.solve(X.T @ X + lam * np.eye(d), X.T @ y)

def lasso_1d(c, lam):
    c = float(c)
    if lam < 0:
        raise ValueError("lam must be >= 0")
    return np.sign(c) * max(abs(c) - lam, 0.0)

# ridge_fit([[1,1],[1,2],[1,3]], [2,2,4], 1.0) -> array([0.5, 1.0])
# lasso_1d(5.0, 2.0) -> 3.0, lasso_1d(1.0, 2.0) -> 0.0`;

const STRETCH_REFERENCE = `import numpy as np

def ridge_fit(X, y, lam):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    if lam < 0:
        raise ValueError("lam must be >= 0")
    d = X.shape[1]
    return np.linalg.solve(X.T @ X + lam * np.eye(d), X.T @ y)

def coefficient_path(X, y, lams):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    path = []
    for lam in lams:
        w = ridge_fit(X, y, lam)
        pred = X @ w
        rmse = float(np.sqrt(np.mean((pred - y) ** 2)))
        path.append({"lam": float(lam), "w": w, "rmse": rmse})
    return path

# 1 Feature, y = (2, 4, 7): |w| faellt mit lambda, Trainings-rmse steigt.`;

const CORE_PROMPT = 'Implementiere zwei Funktionen. `ridge_fit(X, y, lam)` berechnet die Ridge-Koeffizienten aus der geschlossenen Formel $(X^\\top X + \\lambda I)^{-1}X^\\top y$ (mit `numpy.linalg.solve`, nicht mit inverser Matrix) und wirft `ValueError` für negatives `lam`. `lasso_1d(c, lam)` implementiert Soft-Thresholding $w = \\operatorname{sign}(c)\\cdot\\max(|c|-\\lambda, 0)$ und wirft ebenfalls `ValueError` für negatives `lam`. Die Tests prüfen exakte Werte gegen die Handrechnung aus der Lektion.';

const STRETCH_PROMPT = 'Final Boss Regularisierung: Implementiere `coefficient_path(X, y, lams)`. Für jedes λ in `lams` (in gegebener Reihenfolge) werden die Ridge-Koeffizienten `w` (Liste oder 1D-Array) und der Trainings-RMSE $\\sqrt{\\text{mean}((Xw-y)^2)}$ berechnet. Rückgabe ist eine Liste von Dictionaries `{\'lam\': float, \'w\': ..., \'rmse\': float}`. Negative λ-Werte werfen `ValueError`. Nutze deine eigene `ridge_fit(X, y, lam)` aus der geschlossenen Formel — implementiere beide Funktionen. Der Testsatz prüft unter anderem, dass im 1-Feature-Fall $|w|$ mit λ monoton fällt und der Trainings-RMSE monoton steigt.';

// Shared reference for the seeded stretch block: the coefficient path checks
// compare w and rmse against this __ref_-copy of the closed-form ridge solve.
const STRETCH_SEEDED_PREAMBLE = `def __ref_ridge(X, y, lam):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    d = X.shape[1]
    return np.linalg.solve(X.T @ X + lam * np.eye(d), X.T @ y)`;

const drawMatrix = (r, rows, cols, lo, hi) =>
  Array.from({ length: rows }, () => Array.from({ length: cols }, () => randInt(r, lo, hi)));

const drawHalfFloat = (r, lo, hi) => randInt(r, lo, hi) * 0.5;

// Case definitions: the draw domains produce concrete literals that get baked
// into the test block (honest distinctness — the drawn inputs differ, not just
// a seed literal). All drawn lambdas are strictly positive multiples of 0.5 so
// X^T X + lam*I stays positive definite and np.linalg.solve always succeeds.
export const RIDGE_LASSO_CASES = {
  'ridge-normal-equation': {
    difficulty: 'core',
    starterCode: CORE_STARTER,
    baseTests: CORE_BASE_TESTS,
    referenceSolver: CORE_REFERENCE,
    prompt: CORE_PROMPT,
    fullSolution: CORE_REFERENCE,
    draw(r) {
      const d = randInt(r, 1, 2);
      const n = randInt(r, 3, 4);
      return {
        X: drawMatrix(r, n, d, -2, 3),
        y: Array.from({ length: n }, () => randInt(r, -2, 5)),
        lam: drawHalfFloat(r, 1, 6),
        c: drawHalfFloat(r, -12, 12),
        clam: drawHalfFloat(r, 1, 6),
      };
    },
    extraCount: 3,
  },
  'lasso-soft-threshold': {
    difficulty: 'stretch',
    starterCode: STRETCH_STARTER,
    baseTests: STRETCH_BASE_TESTS,
    referenceSolver: STRETCH_REFERENCE,
    prompt: STRETCH_PROMPT,
    fullSolution: STRETCH_REFERENCE,
    preamble: STRETCH_SEEDED_PREAMBLE,
    draw(r) {
      const d = randInt(r, 1, 2);
      const n = randInt(r, 3, 5);
      return {
        X: drawMatrix(r, n, d, -2, 3),
        y: Array.from({ length: n }, () => randInt(r, -2, 5)),
        lams: Array.from({ length: randInt(r, 2, 3) }, () => drawHalfFloat(r, 1, 8)),
      };
    },
    extraCount: 3,
  },
};

const pyMatrix = (m) => `[${m.map((row) => `[${row.join(', ')}]`).join(', ')}]`;
const pyList = (v) => `[${v.join(', ')}]`;
const pyFloats = (v) => `[${v.map((x) => x.toFixed(1)).join(', ')}]`;
const f1 = (x) => x.toFixed(1);

// Appends the seeded literal checks. Core: ridge asserted against the inline
// np.linalg.solve reference, lasso_1d against the inline np.sign soft
// threshold. Stretch: w/rmse asserted against the __ref_ridge preamble copy.
function seededChecks(caseId, entry, index) {
  const X = `__X${index}`;
  const y = `__y${index}`;
  if (caseId === 'ridge-normal-equation') {
    const d = entry.X[0].length;
    const ref = `np.linalg.solve(np.asarray(${X}, dtype=float).T @ np.asarray(${X}, dtype=float) + ${f1(entry.lam)} * np.eye(${d}), np.asarray(${X}, dtype=float).T @ np.asarray(${y}, dtype=float))`;
    return [
      `${X} = ${pyMatrix(entry.X)}`,
      `${y} = ${pyList(entry.y)}`,
      `__check('seeded ridge ${index}', np.allclose(ridge_fit(${X}, ${y}, ${f1(entry.lam)}), ${ref}))`,
      `__check('seeded lasso ${index}', lasso_1d(${f1(entry.c)}, ${f1(entry.clam)}) == float(np.sign(${f1(entry.c)}) * max(abs(${f1(entry.c)}) - ${f1(entry.clam)}, 0.0)))`,
    ].join('\n');
  }
  const lams = `__lams${index}`;
  const path = `__p${index}`;
  const refW = `__ref_ridge(${X}, ${y}, p['lam'])`;
  return [
    `${X} = ${pyMatrix(entry.X)}`,
    `${y} = ${pyList(entry.y)}`,
    `${lams} = ${pyFloats(entry.lams)}`,
    `${path} = coefficient_path(${X}, ${y}, ${lams})`,
    `__check('seeded path len ${index}', len(${path}) == ${entry.lams.length})`,
    `__check('seeded path order ${index}', [p['lam'] for p in ${path}] == [float(v) for v in ${lams}])`,
    `__check('seeded path w ${index}', all(np.allclose(p['w'], ${refW}) for p in ${path}))`,
    `__check('seeded path rmse ${index}', all(abs(p['rmse'] - float(np.sqrt(np.mean((np.asarray(${X}, dtype=float) @ ${refW} - np.asarray(${y}, dtype=float)) ** 2)))) < 1e-9 for p in ${path}))`,
  ].join('\n');
}

export const RIDGE_LASSO_CONTRACT = {
  familyId: 'formula-ridge-lasso-closed-form',
  familyGroup: 'formula-apply',
  summary: 'Löst Ridge über die geschlossene Normalgleichung mit np.linalg.solve und Lasso-1D über Soft-Thresholding, je mit Validierung von lambda vor der Berechnung.',
  taskArchetype: 'code-tests',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'ridge-normal-equation', propertyTest: false },
    { caseId: 'lasso-soft-threshold', propertyTest: false },
  ],
  difficultyProfiles: ['core', 'stretch'],
  competencyIds: ['c-ml-regularization', 'c-numpy-basics'],
  graderId: 'pyodide',
  activityType: 'python-code',
};

// Seeded section: optional case preamble (the __ref_ridge copy) once, then
// the per-draw check lines behind the '# seeded extra cases' header.
const FAMILY = makeCaseFamily({
  contract: RIDGE_LASSO_CONTRACT,
  cases: RIDGE_LASSO_CASES,
  shapeError: 'Ridge-Lasso-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, caseId, seedCases) => {
    const extras = seedCases.map((entry, i) => seededChecks(caseId, entry, i + 1)).join('\n');
    const body = caseDef.preamble ? `${caseDef.preamble}\n${extras}` : extras;
    return `# seeded extra cases\n${body}`;
  },
  defaultPackages: PACKAGES,
});

export const ridgeLassoCaseOk = FAMILY.caseOk;
export const genRidgeLassoCase = FAMILY.genCase;
export const solveRidgeLassoFamily = FAMILY.solve;
export const generateRidgeLassoFamily = FAMILY.generate;
export const FAMILY_SPEC = FAMILY.spec;

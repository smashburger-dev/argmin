// Procedural family formula-ridge-lasso-closed-form: the task text, starter
// code and reference solver stay fixed; the seed draws fresh design matrices,
// targets and lambda values that get appended to the curated base test block
// as literal __check lines. Expected values are asserted inline against the
// np.linalg.solve reference (or a __ref_-copy of it for the coefficient-path
// case) with the same tolerances as the base checks, so the grading contract
// cannot drift. Mirrors formula-descriptive-stats-numpy.mjs.

import { makeCaseFamily } from './case_family_kit.mjs';

import { randInt } from '../generator_draw_kit.mjs';
import doc from '../../../../content/families/formula-ridge-lasso-closed-form.json' with { type: 'json' };

const PACKAGES = ['numpy'];

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
};

// Seeded section: optional case preamble (the __ref_ridge copy) once, then
// the per-draw check lines behind the '# seeded extra cases' header.
export const FAMILY_SPEC = makeCaseFamily({
  doc,
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


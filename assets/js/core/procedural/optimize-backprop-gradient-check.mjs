// Procedural family optimize-backprop-gradient-check: the task text, starter
// code and reference solver stay fixed; the seed draws fresh weight/data
// fixtures that get appended to the curated base test block as literal
// __check lines. Expected gradients are asserted inline against the analytic
// factor form (linear case) resp. a __ref_-copy of the reference backward
// (MLP case), so the grading contract cannot drift. Mirrors
// formula-descriptive-stats-numpy.mjs.

import { makeCaseFamily } from './case_family_kit.mjs';

import { randInt, until } from '../generator_draw_kit.mjs';
import doc from '../../../../content/families/optimize-backprop-gradient-check.json' with { type: 'json' };

const PACKAGES = ['numpy'];

// __ref_-copy of the reference MLP backward for the seeded block: the drawn
// fixtures are asserted against this copy plus the analytic delta chain —
// never hardcoded. hidden/out are returned as well so the forward check can
// assert both stages.
const MLP_SEEDED_PREAMBLE = `def __ref_mlp(X, W1, b1, W2, b2, y):
    X = np.asarray(X, dtype=float)
    W1 = np.asarray(W1, dtype=float)
    b1 = np.asarray(b1, dtype=float)
    W2 = np.asarray(W2, dtype=float)
    b2 = np.asarray(b2, dtype=float)
    y = np.asarray(y, dtype=float)
    hidden = np.maximum(0.0, X @ W1 + b1)
    out = hidden @ W2 + b2
    m = out.size
    delta2 = (2.0 / m) * (out - y)
    dW2 = hidden.T @ delta2
    db2 = delta2.sum(axis=0)
    delta1 = (delta2 @ W2.T) * (hidden > 0)
    dW1 = X.T @ delta1
    db1 = delta1.sum(axis=0)
    return hidden, out, dW1, db1, dW2, db2`;

// Python literal emitters: floats keep a decimal point so arrays stay float.
const pyFloat = (n) => (Number.isInteger(n) ? `${n}.0` : String(n));
const pyVec = (values) => `[${values.map(pyFloat).join(', ')}]`;
const pyMat = (rows) => `[${rows.map(pyVec).join(', ')}]`;

// Minimal JS mirrors used only for draw guards (kink-free pre-activations);
// the test block itself never sees JS results.
const matVec = (X, W, b) => X.map((row) => (
  W[0].map((_, j) => row.reduce((sum, x, a) => sum + x * W[a][j], b[j]))
));

// Draws an integer-valued linear fixture: X (n,d), W (d,k), b (k,), y (n,k).
function drawLinearCase(r) {
  const n = randInt(r, 2, 4);
  const d = randInt(r, 1, 3);
  const k = randInt(r, 1, 2);
  const mat = (rows, cols, lo, hi) => Array.from({ length: rows }, () => (
    Array.from({ length: cols }, () => randInt(r, lo, hi))
  ));
  return {
    X: mat(n, d, -4, 4),
    W: mat(d, k, -3, 3),
    b: Array.from({ length: k }, () => randInt(r, -2, 2)),
    y: mat(n, k, -4, 4),
  };
}

// Draws a half-integer MLP fixture. The guard keeps every pre-activation
// |X @ W1 + b1| above 0.05 — the same kink-free domain as the curated base
// test, so the ReLU mask cannot sit on the derivative discontinuity.
function drawMlpCase(r) {
  return until(
    r,
    () => {
      const n = randInt(r, 3, 5);
      const d = randInt(r, 2, 3);
      const hidden = randInt(r, 2, 4);
      const k = randInt(r, 1, 2);
      const halfMat = (rows, cols, lo, hi) => Array.from({ length: rows }, () => (
        Array.from({ length: cols }, () => randInt(r, lo, hi) / 2)
      ));
      const halfVec = (len, lo, hi) => Array.from({ length: len }, () => randInt(r, lo, hi) / 2);
      return {
        X: halfMat(n, d, -4, 4),
        W1: halfMat(d, hidden, -3, 3),
        b1: halfVec(hidden, -2, 2),
        W2: halfMat(hidden, k, -3, 3),
        b2: halfVec(k, -2, 2),
        y: halfMat(n, k, -4, 4),
      };
    },
    (drawn) => matVec(drawn.X, drawn.W1, drawn.b1).every((row) => row.every((v) => Math.abs(v) > 0.05)),
    { scope: 'optimize-backprop-gradient-check' },
  );
}

// Case definitions: the draw domains produce concrete literals that get baked
// into the test block (honest distinctness — the drawn fixtures differ, not
// just a seed literal).
export const BACKPROP_CASES = {
  'linear-mse-gradients': {
    difficulty: 'core',
    competencyIds: ['c-dl-autograd', 'c-grad-regression'],
    draw: drawLinearCase,
    extraCount: 2,
  },
  'mlp-backprop-relu-mse': {
    difficulty: 'stretch',
    competencyIds: ['c-dl-autograd', 'c-dl-tensors'],
    preamble: MLP_SEEDED_PREAMBLE,
    draw: drawMlpCase,
    extraCount: 2,
  },
};

// Appends the seeded literal checks for the linear case: every drawn fixture
// is concrete in the test string; expected gradients via the analytic
// factor form (2/size · X.T @ r), same tolerances as the base checks.
function linearSeededChecks(entry, index) {
  const X = `np.array(${pyMat(entry.X)})`;
  const W = `np.array(${pyMat(entry.W)})`;
  const b = `np.array(${pyVec(entry.b)})`;
  const y = `np.array(${pyMat(entry.y)})`;
  return [
    `__X${index} = ${X}`,
    `__W${index} = ${W}`,
    `__b${index} = ${b}`,
    `__y${index} = ${y}`,
    `__p${index} = linear_mse_forward(__X${index}, __W${index}, __b${index})`,
    `__check('seeded fwd ${index}', np.allclose(__p${index}, __X${index} @ __W${index} + __b${index}))`,
    `__dW${index}, __db${index} = linear_mse_backward(__X${index}, __W${index}, __b${index}, __y${index})`,
    `__r${index} = __X${index} @ __W${index} + __b${index} - __y${index}`,
    `__f${index} = 2.0 / __r${index}.size`,
    `__check('seeded dW ${index}', np.allclose(__dW${index}, __f${index} * __X${index}.T @ __r${index}))`,
    `__check('seeded db ${index}', np.allclose(__db${index}, __f${index} * __r${index}.sum(axis=0)))`,
    `__check('seeded form ${index}', __dW${index}.shape == __W${index}.shape and __db${index}.shape == __b${index}.shape)`,
  ].join('\n');
}

// Seeded checks for the MLP case: forward against np.maximum, all four
// gradients against the __ref_-copy from the preamble, plus the kink-free
// guard re-asserted on the drawn fixture.
function mlpSeededChecks(entry, index) {
  const X = `np.array(${pyMat(entry.X)})`;
  const W1 = `np.array(${pyMat(entry.W1)})`;
  const b1 = `np.array(${pyVec(entry.b1)})`;
  const W2 = `np.array(${pyMat(entry.W2)})`;
  const b2 = `np.array(${pyVec(entry.b2)})`;
  const y = `np.array(${pyMat(entry.y)})`;
  return [
    `__X${index} = ${X}`,
    `__Wa${index} = ${W1}`,
    `__ba${index} = ${b1}`,
    `__Wb${index} = ${W2}`,
    `__bb${index} = ${b2}`,
    `__y${index} = ${y}`,
    `__H${index}, __o${index} = mlp_forward(__X${index}, __Wa${index}, __ba${index}, __Wb${index}, __bb${index})`,
    `__Hr${index}, __or${index}, __rd1_${index}, __rb1_${index}, __rd2_${index}, __rb2_${index} = __ref_mlp(__X${index}, __Wa${index}, __ba${index}, __Wb${index}, __bb${index}, __y${index})`,
    `__check('seeded fwd H ${index}', np.allclose(__H${index}, __Hr${index}))`,
    `__check('seeded fwd out ${index}', np.allclose(__o${index}, __or${index}))`,
    `__check('seeded knickfrei ${index}', bool(np.all(np.abs(__X${index} @ __Wa${index} + __ba${index}) > 0.05)))`,
    `__g${index} = mlp_backward(__X${index}, __Wa${index}, __ba${index}, __Wb${index}, __bb${index}, __y${index})`,
    `__check('seeded dW1 ${index}', np.allclose(__g${index}[0], __rd1_${index}))`,
    `__check('seeded db1 ${index}', np.allclose(__g${index}[1], __rb1_${index}))`,
    `__check('seeded dW2 ${index}', np.allclose(__g${index}[2], __rd2_${index}))`,
    `__check('seeded db2 ${index}', np.allclose(__g${index}[3], __rb2_${index}))`,
  ].join('\n');
}

function seededChecks(caseId, entry, index) {
  return caseId === 'linear-mse-gradients'
    ? linearSeededChecks(entry, index)
    : mlpSeededChecks(entry, index);
}

function seededSection(caseDef, caseId, seedCases) {
  const extras = seedCases.map((entry, i) => seededChecks(caseId, entry, i + 1)).join('\n');
  return caseDef.preamble ? `${caseDef.preamble}\n${extras}` : extras;
}

export const BACKPROP_CONTRACT = {
  familyId: 'optimize-backprop-gradient-check',
  familyGroup: 'optimize-update',
  summary: 'Leitet die Gradienten eines Layers bzw. MLP mit MSE im Rückwärtslauf her und validiert sie gegen die zentrale numerische Differenz.',
  taskArchetype: 'code-tests',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'linear-mse-gradients', propertyTest: false },
    { caseId: 'mlp-backprop-relu-mse', propertyTest: false },
  ],
  difficultyProfiles: ['core', 'stretch'],
  competencyIds: ['c-dl-autograd', 'c-dl-tensors'],
};

// Capsule shape: parameters carry starterCode/tests/seedCases; tests must be
// the verbatim base block plus the seeded extras derived from seedCases.
export const FAMILY_SPEC = makeCaseFamily({
  doc,
  contract: BACKPROP_CONTRACT,
  cases: BACKPROP_CASES,
  shapeError: 'Backprop-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, caseId, seedCases) => `# seeded extra cases\n${seededSection(caseDef, caseId, seedCases)}`,
  defaultPackages: PACKAGES,
});


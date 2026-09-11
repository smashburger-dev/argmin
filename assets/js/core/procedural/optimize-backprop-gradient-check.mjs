// Procedural family optimize-backprop-gradient-check: the task text, starter
// code and reference solver stay fixed; the seed draws fresh weight/data
// fixtures that get appended to the curated base test block as literal
// __check lines. Expected gradients are asserted inline against the analytic
// factor form (linear case) resp. a __ref_-copy of the reference backward
// (MLP case), so the grading contract cannot drift. Mirrors
// formula-descriptive-stats-numpy.mjs.

import { makeCaseFamily } from './case_family_kit.mjs';

import { randInt, until } from '../generator_draw_kit.mjs';

const PACKAGES = ['numpy'];

const LINEAR_STARTER = `import numpy as np


def linear_mse_forward(X, W, b):
    """Return X @ W + b (shapes: X (n, d), W (d, k), b (k,))."""
    ...


def linear_mse_backward(X, W, b, y):
    """Return (dW, db) for L = mean((X @ W + b - y) ** 2) over all n*k entries.

    Derive the gradients yourself: write the residual r = prediction - y,
    apply the chain rule to the squared mean, and check each gradient shape
    (dW (d, k), db (k,)) against the forward contract before returning.
    """
    ...
`;

const MLP_STARTER = `import numpy as np


def mlp_forward(X, W1, b1, W2, b2):
    """Return (H, y_hat): H = relu(X @ W1 + b1), y_hat = H @ W2 + b2."""
    ...


def mlp_backward(X, W1, b1, W2, b2, y):
    """Return (dW1, db1, dW2, db2) for L = mean((y_hat - y) ** 2).

    Walk the chain rule backwards through the output layer, the ReLU mask,
    and the hidden layer. Verify each gradient shape (dW1 (d, h), db1 (h,),
    dW2 (h, k), db2 (k,)) against the forward contract before returning.
    """
    ...
`;

const LINEAR_BASE_TESTS = `X = np.array([[1.0, 2.0], [3.0, 4.0], [5.0, 6.0], [0.0, -1.0]])
W = np.array([[0.5], [-1.0]])
b = np.array([0.25])
y = np.array([[1.0], [-2.0], [3.0], [0.5]])
pred = linear_mse_forward(X, W, b)
__check('Forward', np.allclose(pred, X @ W + b))
dW, db = linear_mse_backward(X, W, b, y)
r = X @ W + b - y
__check('dW analytisch', np.allclose(dW, 2.0 / 4.0 * X.T @ r))
__check('db analytisch', np.allclose(db, 2.0 / 4.0 * r.sum(axis=0)))


def loss_of_W(Wx):
    return float(np.mean((linear_mse_forward(X, Wx, b) - y) ** 2))


def loss_of_b(bx):
    return float(np.mean((linear_mse_forward(X, W, bx) - y) ** 2))


h = 1e-5
ok_w = True
for i in range(W.shape[0]):
    for j in range(W.shape[1]):
        Wp = W.copy(); Wp[i, j] += h
        Wm = W.copy(); Wm[i, j] -= h
        num = (loss_of_W(Wp) - loss_of_W(Wm)) / (2 * h)
        ok_w = ok_w and abs(num - dW[i, j]) < 1e-6
__check('dW numerisch (zentrale Differenz)', ok_w)
ok_b = True
for j in range(b.shape[0]):
    bp = b.copy(); bp[j] += h
    bm = b.copy(); bm[j] -= h
    num = (loss_of_b(bp) - loss_of_b(bm)) / (2 * h)
    ok_b = ok_b and abs(num - db[j]) < 1e-6
__check('db numerisch (zentrale Differenz)', ok_b)
X2 = np.array([[2.0, 0.0, -1.0], [1.0, 1.0, 1.0]])
W2 = np.array([[1.0, -1.0], [0.5, 2.0], [-2.0, 0.0]])
b2 = np.array([0.0, 1.0])
y2 = np.array([[0.0, 0.0], [1.0, -1.0]])
dW2, db2 = linear_mse_backward(X2, W2, b2, y2)
r2 = X2 @ W2 + b2 - y2
__check('n*k-Faktor bei k=2', np.allclose(dW2, 2.0 / 4.0 * X2.T @ r2) and np.allclose(db2, 2.0 / 4.0 * r2.sum(axis=0)))`;

const MLP_BASE_TESTS = `rng = np.random.default_rng(1905)
X = np.array([[2.0, -1.0, 1.0], [1.0, 2.0, -2.0], [-2.0, 1.5, 2.0], [1.0, -1.0, -1.0], [2.0, 2.0, 2.0]])
W1 = np.array([[0.8, -0.5, 0.6, -0.4], [0.3, 1.1, -0.7, 0.5], [-0.6, 0.4, 0.9, 0.7]])
b1 = np.array([0.3, -0.2, 0.1, 0.4])
W2 = np.array([[1.2, -0.6], [0.4, 0.8], [-0.9, 0.3], [0.2, -1.1]])
b2 = np.array([0.1, -0.3])
y = rng.normal(size=(5, 2))
H, y_hat = mlp_forward(X, W1, b1, W2, b2)
H_ref = np.maximum(0.0, X @ W1 + b1)
__check('Forward H', np.allclose(H, H_ref))
__check('Forward y_hat', np.allclose(y_hat, H_ref @ W2 + b2))
pre = X @ W1 + b1
__check('Testdaten knickfrei', np.all(np.abs(pre) > 0.05))
dW1, db1, dW2, db2 = mlp_backward(X, W1, b1, W2, b2, y)


def loss_at(W1x=None, b1x=None, W2x=None, b2x=None):
    _, out = mlp_forward(X, W1x if W1x is not None else W1, b1x if b1x is not None else b1, W2x if W2x is not None else W2, b2x if b2x is not None else b2)
    return float(np.mean((out - y) ** 2))


h = 1e-5
ok1 = True
for i in range(W1.shape[0]):
    for j in range(W1.shape[1]):
        Wp = W1.copy(); Wp[i, j] += h
        Wm = W1.copy(); Wm[i, j] -= h
        ok1 = ok1 and abs((loss_at(W1x=Wp) - loss_at(W1x=Wm)) / (2 * h) - dW1[i, j]) < 1e-6
__check('dW1 numerisch', ok1)
okb1 = True
for j in range(b1.shape[0]):
    bp = b1.copy(); bp[j] += h
    bm = b1.copy(); bm[j] -= h
    okb1 = okb1 and abs((loss_at(b1x=bp) - loss_at(b1x=bm)) / (2 * h) - db1[j]) < 1e-6
__check('db1 numerisch', okb1)
ok2 = True
for i in range(W2.shape[0]):
    for j in range(W2.shape[1]):
        Wp = W2.copy(); Wp[i, j] += h
        Wm = W2.copy(); Wm[i, j] -= h
        ok2 = ok2 and abs((loss_at(W2x=Wp) - loss_at(W2x=Wm)) / (2 * h) - dW2[i, j]) < 1e-6
__check('dW2 numerisch', ok2)
okb2 = True
for j in range(b2.shape[0]):
    bp = b2.copy(); bp[j] += h
    bm = b2.copy(); bm[j] -= h
    okb2 = okb2 and abs((loss_at(b2x=bp) - loss_at(b2x=bm)) / (2 * h) - db2[j]) < 1e-6
__check('db2 numerisch', okb2)
__check('Formen', dW1.shape == W1.shape and db1.shape == b1.shape and dW2.shape == W2.shape and db2.shape == b2.shape)`;

const LINEAR_REFERENCE = `import numpy as np

def linear_mse_forward(X, W, b):
    X = np.asarray(X, dtype=float)
    W = np.asarray(W, dtype=float)
    b = np.asarray(b, dtype=float)
    return X @ W + b

def linear_mse_backward(X, W, b, y):
    X = np.asarray(X, dtype=float)
    W = np.asarray(W, dtype=float)
    b = np.asarray(b, dtype=float)
    y = np.asarray(y, dtype=float)
    r = X @ W + b - y
    factor = 2.0 / r.size
    return factor * X.T @ r, factor * r.sum(axis=0)`;

const MLP_REFERENCE = `import numpy as np

def mlp_forward(X, W1, b1, W2, b2):
    X = np.asarray(X, dtype=float)
    W1 = np.asarray(W1, dtype=float)
    b1 = np.asarray(b1, dtype=float)
    W2 = np.asarray(W2, dtype=float)
    b2 = np.asarray(b2, dtype=float)
    hidden = np.maximum(0.0, X @ W1 + b1)
    return hidden, hidden @ W2 + b2

def mlp_backward(X, W1, b1, W2, b2, y):
    X = np.asarray(X, dtype=float)
    W1 = np.asarray(W1, dtype=float)
    b1 = np.asarray(b1, dtype=float)
    W2 = np.asarray(W2, dtype=float)
    b2 = np.asarray(b2, dtype=float)
    y = np.asarray(y, dtype=float)
    hidden, out = mlp_forward(X, W1, b1, W2, b2)
    m = out.size
    delta2 = (2.0 / m) * (out - y)
    dW2 = hidden.T @ delta2
    db2 = delta2.sum(axis=0)
    delta1 = (delta2 @ W2.T) * (hidden > 0)
    dW1 = X.T @ delta1
    db1 = delta1.sum(axis=0)
    return dW1, db1, dW2, db2`;

const LINEAR_PROMPT = 'Herleiten statt nachschlagen: Implementiere die Gradienten eines linearen Layers mit MSE. <code>linear_mse_forward(X, W, b)</code> gibt $XW + b$ zurück ($X \\in \\mathbb{R}^{n \\times d}$, $W \\in \\mathbb{R}^{d \\times k}$, $b \\in \\mathbb{R}^{k}$). <code>linear_mse_backward(X, W, b, y)</code> gibt $(\\partial L / \\partial W,\\ \\partial L / \\partial b)$ zurück für $L = \\mathrm{mean}\\big((XW + b - y)^2\\big)$, gemittelt über alle $n \\cdot k$ Einträge. Der Test berechnet die Referenz per zentraler numerischer Differenz aus <em>deinem</em> <code>linear_mse_forward</code> (float64, $h = 10^{-5}$) und verlangt Übereinstimmung innerhalb $10^{-6}$.';

const MLP_PROMPT = 'Das volle Programm: Backpropagation für ein 2-Layer-MLP mit ReLU und MSE. <code>mlp_forward(X, W1, b1, W2, b2)</code> gibt $(H, \\hat{y})$ zurück mit $H = \\mathrm{ReLU}(XW_1 + b_1)$, $\\hat{y} = HW_2 + b_2$. <code>mlp_backward(X, W1, b1, W2, b2, y)</code> gibt <code>(dW1, db1, dW2, db2)</code> zurück für $L = \\mathrm{mean}((\\hat{y} - y)^2)$ über alle Einträge. Der Test prüft alle vier Gradienten Eintrag für Eintrag gegen die zentrale numerische Differenz aus <em>deinem</em> <code>mlp_forward</code> ($h = 10^{-5}$, float64, Toleranz $10^{-6}$; die Testeingaben sind knickfrei gewählt).';

const LINEAR_SOLUTION = `${LINEAR_REFERENCE}

# Die zentrale Differenz im Test bestätigt beide Gradienten auf 1e-6`;

const MLP_SOLUTION = `${MLP_REFERENCE}

# Alle vier Gradienten stimmen mit der zentralen Differenz auf < 1e-6 ueberein`;

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
    starterCode: LINEAR_STARTER,
    baseTests: LINEAR_BASE_TESTS,
    referenceSolver: LINEAR_REFERENCE,
    prompt: LINEAR_PROMPT,
    fullSolution: LINEAR_SOLUTION,
    competencyIds: ['c-dl-autograd', 'c-grad-regression'],
    draw: drawLinearCase,
    extraCount: 2,
  },
  'mlp-backprop-relu-mse': {
    difficulty: 'stretch',
    starterCode: MLP_STARTER,
    baseTests: MLP_BASE_TESTS,
    referenceSolver: MLP_REFERENCE,
    prompt: MLP_PROMPT,
    fullSolution: MLP_SOLUTION,
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
const FAMILY = makeCaseFamily({
  contract: BACKPROP_CONTRACT,
  cases: BACKPROP_CASES,
  shapeError: 'Backprop-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, caseId, seedCases) => `# seeded extra cases\n${seededSection(caseDef, caseId, seedCases)}`,
  defaultPackages: PACKAGES,
});

export const backpropCaseOk = FAMILY.caseOk;
export const genBackpropCase = FAMILY.genCase;
export const solveBackpropFamily = FAMILY.solve;
export const generateBackpropFamily = FAMILY.generate;
export const FAMILY_SPEC = FAMILY.spec;

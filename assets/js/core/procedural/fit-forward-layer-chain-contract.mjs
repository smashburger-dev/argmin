// Procedural family fit-forward-layer-chain-contract: the task text, starter
// code and reference solver stay fixed; the seed draws fresh dimension tuples
// and half-step weight literals that get appended to the curated base test
// block as literal __check lines. Forward values are asserted inline against
// np.* expressions (X @ W + b / np.maximum); each draw also carries one
// contract violation that must raise ValueError. For the deep case the base
// block already defines __reference, so the seeded checks reuse it. Mirrors
// formula-descriptive-stats-numpy.mjs.

import { pyNum, pyList } from './py_test_kit.mjs';
import { makeCaseFamily } from './case_family_kit.mjs';

import { randInt, pick } from '../generator_draw_kit.mjs';

const PACKAGES = ['numpy'];

const LINEAR_STARTER = `import numpy as np


def linear_forward(X, W, b):
    """Return X @ W + b as ndarray after checking the dimension contract.

    Contracts: X (n, d), W (d, h), b (h,). Raise ValueError on any violation
    before computing anything.
    """
    # 1) X, W must be 2-d, b must be 1-d (np.asarray first, then check ndim)
    # 2) X.shape[1] == W.shape[0] and W.shape[1] == b.shape[0]
    # 3) return X @ W + b
    ...


def param_count(W, b):
    """Return the number of trainable parameters (weights + bias) as int."""
    ...
`;

const MLP_STARTER = `import numpy as np


def mlp_forward(X, W1, b1, W2, b2):
    """Return (H, y_hat) with H = relu(X @ W1 + b1), y_hat = H @ W2 + b2.

    Contracts: X (n, d), W1 (d, h1), b1 (h1,), W2 (h1, h2), b2 (h2,).
    Raise ValueError before computing anything if a contract is broken.
    """
    # 1) check ndim and shapes (including the hidden shape against W2)
    # 2) hidden = np.maximum(0.0, X @ W1 + b1)
    # 3) return hidden, hidden @ W2 + b2
    ...


def mlp_param_count(layer_sizes):
    """Return the total number of trainable parameters (all weights + all biases)."""
    ...
`;

const DEEP_STARTER = `import numpy as np


def deep_forward(X, weights, biases):
    """Return the output of an arbitrarily deep MLP (ReLU hidden, linear last).

    Contracts: X (n, d); weights [W1..WL] with Wi (d_i, d_{i+1}); biases [b1..bL].
    Raise ValueError before computing if any contract is broken, including
    len(weights) != len(biases).
    """
    # 1) structural checks: lists non-empty, same length, ndim per layer
    # 2) chain checks: X->W1, Wi->bi, Wi->W(i+1)
    # 3) loop: ReLU on all but the last layer, linear output
    ...


def deep_param_count(weights, biases):
    """Return the total number of trainable parameters (all weights + biases) as int."""
    ...
`;

const LINEAR_BASE_TESTS = `X = np.array([[1.0, 2.0], [3.0, 4.0], [5.0, 6.0]])
W = np.array([[1.0, 0.0, -1.0], [0.0, 1.0, 1.0]])
b = np.array([0.5, -0.5, 2.0])
out = linear_forward(X, W, b)
__check('bekannte Instanz', isinstance(out, np.ndarray) and np.allclose(out, X @ W + b))
__check('Ausgabeform (3, 3)', np.asarray(out).shape == (3, 3))
__check('param_count', param_count(W, b) == 6 + 3)
for bad in [
    lambda: linear_forward(np.zeros(2), W, b),
    lambda: linear_forward(X, np.zeros((3, 2, 2)), b),
    lambda: linear_forward(X, W, np.zeros((3, 1))),
    lambda: linear_forward(X, np.zeros((5, 3)), b),
    lambda: linear_forward(X, W, np.zeros(4)),
]:
    try:
        bad()
        __check('Vertrag -> ValueError', False, 'kein ValueError')
    except ValueError:
        __check('Vertrag -> ValueError', True)
__rnd = np.random.default_rng(1804)
for i in range(3):
    n, d, h = __rnd.integers(2, 5, size=3)
    Xr = __rnd.normal(size=(int(n), int(d)))
    Wr = __rnd.normal(size=(int(d), int(h)))
    br = __rnd.normal(size=int(h))
    got = np.asarray(linear_forward(Xr, Wr, br))
    __check(f'Unbekannte Instanz {i + 1}', got.shape == (int(n), int(h)) and np.allclose(got, Xr @ Wr + br))
    __check(f'Parameterzahl Instanz {i + 1}', param_count(Wr, br) == int(d) * int(h) + int(h))`;

const MLP_BASE_TESTS = `X = np.array([[1.0, -2.0], [0.5, 0.5], [-1.0, 2.0]])
W1 = np.array([[1.0, -1.0, 0.5], [0.0, 2.0, -0.5]])
b1 = np.array([0.0, 0.25, -0.25])
W2 = np.array([[1.0], [-1.0], [2.0]])
b2 = np.array([0.5])
H, y_hat = mlp_forward(X, W1, b1, W2, b2)
H_ref = np.maximum(0.0, X @ W1 + b1)
__check('H wie Referenz', np.allclose(H, H_ref))
__check('y_hat wie Referenz', np.allclose(y_hat, H_ref @ W2 + b2))
__check('H klemmt Negative', np.all(H >= 0.0) and np.isclose(H[2, 0], 0.0))
__check('Formen (3, 3) und (3, 1)', np.asarray(H).shape == (3, 3) and np.asarray(y_hat).shape == (3, 1))
__check('param_count [2, 3, 1]', mlp_param_count([2, 3, 1]) == 2 * 3 + 3 + 3 * 1 + 1)
__check('param_count [6, 13, 9]', mlp_param_count([6, 13, 9]) == 6 * 13 + 13 + 13 * 9 + 9)
for bad in [
    lambda: mlp_forward(X, W1, b1, np.zeros((2, 1)), b2),
    lambda: mlp_forward(X, W1, b1, W2, np.zeros(2)),
    lambda: mlp_forward(X, np.zeros((3, 3)), b1, W2, b2),
]:
    try:
        bad()
        __check('Vertrag -> ValueError', False, 'kein ValueError')
    except ValueError:
        __check('Vertrag -> ValueError', True)
__rnd = np.random.default_rng(1805)
for i in range(3):
    n, d, h1, h2 = [int(v) for v in __rnd.integers(2, 6, size=4)]
    Xr = __rnd.normal(size=(n, d)) * 2.0
    W1r = __rnd.normal(size=(d, h1))
    b1r = __rnd.normal(size=h1)
    W2r = __rnd.normal(size=(h1, h2))
    b2r = __rnd.normal(size=h2)
    Hr, yr = mlp_forward(Xr, W1r, b1r, W2r, b2r)
    Hr_ref = np.maximum(0.0, Xr @ W1r + b1r)
    __check(f'Unbekannte Instanz {i + 1}', np.allclose(Hr, Hr_ref) and np.allclose(yr, Hr_ref @ W2r + b2r))
    __check(f'Parameterzahl {i + 1}', mlp_param_count([d, h1, h2]) == d * h1 + h1 + h1 * h2 + h2)`;

const DEEP_BASE_TESTS = `def __reference(X, weights, biases):
    A = np.asarray(X, dtype=float)
    L = len(weights)
    for i, (W, b) in enumerate(zip(weights, biases)):
        A = A @ np.asarray(W, dtype=float) + np.asarray(b, dtype=float)
        if i < L - 1:
            A = np.maximum(0.0, A)
    return A


__rnd = np.random.default_rng(1806)
for depth in range(1, 5):
    sizes = [int(v) for v in __rnd.integers(2, 6, size=depth + 1)]
    n = int(__rnd.integers(2, 5))
    X = __rnd.normal(size=(n, sizes[0])) * 2.0
    weights = [__rnd.normal(size=(sizes[i], sizes[i + 1])) for i in range(depth)]
    biases = [__rnd.normal(size=sizes[i + 1]) for i in range(depth)]
    out = np.asarray(deep_forward(X, weights, biases))
    ref = __reference(X, weights, biases)
    __check(f'Tiefe {depth}: Werte', np.allclose(out, ref))
    __check(f'Tiefe {depth}: Form', out.shape == (n, sizes[-1]))
    __check(f'Tiefe {depth}: Parameterzahl', deep_param_count(weights, biases) == sum(w.size + b.size for w, b in zip(weights, biases)))
X1 = np.array([[1.0, -1.0], [0.0, 1.0]])
W = [np.ones((2, 3)), np.ones((3, 1))]
B = [np.zeros(3), np.zeros(1)]
for label, bad in [
    ('W1-Form', lambda: deep_forward(X1, [np.ones((3, 2))] + W[1:], B)),
    ('b-Form', lambda: deep_forward(X1, W, [np.zeros((3, 1)), np.zeros(1)])),
    ('Luecke in der Kette', lambda: deep_forward(X1, W, [np.zeros(3)])),
    ('leere Listen', lambda: deep_forward(X1, [], [])),
]:
    try:
        bad()
        __check(f'Vertrag {label} -> ValueError', False, 'kein ValueError')
    except ValueError:
        __check(f'Vertrag {label} -> ValueError', True)
out1 = deep_forward(X1, [np.eye(2)], [np.zeros(2)])
__check('Tiefe 1 bleibt linear (kein ReLU)', np.allclose(out1, X1))`;

const LINEAR_REFERENCE = `import numpy as np

def linear_forward(X, W, b):
    X = np.asarray(X, dtype=float)
    W = np.asarray(W, dtype=float)
    b = np.asarray(b, dtype=float)
    if X.ndim != 2 or W.ndim != 2:
        raise ValueError("X und W muessen 2-dimensional sein")
    if b.ndim != 1:
        raise ValueError("b muss 1-dimensional sein")
    if X.shape[1] != W.shape[0]:
        raise ValueError("X und W passen nicht zusammen")
    if W.shape[1] != b.shape[0]:
        raise ValueError("W und b passen nicht zusammen")
    return X @ W + b

def param_count(W, b):
    W = np.asarray(W)
    b = np.asarray(b)
    return int(W.size + b.size)`;

const MLP_REFERENCE = `import numpy as np

def mlp_forward(X, W1, b1, W2, b2):
    X = np.asarray(X, dtype=float)
    W1 = np.asarray(W1, dtype=float)
    b1 = np.asarray(b1, dtype=float)
    W2 = np.asarray(W2, dtype=float)
    b2 = np.asarray(b2, dtype=float)
    if X.ndim != 2 or W1.ndim != 2 or W2.ndim != 2:
        raise ValueError("X, W1 und W2 muessen 2-dimensional sein")
    if b1.ndim != 1 or b2.ndim != 1:
        raise ValueError("b1 und b2 muessen 1-dimensional sein")
    if X.shape[1] != W1.shape[0]:
        raise ValueError("X und W1 passen nicht zusammen")
    if W1.shape[1] != b1.shape[0]:
        raise ValueError("W1 und b1 passen nicht zusammen")
    if W1.shape[1] != W2.shape[0]:
        raise ValueError("H und W2 passen nicht zusammen")
    if W2.shape[1] != b2.shape[0]:
        raise ValueError("W2 und b2 passen nicht zusammen")
    hidden = np.maximum(0.0, X @ W1 + b1)
    return hidden, hidden @ W2 + b2

def mlp_param_count(layer_sizes):
    total = 0
    for d, h in zip(layer_sizes[:-1], layer_sizes[1:]):
        total += d * h + h
    return int(total)`;

const DEEP_REFERENCE = `import numpy as np

def deep_forward(X, weights, biases):
    X = np.asarray(X, dtype=float)
    if X.ndim != 2:
        raise ValueError("X muss 2-dimensional sein")
    if not isinstance(weights, (list, tuple)) or not isinstance(biases, (list, tuple)):
        raise ValueError("weights und biases muessen Listen sein")
    if len(weights) == 0 or len(weights) != len(biases):
        raise ValueError("weights und biases brauchen gleiche, nichtleere Laenge")
    mats = [np.asarray(W, dtype=float) for W in weights]
    vecs = [np.asarray(b, dtype=float) for b in biases]
    for W, b in zip(mats, vecs):
        if W.ndim != 2:
            raise ValueError("jede Gewichtsmatrix muss 2-dimensional sein")
        if b.ndim != 1:
            raise ValueError("jeder Bias muss 1-dimensional sein")
        if W.shape[1] != b.shape[0]:
            raise ValueError("Wi und bi passen nicht zusammen")
    if X.shape[1] != mats[0].shape[0]:
        raise ValueError("X und W1 passen nicht zusammen")
    for W, nxt in zip(mats[:-1], mats[1:]):
        if W.shape[1] != nxt.shape[0]:
            raise ValueError("benachbarte Schichten passen nicht zusammen")
    A = X
    last = len(mats) - 1
    for i, (W, b) in enumerate(zip(mats, vecs)):
        A = A @ W + b
        if i < last:
            A = np.maximum(0.0, A)
    return A

def deep_param_count(weights, biases):
    return int(sum(np.asarray(W).size + np.asarray(b).size for W, b in zip(weights, biases)))`;

const LINEAR_PROMPT = String.raw`Implementiere ein lineares Layer mit Dimensionsvertrag. <code>linear_forward(X, W, b)</code> gibt $XW + b$ zurück, nachdem es die Verträge geprüft hat: <code>X.ndim == 2</code>, <code>W.ndim == 2</code>, <code>b.ndim == 1</code>, <code>X.shape[1] == W.shape[0]</code> und <code>W.shape[1] == b.shape[0]</code>. Bei Verstoß wirft die Funktion <code>ValueError</code> — vor jeder Rechnung. <code>param_count(W, b)</code> liefert die Anzahl trainierbarer Parameter des Layers ($d \cdot h + h$) als <code>int</code>. Der Test prüft bekannte Instanzen gegen eine direkte Referenz, unbekannte per Zufall generierte Instanzen gegen <code>X @ W + b</code> und das Fehlerverhalten.`;

const MLP_PROMPT = String.raw`Baue den Forward-Pass eines 2-Layer-MLP. <code>mlp_forward(X, W1, b1, W2, b2)</code> berechnet $H = \mathrm{ReLU}(XW_1 + b_1)$ und $\hat{y} = HW_2 + b_2$ und gibt das Tupel <code>(H, y_hat)</code> zurück. Verträge: <code>X (n, d)</code>, <code>W1 (d, h1)</code>, <code>b1 (h1,)</code>, <code>W2 (h1, h2)</code>, <code>b2 (h2,)</code> — Verstoß wirft <code>ValueError</code> vor der Rechnung (auch $H$-Form gegen $W2$). <code>mlp_param_count(layer_sizes)</code> bekommt eine Liste wie <code>[d, h1, h2]</code> und liefert die Gesamtzahl trainierbarer Parameter inklusive aller Bias-Vektoren als <code>int</code>. Der Test rechnet bekannte und unbekannte Instanzen gegen direkte NumPy-Referenzen nach und prüft, dass ReLU Negative auf 0 klemmt.`;

const DEEP_PROMPT = 'Final Boss Dimensionsverträge: Implementiere den Forward-Pass eines **beliebig tiefen** MLP. <code>deep_forward(X, weights, biases)</code> bekommt eine Liste von Gewichtsmatriken <code>weights = [W1, ..., WL]</code> und Bias-Vektoren <code>biases = [b1, ..., bL]</code>. Alle Schichten außer der letzten nutzen ReLU, die letzte ist linear. Verträge (jeder Verstoß wirft <code>ValueError</code> vor der Rechnung): <code>X.ndim == 2</code>, Listen gleich lang und nicht leer, jedes <code>Wi.ndim == 2</code>, jedes <code>bi.ndim == 1</code>, <code>X.shape[1] == W1.shape[0]</code>, <code>Wi.shape[1] == bi.shape[0]</code> und <code>Wi.shape[1] == W(i+1).shape[0]</code> für benachbarte Schichten. Rückgabe: der Ausgabe-Tensor. <code>deep_param_count(weights, biases)</code> zählt alle Parameter inklusive Bias als <code>int</code>. Der Test fährt Tiefen 1 bis 4 mit unbekannten Instanzen gegen eine Schleifen-Referenz und prüft Vertragsverletzungen inklusive einer Lückenlänge.';

const LINEAR_SOLUTION = `def linear_forward(X, W, b):
    X = np.asarray(X, dtype=float)
    W = np.asarray(W, dtype=float)
    b = np.asarray(b, dtype=float)
    if X.ndim != 2 or W.ndim != 2:
        raise ValueError("X und W muessen 2-dimensional sein")
    if b.ndim != 1:
        raise ValueError("b muss 1-dimensional sein")
    if X.shape[1] != W.shape[0]:
        raise ValueError("X und W passen nicht zusammen")
    if W.shape[1] != b.shape[0]:
        raise ValueError("W und b passen nicht zusammen")
    return X @ W + b

def param_count(W, b):
    W = np.asarray(W)
    b = np.asarray(b)
    return int(W.size + b.size)

# linear_forward((3,2)-X, (2,3)-W, (3,)-b) -> (3, 3); Vertragsverletzungen werfen ValueError`;

const MLP_SOLUTION = `def mlp_forward(X, W1, b1, W2, b2):
    X = np.asarray(X, dtype=float)
    W1 = np.asarray(W1, dtype=float)
    b1 = np.asarray(b1, dtype=float)
    W2 = np.asarray(W2, dtype=float)
    b2 = np.asarray(b2, dtype=float)
    if X.ndim != 2 or W1.ndim != 2 or W2.ndim != 2:
        raise ValueError("X, W1 und W2 muessen 2-dimensional sein")
    if b1.ndim != 1 or b2.ndim != 1:
        raise ValueError("b1 und b2 muessen 1-dimensional sein")
    if X.shape[1] != W1.shape[0]:
        raise ValueError("X und W1 passen nicht zusammen")
    if W1.shape[1] != b1.shape[0]:
        raise ValueError("W1 und b1 passen nicht zusammen")
    if W1.shape[1] != W2.shape[0]:
        raise ValueError("H und W2 passen nicht zusammen")
    if W2.shape[1] != b2.shape[0]:
        raise ValueError("W2 und b2 passen nicht zusammen")
    hidden = np.maximum(0.0, X @ W1 + b1)
    return hidden, hidden @ W2 + b2

def mlp_param_count(layer_sizes):
    total = 0
    for d, h in zip(layer_sizes[:-1], layer_sizes[1:]):
        total += d * h + h
    return int(total)

# mlp_param_count([6, 13, 9]) = 6·13 + 13 + 13·9 + 9 = 217`;

const DEEP_SOLUTION = `def deep_forward(X, weights, biases):
    X = np.asarray(X, dtype=float)
    if X.ndim != 2:
        raise ValueError("X muss 2-dimensional sein")
    if not isinstance(weights, (list, tuple)) or not isinstance(biases, (list, tuple)):
        raise ValueError("weights und biases muessen Listen sein")
    if len(weights) == 0 or len(weights) != len(biases):
        raise ValueError("weights und biases brauchen gleiche, nichtleere Laenge")
    mats = [np.asarray(W, dtype=float) for W in weights]
    vecs = [np.asarray(b, dtype=float) for b in biases]
    for W, b in zip(mats, vecs):
        if W.ndim != 2:
            raise ValueError("jede Gewichtsmatrix muss 2-dimensional sein")
        if b.ndim != 1:
            raise ValueError("jeder Bias muss 1-dimensional sein")
        if W.shape[1] != b.shape[0]:
            raise ValueError("Wi und bi passen nicht zusammen")
    if X.shape[1] != mats[0].shape[0]:
        raise ValueError("X und W1 passen nicht zusammen")
    for W, nxt in zip(mats[:-1], mats[1:]):
        if W.shape[1] != nxt.shape[0]:
            raise ValueError("benachbarte Schichten passen nicht zusammen")
    A = X
    last = len(mats) - 1
    for i, (W, b) in enumerate(zip(mats, vecs)):
        A = A @ W + b
        if i < last:
            A = np.maximum(0.0, A)
    return A

def deep_param_count(weights, biases):
    return int(sum(np.asarray(W).size + np.asarray(b).size for W, b in zip(weights, biases)))

# Tiefe 1 bleibt linear, Tiefen 2-4 matchen die Schleifen-Referenz`;

const pyMatrix = (rows) => `np.array([${rows.map(pyList).join(', ')}])`;
const pyVector = (values) => `np.array(${pyList(values)})`;

// Draw domains: dims stay small (2-4 / 2-5) so the baked literals stay
// readable; weights use half steps so the matrix literals print as short
// decimals. Each entry also draws one contract violation that must raise
// ValueError — a weight matrix with wrong row count for the shallow cases,
// and a length mismatch / 1-d input for the deep case.
const drawMatrix = (r, rows, cols) =>
  Array.from({ length: rows }, () => Array.from({ length: cols }, () => randInt(r, -8, 8) / 2));

const drawVector = (r, len) => Array.from({ length: len }, () => randInt(r, -8, 8) / 2);

const offByOne = (r, base) => base + (r() < 0.5 ? -1 : 1);

export const FORWARD_CASES = {
  'linear-forward-contract': {
    difficulty: 'core',
    starterCode: LINEAR_STARTER,
    baseTests: LINEAR_BASE_TESTS,
    referenceSolver: LINEAR_REFERENCE,
    prompt: LINEAR_PROMPT,
    fullSolution: LINEAR_SOLUTION,
    draw(r) {
      const n = randInt(r, 2, 4);
      const d = randInt(r, 2, 4);
      const h = randInt(r, 2, 4);
      return {
        n,
        d,
        h,
        X: drawMatrix(r, n, d),
        W: drawMatrix(r, d, h),
        b: drawVector(r, h),
        badRows: offByOne(r, d),
      };
    },
    seededChecks(entry, index) {
      const i = index;
      return [
        `__X${i} = ${pyMatrix(entry.X)}`,
        `__W${i} = ${pyMatrix(entry.W)}`,
        `__b${i} = ${pyVector(entry.b)}`,
        `__check('seeded forward ${i}', np.allclose(linear_forward(__X${i}, __W${i}, __b${i}), __X${i} @ __W${i} + __b${i}))`,
        `__check('seeded form ${i}', np.asarray(linear_forward(__X${i}, __W${i}, __b${i})).shape == (${entry.n}, ${entry.h}))`,
        `__check('seeded params ${i}', param_count(__W${i}, __b${i}) == __W${i}.size + __b${i}.size)`,
        'try:',
        `    linear_forward(__X${i}, np.zeros((${entry.badRows}, ${entry.h})), __b${i})`,
        `    __check('seeded Vertrag ${i}', False, 'kein ValueError')`,
        'except ValueError:',
        `    __check('seeded Vertrag ${i}', True)`,
      ].join('\n');
    },
    extraCount: 3,
  },
  'mlp-forward-relu': {
    difficulty: 'stretch',
    starterCode: MLP_STARTER,
    baseTests: MLP_BASE_TESTS,
    referenceSolver: MLP_REFERENCE,
    prompt: MLP_PROMPT,
    fullSolution: MLP_SOLUTION,
    draw(r) {
      const n = randInt(r, 2, 4);
      const d = randInt(r, 2, 5);
      const h1 = randInt(r, 2, 5);
      const h2 = randInt(r, 2, 4);
      return {
        n,
        d,
        h1,
        h2,
        X: drawMatrix(r, n, d),
        W1: drawMatrix(r, d, h1),
        b1: drawVector(r, h1),
        W2: drawMatrix(r, h1, h2),
        b2: drawVector(r, h2),
        sizes: [randInt(r, 2, 6), randInt(r, 2, 6), randInt(r, 2, 5)],
        badRows: offByOne(r, h1),
      };
    },
    seededChecks(entry, index) {
      const i = index;
      const [sd, sh1, sh2] = entry.sizes;
      return [
        `__X${i} = ${pyMatrix(entry.X)}`,
        `__W1${i} = ${pyMatrix(entry.W1)}`,
        `__b1${i} = ${pyVector(entry.b1)}`,
        `__W2${i} = ${pyMatrix(entry.W2)}`,
        `__b2${i} = ${pyVector(entry.b2)}`,
        `__H${i}, __y${i} = mlp_forward(__X${i}, __W1${i}, __b1${i}, __W2${i}, __b2${i})`,
        `__Href${i} = np.maximum(0.0, __X${i} @ __W1${i} + __b1${i})`,
        `__check('seeded H ${i}', np.allclose(__H${i}, __Href${i}))`,
        `__check('seeded y ${i}', np.allclose(__y${i}, __Href${i} @ __W2${i} + __b2${i}))`,
        `__check('seeded relu ${i}', np.all(__H${i} >= 0.0))`,
        `__check('seeded formen ${i}', np.asarray(__H${i}).shape == (${entry.n}, ${entry.h1}) and np.asarray(__y${i}).shape == (${entry.n}, ${entry.h2}))`,
        `__check('seeded params ${i}', mlp_param_count([${sd}, ${sh1}, ${sh2}]) == ${sd} * ${sh1} + ${sh1} + ${sh1} * ${sh2} + ${sh2})`,
        'try:',
        `    mlp_forward(__X${i}, __W1${i}, __b1${i}, np.zeros((${entry.badRows}, ${entry.h2})), __b2${i})`,
        `    __check('seeded Vertrag ${i}', False, 'kein ValueError')`,
        'except ValueError:',
        `    __check('seeded Vertrag ${i}', True)`,
      ].join('\n');
    },
    extraCount: 3,
  },
  'deep-forward-chain': {
    difficulty: 'challenge',
    starterCode: DEEP_STARTER,
    baseTests: DEEP_BASE_TESTS,
    referenceSolver: DEEP_REFERENCE,
    prompt: DEEP_PROMPT,
    fullSolution: DEEP_SOLUTION,
    draw(r) {
      const depth = randInt(r, 1, 4);
      const sizes = Array.from({ length: depth + 1 }, () => randInt(r, 2, 5));
      const n = randInt(r, 2, 4);
      return {
        depth,
        sizes,
        n,
        X: drawMatrix(r, n, sizes[0]),
        weights: Array.from({ length: depth }, (_, i) => drawMatrix(r, sizes[i], sizes[i + 1])),
        biases: Array.from({ length: depth }, (_, i) => drawVector(r, sizes[i + 1])),
        violation: pick(r, ['short-biases', 'flat-x']),
      };
    },
    seededChecks(entry, index) {
      const i = index;
      const ws = `[${entry.weights.map(pyMatrix).join(', ')}]`;
      const bs = `[${entry.biases.map(pyVector).join(', ')}]`;
      const badCall = entry.violation === 'flat-x'
        ? `deep_forward(np.zeros(${entry.sizes[0]}), __ws${i}, __bs${i})`
        : `deep_forward(__X${i}, __ws${i}, __bs${i}[:-1])`;
      return [
        `__X${i} = ${pyMatrix(entry.X)}`,
        `__ws${i} = ${ws}`,
        `__bs${i} = ${bs}`,
        `__out${i} = np.asarray(deep_forward(__X${i}, __ws${i}, __bs${i}))`,
        `__check('seeded deep Werte ${i}', np.allclose(__out${i}, __reference(__X${i}, __ws${i}, __bs${i})))`,
        `__check('seeded deep Form ${i}', __out${i}.shape == (${entry.n}, ${entry.sizes[entry.sizes.length - 1]}))`,
        `__check('seeded deep Parameter ${i}', deep_param_count(__ws${i}, __bs${i}) == sum(w.size + b.size for w, b in zip(__ws${i}, __bs${i})))`,
        'try:',
        `    ${badCall}`,
        `    __check('seeded deep Vertrag ${i}', False, 'kein ValueError')`,
        'except ValueError:',
        `    __check('seeded deep Vertrag ${i}', True)`,
      ].join('\n');
    },
    extraCount: 3,
  },
};

export const FORWARD_CONTRACT = {
  familyId: 'fit-forward-layer-chain-contract',
  familyGroup: 'fit-model',
  summary: 'Implementiert den MLP-Forward vertrags zuerst: Struktur- und Kettenverträge vor der Rechnung, ReLU nur auf versteckten Schichten, Parameterzahl inklusive Bias.',
  taskArchetype: 'code-tests',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'linear-forward-contract', propertyTest: false },
    { caseId: 'mlp-forward-relu', propertyTest: false },
    { caseId: 'deep-forward-chain', propertyTest: false },
  ],
  difficultyProfiles: ['core', 'stretch', 'challenge'],
  competencyIds: ['c-dl-tensors', 'c-numpy-basics', 'c-linalg-matrices'],
  graderId: 'pyodide',
  activityType: 'python-code',
};

// Capsule shape: parameters carry starterCode/tests/seedCases; tests must be
// the verbatim base block plus the seeded extras derived from seedCases.
const FAMILY = makeCaseFamily({
  contract: FORWARD_CONTRACT,
  cases: FORWARD_CASES,
  shapeError: 'Forward-Chain-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, _caseId, seedCases) =>
    `# seeded extra cases\n${seedCases.map((entry, i) => caseDef.seededChecks(entry, i + 1)).join('\n\n')}`,
  defaultPackages: PACKAGES,
});

export const forwardCaseOk = FAMILY.caseOk;
export const genForwardCase = FAMILY.genCase;
export const solveForwardFamily = FAMILY.solve;
export const generateForwardFamily = FAMILY.generate;
export const FAMILY_SPEC = FAMILY.spec;

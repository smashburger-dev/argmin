// Procedural family optimize-training-primitive-contract: task text, starter
// code and reference solver stay fixed; the seed draws fresh value vectors,
// probability/label pairs, batch sizes, dropout masks and decay terms that
// get appended to the curated base test block as literal __check lines.
// Expected values are asserted inline against np.* reference formulas with
// the same tolerances as the base checks, so the grading contract cannot
// drift. Mirrors formula-descriptive-stats-numpy.mjs.

import { makeCaseFamily } from './case_family_kit.mjs';

import { randInt } from '../generator_draw_kit.mjs';

const PACKAGES = ['numpy'];

const LOSS_STARTER = `import numpy as np


def mse_loss(y_hat, y):
    """Return mean((y_hat - y) ** 2) as float; ValueError on shape mismatch."""
    # np.asarray, check shapes coincide, then mean of squared residuals
    ...


def bce_loss(p, y):
    """Return binary cross entropy with eps = 1e-12 clipping as float.

    p must lie within [0, 1] and match the shape of y; otherwise ValueError.
    """
    # check shapes and value range FIRST, then clip and apply the formula
    ...


def steps_per_epoch(n, batch_size):
    """Return ceil(n / batch_size) as int; ValueError for n < 1 or batch_size < 1."""
    ...
`;

const LOSS_BASE_TESTS = `yh = np.array([1.0, 2.0, 3.0])
yv = np.array([1.5, 2.0, 3.5])
__check('mse bekannter Wert', abs(mse_loss(yh, yv) - (0.25 + 0.0 + 0.25) / 3.0) < 1e-12)
__check('mse konstant null', mse_loss(yh, yh) == 0.0)
try:
    mse_loss(np.zeros(3), np.zeros(4))
    __check('mse Formfehler -> ValueError', False, 'kein ValueError')
except ValueError:
    __check('mse Formfehler -> ValueError', True)
p = np.array([0.9, 0.2, 0.7, 0.99])
t = np.array([1.0, 0.0, 1.0, 0.0])
eps = 1e-12
pc = np.clip(p, eps, 1.0 - eps)
ref = -np.mean(t * np.log(pc) + (1.0 - t) * np.log(1.0 - pc))
__check('bce bekannter Wert', abs(bce_loss(p, t) - float(ref)) < 1e-12)
__check('bce clippt 1.0 endlich', np.isfinite(bce_loss(np.array([1.0, 0.5]), np.array([1.0, 1.0]))))
__check('bce perfekt ist ~0', bce_loss(np.array([1.0 - 1e-9, 1e-9]), np.array([1.0, 0.0])) < 1e-6)
for bad in [
    lambda: bce_loss(np.array([1.2, 0.5]), np.array([1.0, 0.0])),
    lambda: bce_loss(np.array([-0.1, 0.5]), np.array([1.0, 0.0])),
    lambda: bce_loss(np.zeros(3), np.zeros(4)),
]:
    try:
        bad()
        __check('bce Vertrag -> ValueError', False, 'kein ValueError')
    except ValueError:
        __check('bce Vertrag -> ValueError', True)
__check('steps 90/40', steps_per_epoch(90, 40) == 3)
__check('steps 100/10', steps_per_epoch(100, 10) == 10)
__check('steps 5/8', steps_per_epoch(5, 8) == 1)
__check('steps ist int', isinstance(steps_per_epoch(7, 3), int))
for bad_n, bad_b in [(0, 4), (10, 0), (-3, 4)]:
    try:
        steps_per_epoch(bad_n, bad_b)
        __check('steps Vertrag -> ValueError', False, 'kein ValueError')
    except ValueError:
        __check('steps Vertrag -> ValueError', True)
__check('mse/bce als float', isinstance(mse_loss(yh, yv), float) and isinstance(bce_loss(p, t), float))`;

const REG_STARTER = `import numpy as np


def dropout_forward(x, mask, p):
    """Return x with dropped entries exactly 0 and kept entries scaled by 1/p.

    mask is read via np.asarray(mask).astype(bool); ValueError (before any
    computation) if mask.shape != x.shape or not 0 < p <= 1.
    """
    # 1) contracts: shape equality and 0 < p <= 1
    # 2) scaled = x / p, then zero out dropped entries via the mask
    ...


def weight_decay_update(w, grad, lr, lam):
    """Return w - lr * (grad + lam * w); ndarray in -> ndarray out, float in -> float out."""
    ...
`;

const REG_BASE_TESTS = `x = np.array([[2.0, -4.0], [6.0, 8.0]])
mask = np.array([[True, False], [True, True]])
out = dropout_forward(x, mask, 0.5)
__check('Skalierung 1/p', np.allclose(out, np.array([[4.0, 0.0], [12.0, 16.0]])))
__check('gedroppt exakt 0', out[0, 1] == 0.0)
__check('p=1 ist Identitaet', np.allclose(dropout_forward(x, mask, 1.0), np.array([[2.0, 0.0], [6.0, 8.0]])))
out34 = dropout_forward(x, mask, 0.75)
__check('Skalierung 1/0,75', np.allclose(out34, np.array([[2.0 / 0.75, 0.0], [8.0, 32.0 / 3.0]])))
__check('0/1-Maske akzeptiert', np.allclose(dropout_forward(x, np.array([[1, 0], [0, 1]]), 0.5), np.array([[4.0, 0.0], [0.0, 16.0]])))
for bad in [
    lambda: dropout_forward(x, np.array([True, False, True]), 0.5),
    lambda: dropout_forward(x, mask, 0.0),
    lambda: dropout_forward(x, mask, 1.5),
    lambda: dropout_forward(x, mask, -0.5),
]:
    try:
        bad()
        __check('Dropout Vertrag -> ValueError', False, 'kein ValueError')
    except ValueError:
        __check('Dropout Vertrag -> ValueError', True)
w = np.array([2.0, -1.0])
g = np.array([0.4, 0.2])
upd = weight_decay_update(w, g, 0.5, 0.2)
__check('Weight-Decay-Update Array', np.allclose(upd, w - 0.5 * (g + 0.2 * w)))
__check('Weight-Decay Update Vektorraeume', upd.shape == w.shape and isinstance(upd, np.ndarray))
__check('Weight-Decay lam=0 ist SGD', np.allclose(weight_decay_update(w, g, 0.5, 0.0), w - 0.5 * g))
__check('Weight-Decay skalar', isinstance(weight_decay_update(2.0, 0.4, 0.5, 0.2), float) and abs(weight_decay_update(2.0, 0.4, 0.5, 0.2) - 1.6) < 1e-12)
big = weight_decay_update(np.array([10.0]), np.array([0.0]), 0.5, 0.2)
__check('reiner Decay zieht Richtung null', big[0] == 9.0)`;

const LOSS_REFERENCE = `import numpy as np


def mse_loss(y_hat, y):
    y_hat = np.asarray(y_hat, dtype=float)
    y = np.asarray(y, dtype=float)
    if y_hat.shape != y.shape:
        raise ValueError("y_hat und y brauchen gleiche Form")
    return float(np.mean((y_hat - y) ** 2))


def bce_loss(p, y):
    p = np.asarray(p, dtype=float)
    y = np.asarray(y, dtype=float)
    if p.shape != y.shape:
        raise ValueError("p und y brauchen gleiche Form")
    if np.any(p < 0.0) or np.any(p > 1.0):
        raise ValueError("p muss in [0, 1] liegen")
    eps = 1e-12
    pc = np.clip(p, eps, 1.0 - eps)
    return float(-np.mean(y * np.log(pc) + (1.0 - y) * np.log(1.0 - pc)))


def steps_per_epoch(n, batch_size):
    if n < 1 or batch_size < 1:
        raise ValueError("n und batch_size muessen >= 1 sein")
    return int(-(-n // batch_size))`;

const REG_REFERENCE = `import numpy as np


def dropout_forward(x, mask, p):
    x = np.asarray(x, dtype=float)
    m = np.asarray(mask).astype(bool)
    if m.shape != x.shape:
        raise ValueError("mask und x brauchen gleiche Form")
    if not (0.0 < p <= 1.0):
        raise ValueError("p muss in (0, 1] liegen")
    return np.where(m, x / p, 0.0)


def weight_decay_update(w, grad, lr, lam):
    if np.isscalar(w):
        return float(w - lr * (grad + lam * w))
    w = np.asarray(w, dtype=float)
    grad = np.asarray(grad, dtype=float)
    return w - lr * (grad + lam * w)`;

const LOSS_PROMPT = 'Verluste und Batch-Zählung sauber implementieren. <code>mse_loss(y_hat, y)</code> gibt $\\frac{1}{n}\\sum_i (\\hat{y}_i - y_i)^2$ als float zurück; bei Formungleichheit wirft sie <code>ValueError</code>. <code>bce_loss(p, y)</code> bekommt Wahrscheinlichkeiten $p \\in [0, 1]$ und Labels $y \\in \\{0, 1\\}$ und gibt $-\\frac{1}{n}\\sum_i (y_i \\log p_i + (1 - y_i)\\log(1 - p_i))$ zurück — dabei werden die Wahrscheinlichkeiten vor dem Logarithmus auf $[\\varepsilon, 1-\\varepsilon]$ mit $\\varepsilon = 10^{-12}$ geclippt; Werte außerhalb $[0, 1]$ oder falsche Formen werfen <code>ValueError</code>. <code>steps_per_epoch(n, batch_size)</code> liefert $\\lceil n / B \\rceil$ als <code>int</code> und wirft <code>ValueError</code> für $n < 1$ oder $B < 1$. Der Test rechnet alle Werte gegen direkte Formeln nach und prüft die Fehlerverträge.';

const REG_PROMPT = 'Regularisierung exakt umsetzen. <code>dropout_forward(x, mask, p)</code> wendet eine feste Maske an: Gedroppte Einträge werden exakt $0$, erhaltene werden mit $1/p$ multipliziert (invertierte Skalierung). Verträge: <code>mask</code> wird mit <code>np.asarray(mask).astype(bool)</code> gelesen; <code>mask.shape != x.shape</code> oder $p \\notin (0, 1]$ wirft <code>ValueError</code> vor der Rechnung. <code>weight_decay_update(w, grad, lr, lam)</code> gibt $w - \\mathrm{lr} \\cdot (g + \\lambda w)$ zurück — Array für Array, float für float. Der Test prüft exakte Werte, Skalierung, Fehlerverträge und dass $p = 1$ die Identität ist.';

const LOSS_SOLUTION = `def mse_loss(y_hat, y):
    y_hat = np.asarray(y_hat, dtype=float)
    y = np.asarray(y, dtype=float)
    if y_hat.shape != y.shape:
        raise ValueError("y_hat und y brauchen gleiche Form")
    return float(np.mean((y_hat - y) ** 2))

def bce_loss(p, y):
    p = np.asarray(p, dtype=float)
    y = np.asarray(y, dtype=float)
    if p.shape != y.shape:
        raise ValueError("p und y brauchen gleiche Form")
    if np.any(p < 0.0) or np.any(p > 1.0):
        raise ValueError("p muss in [0, 1] liegen")
    eps = 1e-12
    pc = np.clip(p, eps, 1.0 - eps)
    return float(-np.mean(y * np.log(pc) + (1.0 - y) * np.log(1.0 - pc)))

def steps_per_epoch(n, batch_size):
    if n < 1 or batch_size < 1:
        raise ValueError("n und batch_size muessen >= 1 sein")
    return int(-(-n // batch_size))

# mse([1,2,3],[1.5,2,3.5]) = 1/6; steps_per_epoch(90,40) = 3`;

const REG_SOLUTION = `def dropout_forward(x, mask, p):
    x = np.asarray(x, dtype=float)
    m = np.asarray(mask).astype(bool)
    if m.shape != x.shape:
        raise ValueError("mask und x brauchen gleiche Form")
    if not (0.0 < p <= 1.0):
        raise ValueError("p muss in (0, 1] liegen")
    return np.where(m, x / p, 0.0)

def weight_decay_update(w, grad, lr, lam):
    if np.isscalar(w):
        return float(w - lr * (grad + lam * w))
    return np.asarray(w, float) - lr * (np.asarray(grad, float) + lam * np.asarray(w, float))

# dropout(x=[[2,-4],[6,8]], mask, p=0.5) -> [[4, 0], [12, 16]]; weight_decay_update(2.0, 0.4, 0.5, 0.2) = 1.6`;

// Python literal emitters: ints stay ints, probability/decay banks render
// exact short decimals, masks render True/False.
const pyNum = (n) => String(n);
const pyVec = (values) => `[${values.map(pyNum).join(', ')}]`;
const pyMat = (rows) => `[${rows.map(pyVec).join(', ')}]`;
const pyBoolMat = (rows) => `[${rows.map((row) => `[${row.map((v) => (v ? 'True' : 'False')).join(', ')}]`).join(', ')}]`;

const drawVec = (r, len, lo, hi) => Array.from({ length: len }, () => randInt(r, lo, hi));

// Value banks: probabilities in hundredths (5..95), keep probabilities for
// dropout and decay/lr factors as short exact decimals.
const DROPOUT_PS = [0.5, 0.6, 0.75, 0.8, 1.0];
const DECAY_LRS = [0.1, 0.2, 0.5];
const DECAY_LAMS = [0.0, 0.1, 0.2, 0.5];

// Case definitions: the draw domains produce concrete literals that get baked
// into the test block (honest distinctness — the drawn inputs differ, not just
// a seed literal).
export const PRIM_CASES = {
  'loss-and-batch-primitives': {
    difficulty: 'core',
    starterCode: LOSS_STARTER,
    baseTests: LOSS_BASE_TESTS,
    referenceSolver: LOSS_REFERENCE,
    prompt: LOSS_PROMPT,
    fullSolution: LOSS_SOLUTION,
    draw(r) {
      const len = randInt(r, 3, 5);
      const pLen = randInt(r, 2, 4);
      return {
        yHat: drawVec(r, len, -4, 6),
        y: drawVec(r, len, -4, 6),
        p: Array.from({ length: pLen }, () => randInt(r, 5, 95) / 100),
        t: drawVec(r, pLen, 0, 1),
        n: randInt(r, 5, 120),
        batch: randInt(r, 1, 30),
      };
    },
    emitChecks(entry, index) {
      const { yHat, y, p, t, n, batch } = entry;
      const steps = Math.ceil(n / batch);
      return [
        `__yh${index} = ${pyVec(yHat)}`,
        `__yv${index} = ${pyVec(y)}`,
        `__check('seeded mse ${index}', abs(mse_loss(__yh${index}, __yv${index}) - float(np.mean((np.asarray(__yh${index}) - np.asarray(__yv${index})) ** 2))) < 1e-12)`,
        `__pb${index} = ${pyVec(p)}`,
        `__tb${index} = ${pyVec(t)}`,
        `__pc${index} = np.clip(np.asarray(__pb${index}, dtype=float), 1e-12, 1.0 - 1e-12)`,
        `__check('seeded bce ${index}', abs(bce_loss(__pb${index}, __tb${index}) - float(-np.mean(np.asarray(__tb${index}, dtype=float) * np.log(__pc${index}) + (1.0 - np.asarray(__tb${index}, dtype=float)) * np.log(1.0 - __pc${index})))) < 1e-12)`,
        `__check('seeded steps ${index}', steps_per_epoch(${n}, ${batch}) == ${steps})`,
      ].join('\n');
    },
    extraCount: 2,
  },
  'dropout-weight-decay-primitives': {
    difficulty: 'core',
    starterCode: REG_STARTER,
    baseTests: REG_BASE_TESTS,
    referenceSolver: REG_REFERENCE,
    prompt: REG_PROMPT,
    fullSolution: REG_SOLUTION,
    draw(r) {
      const cols = randInt(r, 2, 3);
      const wLen = randInt(r, 2, 3);
      return {
        x: [drawVec(r, cols, -6, 8), drawVec(r, cols, -6, 8)],
        mask: [
          Array.from({ length: cols }, () => r() < 0.5),
          Array.from({ length: cols }, () => r() < 0.5),
        ],
        p: DROPOUT_PS[randInt(r, 0, DROPOUT_PS.length - 1)],
        w: drawVec(r, wLen, -4, 4),
        g: drawVec(r, wLen, -4, 4),
        lr: DECAY_LRS[randInt(r, 0, DECAY_LRS.length - 1)],
        lam: DECAY_LAMS[randInt(r, 0, DECAY_LAMS.length - 1)],
      };
    },
    emitChecks(entry, index) {
      const { x, mask, p, w, g, lr, lam } = entry;
      return [
        `__x${index} = np.array(${pyMat(x)})`,
        `__mk${index} = np.array(${pyBoolMat(mask)})`,
        `__check('seeded dropout ${index}', np.allclose(dropout_forward(__x${index}, __mk${index}, ${p}), np.where(__mk${index}, __x${index} / ${p}, 0.0)))`,
        `__w${index} = np.array(${pyVec(w)})`,
        `__g${index} = np.array(${pyVec(g)})`,
        `__check('seeded decay ${index}', np.allclose(weight_decay_update(__w${index}, __g${index}, ${lr}, ${lam}), __w${index} - ${lr} * (__g${index} + ${lam} * __w${index})))`,
      ].join('\n');
    },
    extraCount: 2,
  },
};

export const PRIM_CONTRACT = {
  familyId: 'optimize-training-primitive-contract',
  familyGroup: 'optimize-update',
  summary: 'Implementiert Verlust- und Regularisierungsprimitive mit Wertebereichs-Verträgen vor der Rechnung (MSE, BCE mit Clipping, Ceil-Schritte, Dropout, Weight Decay).',
  taskArchetype: 'code-tests',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'loss-and-batch-primitives', propertyTest: false },
    { caseId: 'dropout-weight-decay-primitives', propertyTest: false },
  ],
  difficultyProfiles: ['core'],
  competencyIds: ['c-dl-training', 'c-dl-regularization', 'c-grad-regression', 'c-numpy-basics'],
  graderId: 'pyodide',
  activityType: 'python-code',
};

// Capsule shape: parameters carry starterCode/tests/seedCases; tests must be
// the verbatim base block plus the seeded extras derived from seedCases.
const FAMILY = makeCaseFamily({
  contract: PRIM_CONTRACT,
  cases: PRIM_CASES,
  shapeError: 'Trainings-Primitiv-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, _caseId, seedCases) =>
    `# seeded extra cases\n${seedCases.map((entry, i) => caseDef.emitChecks(entry, i + 1)).join('\n')}`,
  defaultPackages: PACKAGES,
});

export const primCaseOk = FAMILY.caseOk;
export const genPrimCase = FAMILY.genCase;
export const solvePrimFamily = FAMILY.solve;
export const generatePrimFamily = FAMILY.generate;
export const FAMILY_SPEC = FAMILY.spec;

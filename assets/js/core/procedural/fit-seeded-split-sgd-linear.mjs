// Procedural family fit-seeded-split-sgd-linear: the task text, starter code
// and reference solver stay fixed; the seed draws fresh split sizes,
// fractions and seeds plus full SGD data regimes (data seed, shape, true
// weights, noise, learning rate, epoch count, train seed) that get appended
// to the curated base test block as literal __check lines. The split is
// asserted inline against np.random.default_rng(seed).permutation; the SGD
// loop cannot be expressed as a np.* one-liner, so a renamed copy of the
// reference (__ref_train_linear_sgd) is embedded once per seeded block and
// the learner's w/b/loss_history are compared against it on the drawn
// literals. Mirrors fit-early-stopping-roundtrip.mjs.

import { pyNum } from './py_test_kit.mjs';
import { makeCaseFamily } from './case_family_kit.mjs';

import { pick, randInt } from '../generator_draw_kit.mjs';

const PACKAGES = ['numpy'];

const SGD_STARTER = `import numpy as np


def train_val_split(n, val_fraction, seed):
    """Return (train_idx, val_idx), both sorted ascending; k = round(n * f) val indices.

    k must satisfy 1 <= k <= n - 1, else ValueError. Uses
    np.random.default_rng(seed).permutation(n); the FIRST k indices go to val.
    """
    # guard k, permute, split, sort both parts
    ...


def train_linear_sgd(X, y, lr, epochs, seed):
    """Full-batch SGD on MSE of X @ w + b; return {'w', 'b', 'loss_history'}.

    Init: w = rng.normal(size=(d, 1)) * 0.1, b = 0.0 with
    rng = np.random.default_rng(seed). loss_history[i] is the MSE at the
    START of epoch i (length == epochs).
    """
    # init from seed, loop: record loss, residuals, both updates
    ...
`;

const SGD_BASE_TESTS = `tr, va = train_val_split(50, 0.2, 7)
__check('Split-Groessen', len(tr) == 40 and len(va) == 10)
__check('Split disjunkt und vollstaendig', set(tr.tolist()) | set(va.tolist()) == set(range(50)) and not (set(tr.tolist()) & set(va.tolist())))
__check('Split sortiert', np.all(np.diff(tr) > 0) and np.all(np.diff(va) > 0))
__check('Split deterministisch', np.array_equal(train_val_split(50, 0.2, 7)[0], tr))
__check('Split anderer Seed unterscheidet sich', not np.array_equal(train_val_split(50, 0.2, 8)[1], va))
for bad_f in [0.0, 1.0]:
    try:
        train_val_split(50, bad_f, 7)
        __check('Split Vertrag -> ValueError', False, 'kein ValueError')
    except ValueError:
        __check('Split Vertrag -> ValueError', True)
rng = np.random.default_rng(2020)
n = 120
X = rng.normal(size=(n, 2))
w_true = np.array([[1.5], [-0.75]])
y = X @ w_true + 0.02 * rng.normal(size=(n, 1))
res1 = train_linear_sgd(X, y, 0.05, 300, 42)
res2 = train_linear_sgd(X, y, 0.05, 300, 42)
__check('Training deterministisch', np.array_equal(res1["w"], res2["w"]) and res1["loss_history"] == res2["loss_history"])
__check('Verlaufslaenge', len(res1["loss_history"]) == 300)
__check('Verlust faellt', res1["loss_history"][-1] < res1["loss_history"][0])
__check('Verlust klein am Ende', res1["loss_history"][-1] < 1e-2)
__check('w nahe an der Wahrheit', np.allclose(res1["w"], w_true, atol=0.05))
res3 = train_linear_sgd(X, y, 0.05, 300, 43)
__check('Anderer Seed -> anderer Startverlust', res3["loss_history"][0] != res1["loss_history"][0])
__check('Rueckgabeschluessel', set(res1.keys()) == {"w", "b", "loss_history"})`;

const SGD_REFERENCE = `import numpy as np


def train_val_split(n, val_fraction, seed):
    if n < 2:
        raise ValueError("n muss mindestens 2 sein")
    k = int(round(n * val_fraction))
    if k < 1 or k > n - 1:
        raise ValueError("val_fraction muss zwischen 1/n und 1 - 1/n liegen")
    perm = np.random.default_rng(seed).permutation(n)
    val_idx = np.sort(perm[:k])
    train_idx = np.sort(perm[k:])
    return train_idx, val_idx


def train_linear_sgd(X, y, lr, epochs, seed):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    d = X.shape[1]
    n = X.shape[0]
    rng = np.random.default_rng(seed)
    w = rng.normal(size=(d, 1)) * 0.1
    b = 0.0
    loss_history = []
    for _ in range(int(epochs)):
        pred = X @ w + b
        loss_history.append(float(np.mean((pred - y) ** 2)))
        r = pred - y
        w = w - lr * (2.0 / n) * (X.T @ r)
        b = b - lr * (2.0 / n) * float(np.sum(r))
    return {"w": w, "b": float(b), "loss_history": loss_history}`;

const SGD_PROMPT = "Deterministisches Training einer linearen Regression mit SGD. <code>train_val_split(n, val_fraction, seed)</code> erzeugt mit <code>np.random.default_rng(seed).permutation(n)</code> eine feste Permutation, entnimmt die ersten $k = \\mathrm{round}(n \\cdot f)$ Indizes für Validierung und den Rest für Training — Rückgabe <code>(train_idx, val_idx)</code>, beide aufsteigend sortiert; $k$ muss mindestens 1 und höchstens $n-1$ sein, sonst <code>ValueError</code>. <code>train_linear_sgd(X, y, lr, epochs, seed)</code> initialisiert $w$ mit <code>rng.normal(size=(d, 1)) * 0.1</code> und $b = 0{,}0$ aus <code>np.random.default_rng(seed)</code> und führt <code>epochs</code> Full-Batch-SGD-Schritte auf den MSE aus (Vorzeichen $w \\leftarrow w - \\mathrm{lr} \\cdot \\frac{2}{n} X^\\top r$ mit $r = Xw + b - y$; analog für $b$). Rückgabe: <code>{\"w\", \"b\", \"loss_history\"}</code>, wobei <code>loss_history</code> den Verlust <em>zu Epochenbeginn</em> enthält (Länge <code>epochs</code>). Der Test prüft Determinismus über gleiche Seeds, den Split-Vertrag und, dass der Verlust über 300 Epochen auf gut konditionierten Daten fällt.";

const SGD_SOLUTION = `def train_val_split(n, val_fraction, seed):
    k = int(round(n * val_fraction))
    if k < 1 or k > n - 1:
        raise ValueError("val_fraction muss zwischen 1/n und 1 - 1/n liegen")
    perm = np.random.default_rng(seed).permutation(n)
    val_idx = np.sort(perm[:k])
    train_idx = np.sort(perm[k:])
    return train_idx, val_idx

def train_linear_sgd(X, y, lr, epochs, seed):
    rng = np.random.default_rng(seed)
    w = rng.normal(size=(X.shape[1], 1)) * 0.1
    b = 0.0
    loss_history = []
    for _ in range(int(epochs)):
        pred = X @ w + b
        loss_history.append(float(np.mean((pred - y) ** 2)))
        r = pred - y
        w = w - lr * (2.0 / X.shape[0]) * (X.T @ r)
        b = b - lr * (2.0 / X.shape[0]) * float(np.sum(r))
    return {"w": w, "b": b, "loss_history": loss_history}

# n=120, lr=0.05, 300 Epochen: Verlust faellt unter 1e-2, w liegt nahe [1.5, -0.75]`;

// Renamed copy of the reference train_linear_sgd — embedded once into the
// seeded test block so the learner's loop can be compared against the
// contracted update rule on every drawn data regime.
const SGD_REF_HELPER = `def __ref_train_linear_sgd(X, y, lr, epochs, seed):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    d = X.shape[1]
    n = X.shape[0]
    rng = np.random.default_rng(seed)
    w = rng.normal(size=(d, 1)) * 0.1
    b = 0.0
    loss_history = []
    for _ in range(int(epochs)):
        pred = X @ w + b
        loss_history.append(float(np.mean((pred - y) ** 2)))
        r = pred - y
        w = w - lr * (2.0 / n) * (X.T @ r)
        b = b - lr * (2.0 / n) * float(np.sum(r))
    return {"w": w, "b": float(b), "loss_history": loss_history}`;

const pyCol = (values) => `[${values.map((v) => `[${pyNum(v)}]`).join(', ')}]`;

// Draw domains: split sizes 20-60 with fractions from a small bank keep
// k = round(n * f) inside 1..n-1; bad fractions all violate the k guard.
// SGD runs draw gaussian data through a data seed (identical construction to
// the base test) plus small learning rates and 200-400 epochs — full-batch
// GD on this convex, well-conditioned MSE decreases strictly and converges.
const SPLIT_FRACTIONS = [0.15, 0.2, 0.25, 0.3, 0.35];
const BAD_FRACTIONS = [0.0, 1.0, -0.2, 1.5];
const NOISE_LEVELS = [0.02, 0.05, 0.1];
const LEARNING_RATES = [0.02, 0.03, 0.05, 0.08];
const EPOCH_BANK = [200, 250, 300, 400];

function drawSplit(r) {
  return {
    n: randInt(r, 20, 60),
    f: pick(r, SPLIT_FRACTIONS),
    badF: pick(r, BAD_FRACTIONS),
    seed: randInt(r, 0, 99),
  };
}

function drawRun(r) {
  const d = pick(r, [2, 3]);
  return {
    dataSeed: randInt(r, 0, 9999),
    n: randInt(r, 60, 120),
    d,
    wTrue: Array.from({ length: d }, () => (r() < 0.5 ? -1 : 1) * (randInt(r, 4, 15) / 10)),
    noise: pick(r, NOISE_LEVELS),
    lr: pick(r, LEARNING_RATES),
    epochs: pick(r, EPOCH_BANK),
    seed: randInt(r, 0, 99),
  };
}

// Appends the seeded literal checks: split expectations inline via the
// permutation expression, SGD expectations against the embedded __ref_ copy.
function seededChecks(entry, index) {
  const { split, run } = entry;
  return [
    `__p${index} = np.random.default_rng(${split.seed}).permutation(${split.n})`,
    `__k${index} = int(round(${split.n} * ${split.f}))`,
    `__t${index}, __v${index} = train_val_split(${split.n}, ${split.f}, ${split.seed})`,
    `__check('seeded split val ${index}', np.array_equal(np.asarray(__v${index}), np.sort(__p${index}[:__k${index}])))`,
    `__check('seeded split train ${index}', np.array_equal(np.asarray(__t${index}), np.sort(__p${index}[__k${index}:])))`,
    `__check('seeded split sizes ${index}', len(__t${index}) == ${split.n} - __k${index} and len(__v${index}) == __k${index})`,
    `try:`,
    `    train_val_split(${split.n}, ${split.badF}, ${split.seed})`,
    `    __check('seeded split guard ${index}', False, 'kein ValueError')`,
    `except ValueError:`,
    `    __check('seeded split guard ${index}', True)`,
    `__g${index} = np.random.default_rng(${run.dataSeed})`,
    `__X${index} = __g${index}.normal(size=(${run.n}, ${run.d}))`,
    `__y${index} = __X${index} @ np.array(${pyCol(run.wTrue)}) + ${run.noise} * __g${index}.normal(size=(${run.n}, 1))`,
    `__r${index} = train_linear_sgd(__X${index}, __y${index}, ${run.lr}, ${run.epochs}, ${run.seed})`,
    `__e${index} = __ref_train_linear_sgd(__X${index}, __y${index}, ${run.lr}, ${run.epochs}, ${run.seed})`,
    `__check('seeded sgd keys ${index}', set(__r${index}.keys()) == {'w', 'b', 'loss_history'})`,
    `__check('seeded sgd w ${index}', np.allclose(np.asarray(__r${index}['w']), np.asarray(__e${index}['w']), atol=1e-9))`,
    `__check('seeded sgd b ${index}', abs(float(__r${index}['b']) - float(__e${index}['b'])) < 1e-9)`,
    `__check('seeded sgd history ${index}', np.allclose(np.asarray(__r${index}['loss_history']), np.asarray(__e${index}['loss_history']), atol=1e-9))`,
    `__check('seeded sgd length ${index}', len(__r${index}['loss_history']) == ${run.epochs})`,
    `__check('seeded sgd falls ${index}', __r${index}['loss_history'][-1] < __r${index}['loss_history'][0])`,
    `__r${index}b = train_linear_sgd(__X${index}, __y${index}, ${run.lr}, ${run.epochs}, ${run.seed})`,
    `__check('seeded sgd deterministic ${index}', np.array_equal(np.asarray(__r${index}b['w']), np.asarray(__r${index}['w'])) and __r${index}b['loss_history'] == __r${index}['loss_history'])`,
  ].join('\n');
}

export const SEEDED_SGD_CASES = {
  'seeded-split-sgd-linear': {
    difficulty: 'stretch',
    starterCode: SGD_STARTER,
    baseTests: SGD_BASE_TESTS,
    referenceSolver: SGD_REFERENCE,
    prompt: SGD_PROMPT,
    fullSolution: SGD_SOLUTION,
    refHelper: SGD_REF_HELPER,
    checks: seededChecks,
    draw(r) {
      return { split: drawSplit(r), run: drawRun(r) };
    },
    validEntry: (entry) =>
      !!entry &&
      !!entry.split &&
      Number.isInteger(entry.split.n) &&
      Number.isInteger(entry.split.seed) &&
      !!entry.run &&
      Number.isInteger(entry.run.dataSeed) &&
      Number.isInteger(entry.run.n) &&
      Array.isArray(entry.run.wTrue) &&
      Number.isInteger(entry.run.epochs) &&
      Number.isInteger(entry.run.seed),
    extraCount: 3,
  },
};

export const SEEDED_SGD_CONTRACT = {
  familyId: 'fit-seeded-split-sgd-linear',
  familyGroup: 'fit-model',
  summary: 'Implementiert geseedetes Training einer linearen Regression: Seed-Permutation-Split, Full-Batch-SGD mit Faktor 2/n, Verlusthistorie zu Epochenbeginn.',
  taskArchetype: 'code-tests',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [{ caseId: 'seeded-split-sgd-linear', propertyTest: false }],
  difficultyProfiles: ['stretch'],
  competencyIds: ['c-dl-training', 'c-grad-regression'],
  graderId: 'pyodide',
  activityType: 'python-code',
};

// Seeded block: the renamed reference helper once, then the per-draw check
// lines behind the '# seeded extra cases' header.
const FAMILY = makeCaseFamily({
  contract: SEEDED_SGD_CONTRACT,
  cases: SEEDED_SGD_CASES,
  shapeError: 'Seeded-SGD-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, _caseId, seedCases) => {
    const checks = seedCases.map((entry, i) => caseDef.checks(entry, i + 1)).join('\n\n');
    return `# seeded extra cases\n${caseDef.refHelper}\n\n${checks}`;
  },
  defaultPackages: PACKAGES,
});

export const seededSgdCaseOk = FAMILY.caseOk;
export const genSeededSgdCase = FAMILY.genCase;
export const solveSeededSgdFamily = FAMILY.solve;
export const generateSeededSgdFamily = FAMILY.generate;
export const FAMILY_SPEC = FAMILY.spec;

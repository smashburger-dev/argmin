// Procedural family fit-mlp-val-curve-argmin: the task text, starter code and
// reference solver stay fixed; the seed draws fresh dataset shapes and
// training hyperparameters that get appended to the curated base test block
// as literal __check lines. The drawn data is rebuilt inside the test via
// np.random.default_rng(<dataSeed>) literals, so the checks stay honest
// without pinning float values — only the contracted properties are asserted
// (determinism, lengths, argmin, int type, split contract). Mirrors
// formula-descriptive-stats-numpy.mjs.

import { pyNum } from './py_test_kit.mjs';
import { makeCaseFamily } from './case_family_kit.mjs';

import { randInt, pick } from '../generator_draw_kit.mjs';

const PACKAGES = ['numpy'];

const VAL_CURVE_STARTER = `import numpy as np


def train_mlp_regression(X, y, hidden, lr, epochs, seed, val_fraction=0.25):
    """Train a small 2-layer MLP (ReLU) with full-batch SGD; return curves.

    One rng = np.random.default_rng(seed) drives BOTH init (first) and the
    split permutation (afterwards): the LAST k = round(n * f) permutation
    indices are validation, the rest train. Per epoch, record train and val
    loss of the CURRENT model first, then update on train data only.
    Return {'train_loss', 'val_loss', 'best_val_epoch': int(argmin(val_loss))}.
    Raise ValueError if k leaves no data on either side.
    """
    # 1) init W1, b1, W2, b2 from rng; permute for the split
    # 2) loop epochs: forward both splits, record losses, backward on train
    # 3) argmin over val_loss as int
    ...
`;

const VAL_CURVE_BASE_TESTS = `rng = np.random.default_rng(2026)
n = 200
X = rng.normal(size=(n, 3))
y = np.sin(X[:, :1]) * 0.8 + 0.1 * rng.normal(size=(n, 1))
res1 = train_mlp_regression(X, y, 8, 0.01, 80, 42)
res2 = train_mlp_regression(X, y, 8, 0.01, 80, 42)
__check('Determinismus', res1 == res2)
__check('Schluessel', set(res1.keys()) == {"train_loss", "val_loss", "best_val_epoch"})
__check('Laengen', len(res1["train_loss"]) == 80 and len(res1["val_loss"]) == 80)
__check('Trainingsverlust faellt', res1["train_loss"][-1] < res1["train_loss"][0])
__check('Val auf getrennten Daten', res1["val_loss"][0] != res1["train_loss"][0])
__check('best_val_epoch int im Bereich', isinstance(res1["best_val_epoch"], int) and 0 <= res1["best_val_epoch"] < 80)
__check('best_val_epoch ist Argmin', res1["best_val_epoch"] == int(np.argmin(res1["val_loss"])))
res3 = train_mlp_regression(X, y, 8, 0.01, 80, 43)
__check('Anderer Seed -> anderer Lauf', res3["train_loss"][0] != res1["train_loss"][0])
try:
    train_mlp_regression(X, y, 8, 0.01, 80, 42, val_fraction=0.0)
    __check('Split Vertrag -> ValueError', False, 'kein ValueError')
except ValueError:
    __check('Split Vertrag -> ValueError', True)
try:
    train_mlp_regression(X, y, 8, 0.01, 80, 42, val_fraction=1.0)
    __check('Split Vertrag 1.0 -> ValueError', False, 'kein ValueError')
except ValueError:
    __check('Split Vertrag 1.0 -> ValueError', True)`;

const VAL_CURVE_REFERENCE = `import numpy as np


def train_mlp_regression(X, y, hidden, lr, epochs, seed, val_fraction=0.25):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    n, d = X.shape
    k = int(round(n * val_fraction))
    if k < 1 or k > n - 1:
        raise ValueError("val_fraction muss beide Seiten nichtleer lassen")
    rng = np.random.default_rng(seed)
    W1 = rng.normal(size=(d, hidden)) * 0.5
    b1 = np.zeros(hidden)
    W2 = rng.normal(size=(hidden, 1)) * 0.5
    b2 = np.zeros(1)
    perm = rng.permutation(n)
    val_idx = perm[n - k:]
    train_idx = perm[:n - k]
    Xtr, ytr = X[train_idx], y[train_idx]
    Xva, yva = X[val_idx], y[val_idx]
    train_loss = []
    val_loss = []
    m = ytr.size
    for _ in range(int(epochs)):
        h_tr = np.maximum(0.0, Xtr @ W1 + b1)
        out_tr = h_tr @ W2 + b2
        train_loss.append(float(np.mean((out_tr - ytr) ** 2)))
        h_va = np.maximum(0.0, Xva @ W1 + b1)
        out_va = h_va @ W2 + b2
        val_loss.append(float(np.mean((out_va - yva) ** 2)))
        delta2 = (2.0 / m) * (out_tr - ytr)
        dW2 = h_tr.T @ delta2
        db2 = delta2.sum(axis=0)
        delta1 = (delta2 @ W2.T) * (h_tr > 0)
        dW1 = Xtr.T @ delta1
        db1 = delta1.sum(axis=0)
        W1 = W1 - lr * dW1
        b1 = b1 - lr * db1
        W2 = W2 - lr * dW2
        b2 = b2 - lr * db2
    return {"train_loss": train_loss, "val_loss": val_loss, "best_val_epoch": int(np.argmin(val_loss))}`;

const VAL_CURVE_PROMPT = String.raw`Final Boss Trainingsschleife: ein kleines MLP auf synthetischen Daten mit Validierung — ehrlich in Toy-Größe ($n \le 300$, Full-Batch, kein Framework, kein GPU-Claim). <code>train_mlp_regression(X, y, hidden, lr, epochs, seed, val_fraction=0.25)</code>: Initialisiere aus <code>rng = np.random.default_rng(seed)</code> zuerst <code>W1 = rng.normal(size=(d, hidden)) * 0.5</code>, <code>b1 = Nullen</code>, <code>W2 = rng.normal(size=(hidden, 1)) * 0.5</code>, <code>b2 = Nullen</code> und ziehe danach mit demselben <code>rng</code> die Split-Permutation (letzte $k = \mathrm{round}(n \cdot f)$ Indizes = Validierung, Rest = Training; $1 \le k \le n-1$, sonst <code>ValueError</code>). Pro Epoche (Epochenbeginn): notiere Trainings- und Validierungsverlust des aktuellen Modells, dann ein Full-Batch-SGD-Update nur auf Trainingsdaten (Backward wie in der Lektion „Backpropagation als Kettenregel“: $\mathrm{delta2} = \frac{2}{m}(\hat{y} - y)$, ReLU-Maske). Rückgabe: <code>{"train_loss": [...], "val_loss": [...], "best_val_epoch": int}</code> mit <code>best_val_epoch = argmin(val_loss)</code>. Der Test prüft Determinismus bei Doppelaufruf, Längen, dass der Trainingsverlust fällt, dass Validierung auf getrennten Indizes gerechnet wird (anderer Wert als Trainingsverlust in Epoche 0) und dass <code>best_val_epoch</code> im Bereich liegt.`;

const VAL_CURVE_SOLUTION = `def train_mlp_regression(X, y, hidden, lr, epochs, seed, val_fraction=0.25):
    n, d = X.shape
    k = int(round(n * val_fraction))
    if k < 1 or k > n - 1:
        raise ValueError("val_fraction muss beide Seiten nichtleer lassen")
    rng = np.random.default_rng(seed)
    W1 = rng.normal(size=(d, hidden)) * 0.5
    b1 = np.zeros(hidden)
    W2 = rng.normal(size=(hidden, 1)) * 0.5
    b2 = np.zeros(1)
    perm = rng.permutation(n)
    val_idx, train_idx = perm[n - k:], perm[:n - k]
    Xtr, ytr, Xva, yva = X[train_idx], y[train_idx], X[val_idx], y[val_idx]
    train_loss, val_loss = [], []
    m = ytr.size
    for _ in range(int(epochs)):
        h_tr = np.maximum(0.0, Xtr @ W1 + b1)
        out_tr = h_tr @ W2 + b2
        train_loss.append(float(np.mean((out_tr - ytr) ** 2)))
        h_va = np.maximum(0.0, Xva @ W1 + b1)
        val_loss.append(float(np.mean((h_va @ W2 + b2 - yva) ** 2)))
        delta2 = (2.0 / m) * (out_tr - ytr)
        dW2 = h_tr.T @ delta2
        db2 = delta2.sum(axis=0)
        delta1 = (delta2 @ W2.T) * (h_tr > 0)
        dW1 = Xtr.T @ delta1
        db1 = delta1.sum(axis=0)
        W1, b1 = W1 - lr * dW1, b1 - lr * db1
        W2, b2 = W2 - lr * dW2, b2 - lr * db2
    return {"train_loss": train_loss, "val_loss": val_loss, "best_val_epoch": int(np.argmin(val_loss))}

# Deterministischer Doppelaufruf, Trainingsverlust faellt, Validierung auf getrennten Indizes`;


// Draw domain: toy-scale datasets (n 120-260, d 2-5), small hidden layers,
// conservative learning rates and 40-80 epochs keep the generated run cheap
// in Pyodide. badFraction is one of the two contracted boundary violations;
// altSeed is a different training seed for the determinism contrast.
export const VAL_CURVE_CASES = {
  'mlp-val-curve-argmin': {
    difficulty: 'challenge',
    starterCode: VAL_CURVE_STARTER,
    baseTests: VAL_CURVE_BASE_TESTS,
    referenceSolver: VAL_CURVE_REFERENCE,
    prompt: VAL_CURVE_PROMPT,
    fullSolution: VAL_CURVE_SOLUTION,
    draw(r) {
      const trainSeed = randInt(r, 1, 9999);
      return {
        dataSeed: randInt(r, 1, 9999),
        n: randInt(r, 120, 260),
        d: randInt(r, 2, 5),
        hidden: randInt(r, 4, 12),
        lr: randInt(r, 5, 20) / 1000,
        epochs: randInt(r, 40, 80),
        trainSeed,
        altSeed: trainSeed + randInt(r, 1, 9),
        badFraction: pick(r, [0.0, 1.0]),
      };
    },
    extraCount: 2,
  },
};

// Appends the seeded literal checks: data is rebuilt from the drawn
// dataSeed inside the test; the assertions only pin contract-guaranteed
// properties (determinism, keys, lengths, argmin, int, split ValueError),
// never exact float curves.
function seededChecks(entry, index) {
  const i = index;
  const args = `__X${i}, __y${i}, ${entry.hidden}, ${pyNum(entry.lr)}, ${entry.epochs}, ${entry.trainSeed}`;
  return [
    `__dr${i} = np.random.default_rng(${entry.dataSeed})`,
    `__X${i} = __dr${i}.normal(size=(${entry.n}, ${entry.d}))`,
    `__y${i} = np.sin(__X${i}[:, :1]) * 0.8 + 0.1 * __dr${i}.normal(size=(${entry.n}, 1))`,
    `__a${i} = train_mlp_regression(${args})`,
    `__b${i} = train_mlp_regression(${args})`,
    `__check('seeded determinismus ${i}', __a${i} == __b${i})`,
    `__check('seeded schluessel ${i}', set(__a${i}.keys()) == {"train_loss", "val_loss", "best_val_epoch"})`,
    `__check('seeded laengen ${i}', len(__a${i}["train_loss"]) == ${entry.epochs} and len(__a${i}["val_loss"]) == ${entry.epochs})`,
    `__check('seeded val getrennt ${i}', __a${i}["val_loss"][0] != __a${i}["train_loss"][0])`,
    `__check('seeded best int ${i}', isinstance(__a${i}["best_val_epoch"], int) and 0 <= __a${i}["best_val_epoch"] < ${entry.epochs})`,
    `__check('seeded argmin ${i}', __a${i}["best_val_epoch"] == int(np.argmin(__a${i}["val_loss"])))`,
    `__c${i} = train_mlp_regression(__X${i}, __y${i}, ${entry.hidden}, ${pyNum(entry.lr)}, ${entry.epochs}, ${entry.altSeed})`,
    `__check('seeded anderer seed ${i}', __c${i}["train_loss"][0] != __a${i}["train_loss"][0])`,
    'try:',
    `    train_mlp_regression(${args}, val_fraction=${pyNum(entry.badFraction)})`,
    `    __check('seeded split vertrag ${i}', False, 'kein ValueError')`,
    'except ValueError:',
    `    __check('seeded split vertrag ${i}', True)`,
  ].join('\n');
}

export const VAL_CURVE_CONTRACT = {
  familyId: 'fit-mlp-val-curve-argmin',
  familyGroup: 'fit-model',
  summary: 'Trainiert ein MLP mit einem rng in fester Reihenfolge, führt Trainings- und Validierungsverlust pro Epoche und leitet best_val_epoch als Argmin ab.',
  taskArchetype: 'code-tests',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'mlp-val-curve-argmin', propertyTest: false },
  ],
  difficultyProfiles: ['challenge'],
  competencyIds: ['c-dl-training', 'c-dl-autograd'],
  graderId: 'pyodide',
  activityType: 'python-code',
};

// Capsule shape: parameters carry starterCode/tests/seedCases; tests must be
// the verbatim base block plus the seeded extras derived from seedCases.
const FAMILY = makeCaseFamily({
  contract: VAL_CURVE_CONTRACT,
  cases: VAL_CURVE_CASES,
  shapeError: 'Val-Curve-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, _caseId, seedCases) =>
    `# seeded extra cases\n${seedCases.map((entry, i) => seededChecks(entry, i + 1)).join('\n\n')}`,
  defaultPackages: PACKAGES,
});

export const valCurveCaseOk = FAMILY.caseOk;
export const genValCurveCase = FAMILY.genCase;
export const solveValCurveFamily = FAMILY.solve;
export const generateValCurveFamily = FAMILY.generate;
export const FAMILY_SPEC = FAMILY.spec;

// Procedural family fit-weight-decay-ablation: the task text, starter code
// and reference solver stay fixed; the seed draws fresh dataset shapes,
// hyperparameters and training seeds that get appended to the curated base
// test block as literal __check lines. The drawn data is rebuilt inside the
// test via np.random.default_rng(<dataSeed>) literals, so the checks stay
// honest without pinning float values — only the contracted properties are
// asserted (determinism, keys, falling loss, lam=0 equals the plain run,
// decay shrinks the weight norm, smaller lam shrinks less). Mirrors
// fit-mlp-val-curve-argmin.mjs.

import { pyNum } from './py_test_kit.mjs';

import { pick, randInt, rng } from '../generator_draw_kit.mjs';

const PACKAGES = ['numpy'];

const WEIGHT_DECAY_STARTER = `import numpy as np


def train_decay(X, y, lam, lr, epochs, seed):
    """Full-batch SGD on MSE + lam * L2 for y_hat = X @ w.

    grad = (2/n) * X.T @ (X @ w - y) + lam * w; init w from
    np.random.default_rng(seed).normal(size=(d, 1)) * 0.1.
    Return {'w': final weights, 'loss_history': [MSE at epoch start]}.
    """
    # init from seed, loop: record plain MSE (without the penalty term!),
    # then compute the gradient WITH lam * w and update
    ...


def compare_decay(X, y, lam, lr, epochs, seed):
    """Fair ablation: same seed and data, lam vs 0.

    Return {'norm_plain', 'norm_decay', 'final_loss_plain', 'final_loss_decay'}
    as floats; norms are np.linalg.norm(w) of the final weights.
    """
    ...
`;

const WEIGHT_DECAY_BASE_TESTS = `rng = np.random.default_rng(2106)
n = 100
X = rng.normal(size=(n, 3))
w_true = np.array([[1.2], [-0.6], [0.4]])
y = X @ w_true + 0.05 * rng.normal(size=(n, 1))
run1 = train_decay(X, y, 0.05, 0.05, 400, 42)
run2 = train_decay(X, y, 0.05, 0.05, 400, 42)
__check('Determinismus', np.array_equal(run1["w"], run2["w"]) and run1["loss_history"] == run2["loss_history"])
__check('Schluessel train', set(run1.keys()) == {"w", "loss_history"})
__check('Verlaufslaenge', len(run1["loss_history"]) == 400)
__check('Verlust faellt', run1["loss_history"][-1] < run1["loss_history"][0])
__check('w-Form', run1["w"].shape == (3, 1))
plain = train_decay(X, y, 0.0, 0.05, 400, 42)
cmp = compare_decay(X, y, 0.05, 0.05, 400, 42)
__check('Ablation-Schluessel', set(cmp.keys()) == {"norm_plain", "norm_decay", "final_loss_plain", "final_loss_decay"})
__check('Werte sind floats', all(isinstance(v, float) for v in cmp.values()))
__check('lam=0 ist der Plain-Lauf', abs(cmp["norm_plain"] - float(np.linalg.norm(plain["w"]))) < 1e-12 and abs(cmp["final_loss_plain"] - plain["loss_history"][-1]) < 1e-12)
__check('Ablation deterministisch', compare_decay(X, y, 0.05, 0.05, 400, 42) == cmp)
__check('Decay schrumpft Gewichte', cmp["norm_decay"] < cmp["norm_plain"])
__check('Norm-Werte plausibel', cmp["norm_decay"] > 0.0 and cmp["norm_plain"] > cmp["norm_decay"])
cmp_small = compare_decay(X, y, 0.001, 0.05, 400, 43)
__check('Kleines lambda schrumpft weniger', cmp_small["norm_decay"] > cmp["norm_decay"] or abs(cmp_small["norm_decay"] - cmp["norm_decay"]) < 1e-3)`;

const WEIGHT_DECAY_REFERENCE = `import numpy as np


def train_decay(X, y, lam, lr, epochs, seed):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    n, d = X.shape
    rng = np.random.default_rng(seed)
    w = rng.normal(size=(d, 1)) * 0.1
    loss_history = []
    for _ in range(int(epochs)):
        pred = X @ w
        loss_history.append(float(np.mean((pred - y) ** 2)))
        grad = (2.0 / n) * (X.T @ (pred - y)) + lam * w
        w = w - lr * grad
    return {"w": w, "loss_history": loss_history}


def compare_decay(X, y, lam, lr, epochs, seed):
    decayed = train_decay(X, y, lam, lr, epochs, seed)
    plain = train_decay(X, y, 0.0, lr, epochs, seed)
    return {
        "norm_plain": float(np.linalg.norm(plain["w"])),
        "norm_decay": float(np.linalg.norm(decayed["w"])),
        "final_loss_plain": float(plain["loss_history"][-1]),
        "final_loss_decay": float(decayed["loss_history"][-1]),
    }`;

const WEIGHT_DECAY_PROMPT = String.raw`Final Boss faire Ablation: misst Weight Decay wirklich etwas — oder nur der Zufall? <code>train_decay(X, y, lam, lr, epochs, seed)</code> trainiert ein lineares Modell $\hat{y} = Xw$ mit Full-Batch-SGD auf den MSE mit L2-Term: Gradient $\frac{2}{n} X^\top (Xw - y) + \lambda w$, Update $w \leftarrow w - \mathrm{lr} \cdot \mathrm{grad}$, Start $w = $ <code>rng.normal(size=(d, 1)) * 0.1</code> aus <code>np.random.default_rng(seed)</code>. Rückgabe: <code>{"w": finales w, "loss_history": [MSE zu Epochenbeginn]}</code>. <code>compare_decay(X, y, lam, lr, epochs, seed)</code> fährt die <em>faire</em> Ablation: zweimal <code>train_decay</code> mit demselben Seed — einmal mit $\lambda$ und einmal mit $\lambda = 0$ — und gibt <code>{"norm_plain": float, "norm_decay": float, "final_loss_plain": float, "final_loss_decay": float}</code> zurück (Norm: $\lVert w \rVert_2$ als float). Der Test prüft Determinismus, dass $\lambda = 0$ zum identischen Plain-Lauf führt, dass die Gewichte mit Decay kleiner bleiben und dass beide Verläufe fallen.`;

const WEIGHT_DECAY_SOLUTION = `def train_decay(X, y, lam, lr, epochs, seed):
    rng = np.random.default_rng(seed)
    w = rng.normal(size=(X.shape[1], 1)) * 0.1
    loss_history = []
    for _ in range(int(epochs)):
        pred = X @ w
        loss_history.append(float(np.mean((pred - y) ** 2)))
        grad = (2.0 / X.shape[0]) * (X.T @ (pred - y)) + lam * w
        w = w - lr * grad
    return {"w": w, "loss_history": loss_history}

def compare_decay(X, y, lam, lr, epochs, seed):
    decayed = train_decay(X, y, lam, lr, epochs, seed)
    plain = train_decay(X, y, 0.0, lr, epochs, seed)
    return {
        "norm_plain": float(np.linalg.norm(plain["w"])),
        "norm_decay": float(np.linalg.norm(decayed["w"])),
        "final_loss_plain": float(plain["loss_history"][-1]),
        "final_loss_decay": float(decayed["loss_history"][-1]),
    }

# Gleicher Seed: nur lambda unterscheidet die Laeufe; Decay haelt die Gewichtsnorm kleiner`;


const W_TRUE_POOL = [-1.5, -1, -0.5, 0.5, 1, 1.5, 2];
const LAM_CHOICES = [0.04, 0.06, 0.08, 0.1];
const LR_CHOICES = [0.01, 0.02, 0.05];

// Draw domain: toy-scale datasets (n 80-220, d 2-5), moderate lambda values,
// conservative learning rates and 300-500 epochs keep the generated run
// converged enough that the contracted shrinkage holds (checked empirically:
// the decayed norm stays strictly below the plain norm across the domain).
// altSeed is a different training seed for the smaller-lambda contrast run,
// mirroring the base block's seed change; wTrue is drawn as a literal column
// vector of nonzero half-step weights.
export const WEIGHT_DECAY_CASES = {
  'weight-decay-ablation': {
    difficulty: 'challenge',
    starterCode: WEIGHT_DECAY_STARTER,
    baseTests: WEIGHT_DECAY_BASE_TESTS,
    referenceSolver: WEIGHT_DECAY_REFERENCE,
    prompt: WEIGHT_DECAY_PROMPT,
    fullSolution: WEIGHT_DECAY_SOLUTION,
    drawEntry(r) {
      const trainSeed = randInt(r, 1, 9999);
      const d = randInt(r, 2, 5);
      const lam = pick(r, LAM_CHOICES);
      return {
        dataSeed: randInt(r, 1, 9999),
        n: randInt(r, 80, 220),
        d,
        lam,
        lamSmall: Math.round((lam / 5) * 1000) / 1000,
        lr: pick(r, LR_CHOICES),
        epochs: randInt(r, 300, 500),
        trainSeed,
        altSeed: trainSeed + randInt(r, 1, 9),
        wTrue: Array.from({ length: d }, () => pick(r, W_TRUE_POOL)),
      };
    },
    extraCount: 2,
  },
};

// Appends the seeded literal checks: data is rebuilt from the drawn dataSeed
// inside the test; the assertions only pin contract-guaranteed properties
// (determinism, keys, falling loss, w shape, lam=0 equals the plain run,
// float results, decay shrinkage, smaller-lambda soft check), never exact
// float values.
function seededChecks(entry, index) {
  const i = index;
  const wTrueLit = `np.array([${entry.wTrue.map((v) => `[${pyNum(v)}]`).join(', ')}])`;
  const args = `__X${i}, __y${i}, ${entry.lam}, ${entry.lr}, ${entry.epochs}, ${entry.trainSeed}`;
  return [
    `__dr${i} = np.random.default_rng(${entry.dataSeed})`,
    `__X${i} = __dr${i}.normal(size=(${entry.n}, ${entry.d}))`,
    `__wt${i} = ${wTrueLit}`,
    `__y${i} = __X${i} @ __wt${i} + 0.05 * __dr${i}.normal(size=(${entry.n}, 1))`,
    `__a${i} = train_decay(${args})`,
    `__b${i} = train_decay(${args})`,
    `__check('seeded determinismus ${i}', np.array_equal(__a${i}["w"], __b${i}["w"]) and __a${i}["loss_history"] == __b${i}["loss_history"])`,
    `__check('seeded schluessel ${i}', set(__a${i}.keys()) == {"w", "loss_history"})`,
    `__check('seeded verlauf ${i}', len(__a${i}["loss_history"]) == ${entry.epochs} and __a${i}["loss_history"][-1] < __a${i}["loss_history"][0])`,
    `__check('seeded form ${i}', __a${i}["w"].shape == (${entry.d}, 1))`,
    `__p${i} = train_decay(__X${i}, __y${i}, 0.0, ${entry.lr}, ${entry.epochs}, ${entry.trainSeed})`,
    `__c${i} = compare_decay(${args})`,
    `__check('seeded ablation schluessel ${i}', set(__c${i}.keys()) == {"norm_plain", "norm_decay", "final_loss_plain", "final_loss_decay"})`,
    `__check('seeded floats ${i}', all(isinstance(v, float) for v in __c${i}.values()))`,
    `__check('seeded lam0 plain ${i}', abs(__c${i}["norm_plain"] - float(np.linalg.norm(__p${i}["w"]))) < 1e-12 and abs(__c${i}["final_loss_plain"] - __p${i}["loss_history"][-1]) < 1e-12)`,
    `__check('seeded ablation deterministisch ${i}', compare_decay(${args}) == __c${i})`,
    `__check('seeded decay schrumpft ${i}', __c${i}["norm_decay"] < __c${i}["norm_plain"])`,
    `__cs${i} = compare_decay(__X${i}, __y${i}, ${entry.lamSmall}, ${entry.lr}, ${entry.epochs}, ${entry.altSeed})`,
    `__check('seeded kleiner lambda ${i}', __cs${i}["norm_decay"] > __c${i}["norm_decay"] or abs(__cs${i}["norm_decay"] - __c${i}["norm_decay"]) < 1e-3)`,
  ].join('\n');
}

// Capsule shape: parameters carry starterCode/tests/seedCases; tests must be
// the verbatim base block plus the seeded extras derived from seedCases.
export function weightDecayCaseOk(parameters, caseDef) {
  try {
    if (!parameters || typeof parameters !== 'object') return false;
    if (parameters.starterCode !== caseDef.starterCode) return false;
    if (!Array.isArray(parameters.seedCases) || parameters.seedCases.length !== caseDef.extraCount) return false;
    const rebuilt = parameters.seedCases
      .map((entry, i) => seededChecks(entry, i + 1))
      .join('\n\n');
    return parameters.tests === `${caseDef.baseTests}\n\n# seeded extra cases\n${rebuilt}`;
  } catch { return false; }
}

export function genWeightDecayCase(seed, caseDef) {
  const r = rng(seed);
  const seedCases = Array.from({ length: caseDef.extraCount }, () => caseDef.drawEntry(r));
  const extras = seedCases.map((entry, i) => seededChecks(entry, i + 1)).join('\n\n');
  return {
    parameters: {
      packages: PACKAGES,
      starterCode: caseDef.starterCode,
      tests: `${caseDef.baseTests}\n\n# seeded extra cases\n${extras}`,
      seedCases,
    },
    expected: { kind: 'reference-solver', referenceSolver: caseDef.referenceSolver },
    prompt: caseDef.prompt,
    fullSolution: caseDef.fullSolution,
  };
}

export function solveWeightDecayFamily(parameters) {
  const caseDef = Object.values(WEIGHT_DECAY_CASES).find((item) => weightDecayCaseOk(parameters, item));
  if (!caseDef) throw new Error('Weight-Decay-Parameter verletzen die Kapselform');
  return { referenceCode: caseDef.referenceSolver };
}

export const WEIGHT_DECAY_CONTRACT = {
  familyId: 'fit-weight-decay-ablation',
  familyGroup: 'fit-model',
  summary: 'Führt eine faire Weight-Decay-Ablation durch: zweimal train_decay mit identischem Seed, reiner MSE in der Historie, λ·w nur im Gradienten.',
  taskArchetype: 'code-tests',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'weight-decay-ablation', propertyTest: false },
  ],
  difficultyProfiles: ['challenge'],
  competencyIds: ['c-dl-regularization', 'c-ml-cv'],
  graderId: 'pyodide',
  activityType: 'python-code',
};

export function generateWeightDecayFamily({ seed, caseId, difficulty }) {
  if (!Number.isSafeInteger(seed)) throw new Error('Seed muss eine ganze Zahl sein');
  const caseDef = WEIGHT_DECAY_CASES[caseId];
  if (!caseDef || caseDef.difficulty !== difficulty) {
    throw new Error(`Unbekannter Fall ${caseId} für Profil ${difficulty}`);
  }
  return genWeightDecayCase(seed, caseDef);
}

export const FAMILY_SPEC = { ...WEIGHT_DECAY_CONTRACT, generate: generateWeightDecayFamily, solve: solveWeightDecayFamily };

// Procedural family optimize-sgd-step-pure-update: task text, starter code
// and reference solver stay fixed; the seed draws fresh training fixtures
// (data seeds, widths, learning rates) for the pure train step and fresh
// parameter/gradient/velocity dictionaries plus lr/momentum for the
// momentum step. The draws get appended to the curated base test block as
// literal __check lines whose expected values are asserted inline (np.*
// reference copies and closed-form update terms), so the grading contract
// cannot drift. Mirrors formula-descriptive-stats-numpy.mjs.

import { randInt, rng } from '../generator_draw_kit.mjs';

const PACKAGES = ['numpy'];

const TRAIN_STARTER = `import numpy as np


def train_step(X, y, params, lr):
    """One SGD step on the 2-layer MLP; return (loss, new_params).

    loss is the MSE of the CURRENT params (before the update); new_params is
    a fresh dict with updated copies — never mutate the input dict.
    """
    # 1) forward: hidden = relu(X @ W1 + b1); out = hidden @ W2 + b2
    # 2) loss = float(np.mean((out - y) ** 2))
    # 3) backward (delta2/dW2/db1/... as in the lesson)
    # 4) new_params = {k: params[k] - lr * grad_k} for all four entries
    ...
`;

const TRAIN_BASE_TESTS = `rng = np.random.default_rng(1906)
X = rng.normal(size=(20, 3))
y = (X[:, :1] * 1.5 - X[:, 1:2] * 0.5 + 0.25) + 0.05 * rng.normal(size=(20, 1))
params = {
    "W1": rng.normal(size=(3, 8)) * 0.5,
    "b1": np.zeros(8),
    "W2": rng.normal(size=(8, 1)) * 0.5,
    "b2": np.zeros(1),
}
snapshot = {k: v.copy() for k, v in params.items()}
loss0, params0 = train_step(X, y, params, 0.0)
__check('lr=0 aendert Parameter nicht', all(np.array_equal(params[k], snapshot[k]) for k in params) and all(np.array_equal(params0[k], snapshot[k]) for k in params0))
__check('loss ist float', isinstance(loss0, float) and np.isfinite(loss0))
loss_ref = float(np.mean((np.maximum(0.0, X @ snapshot["W1"] + snapshot["b1"]) @ snapshot["W2"] + snapshot["b2"] - y) ** 2))
__check('loss = aktueller MSE', abs(loss0 - loss_ref) < 1e-12)
_, params_small = train_step(X, y, params, 0.001)
loss_small, _ = train_step(X, y, params_small, 0.0)
__check('kleiner Schritt senkt Verlust', loss_small < loss0)
h = 1e-5
Wp = {**snapshot, "W2": snapshot["W2"].copy()}; Wp["W2"][0, 0] += h
Wm = {**snapshot, "W2": snapshot["W2"].copy()}; Wm["W2"][0, 0] -= h
num_grad = (train_step(X, y, Wp, 0.0)[0] - train_step(X, y, Wm, 0.0)[0]) / (2 * h)
_, params_step = train_step(X, y, params, 0.01)
__check('Update folgt numerischem Gradienten', abs((snapshot["W2"][0, 0] - params_step["W2"][0, 0]) / 0.01 - num_grad) < 1e-5)
current = {k: v.copy() for k, v in params.items()}
first = train_step(X, y, current, 0.0)[0]
for _ in range(40):
    _, current = train_step(X, y, current, 0.01)
last = train_step(X, y, current, 0.0)[0]
__check('40 Schritte senken Verlust deutlich', last < 0.5 * first)
__check('Doppelaufruf deterministisch', train_step(X, y, params, 0.01)[0] == loss0 and np.array_equal(train_step(X, y, params, 0.01)[1]["W1"], train_step(X, y, params, 0.01)[1]["W1"]))`;

const MOMENTUM_STARTER = `import numpy as np


def momentum_step(params, grads, velocity, lr, momentum):
    ...
`;

const MOMENTUM_BASE_TESTS = `params = {"w": np.array([1.0, -2.0]), "b": np.array([0.5])}
grads = {"w": np.array([2.0, -4.0]), "b": np.array([1.0])}
velocity = {"w": np.array([0.5, 1.0]), "b": np.array([0.0])}
new_params, new_velocity = momentum_step(params, grads, velocity, 0.1, 0.9)
__check('Momentumgeschwindigkeit', np.allclose(new_velocity["w"], [2.45, -3.1]))
__check('Update mit neuer Geschwindigkeit', np.allclose(new_params["w"], [0.755, -1.69]))
__check('Bias getrennt', np.allclose(new_params["b"], [0.4]))
__check('Eingabe unverändert', np.array_equal(params["w"], [1.0, -2.0]) and np.array_equal(velocity["w"], [0.5, 1.0]))
`;

const TRAIN_REFERENCE = `import numpy as np

def train_step(X, y, params, lr):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    W1 = np.asarray(params["W1"], dtype=float)
    b1 = np.asarray(params["b1"], dtype=float)
    W2 = np.asarray(params["W2"], dtype=float)
    b2 = np.asarray(params["b2"], dtype=float)
    hidden = np.maximum(0.0, X @ W1 + b1)
    out = hidden @ W2 + b2
    loss = float(np.mean((out - y) ** 2))
    m = out.size
    delta2 = (2.0 / m) * (out - y)
    dW2 = hidden.T @ delta2
    db2 = delta2.sum(axis=0)
    delta1 = (delta2 @ W2.T) * (hidden > 0)
    dW1 = X.T @ delta1
    db1 = delta1.sum(axis=0)
    new_params = {
        "W1": W1 - lr * dW1,
        "b1": b1 - lr * db1,
        "W2": W2 - lr * dW2,
        "b2": b2 - lr * db2,
    }
    return loss, new_params`;

const MOMENTUM_REFERENCE = `import numpy as np

def momentum_step(params, grads, velocity, lr, momentum):
    new_velocity = {key: momentum * np.asarray(velocity[key], dtype=float) + np.asarray(grads[key], dtype=float) for key in params}
    new_params = {key: np.asarray(params[key], dtype=float) - lr * new_velocity[key] for key in params}
    return new_params, new_velocity
`;

const TRAIN_PROMPT = 'Final Boss Autograd: ein kompletter Trainings-Teilschritt aus einer Hand. <code>train_step(X, y, params, lr)</code> bekommt <code>params = {"W1": ..., "b1": ..., "W2": ..., "b2": ...}</code> (2-Layer-MLP mit ReLU, $L = \\mathrm{mean}((\\hat{y} - y)^2)$) und führt Vorwärts, Backward und ein SGD-Update <code>p ← p − lr · grad</code> für alle vier Parameter aus. Rückgabe: Tupel <code>(loss, new_params)</code> — <code>loss</code> als float des <em>aktuellen</em> Modells vor dem Update, <code>new_params</code> als neues Dictionary mit denselben Schlüsseln und Formen (das Eingabe-Dictionary darf nicht verändert werden). Der Test prüft: <code>lr = 0</code> ändert nichts; ein kleiner Schritt senkt den Verlust; das Update von <code>W2[0,0]</code> stimmt mit der zentralen Differenz aus deinem eigenen Schritt überein; 40 Schritte senken den Verlust deutlich.';

const MOMENTUM_PROMPT = 'Implementiere einen reinen Momentum-SGD-Schritt für Dictionaries aus NumPy-Arrays: $v_{neu}=\\mu v+g$ und $p_{neu}=p-lr\\,v_{neu}$.';

const TRAIN_SOLUTION = `${TRAIN_REFERENCE}

# lr=0 identisch, kleiner Schritt senkt, Update matcht die zentrale Differenz, 40 Schritte halbieren den Verlust`;

const MOMENTUM_SOLUTION = 'Für jeden Schlüssel wird zuerst die neue Geschwindigkeit aus altem Momentum und aktuellem Gradienten berechnet. Danach entsteht ein neues Parameter-Dictionary; weder Parameter noch alte Geschwindigkeiten werden verändert.';

// Python literal emitters: floats keep a decimal point so arrays stay float.
const pyFloat = (n) => (Number.isInteger(n) ? `${n}.0` : String(n));
const pyVec = (values) => `[${values.map(pyFloat).join(', ')}]`;
const pyArr = (values) => `np.array(${pyVec(values)})`;

// Seeded prelude for the pure train step: an independent __ref_step copy so
// the seeded checks can assert loss AND the full parameter update inline.
const TRAIN_SEEDED_PRELUDE = `def __ref_step(X, y, params, lr):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    W1 = np.asarray(params["W1"], dtype=float)
    b1 = np.asarray(params["b1"], dtype=float)
    W2 = np.asarray(params["W2"], dtype=float)
    b2 = np.asarray(params["b2"], dtype=float)
    hidden = np.maximum(0.0, X @ W1 + b1)
    out = hidden @ W2 + b2
    loss = float(np.mean((out - y) ** 2))
    m = out.size
    delta2 = (2.0 / m) * (out - y)
    dW2 = hidden.T @ delta2
    db2 = delta2.sum(axis=0)
    delta1 = (delta2 @ W2.T) * (hidden > 0)
    dW1 = X.T @ delta1
    db1 = delta1.sum(axis=0)
    return loss, {"W1": W1 - lr * dW1, "b1": b1 - lr * db1, "W2": W2 - lr * dW2, "b2": b2 - lr * db2}`;

const TRAIN_LRS = [0.001, 0.005, 0.01, 0.02, 0.05];
const TRAIN_HIDDEN = [4, 6, 8];
const MOMENTUM_LRS = [0.05, 0.1, 0.2, 0.5];
const MOMENTUM_MUS = [0.0, 0.5, 0.8, 0.9];

const drawVec = (r, len, lo, hi) => Array.from({ length: len }, () => randInt(r, lo, hi));

// Case definitions: the draw domains produce concrete literals that get baked
// into the test block (honest distinctness — the drawn inputs differ, not just
// a seed literal).
export const SGD_CASES = {
  'pure-train-step': {
    difficulty: 'challenge',
    starterCode: TRAIN_STARTER,
    baseTests: TRAIN_BASE_TESTS,
    referenceSolver: TRAIN_REFERENCE,
    prompt: TRAIN_PROMPT,
    fullSolution: TRAIN_SOLUTION,
    seededPrelude: TRAIN_SEEDED_PRELUDE,
    drawCase(r) {
      return {
        dataSeed: randInt(r, 0, 9999),
        n: randInt(r, 12, 24),
        hidden: TRAIN_HIDDEN[randInt(r, 0, TRAIN_HIDDEN.length - 1)],
        lr: TRAIN_LRS[randInt(r, 0, TRAIN_LRS.length - 1)],
      };
    },
    emitChecks(entry, index) {
      const { dataSeed, n, hidden, lr } = entry;
      return [
        `__rng${index} = np.random.default_rng(${dataSeed})`,
        `__X${index} = __rng${index}.normal(size=(${n}, 3))`,
        `__y${index} = (__X${index}[:, :1] * 1.5 - __X${index}[:, 1:2] * 0.5 + 0.25) + 0.05 * __rng${index}.normal(size=(${n}, 1))`,
        `__p${index} = {"W1": __rng${index}.normal(size=(3, ${hidden})) * 0.5, "b1": np.zeros(${hidden}), "W2": __rng${index}.normal(size=(${hidden}, 1)) * 0.5, "b2": np.zeros(1)}`,
        `__snap${index} = {k: v.copy() for k, v in __p${index}.items()}`,
        `__ls${index}, __nw${index} = train_step(__X${index}, __y${index}, __p${index}, ${lr})`,
        `__rl${index}, __rn${index} = __ref_step(__X${index}, __y${index}, __snap${index}, ${lr})`,
        `__check('seeded step loss ${index}', abs(__ls${index} - __rl${index}) < 1e-9)`,
        `__check('seeded step update ${index}', all(np.allclose(__nw${index}[k], __rn${index}[k]) for k in __rn${index}))`,
        `__check('seeded step eingabe stabil ${index}', all(np.array_equal(__p${index}[k], __snap${index}[k]) for k in __p${index}))`,
      ].join('\n');
    },
    extraCount: 2,
  },
  'sgd-momentum-step': {
    difficulty: 'challenge',
    starterCode: MOMENTUM_STARTER,
    baseTests: MOMENTUM_BASE_TESTS,
    referenceSolver: MOMENTUM_REFERENCE,
    prompt: MOMENTUM_PROMPT,
    fullSolution: MOMENTUM_SOLUTION,
    drawCase(r) {
      const wLen = randInt(r, 2, 3);
      return {
        params: { w: drawVec(r, wLen, -3, 3), b: drawVec(r, 1, -3, 3) },
        grads: { w: drawVec(r, wLen, -4, 4), b: drawVec(r, 1, -4, 4) },
        velocity: { w: drawVec(r, wLen, -2, 2), b: drawVec(r, 1, -2, 2) },
        lr: MOMENTUM_LRS[randInt(r, 0, MOMENTUM_LRS.length - 1)],
        momentum: MOMENTUM_MUS[randInt(r, 0, MOMENTUM_MUS.length - 1)],
      };
    },
    emitChecks(entry, index) {
      const { params, grads, velocity, lr, momentum } = entry;
      const pW = pyArr(params.w); const pB = pyArr(params.b);
      const gW = pyArr(grads.w); const gB = pyArr(grads.b);
      const vW = pyArr(velocity.w); const vB = pyArr(velocity.b);
      return [
        `__mp${index} = {"w": ${pW}, "b": ${pB}}`,
        `__mg${index} = {"w": ${gW}, "b": ${gB}}`,
        `__mv${index} = {"w": ${vW}, "b": ${vB}}`,
        `__mnp${index}, __mnv${index} = momentum_step(__mp${index}, __mg${index}, __mv${index}, ${lr}, ${momentum})`,
        `__check('seeded momentum v ${index}', np.allclose(__mnv${index}["w"], ${momentum} * ${vW} + ${gW}) and np.allclose(__mnv${index}["b"], ${momentum} * ${vB} + ${gB}))`,
        `__check('seeded momentum p ${index}', np.allclose(__mnp${index}["w"], ${pW} - ${lr} * (${momentum} * ${vW} + ${gW})) and np.allclose(__mnp${index}["b"], ${pB} - ${lr} * (${momentum} * ${vB} + ${gB})))`,
        `__check('seeded momentum eingabe ${index}', np.array_equal(__mp${index}["w"], ${pW}) and np.array_equal(__mv${index}["w"], ${vW}))`,
      ].join('\n');
    },
    extraCount: 2,
  },
};

// Assembles the seeded block: optional per-case prelude (reference copies)
// followed by the per-draw literal checks.
function seededBlock(caseDef, seedCases) {
  const extras = seedCases.map((entry, i) => caseDef.emitChecks(entry, i + 1)).join('\n');
  return caseDef.seededPrelude ? `${caseDef.seededPrelude}\n${extras}` : extras;
}

// Capsule shape: parameters carry starterCode/tests/seedCases; tests must be
// the verbatim base block plus the seeded extras derived from seedCases.
export function sgdCaseOk(parameters, caseDef) {
  try {
    if (!parameters || typeof parameters !== 'object') return false;
    if (parameters.starterCode !== caseDef.starterCode) return false;
    if (!Array.isArray(parameters.seedCases) || parameters.seedCases.length !== caseDef.extraCount) return false;
    return parameters.tests === `${caseDef.baseTests}\n\n# seeded extra cases\n${seededBlock(caseDef, parameters.seedCases)}`;
  } catch { return false; }
}

export function genSgdCase(seed, caseDef) {
  const r = rng(seed);
  const seedCases = Array.from({ length: caseDef.extraCount }, () => caseDef.drawCase(r));
  return {
    parameters: {
      packages: PACKAGES,
      starterCode: caseDef.starterCode,
      tests: `${caseDef.baseTests}\n\n# seeded extra cases\n${seededBlock(caseDef, seedCases)}`,
      seedCases,
    },
    expected: { kind: 'reference-solver', referenceSolver: caseDef.referenceSolver },
    prompt: caseDef.prompt,
    fullSolution: caseDef.fullSolution,
  };
}

export function solveSgdFamily(parameters) {
  const caseDef = Object.values(SGD_CASES).find((item) => sgdCaseOk(parameters, item));
  if (!caseDef) throw new Error('SGD-Step-Parameter verletzen die Kapselform');
  return { referenceCode: caseDef.referenceSolver };
}

export const SGD_CONTRACT = {
  familyId: 'optimize-sgd-step-pure-update',
  familyGroup: 'optimize-update',
  summary: 'Implementiert einen vollständigen SGD-Trainingsschritt als reine Funktion: Verlust vor dem Update, Update in neue Parameter, Eingabe unverändert.',
  taskArchetype: 'code-tests',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'pure-train-step', propertyTest: false },
    { caseId: 'sgd-momentum-step', propertyTest: false },
  ],
  difficultyProfiles: ['challenge', 'core', 'stretch'],
  competencyIds: ['c-dl-autograd', 'c-grad-regression'],
  graderId: 'pyodide',
  activityType: 'python-code',
};

export function generateSgdFamily({ seed, caseId, difficulty }) {
  if (!Number.isSafeInteger(seed)) throw new Error('Seed muss eine ganze Zahl sein');
  const caseDef = SGD_CASES[caseId];
  if (!caseDef || caseDef.difficulty !== difficulty) {
    throw new Error(`Unbekannter Fall ${caseId} für Profil ${difficulty}`);
  }
  return genSgdCase(seed, caseDef);
}

export const FAMILY_SPEC = { ...SGD_CONTRACT, generate: generateSgdFamily, solve: solveSgdFamily };

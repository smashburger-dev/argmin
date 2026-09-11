// Procedural family fit-early-stopping-roundtrip: the task text, starter code
// and reference solver stay fixed; the seed draws fresh validation-loss curves
// (with patience and, for the sibling case, min_delta) plus small model dicts
// that get appended to the curated base test block as literal __check lines.
// The patience scan cannot be expressed as a np.* one-liner, so a renamed copy
// of the reference (__ref_early_stop) is embedded once per seeded block and the
// learner's function is compared against it on the drawn literals; the state
// roundtrip is asserted via inline np.* expressions. Mirrors
// formula-descriptive-stats-numpy.mjs.

import { pyNum, pyList } from './py_test_kit.mjs';

import { randInt, rng } from '../generator_draw_kit.mjs';

const PACKAGES = ['numpy'];

const ROUNDTRIP_STARTER = `import numpy as np


def early_stop_epoch(val_losses, patience):
    """Return the best epoch (0-based int) under the patience rule.

    best stays at the FIRST index of the running minimum (ties keep the
    earlier epoch); the scan stops once i - best > patience. If that never
    happens, return the global argmin.
    """
    # iterate with index, track best index (strictly smaller updates only)
    ...


def to_state(model):
    """Return {name: arr.tolist()} so the state is JSON-serializable."""
    ...


def from_state(state):
    """Return {name: np.asarray(value, dtype=np.float64)} with equal shapes."""
    ...
`;

const MIN_DELTA_STARTER = `import numpy as np


def early_stop_epoch(val_losses, patience, min_delta):
    ...


def to_state(model):
    ...


def from_state(state):
    ...
`;

const ROUNDTRIP_BASE_TESTS = `import json
__check('Abbruch nach patience=1', early_stop_epoch([1.0, 0.5, 0.6, 0.7, 0.8], 1) == 1)
__check('patience=0 stoppt sofort', early_stop_epoch([1.0, 2.0, 3.0], 0) == 0)
__check('monoton fallend: letzte Epoche', early_stop_epoch([3.0, 2.0, 1.0], 2) == 2)
__check('Gleichstand haelt fruehere Epoche', early_stop_epoch([1.0, 1.0, 1.0], 3) == 0)
__check('typische Overfitting-Kurve', early_stop_epoch([0.9, 0.6, 0.5, 0.55, 0.6, 0.7, 0.8], 2) == 2)
__check('Rueckgabe ist int', isinstance(early_stop_epoch([1.0, 0.5], 1), int))
model = {
    "W1": np.array([[0.5, -0.25], [1.0, 2.0], [-3.5, 0.0]]),
    "b1": np.array([0.1, -0.2]),
    "W2": np.array([[1.0], [-2.0]]),
    "b2": np.array([0.3]),
}
state = to_state(model)
__check('to_state ist reine Listen', all(isinstance(v, list) for v in state.values()))
__check('Schluessel bleiben', set(state.keys()) == set(model.keys()))
__check('JSON-serialisierbar', isinstance(json.dumps(state), str))
restored = from_state(state)
__check('Round-Trip exakt', all(np.array_equal(restored[k], model[k]) for k in model))
__check('Round-Trip Formen', all(restored[k].shape == model[k].shape for k in model))
__check('Round-Trip dtype float64', all(restored[k].dtype == np.float64 for k in restored))
restored2 = from_state(to_state(restored))
__check('Zweiter Round-Trip stabil', all(np.array_equal(restored2[k], restored[k]) for k in restored))`;

const MIN_DELTA_BASE_TESTS = `__check('bester Index bleibt bei 1', early_stop_epoch([0.9, 0.5, 0.505, 0.51], 2, 0.01) == 1)
__check('verbesserung setzt zurueck', early_stop_epoch([0.9, 0.5, 0.505, 0.48, 0.49], 2, 0.01) == 3)
__check('Gleichstand frueh', early_stop_epoch([1.0, 1.0, 1.0], 1, 0.0) == 0)
model = {"w": np.array([[1.0, -2.0]]), "b": np.array([0.5])}
state = to_state(model)
__check('Listenstatus', all(isinstance(value, list) for value in state.values()))
__check('Round-Trip', all(np.array_equal(from_state(state)[key], model[key]) for key in model))
__check('float64', all(from_state(state)[key].dtype == np.float64 for key in model))
`;

const ROUNDTRIP_REFERENCE = `import numpy as np


def early_stop_epoch(val_losses, patience):
    best = 0
    for i, loss in enumerate(val_losses):
        if loss < val_losses[best]:
            best = i
        if i - best > patience:
            break
    return int(best)


def to_state(model):
    return {name: np.asarray(arr).tolist() for name, arr in model.items()}


def from_state(state):
    return {name: np.asarray(value, dtype=np.float64) for name, value in state.items()}`;

const MIN_DELTA_REFERENCE = `import numpy as np

def early_stop_epoch(val_losses, patience, min_delta):
    best_index = 0
    best_loss = float(val_losses[0])
    wait = 0
    for index, loss in enumerate(val_losses):
        loss = float(loss)
        if best_loss - loss > min_delta:
            best_loss = loss
            best_index = index
            wait = 0
        elif index != best_index:
            wait += 1
        if wait >= patience:
            return int(best_index)
    return int(best_index)

def to_state(model):
    return {name: np.asarray(value).tolist() for name, value in model.items()}

def from_state(state):
    return {name: np.asarray(value, dtype=np.float64) for name, value in state.items()}
`;

const ROUNDTRIP_PROMPT = 'Early Stopping und Save/Load. <code>early_stop_epoch(val_losses, patience)</code> durchläuft die Epochen und merkt sich die beste Epoche (kleinster Verlust bisher; bei Gleichstand bleibt der frühere Index). Sobald mehr als <code>patience</code> Epochen seit der letzten Verbesserung vergangen sind, endet der Scan — zurück kommt die beste Epoche als <code>int</code> (0-basiert). Läuft die Liste nie in den Abbruch, ist es der globale Argmin. <code>to_state(model)</code> wandelt ein Dictionary von NumPy-Arrays in ein JSON-fähiges Dictionary von Listen (<code>arr.tolist()</code>); <code>from_state(state)</code> macht daraus mit <code>np.asarray(value, dtype=np.float64)</code> wieder Arrays. Der Test prüft die Stopp-Regel auf vier Kurven, den Round-Trip (gleiche Schlüssel, Formen und exakt gleiche Werte) und dass <code>json.dumps</code> den Zustand serialisieren kann.';

const MIN_DELTA_PROMPT = 'Erweitere Early Stopping um eine strikte <code>min_delta</code>-Schwelle und halte zusätzlich den JSON-sicheren Array-Round-Trip ein.';

const ROUNDTRIP_SOLUTION = `def early_stop_epoch(val_losses, patience):
    best = 0
    for i, loss in enumerate(val_losses):
        if loss < val_losses[best]:
            best = i
        if i - best > patience:
            break
    return int(best)

def to_state(model):
    return {name: np.asarray(arr).tolist() for name, arr in model.items()}

def from_state(state):
    return {name: np.asarray(value, dtype=np.float64) for name, value in state.items()}

# [1.0, 0.5, 0.6, 0.7, 0.8] mit patience 1 -> beste Epoche 1; Round-Trip ist wertexakt`;

const MIN_DELTA_SOLUTION = 'Ein neuer Bestwert wird nur akzeptiert, wenn der Verlust um mehr als min_delta fällt. Nach patience nicht ausreichenden Epochen wird der bisher beste Index zurückgegeben; to_state und from_state bewahren Schlüssel, Formen und float64-Werte.';

// Renamed copies of the reference solvers' early_stop_epoch bodies — embedded
// once into the seeded test block so the learner's scan can be compared
// against the contracted rule on every drawn curve.
const ROUNDTRIP_REF_HELPER = `def __ref_early_stop(val_losses, patience):
    best = 0
    for i, loss in enumerate(val_losses):
        if loss < val_losses[best]:
            best = i
        if i - best > patience:
            break
    return int(best)`;

const MIN_DELTA_REF_HELPER = `def __ref_early_stop(val_losses, patience, min_delta):
    best_index = 0
    best_loss = float(val_losses[0])
    wait = 0
    for index, loss in enumerate(val_losses):
        loss = float(loss)
        if best_loss - loss > min_delta:
            best_loss = loss
            best_index = index
            wait = 0
        elif index != best_index:
            wait += 1
        if wait >= patience:
            return int(best_index)
    return int(best_index)`;

const pyArray = (value) =>
  Array.isArray(value[0])
    ? `np.array([${value.map(pyList).join(', ')}])`
    : `np.array(${pyList(value)})`;
const pyModel = (model) =>
  `{${Object.entries(model).map(([name, value]) => `"${name}": ${pyArray(value)}`).join(', ')}}`;

// Draw domains: curves are 5-9 losses with two decimals (cents keep the
// literals short); ~30% of draws force a tie at the running minimum to keep
// exercising the documented tie rule. Models are small MLP-shaped dicts
// (quarter-float weights) matching the curated examples.
function drawCurve(r) {
  const curve = Array.from({ length: randInt(r, 5, 9) }, () => randInt(r, 30, 300) / 100);
  if (r() < 0.3) {
    let m = 0;
    for (let i = 1; i < curve.length; i += 1) if (curve[i] < curve[m]) m = i;
    let k = randInt(r, 0, curve.length - 1);
    if (k === m) k = (m + 1) % curve.length;
    curve[k] = curve[m];
  }
  return curve;
}

const drawMatrix = (r, rows, cols) =>
  Array.from({ length: rows }, () => Array.from({ length: cols }, () => randInt(r, -8, 8) / 4));

const drawVector = (r, len) => Array.from({ length: len }, () => randInt(r, -8, 8) / 4);

function drawRoundtripModel(r) {
  const rows = randInt(r, 2, 4);
  const cols = randInt(r, 2, 3);
  return {
    W1: drawMatrix(r, rows, cols),
    b1: drawVector(r, cols),
    W2: drawMatrix(r, cols, 1),
    b2: drawVector(r, 1),
  };
}

function drawMinDeltaModel(r) {
  const cols = randInt(r, 2, 4);
  return { w: drawMatrix(r, 1, cols), b: drawVector(r, 1) };
}

export const EARLY_STOP_CASES = {
  'early-stopping-roundtrip': {
    difficulty: 'stretch',
    starterCode: ROUNDTRIP_STARTER,
    baseTests: ROUNDTRIP_BASE_TESTS,
    referenceSolver: ROUNDTRIP_REFERENCE,
    prompt: ROUNDTRIP_PROMPT,
    fullSolution: ROUNDTRIP_SOLUTION,
    refHelper: ROUNDTRIP_REF_HELPER,
    hasMinDelta: false,
    drawEntry(r) {
      return { curve: drawCurve(r), patience: randInt(r, 0, 3), model: drawRoundtripModel(r) };
    },
    extraCount: 3,
  },
  'early-stopping-min-delta-roundtrip': {
    difficulty: 'stretch',
    starterCode: MIN_DELTA_STARTER,
    baseTests: MIN_DELTA_BASE_TESTS,
    referenceSolver: MIN_DELTA_REFERENCE,
    prompt: MIN_DELTA_PROMPT,
    fullSolution: MIN_DELTA_SOLUTION,
    refHelper: MIN_DELTA_REF_HELPER,
    hasMinDelta: true,
    drawEntry(r) {
      return {
        curve: drawCurve(r),
        patience: randInt(r, 1, 3),
        minDelta: randInt(r, 5, 50) / 1000,
        model: drawMinDeltaModel(r),
      };
    },
    extraCount: 3,
  },
};

// Appends the seeded literal checks: every draw is concrete in the test
// string; early_stop_epoch is compared to the embedded __ref_early_stop copy,
// the state roundtrip is asserted with inline np.* expressions.
function seededChecks(entry, index, hasMinDelta) {
  const args = hasMinDelta
    ? `${entry.patience}, ${pyNum(entry.minDelta)}`
    : `${entry.patience}`;
  const call = `early_stop_epoch(__v${index}, ${args})`;
  const refCall = `__ref_early_stop(__v${index}, ${args})`;
  return [
    `__v${index} = ${pyList(entry.curve)}`,
    `__check('seeded stop ${index}', ${call} == ${refCall})`,
    `__check('seeded stop int ${index}', isinstance(${call}, int))`,
    `__m${index} = ${pyModel(entry.model)}`,
    `__s${index} = to_state(__m${index})`,
    `__check('seeded state lists ${index}', all(isinstance(v, list) for v in __s${index}.values()))`,
    `__check('seeded state values ${index}', __s${index} == {name: np.asarray(arr).tolist() for name, arr in __m${index}.items()})`,
    `__check('seeded state json ${index}', isinstance(json.dumps(__s${index}), str))`,
    `__r${index} = from_state(__s${index})`,
    `__check('seeded roundtrip ${index}', all(np.array_equal(__r${index}[k], __m${index}[k]) for k in __m${index}))`,
    `__check('seeded dtype ${index}', all(__r${index}[k].dtype == np.float64 for k in __r${index}))`,
  ].join('\n');
}

function seededBlock(caseDef, seedCases) {
  const checks = seedCases
    .map((entry, i) => seededChecks(entry, i + 1, caseDef.hasMinDelta))
    .join('\n\n');
  return `import json\n\n${caseDef.refHelper}\n\n${checks}`;
}

// Capsule shape: parameters carry starterCode/tests/seedCases; tests must be
// the verbatim base block plus the seeded extras derived from seedCases.
export function earlyStopCaseOk(parameters, caseDef) {
  try {
    if (!parameters || typeof parameters !== 'object') return false;
    if (parameters.starterCode !== caseDef.starterCode) return false;
    if (!Array.isArray(parameters.seedCases) || parameters.seedCases.length !== caseDef.extraCount) return false;
    if (parameters.seedCases.some((entry) => !entry || !Array.isArray(entry.curve) || !entry.model)) return false;
    const expectedTests = `${caseDef.baseTests}\n\n# seeded extra cases\n${seededBlock(caseDef, parameters.seedCases)}`;
    return parameters.tests === expectedTests;
  } catch { return false; }
}

export function genEarlyStopCase(seed, caseDef) {
  const r = rng(seed);
  const seedCases = Array.from({ length: caseDef.extraCount }, () => caseDef.drawEntry(r));
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

export function solveEarlyStopFamily(parameters) {
  const caseDef = Object.values(EARLY_STOP_CASES).find((item) => earlyStopCaseOk(parameters, item));
  if (!caseDef) throw new Error('Early-Stopping-Parameter verletzen die Kapselform');
  return { referenceCode: caseDef.referenceSolver };
}

export const EARLY_STOP_CONTRACT = {
  familyId: 'fit-early-stopping-roundtrip',
  familyGroup: 'fit-model',
  summary: 'Implementiert die Early-Stopping-Patience-Regel als strikten Scan über Epochenverluste plus wertexakten JSON-Zustandsroundtrip.',
  taskArchetype: 'code-tests',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'early-stopping-roundtrip', propertyTest: false },
    { caseId: 'early-stopping-min-delta-roundtrip', propertyTest: false },
  ],
  difficultyProfiles: ['stretch', 'core'],
  competencyIds: ['c-dl-regularization', 'c-ml-cv'],
  graderId: 'pyodide',
  activityType: 'python-code',
};

export function generateEarlyStopFamily({ seed, caseId, difficulty }) {
  if (!Number.isSafeInteger(seed)) throw new Error('Seed muss eine ganze Zahl sein');
  const caseDef = EARLY_STOP_CASES[caseId];
  if (!caseDef || caseDef.difficulty !== difficulty) {
    throw new Error(`Unbekannter Fall ${caseId} für Profil ${difficulty}`);
  }
  return genEarlyStopCase(seed, caseDef);
}

export const FAMILY_SPEC = { ...EARLY_STOP_CONTRACT, generate: generateEarlyStopFamily, solve: solveEarlyStopFamily };

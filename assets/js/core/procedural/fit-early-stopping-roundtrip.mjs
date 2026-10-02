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
import { makeCaseFamily } from './case_family_kit.mjs';

import { randInt } from '../generator_draw_kit.mjs';
import doc from '../../../../content/families/fit-early-stopping-roundtrip.json' with { type: 'json' };

const PACKAGES = ['numpy'];

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
    refHelper: ROUNDTRIP_REF_HELPER,
    hasMinDelta: false,
    draw(r) {
      return { curve: drawCurve(r), patience: randInt(r, 0, 3), model: drawRoundtripModel(r) };
    },
    extraCount: 3,
  },
  'early-stopping-min-delta-roundtrip': {
    difficulty: 'stretch',
    refHelper: MIN_DELTA_REF_HELPER,
    hasMinDelta: true,
    draw(r) {
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
};

// Appends the seeded literal checks behind the '# seeded extra cases' header:
// every draw is concrete in the test string; early_stop_epoch is compared to
// the embedded __ref_early_stop copy, the state roundtrip is asserted with
// inline np.* expressions.
export const FAMILY_SPEC = makeCaseFamily({
  doc,
  contract: EARLY_STOP_CONTRACT,
  cases: EARLY_STOP_CASES,
  shapeError: 'Early-Stopping-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, _caseId, seedCases) => {
    const checks = seedCases
      .map((entry, i) => seededChecks(entry, i + 1, caseDef.hasMinDelta))
      .join('\n\n');
    return `# seeded extra cases\nimport json\n\n${caseDef.refHelper}\n\n${checks}`;
  },
  defaultPackages: PACKAGES,
});


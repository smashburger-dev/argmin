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

import { pyNum, refCopy } from './py_test_kit.mjs';
import { makeCaseFamily } from './case_family_kit.mjs';

import { pick, randInt } from '../generator_draw_kit.mjs';
import doc from '../../../../content/families/fit-seeded-split-sgd-linear.json' with { type: 'json' };

const PACKAGES = ['numpy'];

const SGD_REFERENCE = doc.cases.find((entry) => entry.caseId === 'seeded-split-sgd-linear').expected.referenceSolver;

// Renamed copy of the reference train_linear_sgd — embedded once into the
// seeded test block so the learner's loop can be compared against the
// contracted update rule on every drawn data regime.
// The seeded helper is the reference's train_linear_sgd def, __ref_-prefixed:
// a contiguous slice of the renamed solver copy.
const SGD_REF_HELPER = `def __ref_train_linear_sgd${
  refCopy(SGD_REFERENCE, ['train_linear_sgd']).split('def __ref_train_linear_sgd').pop()
}`;

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
};

// Seeded block: the renamed reference helper once, then the per-draw check
// lines behind the '# seeded extra cases' header.
export const FAMILY_SPEC = makeCaseFamily({
  doc,
  contract: SEEDED_SGD_CONTRACT,
  cases: SEEDED_SGD_CASES,
  shapeError: 'Seeded-SGD-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, _caseId, seedCases) => {
    const checks = seedCases.map((entry, i) => caseDef.checks(entry, i + 1)).join('\n\n');
    return `# seeded extra cases\n${caseDef.refHelper}\n\n${checks}`;
  },
  defaultPackages: PACKAGES,
});


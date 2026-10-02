// Procedural family optimize-sgd-step-pure-update: task text, starter code
// and reference solver stay fixed; the seed draws fresh training fixtures
// (data seeds, widths, learning rates) for the pure train step and fresh
// parameter/gradient/velocity dictionaries plus lr/momentum for the
// momentum step. The draws get appended to the curated base test block as
// literal __check lines whose expected values are asserted inline (np.*
// reference copies and closed-form update terms), so the grading contract
// cannot drift. Mirrors formula-descriptive-stats-numpy.mjs.

import { makeCaseFamily } from './case_family_kit.mjs';

import { randInt } from '../generator_draw_kit.mjs';
import doc from '../../../../content/families/optimize-sgd-step-pure-update.json' with { type: 'json' };

const PACKAGES = ['numpy'];

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
    seededPrelude: TRAIN_SEEDED_PRELUDE,
    draw(r) {
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
    draw(r) {
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
};

// Assembles the seeded block: optional per-case prelude (reference copies)
// followed by the per-draw literal checks.
export const FAMILY_SPEC = makeCaseFamily({
  doc,
  contract: SGD_CONTRACT,
  cases: SGD_CASES,
  shapeError: 'SGD-Step-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, _caseId, seedCases) => {
    const extras = seedCases.map((entry, i) => caseDef.emitChecks(entry, i + 1)).join('\n');
    return `# seeded extra cases\n${caseDef.seededPrelude ? `${caseDef.seededPrelude}\n${extras}` : extras}`;
  },
  defaultPackages: PACKAGES,
});


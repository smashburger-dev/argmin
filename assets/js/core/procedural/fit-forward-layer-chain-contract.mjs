// Procedural family fit-forward-layer-chain-contract: the task text, starter
// code and reference solver stay fixed; the seed draws fresh dimension tuples
// and half-step weight literals that get appended to the curated base test
// block as literal __check lines. Forward values are asserted inline against
// np.* expressions (X @ W + b / np.maximum); each draw also carries one
// contract violation that must raise ValueError. For the deep case the base
// block already defines __reference, so the seeded checks reuse it. Mirrors
// formula-descriptive-stats-numpy.mjs.

import { pyList } from './py_test_kit.mjs';
import { makeCaseFamily } from './case_family_kit.mjs';

import { randInt, pick } from '../generator_draw_kit.mjs';
import doc from '../../../../content/families/fit-forward-layer-chain-contract.json' with { type: 'json' };

const PACKAGES = ['numpy'];

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
};

// Capsule shape: parameters carry starterCode/tests/seedCases; tests must be
// the verbatim base block plus the seeded extras derived from seedCases.
export const FAMILY_SPEC = makeCaseFamily({
  doc,
  contract: FORWARD_CONTRACT,
  cases: FORWARD_CASES,
  shapeError: 'Forward-Chain-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, _caseId, seedCases) =>
    `# seeded extra cases\n${seedCases.map((entry, i) => caseDef.seededChecks(entry, i + 1)).join('\n\n')}`,
  defaultPackages: PACKAGES,
});


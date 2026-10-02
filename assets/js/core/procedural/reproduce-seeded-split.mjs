// Procedural family reproduce-seeded-split: the task text, starter code and
// reference solver stay fixed; the seed draws fresh (n, seed, frac) and
// (n, k, seed) tuples from curated banks plus label lists that get appended
// to the curated base test block as literal __check lines. The split/fold
// expectations are recomputed inline through np.random.default_rng(seed)
// .permutation(n) so the grading contract cannot drift; a renamed __ref
// copy oracles the full return values and __raised covers the ValueError
// path for out-of-range k. Mirrors the capsule recipe of
// formula-descriptive-stats-numpy.mjs.

import { pyLit, RAISED_HELPER, refCopy } from './py_test_kit.mjs';
import { makeCaseFamily } from './case_family_kit.mjs';

import { pick, randInt } from '../generator_draw_kit.mjs';
import doc from '../../../../content/families/reproduce-seeded-split.json' with { type: 'json' };

// Verbatim case payloads extracted from content/families/reproduce-seeded-split.json.
const CASE_PAYLOADS = {
  "deterministic-split-numpy": {"difficulty": "core", },
  "kfold-indices-numpy": {"difficulty": "core", },
};

// Deterministic-majority model for the cv_scores seeded checks: same scoring
// shape as the __majority_model fixture in the curated base block.
const CV_MODEL = `def __cv_model(X_train, y_train, X_test, y_test):
    counts = {}
    for label in y_train:
        counts[label] = counts.get(label, 0) + 1
    best = None
    for label in y_train:
        if best is None or counts[label] > counts[best]:
            best = label
    return sum(1 for t in y_test if t == best) / len(y_test)`;

// Split bank: (n, seed, frac) tuples. frac keeps clean decimals; n_test is
// recomputed in the emitted test via int(round(frac * n)) so Python owns the
// rounding, never JS.
const SPLIT_BANK = [
  { n: 10, seed: 3, frac: 0.3 },
  { n: 8, seed: 11, frac: 0.25 },
  { n: 12, seed: 5, frac: 0.25 },
  { n: 9, seed: 7, frac: 0.2 },
  { n: 14, seed: 2, frac: 0.5 },
  { n: 11, seed: 13, frac: 0.4 },
  { n: 10, seed: 8, frac: 0.2 },
  { n: 13, seed: 4, frac: 0.3 },
  { n: 8, seed: 21, frac: 0.5 },
  { n: 12, seed: 9, frac: 0.4 },
  { n: 9, seed: 17, frac: 0.25 },
  { n: 15, seed: 6, frac: 0.2 },
  { n: 10, seed: 23, frac: 0.5 },
  { n: 11, seed: 1, frac: 0.3 },
  { n: 14, seed: 19, frac: 0.25 },
  { n: 13, seed: 29, frac: 0.4 },
];

// Fold bank: (n, k, seed) tuples with 2 <= k <= 5 and k <= n.
const FOLD_BANK = [
  { n: 7, k: 3, seed: 5 },
  { n: 10, k: 5, seed: 2 },
  { n: 9, k: 4, seed: 7 },
  { n: 8, k: 3, seed: 11 },
  { n: 12, k: 4, seed: 3 },
  { n: 6, k: 2, seed: 13 },
  { n: 11, k: 3, seed: 8 },
  { n: 15, k: 5, seed: 4 },
  { n: 10, k: 4, seed: 17 },
  { n: 9, k: 2, seed: 6 },
  { n: 14, k: 5, seed: 9 },
  { n: 8, k: 2, seed: 23 },
  { n: 13, k: 3, seed: 15 },
  { n: 12, k: 5, seed: 1 },
  { n: 10, k: 3, seed: 27 },
  { n: 7, k: 2, seed: 31 },
];

// Label draws for majority_baseline / cv_scores: plain ints or strings with
// a natural majority, plus an explicit tie shape (the first-seen label must
// win there). Kept quote-free and ASCII.
const drawLabels = (r, len) => {
  const pool = pick(r, [[0, 1], [1, 2, 0], ['ok', 'defekt'], ['a', 'b']]);
  return Array.from({ length: len }, () => pick(r, pool));
};

const drawTieLabels = (r) => {
  const pair = pick(r, [[0, 1], ['ok', 'defekt'], [5, 9]]);
  const [a, b] = pair;
  return r() < 0.5 ? [a, b, b, a] : [a, b, a, b];
};

export const SPLIT_CASES = {
  'deterministic-split-numpy': {
    ...CASE_PAYLOADS['deterministic-split-numpy'],
    competencyIds: ['c-ml-baseline', 'c-numpy-basics'],
    refNames: ['deterministic_split', 'majority_baseline'],
    // One bank tuple plus a majority list; every third draw is the explicit
    // tie shape so the first-seen rule is exercised regularly.
    draw(r, index) {
      const spec = pick(r, SPLIT_BANK);
      const y = index % 3 === 2 ? drawTieLabels(r) : drawLabels(r, randInt(r, 4, 9));
      return { ...spec, y };
    },
    extraCount: 3,
  },
  'kfold-indices-numpy': {
    ...CASE_PAYLOADS['kfold-indices-numpy'],
    competencyIds: ['c-ml-cv', 'c-numpy-basics'],
    refNames: ['kfold_indices', 'cv_scores'],
    // One bank tuple plus a binary label vector of length n (forced to carry
    // both classes) and an out-of-range k for the ValueError path.
    draw(r) {
      const spec = pick(r, FOLD_BANK);
      const y = drawLabels(r, spec.n).map((v) => (typeof v === 'string' ? v.length % 2 : v % 2));
      if (new Set(y).size === 1) y[0] = 1 - y[0];
      return { ...spec, y, kBad: spec.n + randInt(r, 1, 3) };
    },
    extraCount: 2,
  },
};

// Per-draw seeded check lines. Every emitted name is __sp<i>_/__kf<i>_-
// prefixed so the appended block cannot collide with the curated base test
// names.
function seededChecks(caseId, entry, index) {
  const p = caseId === 'deterministic-split-numpy' ? `__sp${index}` : `__kf${index}`;
  if (caseId === 'deterministic-split-numpy') {
    const { n, seed, frac, y } = entry;
    return [
      `${p}_perm = np.random.default_rng(${seed}).permutation(${n})`,
      `${p}_nt = int(round(${frac} * ${n}))`,
      `${p}_tr, ${p}_te = deterministic_split(${n}, ${seed}, ${frac})`,
      `__check('seeded split groesse ${index}', len(${p}_te) == ${p}_nt and len(${p}_tr) == ${n} - ${p}_nt)`,
      `__check('seeded split perm ${index}', [int(v) for v in ${p}_te] == [int(v) for v in ${p}_perm[:${p}_nt]] and [int(v) for v in ${p}_tr] == [int(v) for v in ${p}_perm[${p}_nt:]])`,
      `__check('seeded split ref ${index}', [[int(v) for v in teil] for teil in deterministic_split(${n}, ${seed}, ${frac})] == [[int(v) for v in teil] for teil in __ref_deterministic_split(${n}, ${seed}, ${frac})])`,
      `${p}_y = ${pyLit(y)}`,
      `__check('seeded majority ${index}', majority_baseline(${p}_y) == __ref_majority_baseline(${p}_y))`,
    ].join('\n');
  }
  const { n, k, seed, y, kBad } = entry;
  return [
    `${p}_folds = kfold_indices(${n}, ${k}, ${seed})`,
    `${p}_sizes = [${n} // ${k} + (1 if j < ${n} % ${k} else 0) for j in range(${k})]`,
    `__check('seeded fold groessen ${index}', [len(f) for f in ${p}_folds] == ${p}_sizes)`,
    `__check('seeded fold partition ${index}', sorted(int(v) for f in ${p}_folds for v in f) == list(range(${n})))`,
    `${p}_perm = np.random.default_rng(${seed}).permutation(${n})`,
    `__check('seeded fold perm ${index}', [int(v) for v in ${p}_folds[0]] == [int(v) for v in ${p}_perm[:${p}_sizes[0]]])`,
    `__check('seeded fold ref ${index}', [[int(v) for v in f] for f in ${p}_folds] == [[int(v) for v in f] for f in __ref_kfold_indices(${n}, ${k}, ${seed})])`,
    `${p}_X = [[i] for i in range(${n})]`,
    `${p}_y = ${pyLit(y)}`,
    `__check('seeded cv ${index}', cv_scores(__cv_model, ${p}_X, ${p}_y, ${k}, ${seed}) == __ref_cv_scores(__cv_model, ${p}_X, ${p}_y, ${k}, ${seed}))`,
    `__check('seeded k guard ${index}', __raised(kfold_indices, ${n}, ${kBad}, ${seed}) == __raised(__ref_kfold_indices, ${n}, ${kBad}, ${seed}))`,
  ].join('\n');
}

export const SPLIT_CONTRACT = {
  familyId: 'reproduce-seeded-split',
  familyGroup: 'reproduce-hash',
  summary: 'Reproduziert geseedete Datensplits und Fold-Zuordnungen exakt aus Seed und Split-Parametern.',
  taskArchetype: 'code-tests',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'deterministic-split-numpy', propertyTest: false },
    { caseId: 'kfold-indices-numpy', propertyTest: false },
  ],
  difficultyProfiles: ['core'],
  competencyIds: ['c-ml-baseline'],
};

// The renamed reference copy (plus helpers) is emitted once at the top of
// the seeded block; all per-draw checks call into it.
export const FAMILY_SPEC = makeCaseFamily({
  doc,
  contract: SPLIT_CONTRACT,
  cases: SPLIT_CASES,
  shapeError: 'Split-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, caseId, seedCases) => {
    const helpers = caseId === 'kfold-indices-numpy' ? `${RAISED_HELPER}\n\n${CV_MODEL}` : RAISED_HELPER;
    const prelude = `${helpers}\n\n${refCopy(caseDef.referenceSolver, caseDef.refNames)}`;
    const checks = seedCases.map((entry, i) => seededChecks(caseId, entry, i + 1)).join('\n');
    return `# seeded extra cases\n${prelude}\n\n${checks}`;
  },
});


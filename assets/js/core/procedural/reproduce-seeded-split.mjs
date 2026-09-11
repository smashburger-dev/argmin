// Procedural family reproduce-seeded-split: the task text, starter code and
// reference solver stay fixed; the seed draws fresh (n, seed, frac) and
// (n, k, seed) tuples from curated banks plus label lists that get appended
// to the curated base test block as literal __check lines. The split/fold
// expectations are recomputed inline through np.random.default_rng(seed)
// .permutation(n) so the grading contract cannot drift; a renamed __ref
// copy oracles the full return values and __raised covers the ValueError
// path for out-of-range k. Mirrors the capsule recipe of
// formula-descriptive-stats-numpy.mjs.

import { pick, randInt, rng, shuffle } from '../generator_draw_kit.mjs';

// Verbatim case payloads extracted from content/families/reproduce-seeded-split.json.
const CASE_PAYLOADS = {
  "deterministic-split-numpy": {"difficulty": "core", "packages": ["numpy"], "starterCode": "import numpy as np\n\ndef deterministic_split(n, seed, frac):\n    # perm = np.random.default_rng(seed).permutation(n)\n    # n_test = int(round(frac * n)); first n_test entries are the test set\n    # return (train_idx, test_idx) as lists of int, in permutation order\n    ...\n\ndef majority_baseline(y):\n    # most frequent label; on ties the label that appears first in y\n    ...\n", "baseTests": "import numpy as np\n\ndef __il(x):\n    return [int(v) for v in x]\n\ntr, te = deterministic_split(10, 3, 0.3)\n__check('Split liefert ein Paar (train, test)', len((tr, te)) == 2)\n__check('Testanteil: int(round(frac*n)) = 3 von 10', len(te) == 3)\n__check('Trainanteil: 7 von 10', len(tr) == 7)\n__check('Partition von 0..9 ohne Doppelte', sorted(__il(tr) + __il(te)) == list(range(10)))\ntr2, te2 = deterministic_split(10, 3, 0.3)\n__check('gleicher Seed -> identische Permutation', __il(tr) == __il(tr2) and __il(te) == __il(te2))\nperm = np.random.default_rng(3).permutation(10)\n__check('Permutation ist default_rng(seed).permutation(n)', __il(te) == __il(perm[:3]) and __il(tr) == __il(perm[3:]))\n__check('andere Groesse: n=8, frac=0.25 -> 2 Test-Indizes', len(deterministic_split(8, 11, 0.25)[1]) == 2)\n__check('majority_baseline: haeufigste Klasse', majority_baseline([1, 0, 0, 1, 0]) == 0)\n__check('majority_baseline: Strings als Klassen', majority_baseline(['ok', 'defekt', 'ok']) == 'ok')\n__check('majority_baseline: Gleichstand -> erste Klasse in y', majority_baseline([2, 1]) == 2)\n", "referenceSolver": "import numpy as np\n\ndef deterministic_split(n, seed, frac):\n    '''Deterministic split of range(n) in permutation order.'''\n    perm = np.random.default_rng(seed).permutation(n)\n    n_test = int(round(frac * n))\n    test_idx = [int(i) for i in perm[:n_test]]\n    train_idx = [int(i) for i in perm[n_test:]]\n    return train_idx, test_idx\n\ndef majority_baseline(y):\n    '''Most frequent label; on ties the first label seen in y.'''\n    counts = {}\n    for label in y:\n        counts[label] = counts.get(label, 0) + 1\n    best = None\n    for label in y:\n        if best is None or counts[label] > counts[best]:\n            best = label\n    return best\n", "prompt": "Implementiere zwei Funktionen. `deterministic_split(n, seed, frac)` legt zuerst `perm = np.random.default_rng(seed).permutation(n)` fest, berechnet `n_test = int(round(frac * n))` und schneidet die Permutation: die ersten `n_test` Einträge sind der Test-Index, der Rest der Train-Index. Rückgabe als Tupel `(train_idx, test_idx)` mit zwei Listen von int, in Permutationsreihenfolge (nicht sortiert). `majority_baseline(y)` gibt das häufigste Label zurück; bei Gleichstand das Label, das in `y` zuerst erscheint (Eingabe: Liste oder 1-d-Array, Labels beliebig vergleichbar). Der Testcode ist von deiner Eingabe getrennt und prüft auch die Permutations-Identität.", "fullSolution": "import numpy as np\n\ndef deterministic_split(n, seed, frac):\n    '''Deterministic split of range(n) in permutation order.'''\n    perm = np.random.default_rng(seed).permutation(n)\n    n_test = int(round(frac * n))\n    test_idx = [int(i) for i in perm[:n_test]]\n    train_idx = [int(i) for i in perm[n_test:]]\n    return train_idx, test_idx\n\ndef majority_baseline(y):\n    '''Most frequent label; on ties the first label seen in y.'''\n    counts = {}\n    for label in y:\n        counts[label] = counts.get(label, 0) + 1\n    best = None\n    for label in y:\n        if best is None or counts[label] > counts[best]:\n            best = label\n    return best\n"},
  "kfold-indices-numpy": {"difficulty": "core", "packages": ["numpy"], "starterCode": "import numpy as np\n\ndef kfold_indices(n, k, seed):\n    # perm = np.random.default_rng(seed).permutation(n)\n    # first (n mod k) folds get n//k + 1 entries, the rest n//k\n    # list of k lists of int; ValueError if k < 1 or k > n\n    ...\n\ndef cv_scores(model_fn, X, y, k, seed):\n    # fold i is the test set, all other folds together the train set\n    # call model_fn(X_train, y_train, X_test, y_test) per fold; return list of float\n    ...\n", "baseTests": "import numpy as np\n\nfolds = kfold_indices(7, 3, 5)\n__check('liefert k Folds', len(folds) == 3)\n__check('Groessenverteilung: n mod k vorn -> [3, 2, 2]', [len(f) for f in folds] == [3, 2, 2])\nflat = [int(v) for f in folds for v in f]\n__check('Partition von 0..6 ohne Doppelte', sorted(flat) == list(range(7)))\nfolds2 = kfold_indices(7, 3, 5)\n__check('gleicher Seed -> gleiche Folds', all([int(v) for v in a] == [int(v) for v in b] for a, b in zip(folds, folds2)))\nperm = np.random.default_rng(5).permutation(7)\n__check('Fold-Inhalte folgen default_rng(seed).permutation(n)', [int(v) for v in folds[0]] == [int(v) for v in perm[:3]])\nf10 = kfold_indices(10, 5, 2)\n__check('teilbar: alle Folds Groesse 2', [len(f) for f in f10] == [2, 2, 2, 2, 2])\nf9 = kfold_indices(9, 4, 7)\n__check('9 in 4 Folds -> [3, 2, 2, 2]', [len(f) for f in f9] == [3, 2, 2, 2])\n\ndef __majority_model(X_train, y_train, X_test, y_test):\n    counts = {}\n    for label in y_train:\n        counts[label] = counts.get(label, 0) + 1\n    best = None\n    for label in y_train:\n        if best is None or counts[label] > counts[best]:\n            best = label\n    return sum(1 for t in y_test if t == best) / len(y_test)\n\nX12 = [[0], [1], [2], [3], [4], [5], [6], [7], [8], [9]]\ny12 = [1, 0, 0, 1, 1, 0, 1, 1, 1, 1]\ns = cv_scores(__majority_model, X12, y12, 5, 3)\n__check('fuenf Scores in Fold-Reihenfolge', len(s) == 5)\nfolds_ref = kfold_indices(10, 5, 3)\nexpected = []\nfor i in range(len(folds_ref)):\n    train_idx = [idx for j in range(len(folds_ref)) if j != i for idx in folds_ref[j]]\n    expected.append(float(__majority_model([X12[idx] for idx in train_idx], [y12[idx] for idx in train_idx], [X12[idx] for idx in folds_ref[i]], [y12[idx] for idx in folds_ref[i]])))\n__check('Fold i ist Test, Rest ist Train (konsistent zu kfold_indices)', all(abs(float(a) - e) < 1e-9 for a, e in zip(s, expected)))\ns2 = cv_scores(__majority_model, X12, y12, 5, 3)\n__check('deterministisch: zweite Ausfuehrung gleich', [float(v) for v in s] == [float(v) for v in s2])\ntry:\n    kfold_indices(5, 6, 1)\n    __check('ValueError wenn k > n', False, 'kein ValueError geworfen')\nexcept ValueError:\n    __check('ValueError wenn k > n', True)\nexcept Exception as e:\n    __check('ValueError wenn k > n', False, 'falscher Fehlertyp: ' + type(e).__name__)\n", "referenceSolver": "import numpy as np\n\ndef kfold_indices(n, k, seed):\n    '''Deterministic k folds over range(n); first (n mod k) folds get one extra entry.'''\n    if k < 1 or k > n:\n        raise ValueError('k must be between 1 and n')\n    perm = np.random.default_rng(seed).permutation(n)\n    base = n // k\n    extra = n % k\n    folds = []\n    start = 0\n    for f in range(k):\n        size = base + (1 if f < extra else 0)\n        folds.append([int(i) for i in perm[start:start + size]])\n        start += size\n    return folds\n\ndef cv_scores(model_fn, X, y, k, seed):\n    '''Per fold: fold i is the test set, all other folds the train set.'''\n    X = np.asarray(X)\n    y = np.asarray(y)\n    folds = kfold_indices(len(y), k, seed)\n    scores = []\n    for i in range(len(folds)):\n        test_idx = folds[i]\n        train_idx = [idx for j in range(len(folds)) if j != i for idx in folds[j]]\n        X_train = [X[idx] for idx in train_idx]\n        y_train = [y[idx] for idx in train_idx]\n        X_test = [X[idx] for idx in test_idx]\n        y_test = [y[idx] for idx in test_idx]\n        scores.append(float(model_fn(X_train, y_train, X_test, y_test)))\n    return scores\n", "prompt": "Implementiere K-Fold deterministisch. `kfold_indices(n, k, seed)`: `perm = np.random.default_rng(seed).permutation(n)`; die ersten `n mod k` Folds bekommen `n//k + 1` Einträge, die restlichen `n//k`; Rückgabe: Liste von k Listen mit int-Indizes in Permutationsreihenfolge; für `k < 1` oder `k > n` wirf `ValueError`. `cv_scores(model_fn, X, y, k, seed)`: Fold i ist der Testfall, alle anderen Folds zusammen das Training; rufe pro Fold `model_fn(X_train, y_train, X_test, y_test)` auf und gib die Liste der zurückgegebenen Scores (floats) in Fold-Reihenfolge zurück. Kontrolle: n = 7, k = 3 → Foldgrößen [3, 2, 2].", "fullSolution": "import numpy as np\n\ndef kfold_indices(n, k, seed):\n    '''Deterministic k folds over range(n); first (n mod k) folds get one extra entry.'''\n    if k < 1 or k > n:\n        raise ValueError('k must be between 1 and n')\n    perm = np.random.default_rng(seed).permutation(n)\n    base = n // k\n    extra = n % k\n    folds = []\n    start = 0\n    for f in range(k):\n        size = base + (1 if f < extra else 0)\n        folds.append([int(i) for i in perm[start:start + size]])\n        start += size\n    return folds\n\ndef cv_scores(model_fn, X, y, k, seed):\n    '''Per fold: fold i is the test set, all other folds the train set.'''\n    X = np.asarray(X)\n    y = np.asarray(y)\n    folds = kfold_indices(len(y), k, seed)\n    scores = []\n    for i in range(len(folds)):\n        test_idx = folds[i]\n        train_idx = [idx for j in range(len(folds)) if j != i for idx in folds[j]]\n        X_train = [X[idx] for idx in train_idx]\n        y_train = [y[idx] for idx in train_idx]\n        X_test = [X[idx] for idx in test_idx]\n        y_test = [y[idx] for idx in test_idx]\n        scores.append(float(model_fn(X_train, y_train, X_test, y_test)))\n    return scores\n"},
};

// Minimal JS -> Python literal serializer for the JSON-safe draw structures
// (dicts, lists, strings, numbers, booleans, null). Double-quoted strings are
// valid Python; True/False/None cover bool and null.
const pyLit = (value) => {
  if (value === null || value === undefined) return 'None';
  if (value === true) return 'True';
  if (value === false) return 'False';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(pyLit).join(', ')}]`;
  return `{${Object.entries(value).map(([k, v]) => `${JSON.stringify(k)}: ${pyLit(v)}`).join(', ')}}`;
};

// Returns ("ok", result) or (exception type, message): lets one comparison
// cover both value returns and the contracted ValueError paths.
const RAISED_HELPER = `def __raised(fn, *args):
    try:
        return ("ok", fn(*args))
    except Exception as exc:
        return (type(exc).__name__, str(exc))`;

// Renames the module-level names of the reference solver so the test block
// can keep an inline oracle copy next to the seeded literals. All
// occurrences are rewritten so internal calls stay consistent.
const refCopy = (source, names) => (
  names.reduce((text, name) => text.split(name).join(`__ref_${name}`), source)
);

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

// The renamed reference copy (plus helpers) is emitted once at the top of
// the seeded block; all per-draw checks call into it.
function seededBlock(caseId, caseDef, seedCases) {
  const helpers = caseId === 'kfold-indices-numpy' ? `${RAISED_HELPER}\n\n${CV_MODEL}` : RAISED_HELPER;
  const prelude = `${helpers}\n\n${refCopy(caseDef.referenceSolver, caseDef.refNames)}`;
  const checks = seedCases.map((entry, i) => seededChecks(caseId, entry, i + 1)).join('\n');
  return `# seeded extra cases\n${prelude}\n\n${checks}`;
}

const testsFor = (caseId, caseDef, seedCases) => `${caseDef.baseTests}\n\n${seededBlock(caseId, caseDef, seedCases)}`;

// Capsule shape: parameters carry starterCode/tests/seedCases; tests must be
// the verbatim base block plus the seeded extras derived from seedCases.
export function splitCaseOk(parameters, caseId, caseDef) {
  try {
    if (!parameters || typeof parameters !== 'object') return false;
    if (parameters.starterCode !== caseDef.starterCode) return false;
    if (!Array.isArray(parameters.seedCases) || parameters.seedCases.length !== caseDef.extraCount) return false;
    return parameters.tests === testsFor(caseId, caseDef, parameters.seedCases);
  } catch { return false; }
}

export function genSplitCase(seed, caseId, caseDef) {
  const r = rng(seed);
  const seedCases = Array.from({ length: caseDef.extraCount }, (_, i) => caseDef.draw(r, i));
  return {
    parameters: {
      packages: caseDef.packages,
      starterCode: caseDef.starterCode,
      tests: testsFor(caseId, caseDef, seedCases),
      seedCases,
    },
    expected: { kind: 'reference-solver', referenceSolver: caseDef.referenceSolver },
    prompt: caseDef.prompt,
    fullSolution: caseDef.fullSolution,
    competencyIds: caseDef.competencyIds,
  };
}

export function solveSplitFamily(parameters) {
  const entry = Object.entries(SPLIT_CASES).find(([caseId, item]) => splitCaseOk(parameters, caseId, item));
  if (!entry) throw new Error('Split-Parameter verletzen die Kapselform');
  return { referenceCode: entry[1].referenceSolver };
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
  graderId: 'pyodide',
  activityType: 'python-code',
};

export function generateSplitFamily({ seed, caseId, difficulty }) {
  if (!Number.isSafeInteger(seed)) throw new Error('Seed muss eine ganze Zahl sein');
  const caseDef = SPLIT_CASES[caseId];
  if (!caseDef || caseDef.difficulty !== difficulty) {
    throw new Error(`Unbekannter Fall ${caseId} für Profil ${difficulty}`);
  }
  return genSplitCase(seed, caseId, caseDef);
}

export const FAMILY_SPEC = { ...SPLIT_CONTRACT, generate: generateSplitFamily, solve: solveSplitFamily };

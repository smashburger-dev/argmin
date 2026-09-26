// Procedural family fit-pca-kmeans-pipeline: the task text, starter code and
// reference solver stay fixed; the seed draws fresh two-blob datasets plus
// kmeans seeds that get appended to the curated base test block as literal
// __check lines. Eigenvector signs are convention-free, so renamed copies of
// the reference (__ref_pca / __ref_kmeans / __ref_preprocess) are embedded
// once per seeded block and the learner's outputs are compared against them
// on the drawn literals — components via np.abs, labels exactly (the contract
// pins rng.choice init and smallest-index tie-breaking). Mirrors
// fit-early-stopping-roundtrip.mjs.

import { pyNum, pyList } from './py_test_kit.mjs';
import { makeCaseFamily } from './case_family_kit.mjs';

import { pick, randInt } from '../generator_draw_kit.mjs';
import doc from '../../../../content/families/fit-pca-kmeans-pipeline.json' with { type: 'json' };

const PACKAGES = ['numpy'];

// Renamed copies of the reference solvers — embedded once into the seeded
// test block so the learner's pca/kmeans/preprocess_and_reduce outputs can
// be compared against the contracted algorithm on every drawn dataset.
const PCA_EIGH_REF_HELPER = `def __ref_pca(X, k):
    X = np.asarray(X, dtype=float)
    if k < 1 or k > X.shape[1]:
        raise ValueError("k must be in 1..number of features")
    Xc = X - X.mean(axis=0)
    cov = Xc.T @ Xc / (X.shape[0] - 1)
    eigvals, eigvecs = np.linalg.eigh(cov)
    order = np.argsort(eigvals)[::-1]
    eigvals = eigvals[order]
    eigvecs = eigvecs[:, order]
    components = eigvecs[:, :k].T
    variance_share = eigvals[:k] / eigvals.sum()
    return {"components": components, "variance_share": variance_share}


def __ref_kmeans(X, k, seed, iters=10):
    X = np.asarray(X, dtype=float)
    n = X.shape[0]
    if k < 1 or k > n:
        raise ValueError("k must be in 1..n")
    rng = np.random.default_rng(seed)
    centroids = X[rng.choice(n, size=k, replace=False)].copy()
    labels = np.zeros(n, dtype=int)
    for _ in range(iters):
        dists = np.linalg.norm(X[:, None, :] - centroids[None, :, :], axis=2)
        labels = np.argmin(dists, axis=1)
        for c in range(k):
            mask = labels == c
            if mask.any():
                centroids[c] = X[mask].mean(axis=0)
    return labels, centroids`;

const STANDARDIZE_REF_HELPER = `def __ref_pca(X, k):
    X = np.asarray(X, dtype=float)
    if k < 1 or k > X.shape[1]:
        raise ValueError("k must be in 1..number of features")
    Xc = X - X.mean(axis=0)
    cov = Xc.T @ Xc / (X.shape[0] - 1)
    eigvals, eigvecs = np.linalg.eigh(cov)
    order = np.argsort(eigvals)[::-1]
    eigvals = eigvals[order]
    eigvecs = eigvecs[:, order]
    return {"components": eigvecs[:, :k].T, "variance_share": eigvals[:k] / eigvals.sum()}


def __ref_kmeans(X, k, seed, iters=10):
    X = np.asarray(X, dtype=float)
    n = X.shape[0]
    if k < 1 or k > n:
        raise ValueError("k must be in 1..n")
    rng = np.random.default_rng(seed)
    centroids = X[rng.choice(n, size=k, replace=False)].copy()
    labels = np.zeros(n, dtype=int)
    for _ in range(iters):
        dists = np.linalg.norm(X[:, None, :] - centroids[None, :, :], axis=2)
        labels = np.argmin(dists, axis=1)
        for c in range(k):
            mask = labels == c
            if mask.any():
                centroids[c] = X[mask].mean(axis=0)
    return labels, centroids


def __ref_preprocess(X, k, seed):
    X = np.asarray(X, dtype=float)
    mean = X.mean(axis=0)
    std = X.std(axis=0)
    if np.any(std == 0):
        raise ValueError("constant column cannot be scaled")
    Xs = (X - mean) / std
    res = __ref_pca(Xs, k)
    labels, centroids = __ref_kmeans(Xs, k, seed)
    return {"variance_share": [float(v) for v in res["variance_share"]],
            "labels": [int(v) for v in labels],
            "centroids": centroids.tolist()}`;

const pyMatrix = (rows) => `[${rows.map(pyList).join(', ')}]`;

// Draw domains: every entry is a two-blob 2-D dataset in block order — blob A
// near the origin, blob B around a drawn center at 8-12 on both axes, so
// k-means with k=2 always recovers the contiguous partition and both columns
// keep non-zero variance (the standardization contract needs std > 0).
// Offsets move in half steps so the literals stay short.
const OFFSETS = [-1, -0.5, 0, 0.5, 1];

function drawBlobs(r) {
  const nA = randInt(r, 2, 4);
  const nB = randInt(r, 2, 4);
  const bx = randInt(r, 8, 12);
  const by = randInt(r, 8, 12);
  const blob = (count, cx, cy) =>
    Array.from({ length: count }, () => [cx + pick(r, OFFSETS), cy + pick(r, OFFSETS)]);
  return [...blob(nA, 0, 0), ...blob(nB, bx, by)];
}

// Appends the seeded literal checks: every draw is concrete in the test
// string, expectations run against the embedded __ref_ copies (components
// sign-free via np.abs, kmeans labels exactly, centroids via np.allclose).
function pcaEighChecks(entry, index) {
  const x = pyMatrix(entry.X);
  return [
    `__X${index} = ${x}`,
    `__p${index} = pca(__X${index}, ${entry.k})`,
    `__rp${index} = __ref_pca(__X${index}, ${entry.k})`,
    `__check('seeded share ${index}', np.allclose(np.asarray(__p${index}['variance_share']), np.asarray(__rp${index}['variance_share']), atol=1e-9))`,
    `__check('seeded shape ${index}', np.asarray(__p${index}['components']).shape == (${entry.k}, 2))`,
    `__check('seeded dirs ${index}', np.allclose(np.abs(np.asarray(__p${index}['components'])), np.abs(np.asarray(__rp${index}['components'])), atol=1e-9))`,
    `__l${index}, __c${index} = kmeans(__X${index}, 2, ${entry.kmSeed})`,
    `__rl${index}, __rc${index} = __ref_kmeans(__X${index}, 2, ${entry.kmSeed})`,
    `__check('seeded labels ${index}', np.array_equal(np.asarray(__l${index}), np.asarray(__rl${index})))`,
    `__check('seeded centroids ${index}', np.allclose(np.asarray(__c${index}), np.asarray(__rc${index}), atol=1e-9))`,
    `__l${index}b, __c${index}b = kmeans(__X${index}, 2, ${entry.kmSeed})`,
    `__check('seeded deterministic ${index}', np.array_equal(np.asarray(__l${index}b), np.asarray(__l${index})) and np.allclose(np.asarray(__c${index}b), np.asarray(__c${index})))`,
  ].join('\n');
}

function standardizeChecks(entry, index) {
  const x = pyMatrix(entry.X);
  const c = pyNum(entry.constVal);
  return [
    `__X${index} = ${x}`,
    `__a${index} = preprocess_and_reduce(__X${index}, 2, ${entry.seed})`,
    `__b${index} = preprocess_and_reduce(__X${index}, 2, ${entry.seed})`,
    `__check('seeded pipeline deterministic ${index}', __a${index} == __b${index})`,
    `__check('seeded pipeline keys ${index}', set(__a${index}.keys()) == {'variance_share', 'labels', 'centroids'})`,
    `__ra${index} = __ref_preprocess(__X${index}, 2, ${entry.seed})`,
    `__check('seeded pipeline share ${index}', np.allclose(np.asarray(__a${index}['variance_share'], dtype=float), np.asarray(__ra${index}['variance_share'], dtype=float), atol=1e-9))`,
    `__check('seeded pipeline labels ${index}', np.array_equal(np.asarray(__a${index}['labels']), np.asarray(__ra${index}['labels'])))`,
    `__check('seeded pipeline centroids ${index}', np.allclose(np.asarray(__a${index}['centroids'], dtype=float), np.asarray(__ra${index}['centroids'], dtype=float), atol=1e-9))`,
    `try:`,
    `    preprocess_and_reduce([[${c}, 0.0], [${c}, 1.0], [${c}, 2.0], [${c}, 3.0]], 2, ${entry.seed})`,
    `    __check('seeded constant column ${index}', False, 'kein ValueError')`,
    `except ValueError:`,
    `    __check('seeded constant column ${index}', True)`,
    `except Exception as e:`,
    `    __check('seeded constant column ${index}', False, type(e).__name__)`,
  ].join('\n');
}

export const PCA_KMEANS_CASES = {
  'pca-eigh-projection': {
    difficulty: 'core',
    refHelper: PCA_EIGH_REF_HELPER,
    checks: pcaEighChecks,
    draw(r) {
      return { X: drawBlobs(r), k: pick(r, [1, 2]), kmSeed: randInt(r, 0, 99) };
    },
    validEntry: (entry) =>
      !!entry &&
      Array.isArray(entry.X) &&
      entry.X.every((row) => Array.isArray(row) && row.length === 2) &&
      Number.isInteger(entry.k) &&
      Number.isInteger(entry.kmSeed),
    extraCount: 3,
  },
  'standardize-pca-kmeans': {
    difficulty: 'stretch',
    refHelper: STANDARDIZE_REF_HELPER,
    checks: standardizeChecks,
    draw(r) {
      return { X: drawBlobs(r), seed: randInt(r, 0, 99), constVal: randInt(r, -5, 5) };
    },
    validEntry: (entry) =>
      !!entry &&
      Array.isArray(entry.X) &&
      entry.X.every((row) => Array.isArray(row) && row.length === 2) &&
      Number.isInteger(entry.seed) &&
      Number.isInteger(entry.constVal),
    extraCount: 3,
  },
};

export const PCA_KMEANS_CONTRACT = {
  familyId: 'fit-pca-kmeans-pipeline',
  familyGroup: 'fit-model',
  summary: 'Fit PCA über Zentrierung, Kovarianz und eigh mit absteigender Sortierung und k-Means mit eigenem Generator-Objekt, optional nach Spalten-Standardisierung.',
  taskArchetype: 'code-tests',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'pca-eigh-projection', propertyTest: false },
    { caseId: 'standardize-pca-kmeans', propertyTest: false },
  ],
  difficultyProfiles: ['core', 'stretch'],
  competencyIds: ['c-ml-svm-pca', 'c-numpy-basics'],
};

// Seeded block: the case-level ref helper copy once, then the per-draw check
// lines behind the '# seeded extra cases' header.
export const FAMILY_SPEC = makeCaseFamily({
  doc,
  contract: PCA_KMEANS_CONTRACT,
  cases: PCA_KMEANS_CASES,
  shapeError: 'PCA-k-Means-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, _caseId, seedCases) => {
    const checks = seedCases.map((entry, i) => caseDef.checks(entry, i + 1)).join('\n\n');
    return `# seeded extra cases\n${caseDef.refHelper}\n\n${checks}`;
  },
  defaultPackages: PACKAGES,
});


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

const PACKAGES = ['numpy'];

const PCA_EIGH_STARTER = `import numpy as np

def pca(X, k):
    """Return {'components': (k, d) ndarray, 'variance_share': shares}; eig sorted descending."""
    X = np.asarray(X, dtype=float)
    # 1) zentrieren, 2) Kovarianz, 3) eigh + absteigend sortieren
    ...

def kmeans(X, k, seed, iters=10):
    """Return (labels, centroids) after iters Lloyd steps; init via default_rng(seed)."""
    X = np.asarray(X, dtype=float)
    rng = np.random.default_rng(seed)
    # Init mit rng.choice, dann Zuordnen und Updaten
    ...
`;

const STANDARDIZE_STARTER = `import numpy as np

def preprocess_and_reduce(X, k, seed):
    """Center+scale X, run PCA(k), run kmeans(k, seed); return dict with variance_share, labels, centroids."""
    X = np.asarray(X, dtype=float)
    # 1) Mittelwert/Std je Spalte (Std 0 -> ValueError)
    # 2) PCA auf skalierten Daten
    # 3) kmeans auf skalierten Daten
    ...
`;

const PCA_EIGH_BASE_TESTS = `import numpy as np

__X1 = [[1.0, 1.0], [2.0, 2.0], [3.0, 3.0]]
__p1 = pca(__X1, 2)
__check('Diagonale: PC1 erklaert 100 %', np.allclose(__p1['variance_share'][0], 1.0) and abs(np.sum(__p1['variance_share']) - 1.0) < 1e-9)
__check('PC1-Richtung vorzeichenfrei', np.allclose(np.abs(np.asarray(__p1['components'])[0]), np.array([np.sqrt(0.5), np.sqrt(0.5)])))
__check('components-Shape (k, d)', np.asarray(__p1['components']).shape == (2, 2))
__X2 = [[0.0, 0.0], [8.0, 0.0], [4.0, 2.0], [4.0, -2.0]]
__p2 = pca(__X2, 2)
__check('Varianzanteile 0.8/0.2', np.allclose(__p2['variance_share'], np.array([0.8, 0.2]), atol=1e-9))
__check('PC1 entlang der x-Achse', np.allclose(np.abs(np.asarray(__p2['components'])[0]), np.array([1.0, 0.0]), atol=1e-9))
__X3 = [[0.0, 0.0], [1.0, 0.0], [10.0, 10.0], [11.0, 10.0]]
__l1, __c1 = kmeans(__X3, 2, 0)
__l1b, __c1b = kmeans(__X3, 2, 0)
__check('deterministisch pro Seed', np.array_equal(np.asarray(__l1), np.asarray(__l1b)) and np.allclose(np.asarray(__c1), np.asarray(__c1b)))
__check('Gruppierung stabil', (__l1[0] == __l1[1]) and (__l1[2] == __l1[3]) and (__l1[0] != __l1[2]), str(list(__l1)))
__check('Zentroiden (0.5,0) und (10.5,10)', np.allclose(sorted(np.asarray(__c1).tolist()), [[0.5, 0.0], [10.5, 10.0]], atol=1e-9))
__l2, __c2 = kmeans(__X3, 2, 42)
__check('anderer Seed, gleiche Partition', (__l2[0] == __l2[1]) and (__l2[2] == __l2[3]) and (__l2[0] != __l2[2]))
for __bad in (0, 99):
    try:
        pca(__X3, __bad)
        __check('pca k=' + str(__bad) + ' abgelehnt', False, 'kein ValueError')
    except ValueError:
        __check('pca k=' + str(__bad) + ' abgelehnt', True)
    except Exception as e:
        __check('pca k=' + str(__bad) + ' abgelehnt', False, type(e).__name__)
    try:
        kmeans(__X3, __bad, 0)
        __check('kmeans k=' + str(__bad) + ' abgelehnt', False, 'kein ValueError')
    except ValueError:
        __check('kmeans k=' + str(__bad) + ' abgelehnt', True)
    except Exception as e:
        __check('kmeans k=' + str(__bad) + ' abgelehnt', False, type(e).__name__)`;

const STANDARDIZE_BASE_TESTS = `import numpy as np

__X = [[0.0, 0.0], [0.5, 0.0], [10.0, 10.0], [10.5, 10.0], [11.0, 10.0]]
__a = preprocess_and_reduce(__X, 2, 5)
__b = preprocess_and_reduce(__X, 2, 5)
__check('zwei Aufrufe identisch', __a == __b)
__check('variance_share Summe <= 1', sum(__a['variance_share']) <= 1.0 + 1e-9, str(sum(__a['variance_share'])))
__check('variance_share positiv', all(v > 0.0 for v in __a['variance_share']))
__check('fünf Labels', len(__a['labels']) == 5)
__check('Clustergroessen 2 und 3', sorted([__a['labels'].count(v) for v in set(__a['labels'])]) == [2, 3], str(__a['labels']))
__c = preprocess_and_reduce(__X, 2, 99)
__check('anderer Seed: gleiche Groessen', sorted([__c['labels'].count(v) for v in set(__c['labels'])]) == [2, 3])
__part_a = frozenset(frozenset(i for i, l in enumerate(__a['labels']) if l == v) for v in set(__a['labels']))
__part_c = frozenset(frozenset(i for i, l in enumerate(__c['labels']) if l == v) for v in set(__c['labels']))
__check('Partition seed-invariant', __part_a == __part_c)
try:
    preprocess_and_reduce([[1.0, 2.0], [1.0, 3.0], [1.0, 4.0]], 2, 5)
    __check('konstante Spalte abgelehnt', False, 'kein ValueError')
except ValueError:
    __check('konstante Spalte abgelehnt', True)
except Exception as e:
    __check('konstante Spalte abgelehnt', False, type(e).__name__)`;

const PCA_EIGH_REFERENCE = `import numpy as np

def pca(X, k):
    X = np.asarray(X, dtype=float)
    if k < 1 or k > X.shape[1]:
        raise ValueError("k must be in 1..number of features")
    Xc = X - X.mean(axis=0)
    cov = Xc.T @ Xc / (X.shape[0] - 1)
    eigvals, eigvecs = np.linalg.eigh(cov)
    order = np.argsort(eigvals)[::-1]
    eigvals = eigvals[order]
    eigvecs = eigvecs[:, order]
    components = eigvecs[:, :k].T  # rows are the top-k components
    variance_share = eigvals[:k] / eigvals.sum()
    return {"components": components, "variance_share": variance_share}

def kmeans(X, k, seed, iters=10):
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

# pca([[1,1],[2,2],[3,3]], 2)['variance_share'] -> [1.0, 0.0]
# kmeans([[0,0],[1,0],[10,10],[11,10]], 2, 0) -> labels [0,0,1,1]`;

const STANDARDIZE_REFERENCE = `import numpy as np

def pca(X, k):
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

def kmeans(X, k, seed, iters=10):
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

def preprocess_and_reduce(X, k, seed):
    X = np.asarray(X, dtype=float)
    mean = X.mean(axis=0)
    std = X.std(axis=0)
    if np.any(std == 0):
        raise ValueError("constant column cannot be scaled")
    Xs = (X - mean) / std
    res = pca(Xs, k)
    labels, centroids = kmeans(Xs, k, seed)
    return {"variance_share": [float(v) for v in res["variance_share"]],
            "labels": [int(v) for v in labels],
            "centroids": centroids.tolist()}`;

const PCA_EIGH_PROMPT = "Implementiere PCA und k-Means aus Grundoperationen. `pca(X, k)` zentriert X, berechnet die Kovarianzmatrix $X_c^\\top X_c/(n-1)$, zerlegt sie mit `np.linalg.eigh`, sortiert Eigenwerte und -vektoren absteigend und gibt `{'components': ..., 'variance_share': ...}` zurück: components als (k, d)-Array (Zeilen = Hauptkomponenten), variance_share als Anteile $\\lambda_i/\\sum\\lambda_j$. `ValueError` für k < 1 oder k > Anzahl Spalten. `kmeans(X, k, seed, iters=10)` initialisiert mit `rng = np.random.default_rng(seed)` und k verschiedenen Zeilen aus X via `rng.choice`, läuft iters Lloyd-Iterationen (Zuordnung zum nächsten Zentroid, Gleichstand: kleinster Index; Update als Mittelwert; leere Cluster behalten ihr Zentroid) und gibt `(labels, centroids)` zurück. `ValueError` für k < 1 oder k > Anzahl Zeilen.";

const STANDARDIZE_PROMPT = "Final Boss: `preprocess_and_reduce(X, k, seed)` verkettet die Pipeline aus der Lektion: (1) zentrieren und durch die Spalten-Standardabweichung teilen — `ValueError`, wenn eine Spalte Standardabweichung 0 hat; (2) PCA mit k Komponenten auf den skalierten Daten; (3) k-Means mit k Clustern und dem gegebenen Seed auf den skalierten Daten. Rückgabe: `{'variance_share': [...], 'labels': [...], 'centroids': [...]}` mit variance_share als Liste von Floats, labels als Liste von ints und centroids als verschachtelte Liste. Der Aufruf muss deterministisch sein (zwei Aufrufe, identisches Ergebnis) und die Cluster-Labels müssen permutationsinvariant interpretierbar sein — die Tests prüfen die Clustergrößen und die Partition statt der Label-Namen.";

const PCA_EIGH_SOLUTION = `import numpy as np

def pca(X, k):
    X = np.asarray(X, dtype=float)
    if k < 1 or k > X.shape[1]:
        raise ValueError("k must be in 1..number of features")
    Xc = X - X.mean(axis=0)
    cov = Xc.T @ Xc / (X.shape[0] - 1)
    eigvals, eigvecs = np.linalg.eigh(cov)
    order = np.argsort(eigvals)[::-1]
    eigvals = eigvals[order]
    eigvecs = eigvecs[:, order]
    components = eigvecs[:, :k].T  # rows are the top-k components
    variance_share = eigvals[:k] / eigvals.sum()
    return {"components": components, "variance_share": variance_share}

def kmeans(X, k, seed, iters=10):
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

# pca([[1,1],[2,2],[3,3]], 2)['variance_share'] -> [1.0, 0.0]
# kmeans([[0,0],[1,0],[10,10],[11,10]], 2, 0) -> labels [0,0,1,1]`;

const STANDARDIZE_SOLUTION = `import numpy as np

def pca(X, k):
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

def kmeans(X, k, seed, iters=10):
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

def preprocess_and_reduce(X, k, seed):
    X = np.asarray(X, dtype=float)
    mean = X.mean(axis=0)
    std = X.std(axis=0)
    if np.any(std == 0):
        raise ValueError("constant column cannot be scaled")
    Xs = (X - mean) / std
    res = pca(Xs, k)
    labels, centroids = kmeans(Xs, k, seed)
    return {"variance_share": [float(v) for v in res["variance_share"]],
            "labels": [int(v) for v in labels],
            "centroids": centroids.tolist()}`;

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
    starterCode: PCA_EIGH_STARTER,
    baseTests: PCA_EIGH_BASE_TESTS,
    referenceSolver: PCA_EIGH_REFERENCE,
    prompt: PCA_EIGH_PROMPT,
    fullSolution: PCA_EIGH_SOLUTION,
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
    starterCode: STANDARDIZE_STARTER,
    baseTests: STANDARDIZE_BASE_TESTS,
    referenceSolver: STANDARDIZE_REFERENCE,
    prompt: STANDARDIZE_PROMPT,
    fullSolution: STANDARDIZE_SOLUTION,
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
  graderId: 'pyodide',
  activityType: 'python-code',
};

// Seeded block: the case-level ref helper copy once, then the per-draw check
// lines behind the '# seeded extra cases' header.
const FAMILY = makeCaseFamily({
  contract: PCA_KMEANS_CONTRACT,
  cases: PCA_KMEANS_CASES,
  shapeError: 'PCA-k-Means-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, _caseId, seedCases) => {
    const checks = seedCases.map((entry, i) => caseDef.checks(entry, i + 1)).join('\n\n');
    return `# seeded extra cases\n${caseDef.refHelper}\n\n${checks}`;
  },
  defaultPackages: PACKAGES,
});

export const pcaKmeansCaseOk = FAMILY.caseOk;
export const genPcaKmeansCase = FAMILY.genCase;
export const solvePcaKmeansFamily = FAMILY.solve;
export const generatePcaKmeansFamily = FAMILY.generate;
export const FAMILY_SPEC = FAMILY.spec;

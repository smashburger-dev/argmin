// Procedural family optimize-tree-best-split: task text, starter code and
// reference solver stay fixed; the seed draws fresh feature/label pairs
// (with duplicates for the three-class case) that get appended to the
// curated base test block as literal __check lines. Expected values are
// asserted inline against __ref_gini/__ref_split copies of the reference
// solver emitted once per seeded block, so the grading contract cannot
// drift. Mirrors formula-descriptive-stats-numpy.mjs.

import { makeCaseFamily } from './case_family_kit.mjs';

import { randInt } from '../generator_draw_kit.mjs';

const PACKAGES = ['numpy'];

const GINI_STARTER = `import numpy as np

def gini(labels):
    """Return 1 - sum(p_k^2) over class shares; empty list raises ValueError."""
    labels = list(labels)
    # Anteile zaehlen und Formel anwenden
    ...

def best_split(x, y):
    """Return (threshold, weighted_gini) for a depth-1 split; ties -> lowest threshold."""
    x = [float(v) for v in x]
    y = list(y)
    # 1) Laengen pruefen, 2) nach x sortieren, 3) Kandidatenmitten testen
    ...
`;

const GINI_BASE_TESTS = `import numpy as np

__check('Gini ausgeglichen', abs(gini([0, 0, 1, 1]) - 0.5) < 1e-12)
__check('Gini rein', gini([1, 1, 1]) == 0.0)
__check('Gini 3:1', abs(gini([0, 0, 0, 1]) - 0.375) < 1e-12)
__s = best_split([1, 2, 3, 4], [0, 0, 1, 1])
__check('perfekter Split bei 2.5', abs(__s[0] - 2.5) < 1e-12 and abs(__s[1]) < 1e-12, str(__s))
__t = best_split([1, 2, 3, 4], [0, 1, 0, 1])
__check('Tie-Break kleinster Schwellenwert', abs(__t[0] - 1.5) < 1e-12 and abs(__t[1] - 1.0 / 3.0) < 1e-12, str(__t))
__u = best_split([3, 1, 2, 4], [1, 0, 0, 1])
__check('Eingabereihenfolge egal', abs(__u[0] - 2.5) < 1e-12 and abs(__u[1]) < 1e-12, str(__u))
try:
    best_split([1, 2], [0])
    __check('Laengenpruefung', False, 'kein ValueError')
except ValueError:
    __check('Laengenpruefung', True)
except Exception as e:
    __check('Laengenpruefung', False, type(e).__name__)
try:
    gini([])
    __check('leere Labels abgelehnt', False, 'kein ValueError')
except ValueError:
    __check('leere Labels abgelehnt', True)
except Exception as e:
    __check('leere Labels abgelehnt', False, type(e).__name__)`;

const CANDIDATES_STARTER = `import numpy as np

def gini(labels):
    ...

def best_split(x, y):
    ...
`;

const CANDIDATES_BASE_TESTS = `__check("three classes", abs(gini([0, 1, 2]) - 2.0 / 3.0) < 1e-12)
__check("best middle", abs(best_split([0, 1, 2, 3], [0, 0, 1, 1])[0] - 1.5) < 1e-12)
__check("weighted zero", abs(best_split([0, 1, 2, 3], [0, 0, 1, 1])[1]) < 1e-12)
__check("duplicate x skipped", best_split([1, 1, 2], [0, 1, 1])[0] == 1.5)`;

const GINI_REFERENCE = `import numpy as np

def gini(labels):
    labels = list(labels)
    n = len(labels)
    if n == 0:
        raise ValueError("labels must not be empty")
    return 1.0 - sum((labels.count(c) / n) ** 2 for c in set(labels))

def best_split(x, y):
    x = [float(v) for v in x]
    y = list(y)
    if len(x) != len(y):
        raise ValueError("x and y must have the same length")
    if len(x) < 2:
        raise ValueError("need at least two points")
    order = sorted(range(len(x)), key=lambda i: x[i])
    xs = [x[i] for i in order]
    ys = [y[i] for i in order]
    n = len(xs)
    best = None  # (threshold, weighted gini)
    for i in range(n - 1):
        if xs[i] == xs[i + 1]:
            continue
        t = (xs[i] + xs[i + 1]) / 2.0
        left = ys[: i + 1]
        right = ys[i + 1:]
        g = len(left) / n * gini(left) + len(right) / n * gini(right)
        if best is None or g < best[1] - 1e-12 or (abs(g - best[1]) <= 1e-12 and t < best[0]):
            best = (t, g)
    return best

# gini([0,0,1,1]) -> 0.5; best_split([1,2,3,4],[0,0,1,1]) -> (2.5, 0.0)`;

const CANDIDATES_REFERENCE = `def gini(labels):
    labels = list(labels); n = len(labels)
    if n == 0: raise ValueError("labels must not be empty")
    return 1.0 - sum((labels.count(c) / n) ** 2 for c in set(labels))

def best_split(x, y):
    x = [float(v) for v in x]; y = list(y)
    if len(x) != len(y): raise ValueError("x and y must have the same length")
    if len(x) < 2: raise ValueError("need at least two points")
    order = sorted(range(len(x)), key=lambda i: x[i]); xs = [x[i] for i in order]; ys = [y[i] for i in order]; n = len(xs); best = None
    for i in range(n - 1):
        if xs[i] == xs[i + 1]: continue
        t = (xs[i] + xs[i + 1]) / 2.0; left = ys[:i + 1]; right = ys[i + 1:]
        g = len(left) / n * gini(left) + len(right) / n * gini(right)
        if best is None or g < best[1] - 1e-12 or (abs(g - best[1]) <= 1e-12 and t < best[0]): best = (t, g)
    return best`;

const GINI_PROMPT = 'Implementiere die Baumbasis: `gini(labels)` berechnet $1 - \\sum_k p_k^2$ aus den Klassenanteilen eines Knotens (0/1-Labels) und wirft `ValueError` bei leerer Liste. `best_split(x, y)` sucht für Tiefe 1 den besten Schwellenwert: Kandidaten sind die Mitten zwischen aufeinanderfolgenden verschiedenen x-Werten (nach Sortieren), bewertet wird der gewichtete Gini (Anteile mal Knoten-Gini). Rückgabe ist das Tupel `(threshold, gini)`; bei Gleichstand gewinnt der kleinste Schwellenwert. `ValueError`, wenn `len(x) != len(y)` oder weniger als zwei Punkte. Deterministisch — ohne Zufall.';

const CANDIDATES_PROMPT = 'Implementiere Gini und die deterministische beste Binärschwelle wie im Familienvertrag, diesmal mit drei Klassen und doppelten x-Werten.';

// fullSolution equals the reference verbatim (the JSON ships the solver plus
// the same trailing comment).
const GINI_SOLUTION = GINI_REFERENCE;

const CANDIDATES_SOLUTION = CANDIDATES_REFERENCE;

// Seeded prelude: independent __ref_gini/__ref_split copies so the seeded
// checks can assert threshold AND weighted gini inline. The copies mirror the
// reference solver one to one.
const TREE_SEEDED_PRELUDE = `def __ref_gini(labels):
    labels = list(labels)
    n = len(labels)
    if n == 0:
        raise ValueError("labels must not be empty")
    return 1.0 - sum((labels.count(c) / n) ** 2 for c in set(labels))

def __ref_split(x, y):
    x = [float(v) for v in x]
    y = list(y)
    if len(x) != len(y):
        raise ValueError("x and y must have the same length")
    if len(x) < 2:
        raise ValueError("need at least two points")
    order = sorted(range(len(x)), key=lambda i: x[i])
    xs = [x[i] for i in order]
    ys = [y[i] for i in order]
    n = len(xs)
    best = None
    for i in range(n - 1):
        if xs[i] == xs[i + 1]:
            continue
        t = (xs[i] + xs[i + 1]) / 2.0
        left = ys[: i + 1]
        right = ys[i + 1:]
        g = len(left) / n * __ref_gini(left) + len(right) / n * __ref_gini(right)
        if best is None or g < best[1] - 1e-12 or (abs(g - best[1]) <= 1e-12 and t < best[0]):
            best = (t, g)
    return best`;

const pyVec = (values) => `[${values.join(', ')}]`;

// Ensures at least two distinct x values so __ref_split never returns None;
// bumps the last entry deterministically when the draw degenerates.
const ensureDistinct = (x) => {
  if (new Set(x).size < 2) x[x.length - 1] = x[0] + 1;
  return x;
};

const drawPair = (r, len, xHi, yHi) => ({
  x: ensureDistinct(Array.from({ length: len }, () => randInt(r, 0, xHi))),
  y: Array.from({ length: len }, () => randInt(r, 0, yHi)),
});

const emitSplitChecks = (entry, index) => [
  `__sx${index} = ${pyVec(entry.x)}`,
  `__sy${index} = ${pyVec(entry.y)}`,
  `__check('seeded gini ${index}', abs(gini(__sy${index}) - __ref_gini(__sy${index})) < 1e-12)`,
  `__got${index} = best_split(__sx${index}, __sy${index})`,
  `__exp${index} = __ref_split(__sx${index}, __sy${index})`,
  `__check('seeded split ${index}', abs(__got${index}[0] - __exp${index}[0]) < 1e-12 and abs(__got${index}[1] - __exp${index}[1]) < 1e-12)`,
].join('\n');

// Case definitions: the draw domains produce concrete literals that get baked
// into the test block (honest distinctness — the drawn inputs differ, not just
// a seed literal). The stretch case draws from a small x range so duplicate
// feature values occur naturally.
export const TREE_CASES = {
  'gini-best-binary-split': {
    difficulty: 'core',
    starterCode: GINI_STARTER,
    baseTests: GINI_BASE_TESTS,
    referenceSolver: GINI_REFERENCE,
    prompt: GINI_PROMPT,
    fullSolution: GINI_SOLUTION,
    seededPrelude: TREE_SEEDED_PRELUDE,
    draw: (r) => drawPair(r, randInt(r, 4, 6), 9, 1),
    emitChecks: emitSplitChecks,
    extraCount: 2,
  },
  'gini-three-class-candidates': {
    difficulty: 'stretch',
    starterCode: CANDIDATES_STARTER,
    baseTests: CANDIDATES_BASE_TESTS,
    referenceSolver: CANDIDATES_REFERENCE,
    prompt: CANDIDATES_PROMPT,
    fullSolution: CANDIDATES_SOLUTION,
    seededPrelude: TREE_SEEDED_PRELUDE,
    draw: (r) => drawPair(r, randInt(r, 4, 6), 4, 2),
    emitChecks: emitSplitChecks,
    extraCount: 2,
  },
};

export const TREE_CONTRACT = {
  familyId: 'optimize-tree-best-split',
  familyGroup: 'optimize-update',
  summary: 'Bestimmt den besten Binär-Split über die Gini-Impurity mit Kandidatenschwellen auf Mitten und deterministischer Gleichstandsregel.',
  taskArchetype: 'code-tests',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'gini-best-binary-split', propertyTest: false },
    { caseId: 'gini-three-class-candidates', propertyTest: false },
  ],
  difficultyProfiles: ['core', 'stretch'],
  competencyIds: ['c-ml-ensembles', 'c-numpy-basics'],
};

// Assembles the seeded block: the shared prelude (reference copies) followed
// by the per-draw literal checks.
const FAMILY = makeCaseFamily({
  contract: TREE_CONTRACT,
  cases: TREE_CASES,
  shapeError: 'Tree-Split-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, _caseId, seedCases) => {
    const extras = seedCases.map((entry, i) => caseDef.emitChecks(entry, i + 1)).join('\n');
    return `# seeded extra cases\n${caseDef.seededPrelude ? `${caseDef.seededPrelude}\n${extras}` : extras}`;
  },
  defaultPackages: PACKAGES,
});

export const treeCaseOk = FAMILY.caseOk;
export const genTreeCase = FAMILY.genCase;
export const solveTreeFamily = FAMILY.solve;
export const generateTreeFamily = FAMILY.generate;
export const FAMILY_SPEC = FAMILY.spec;

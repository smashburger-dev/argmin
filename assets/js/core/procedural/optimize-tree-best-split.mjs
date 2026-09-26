// Procedural family optimize-tree-best-split: task text, starter code and
// reference solver stay fixed; the seed draws fresh feature/label pairs
// (with duplicates for the three-class case) that get appended to the
// curated base test block as literal __check lines. Expected values are
// asserted inline against __ref_gini/__ref_split copies of the reference
// solver emitted once per seeded block, so the grading contract cannot
// drift. Mirrors formula-descriptive-stats-numpy.mjs.

import { makeCaseFamily } from './case_family_kit.mjs';

import { randInt } from '../generator_draw_kit.mjs';
import doc from '../../../../content/families/optimize-tree-best-split.json' with { type: 'json' };

const PACKAGES = ['numpy'];

// fullSolution equals the reference verbatim (the JSON ships the solver plus
// the same trailing comment).

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
    seededPrelude: TREE_SEEDED_PRELUDE,
    draw: (r) => drawPair(r, randInt(r, 4, 6), 9, 1),
    emitChecks: emitSplitChecks,
    extraCount: 2,
  },
  'gini-three-class-candidates': {
    difficulty: 'stretch',
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
export const FAMILY_SPEC = makeCaseFamily({
  doc,
  contract: TREE_CONTRACT,
  cases: TREE_CASES,
  shapeError: 'Tree-Split-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, _caseId, seedCases) => {
    const extras = seedCases.map((entry, i) => caseDef.emitChecks(entry, i + 1)).join('\n');
    return `# seeded extra cases\n${caseDef.seededPrelude ? `${caseDef.seededPrelude}\n${extras}` : extras}`;
  },
  defaultPackages: PACKAGES,
});


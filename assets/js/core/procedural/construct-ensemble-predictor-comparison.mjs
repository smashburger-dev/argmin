// Procedural family construct-ensemble-predictor-comparison: the task text,
// starter code and reference solver stay fixed; the seed draws fresh vote
// panels, nested dict trees and small datasets that get appended to the
// curated base test block as literal __check lines. Expected values are
// asserted inline: the vote oracle is a verbatim comprehension of the
// half-of-models rule, the tree leaf is a baked literal the generator
// computes by walking the drawn tree, and the linear RMSE is recomputed
// inline with np.*, so the grading contract cannot drift. The challenge
// case shares the trio contract but its starter hides the tie rule (the
// prompt states it), its draw forces one exact tie column per panel and
// always picks the deep tree. Mirrors formula-descriptive-stats-numpy.mjs.

import { makeCaseFamily } from './case_family_kit.mjs';

import { randInt, shuffle } from '../generator_draw_kit.mjs';
import doc from '../../../../content/families/construct-ensemble-predictor-comparison.json' with { type: 'json' };

const PACKAGES = ['numpy'];

const TRIO_STARTER = doc.cases.find((entry) => entry.caseId === 'voting-tree-linear-rmse').parameters.starterCode;

// Same skeleton as TRIO_STARTER, but the majority docstring drops the
// half-of-models rule — the prompt carries it, so reading the spec is part
// of the challenge.

// Opens with the tie check the challenge starter no longer states, then the
// full trio base block.

// The curated solution anchor mirrors the reference solver; only the inline
// majority-vote comment is reworded to spell out the tie rule.

// Python literal rendering for the seeded test block (ints, floats, lists,
// dicts, strings).
const pyLit = (value) => {
  if (value === true) return 'True';
  if (value === false) return 'False';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  if (Array.isArray(value)) return `[${value.map(pyLit).join(', ')}]`;
  return `{${Object.entries(value).map(([k, v]) => `${pyLit(k)}: ${pyLit(v)}`).join(', ')}}`;
};

// Draw helpers ---------------------------------------------------------------

// m x n panel of 0/1 predictions; forceTie rewrites column 0 to an exact
// half/half split so the tie-counts-as-one rule is exercised (m even).
function drawPreds(r, m, n, forceTie) {
  const preds = Array.from({ length: m }, () => (
    Array.from({ length: n }, () => randInt(r, 0, 1))
  ));
  if (forceTie) {
    const rows = shuffle(r, Array.from({ length: m }, (_, i) => i));
    preds.forEach((row, i) => { row[0] = rows.indexOf(i) < m / 2 ? 1 : 0; });
  }
  return preds;
}

// Nested dict tree over feature 0 with half-integer thresholds; leaf values
// are small ints. forceDeep skips the shallow coin flip — the challenge
// always draws a deeper left split with a leaf on the right.
function drawTree(r, forceDeep = false) {
  const leaf = () => ({ leaf: randInt(r, 0, 2) });
  const hi = randInt(r, 2, 6) + 0.5;
  if (!forceDeep && r() < 0.5) return { feature: 0, threshold: hi, left: leaf(), right: leaf() };
  const lo = randInt(r, 0, Math.floor(hi) - 1) + 0.5;
  return {
    feature: 0,
    threshold: hi,
    left: { feature: 0, threshold: lo, left: leaf(), right: leaf() },
    right: leaf(),
  };
}

// Walks the drawn tree exactly as the contract states (left at x[i] <= t).
function treeLeaf(node, x) {
  let cur = node;
  while (!('leaf' in cur)) {
    cur = x[cur.feature] <= cur.threshold ? cur.left : cur.right;
  }
  return cur.leaf;
}

function drawCompareData(r) {
  const n = randInt(r, 4, 6);
  const xs = Array.from({ length: n }, (_, i) => i + 1);
  const ys = Array.from({ length: n }, () => randInt(r, 0, 2));
  const modelCount = randInt(r, 2, 3);
  const models = Array.from({ length: modelCount }, () => (
    Array.from({ length: n }, () => randInt(r, 0, 2))
  ));
  return { xs, ys, models };
}

// Seeded check blocks ----------------------------------------------------------

function sharedSeededLines(entry, index) {
  const p = `__p${index}`;
  const t = `__t${index}`;
  return [
    `${p} = ${pyLit(entry.preds)}`,
    `__check('seeded vote ${index}', majority_vote(${p}) == [1 if sum(int(row[j]) for row in ${p}) * 2 >= len(${p}) else 0 for j in range(len(${p}[0]))])`,
    `${t} = ${pyLit(entry.tree)}`,
    `__check('seeded baum ${index}', tree_predict(${t}, [${entry.xval}]) == ${pyLit(treeLeaf(entry.tree, [entry.xval]))})`,
    `__r${index} = compare_models(${pyLit(entry.xs)}, ${pyLit(entry.ys)}, ${t}, ${pyLit(entry.models)})`,
    `__check('seeded rmse schluessel ${index}', sorted(__r${index}.keys()) == ['linear', 'tree', 'voting'])`,
    `__xa${index} = np.asarray(${pyLit(entry.xs)}, dtype=float)`,
    `__ya${index} = np.asarray(${pyLit(entry.ys)}, dtype=float)`,
    `__w${index} = float((__xa${index} @ __ya${index}) / (__xa${index} @ __xa${index}))`,
    `__check('seeded linear rmse ${index}', abs(__r${index}["linear"] - float(np.sqrt(np.mean((__w${index} * __xa${index} - __ya${index}) ** 2)))) < 1e-9)`,
  ];
}

function trioSeededChecks(entry, index) {
  return sharedSeededLines(entry, index).join('\n');
}

// Shared lines plus the forced-tie assertion: forceTie splits column 0
// exactly in half, so the majority must come out 1.
function challengeSeededChecks(entry, index) {
  return [
    ...sharedSeededLines(entry, index),
    `__check('seeded vote tie ${index}', majority_vote(__p${index})[0] == 1)`,
  ].join('\n');
}

// Case definitions: the draw domains produce concrete literals that get baked
// into the test block (honest distinctness — the drawn panels, trees and
// datasets differ, not just a seed literal). The challenge shares the trio
// contract; its draw keeps the model count even, forces one exact tie
// column and always picks the deep tree, so the "tie counts as one" rule
// stays under test on full trio substance.
export const ENSEMBLE_CASES = {
  'voting-tree-linear-rmse': {
    difficulty: 'stretch',
    seededChecks: trioSeededChecks,
    draw(r) {
      const preds = drawPreds(r, randInt(r, 2, 5), randInt(r, 3, 6), false);
      const tree = drawTree(r);
      const xval = randInt(r, 0, 8);
      const { xs, ys, models } = drawCompareData(r);
      return { preds, tree, xval, xs, ys, models };
    },
    extraCount: 2,
  },
  'voting-tie-and-tree': {
    difficulty: 'challenge',
    seededChecks: challengeSeededChecks,
    draw(r) {
      const m = r() < 0.5 ? 2 : 4;
      const preds = drawPreds(r, m, randInt(r, 3, 6), true);
      const tree = drawTree(r, true);
      const xval = randInt(r, 0, 8);
      const { xs, ys, models } = drawCompareData(r);
      return { preds, tree, xval, xs, ys, models };
    },
    extraCount: 2,
  },
};

export const ENSEMBLE_CONTRACT = {
  familyId: 'construct-ensemble-predictor-comparison',
  familyGroup: 'construct-program',
  summary: 'Konstruiert Mehrheits-Voting, Baum-Vorhersage und Intercept-loose lineare Baseline und vergleicht die Verfahren über RMSE.',
  taskArchetype: 'code-tests',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'voting-tree-linear-rmse', propertyTest: false },
    { caseId: 'voting-tie-and-tree', propertyTest: false },
  ],
  difficultyProfiles: ['stretch', 'challenge'],
  competencyIds: ['c-ml-ensembles', 'c-numpy-basics'],
};

// Capsule shape: parameters carry starterCode/tests/seedCases; tests must be
// the verbatim base block plus the seeded extras derived from seedCases.
export const FAMILY_SPEC = makeCaseFamily({
  doc,
  contract: ENSEMBLE_CONTRACT,
  cases: ENSEMBLE_CASES,
  shapeError: 'Ensemble-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, _caseId, seedCases) =>
    `# seeded extra cases\n${seedCases.map((entry, i) => caseDef.seededChecks(entry, i + 1)).join('\n')}`,
  defaultPackages: PACKAGES,
});


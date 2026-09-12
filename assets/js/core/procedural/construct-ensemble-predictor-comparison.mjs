// Procedural family construct-ensemble-predictor-comparison: the task text,
// starter code and reference solver stay fixed; the seed draws fresh vote
// panels, nested dict trees, boundary inputs and small datasets that get
// appended to the curated base test block as literal __check lines. Expected
// values are asserted inline: the vote oracle is a verbatim comprehension of
// the half-of-models rule, the tree leaf is a baked literal the generator
// computes by walking the drawn tree, and the linear RMSE is recomputed
// inline with np.*, so the grading contract cannot drift. Mirrors
// formula-descriptive-stats-numpy.mjs.

import { makeCaseFamily } from './case_family_kit.mjs';

import { randInt } from '../generator_draw_kit.mjs';

const PACKAGES = ['numpy'];

const TRIO_STARTER = `import numpy as np

def majority_vote(preds):
    """Return the per-example majority (0/1) across all models in preds."""
    ...

def tree_predict(node, x):
    """Return the leaf value of the nested dict tree for input x."""
    ...

def compare_models(x, y, node, model_preds):
    """Return {'tree': rmse, 'voting': rmse, 'linear': rmse} on identical data."""
    xa = np.asarray(x, dtype=float)
    ya = np.asarray(y, dtype=float)
    # 1) Baum-Vorhersagen je x, 2) Mehrheit, 3) lineare Baseline w*x
    ...
`;

const FLAT_STARTER = `import numpy as np

def majority_vote(preds):
    ...

def tree_predict(node, x):
    ...

def rmse(pred, y):
    ...

def compare_models(x, y, node, model_preds):
    ...
`;

const TRIO_BASE_TESTS = `import numpy as np

__check('Mehrheit dreier Modelle', majority_vote([[1, 0, 1], [1, 0, 0], [0, 0, 1]]) == [1, 0, 1])
__check('Einstimmigkeit', majority_vote([[0, 1], [0, 1], [0, 1]]) == [0, 1])
__node = {'feature': 0, 'threshold': 3.5,
          'left': {'feature': 0, 'threshold': 1.5, 'left': {'leaf': 0}, 'right': {'leaf': 1}},
          'right': {'feature': 0, 'threshold': 5.5, 'left': {'leaf': 1}, 'right': {'leaf': 0}}}
__check('Baum: Blatt ganz links', tree_predict(__node, [1.0]) == 0)
__check('Baum: Mittelzone', tree_predict(__node, [2.0]) == 1 and tree_predict(__node, [4.0]) == 1)
__check('Baum: Blatt ganz rechts', tree_predict(__node, [6.0]) == 0)
__x = [1, 2, 3, 4, 5, 6]
__y = [0, 1, 1, 1, 1, 0]
__models = [[0, 1, 1, 1, 1, 1], [0, 0, 1, 1, 1, 1], [0, 0, 0, 1, 1, 1]]
__res = compare_models(__x, __y, __node, __models)
__check('drei RMSE-Schluessel', sorted(__res.keys()) == ['linear', 'tree', 'voting'])
__check('Baum schlaegt lineare Baseline', __res['tree'] <= __res['linear'] + 1e-12, str(__res))
__check('Baum perfekt auf dem Datensatz', abs(__res['tree']) < 1e-12, str(__res))
__check('lineare Baseline: 1D-KQ durch null', abs(__res['linear'] - 0.554700196225229) < 1e-9, str(__res['linear']))
__check('Voting-RMSE positiv', __res['voting'] > 0.0, str(__res))`;

const FLAT_BASE_TESTS = `__check("tie counts as one", majority_vote([[1, 0], [0, 0]]) == [1, 0])
node = {"feature": 0, "threshold": 2.5, "left": {"leaf": 0.0}, "right": {"leaf": 2.0}}
__check("tree boundary", tree_predict(node, [2.5]) == 0.0 and tree_predict(node, [3.0]) == 2.0)
r = compare_models([1, 2, 3, 4], [0, 0, 2, 2], node, [[0, 0, 2, 2], [0, 0, 0, 2]])
__check("tree rmse", abs(r["tree"]) < 1e-12)
__check("keys", set(r) == {"tree", "voting", "linear"})`;

const TRIO_REFERENCE = `import numpy as np

def majority_vote(preds):
    n_models = len(preds)
    n = len(preds[0])
    out = []
    for j in range(n):
        ones = sum(int(preds[i][j]) for i in range(n_models))
        out.append(1 if ones * 2 >= n_models else 0)
    return out

def tree_predict(node, x):
    if "leaf" in node:
        return node["leaf"]
    if x[node["feature"]] <= node["threshold"]:
        return tree_predict(node["left"], x)
    return tree_predict(node["right"], x)

def rmse(pred, y):
    pred = np.asarray(pred, dtype=float)
    y = np.asarray(y, dtype=float)
    return float(np.sqrt(np.mean((pred - y) ** 2)))

def compare_models(x, y, node, model_preds):
    x = [float(v) for v in x]
    tree_pred = [tree_predict(node, [v]) for v in x]
    vote_pred = majority_vote(model_preds)
    xa = np.asarray(x, dtype=float)
    ya = np.asarray(y, dtype=float)
    w = float((xa @ ya) / (xa @ xa))  # 1D least squares through origin
    lin_pred = w * xa
    return {"tree": rmse(tree_pred, ya), "voting": rmse(vote_pred, ya), "linear": rmse(lin_pred, ya)}

# compare_models([1..6], [0,1,1,1,1,0], node, 3 stumps) ->
# {'tree': 0.0, 'voting': 0.577..., 'linear': 0.554...}`;

const FLAT_REFERENCE = `import numpy as np

def majority_vote(preds):
    n_models = len(preds); n = len(preds[0])
    return [1 if sum(int(preds[i][j]) for i in range(n_models)) * 2 >= n_models else 0 for j in range(n)]

def tree_predict(node, x):
    if "leaf" in node: return node["leaf"]
    return tree_predict(node["left"] if x[node["feature"]] <= node["threshold"] else node["right"], x)

def rmse(pred, y):
    pred = np.asarray(pred, dtype=float); y = np.asarray(y, dtype=float)
    return float(np.sqrt(np.mean((pred - y) ** 2)))

def compare_models(x, y, node, model_preds):
    xa = np.asarray([float(v) for v in x], dtype=float); ya = np.asarray(y, dtype=float)
    tree_pred = [tree_predict(node, [v]) for v in xa]
    vote_pred = majority_vote(model_preds); w = float((xa @ ya) / (xa @ xa))
    return {"tree": rmse(tree_pred, ya), "voting": rmse(vote_pred, ya), "linear": rmse(w * xa, ya)}`;

const TRIO_PROMPT = 'Final Boss Ensembles: Implementiere drei Funktionen. `majority_vote(preds)` erhält eine Liste von Modellvorhersagen (je eine Liste von 0/1) und gibt die Mehrheitsentscheidung pro Beispiel zurück (1, wenn mindestens die Hälfte der Modelle 1 ausgibt). `tree_predict(node, x)` läuft rekursiv durch einen Baum als Dictionary: Blätter haben die Form `{\'leaf\': wert}`, innere Knoten `{\'feature\': i, \'threshold\': t, \'left\': ..., \'right\': ...}` mit Übergang links bei `x[i] <= t`. `compare_models(x, y, node, model_preds)` berechnet auf identischen Daten die RMSEs `{\'tree\': ..., \'voting\': ..., \'linear\': ...}`, wobei die lineare Baseline die 1D-Kleinste-Quadrate-Lösung durch den Ursprung ist: $w = \\sum x_i y_i / \\sum x_i^2$, Vorhersage $w\\cdot x$. RMSE = Wurzel aus dem mittleren quadratischen Fehler.';

const FLAT_PROMPT = 'Implementiere Mehrheits-Voting mit Gleichstand zugunsten von 1, rekursive Baumvorhersage mit linker Grenze bei <= und den Vergleich über drei RMSE-Werte.';

// The reference solver already carries the worked-example comment, so the
// curated solution anchor is the reference verbatim.
const TRIO_SOLUTION = TRIO_REFERENCE;

// The curated anchor drops the import header (the starter already ships it).
const FLAT_SOLUTION = FLAT_REFERENCE.replace('import numpy as np\n\n', '');

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
    const rows = Array.from({ length: m }, (_, i) => i);
    for (let i = rows.length - 1; i > 0; i -= 1) {
      const j = Math.floor(r() * (i + 1));
      [rows[i], rows[j]] = [rows[j], rows[i]];
    }
    preds.forEach((row, i) => { row[0] = rows.indexOf(i) < m / 2 ? 1 : 0; });
  }
  return preds;
}

// Nested dict tree over feature 0 with half-integer thresholds; leaf values
// are small ints. Depth 2 mirrors the curated root shape (a deeper left
// split, a leaf on the right).
function drawTree(r) {
  const leaf = () => ({ leaf: randInt(r, 0, 2) });
  const hi = randInt(r, 2, 6) + 0.5;
  if (r() < 0.5) return { feature: 0, threshold: hi, left: leaf(), right: leaf() };
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

function flatSeededChecks(entry, index) {
  return [
    ...sharedSeededLines(entry, index),
    `__check('seeded vote tie ${index}', majority_vote(__p${index})[0] == 1)`,
    `__check('seeded rmse funktion ${index}', abs(rmse(${pyLit(entry.rmsePred)}, ${pyLit(entry.rmseY)}) - float(np.sqrt(np.mean((np.asarray(${pyLit(entry.rmsePred)}, dtype=float) - np.asarray(${pyLit(entry.rmseY)}, dtype=float)) ** 2)))) < 1e-9)`,
  ].join('\n');
}

// Case definitions: the draw domains produce concrete literals that get baked
// into the test block (honest distinctness — the drawn panels, trees and
// datasets differ, not just a seed literal). The challenge draw keeps the
// model count even and forces one exact tie column so the
// "tie counts as one" rule stays under test.
export const ENSEMBLE_CASES = {
  'voting-tree-linear-rmse': {
    difficulty: 'stretch',
    starterCode: TRIO_STARTER,
    baseTests: TRIO_BASE_TESTS,
    referenceSolver: TRIO_REFERENCE,
    prompt: TRIO_PROMPT,
    fullSolution: TRIO_SOLUTION,
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
    starterCode: FLAT_STARTER,
    baseTests: FLAT_BASE_TESTS,
    referenceSolver: FLAT_REFERENCE,
    prompt: FLAT_PROMPT,
    fullSolution: FLAT_SOLUTION,
    seededChecks: flatSeededChecks,
    draw(r) {
      const m = r() < 0.5 ? 2 : 4;
      const preds = drawPreds(r, m, randInt(r, 2, 5), true);
      const threshold = randInt(r, 1, 5) + 0.5;
      const tree = {
        feature: 0,
        threshold,
        left: { leaf: randInt(r, 0, 2) },
        right: { leaf: randInt(r, 0, 2) },
      };
      const xval = [threshold - 1, threshold, threshold + 1.5][randInt(r, 0, 2)];
      const { xs, ys, models } = drawCompareData(r);
      const n2 = randInt(r, 2, 4);
      const rmsePred = Array.from({ length: n2 }, () => randInt(r, 0, 3));
      const rmseY = Array.from({ length: n2 }, () => randInt(r, 0, 3));
      return { preds, tree, xval, xs, ys, models, rmsePred, rmseY };
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
const FAMILY = makeCaseFamily({
  contract: ENSEMBLE_CONTRACT,
  cases: ENSEMBLE_CASES,
  shapeError: 'Ensemble-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, _caseId, seedCases) =>
    `# seeded extra cases\n${seedCases.map((entry, i) => caseDef.seededChecks(entry, i + 1)).join('\n')}`,
  defaultPackages: PACKAGES,
});

export const ensembleCaseOk = FAMILY.caseOk;
export const genEnsembleCase = FAMILY.genCase;
export const solveEnsembleFamily = FAMILY.solve;
export const generateEnsembleFamily = FAMILY.generate;
export const FAMILY_SPEC = FAMILY.spec;

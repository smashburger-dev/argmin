// Procedural family optimize-multi-head-attention: task text, starter code
// and reference solver stay fixed; the seed draws fresh sequence lengths,
// model widths, head counts, weight matrices and masks that get appended to
// the curated base test block as literal __check lines. Expected values are
// asserted inline against the __ref_mha loop reference that the base block
// already defines, so the grading contract cannot drift. Mirrors
// formula-descriptive-stats-numpy.mjs.

import { makeCaseFamily } from './case_family_kit.mjs';

import { randInt } from '../generator_draw_kit.mjs';

const PACKAGES = ['numpy'];

const MHA_STARTER = `import numpy as np


def multi_head_attention(X, Wq, Wk, Wv, Wo, n_heads, mask=None):
    """Project, split into n_heads heads, per-head scaled attention, concat, output projection."""
    X = np.asarray(X, dtype=float)
    ...
    # d_model % n_heads != 0 -> ValueError
    # per head h: slice columns [h*d_head, (h+1)*d_head) of Q, K, V
    # scores = Q_h @ K_h.T / sqrt(d_head); optional mask -> -inf before softmax
    # concat all heads along axis=1, then multiply by Wo
    ...
`;

const MHA_BASE_TESTS = `def __ref_mha(X, Wq, Wk, Wv, Wo, n_heads, mask=None):
    n, d_model = len(X), len(X[0])
    d_head = d_model // n_heads
    Q = [[sum(X[i][a] * Wq[a][b] for a in range(d_model)) for b in range(d_model)] for i in range(n)]
    K = [[sum(X[i][a] * Wk[a][b] for a in range(d_model)) for b in range(d_model)] for i in range(n)]
    V = [[sum(X[i][a] * Wv[a][b] for a in range(d_model)) for b in range(d_model)] for i in range(n)]
    outs = []
    for h in range(n_heads):
        lo, hi = h * d_head, (h + 1) * d_head
        rows = []
        for i in range(n):
            s = [sum(Q[i][a] * K[j][a] for a in range(lo, hi)) / math.sqrt(d_head) for j in range(n)]
            if mask is not None:
                s = [s[j] if mask[i][j] else float('-inf') for j in range(len(s))]
            m = max(s)
            ex = [math.exp(v - m) for v in s]
            tot = sum(ex)
            w = [e / tot for e in ex]
            rows.append([sum(w[j] * V[j][c] for j in range(n)) for c in range(lo, hi)])
        outs.append(rows)
    concat = [[outs[h][i][c - h * d_head] for h in range(n_heads) for c in range(h * d_head, (h + 1) * d_head)] for i in range(n)]
    return [[sum(concat[i][a] * Wo[a][b] for a in range(d_model)) for b in range(d_model)] for i in range(n)]

X = [[1, 1, 0, 0], [0, 0, 1, 1], [1, 0, 1, 0]]
Wq = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]
Wk = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]
Wv = [[2, 0, 1, 0], [0, 2, 0, 1], [1, 0, 2, 0], [0, 1, 0, 2]]
Wo = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]
out = multi_head_attention(X, Wq, Wk, Wv, Wo, 2)
__check('Form n x d_model', out.shape == (3, 4))
__check('gegen Referenz 2 Koepfe', np.allclose(out, __ref_mha(X, Wq, Wk, Wv, Wo, 2), atol=1e-9))
causal = [[True, False, False], [True, True, False], [True, True, True]]
__check('gegen Referenz mit kausaler Maske', np.allclose(multi_head_attention(X, Wq, Wk, Wv, Wo, 2, mask=causal), __ref_mha(X, Wq, Wk, Wv, Wo, 2, mask=causal), atol=1e-9))
__check('gegen Referenz 4 Koepfe', np.allclose(multi_head_attention(X, Wq, Wk, Wv, Wo, 4), __ref_mha(X, Wq, Wk, Wv, Wo, 4), atol=1e-9))
rng = np.random.default_rng(7)
Xr = rng.integers(-2, 3, size=(3, 4)).tolist()
Wqr = rng.integers(-1, 2, size=(4, 4)).tolist()
Wkr = rng.integers(-1, 2, size=(4, 4)).tolist()
Wvr = rng.integers(-2, 3, size=(4, 4)).tolist()
Wor = rng.integers(-1, 2, size=(4, 4)).tolist()
__check('unbekannte Instanz gegen Referenz', np.allclose(multi_head_attention(Xr, Wqr, Wkr, Wvr, Wor, 2), __ref_mha(Xr, Wqr, Wkr, Wvr, Wor, 2), atol=1e-9))
one = multi_head_attention(X, Wq, Wk, Wv, Wo, 1)
__check('1 Kopf = einfache Attention mit Projektion', np.allclose(one, __ref_mha(X, Wq, Wk, Wv, Wo, 1), atol=1e-9))
try:
    multi_head_attention(X, Wq, Wk, Wv, Wo, 3)
    __check('nicht teilbar -> ValueError', False, 'kein ValueError')
except ValueError:
    __check('nicht teilbar -> ValueError', True)
__check('Doppelaufruf deterministisch', np.array_equal(multi_head_attention(X, Wq, Wk, Wv, Wo, 2), multi_head_attention(X, Wq, Wk, Wv, Wo, 2)))`;

const MHA_REFERENCE = `import math
import numpy as np

def multi_head_attention(X, Wq, Wk, Wv, Wo, n_heads, mask=None):
    """Project, split into n_heads heads, per-head scaled attention, concat, output projection."""
    X = np.asarray(X, dtype=float)
    Wq = np.asarray(Wq, dtype=float)
    Wk = np.asarray(Wk, dtype=float)
    Wv = np.asarray(Wv, dtype=float)
    Wo = np.asarray(Wo, dtype=float)
    n, d_model = X.shape
    if d_model % n_heads != 0:
        raise ValueError("d_model muss durch n_heads teilbar sein")
    d_head = d_model // n_heads
    Q, K, V = X @ Wq, X @ Wk, X @ Wv
    heads = []
    for h in range(n_heads):
        sl = slice(h * d_head, (h + 1) * d_head)
        scores = (Q[:, sl] @ K[:, sl].T) / np.sqrt(d_head)
        if mask is not None:
            keep = np.asarray(mask, dtype=bool)
            scores = np.where(keep, scores, -np.inf)
        scores = scores - scores.max(axis=1, keepdims=True)
        w = np.exp(scores)
        w = w / w.sum(axis=1, keepdims=True)
        heads.append(w @ V[:, sl])
    concat = np.concatenate(heads, axis=1)
    return concat @ Wo
`;

const MHA_PROMPT = 'Final Boss Multi-Head: Implementiere <code>multi_head_attention(X, Wq, Wk, Wv, Wo, n_heads, mask=None)</code>. Vertrag: $X$ ist $(n, d_{\\text{model}})$; die Projektionen $XW_Q$, $XW_K$, $XW_V$ werden in <code>n_heads</code> Köpfe der Breite $d_{\\text{model}}/n_{\\text{heads}}$ <strong>zerlegt (Reshape/Slicing, keine neuen Projektionen)</strong>; jeder Kopf rechnet eigene skalierte Attention (Divisor $\\sqrt{d_{\\text{head}}}$, stabiles zeilenweises Softmax); optionale <code>mask</code> $(n, n)$ gilt in jedem Kopf; die Kopfausgaben werden konkateniert ($(n, d_{\\text{model}})$) und mit $W_O$ projiziert. Nicht teilbares $d_{\\text{model}}$ wirft <code>ValueError</code>. Der Testcode hält eine unabhängige Schleifen-Referenz (inkl. Kopfzerlegung und Projektion) und prüft 1, 2 und 4 Köpfe, kausale Maske, eine unbekannte Instanz und Determinismus.';

const MHA_SOLUTION = `${MHA_REFERENCE}# Kopfzerlegung als Slice-Sicht auf die Projektionen; die Tests vergleichen gegen
# eine unabhaengige Schleifen-Referenz fuer 1, 2 und 4 Koepfe (mit und ohne Maske).`;

// Python literal emitters: ints stay ints, float banks render exact decimals,
// masks render True/False.
const pyNum = (n) => String(n);
const pyVec = (values) => `[${values.map(pyNum).join(', ')}]`;
const pyMat = (rows) => `[${rows.map(pyVec).join(', ')}]`;
const pyBoolMat = (rows) => `[${rows.map((row) => `[${row.map((v) => (v ? 'True' : 'False')).join(', ')}]`).join(', ')}]`;

const drawMatrix = (r, nRows, nCols, lo, hi) =>
  Array.from({ length: nRows }, () => Array.from({ length: nCols }, () => randInt(r, lo, hi)));

// Shape bank: (seqLen, dModel, nHeads) with dModel % nHeads === 0.
const MHA_SHAPES = [
  { n: 2, d: 2, h: 1 },
  { n: 2, d: 2, h: 2 },
  { n: 2, d: 6, h: 3 },
  { n: 3, d: 4, h: 2 },
  { n: 3, d: 4, h: 4 },
  { n: 3, d: 6, h: 3 },
  { n: 4, d: 4, h: 1 },
  { n: 4, d: 4, h: 2 },
  { n: 4, d: 6, h: 2 },
  { n: 4, d: 8, h: 4 },
];

// Mask bank: null (unmasked), causal lower triangle, random rows — the random
// variant forces the diagonal True so every query row keeps at least one key.
const MHA_MASK_KINDS = ['none', 'causal', 'random'];

const drawMask = (r, n, kind) => {
  if (kind === 'none') return null;
  if (kind === 'causal') {
    return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => j <= i));
  }
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (j === i ? true : r() < 0.5)));
};

// Case definition: the draw domain produces concrete literals that get baked
// into the test block (honest distinctness — the drawn inputs differ, not just
// a seed literal).
export const MHA_CASES = {
  'multi-head-attention': {
    difficulty: 'challenge',
    starterCode: MHA_STARTER,
    baseTests: MHA_BASE_TESTS,
    referenceSolver: MHA_REFERENCE,
    prompt: MHA_PROMPT,
    fullSolution: MHA_SOLUTION,
    draw(r) {
      const shape = MHA_SHAPES[randInt(r, 0, MHA_SHAPES.length - 1)];
      const maskKind = MHA_MASK_KINDS[randInt(r, 0, MHA_MASK_KINDS.length - 1)];
      return {
        shape,
        X: drawMatrix(r, shape.n, shape.d, -2, 2),
        Wq: drawMatrix(r, shape.d, shape.d, -1, 1),
        Wk: drawMatrix(r, shape.d, shape.d, -1, 1),
        Wv: drawMatrix(r, shape.d, shape.d, -2, 2),
        Wo: drawMatrix(r, shape.d, shape.d, -1, 1),
        mask: drawMask(r, shape.n, maskKind),
      };
    },
    extraCount: 2,
  },
};

// Appends the seeded literal checks: every draw is concrete in the test
// string, expected values via the __ref_mha loop reference from the base
// block (same tolerance atol=1e-9).
function seededChecks(entry, index) {
  const { shape, X, Wq, Wk, Wv, Wo, mask } = entry;
  const lines = [
    `__X${index} = ${pyMat(X)}`,
    `__Wq${index} = ${pyMat(Wq)}`,
    `__Wk${index} = ${pyMat(Wk)}`,
    `__Wv${index} = ${pyMat(Wv)}`,
    `__Wo${index} = ${pyMat(Wo)}`,
    `__check('seeded mha ${index}', np.allclose(multi_head_attention(__X${index}, __Wq${index}, __Wk${index}, __Wv${index}, __Wo${index}, ${shape.h}), __ref_mha(__X${index}, __Wq${index}, __Wk${index}, __Wv${index}, __Wo${index}, ${shape.h}), atol=1e-9))`,
  ];
  if (mask) {
    lines.push(
      `__M${index} = ${pyBoolMat(mask)}`,
      `__check('seeded mha maske ${index}', np.allclose(multi_head_attention(__X${index}, __Wq${index}, __Wk${index}, __Wv${index}, __Wo${index}, ${shape.h}, mask=__M${index}), __ref_mha(__X${index}, __Wq${index}, __Wk${index}, __Wv${index}, __Wo${index}, ${shape.h}, mask=__M${index}), atol=1e-9))`,
    );
  }
  return lines.join('\n');
}

export const MHA_CONTRACT = {
  familyId: 'optimize-multi-head-attention',
  familyGroup: 'optimize-update',
  summary: 'Zerlegt projizierte Q/K/V in Köpfe, rechnet je Kopf skalierte Attention mit Maske, konkateniert und projiziert die Ausgabe.',
  taskArchetype: 'code-tests',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'multi-head-attention', propertyTest: false },
  ],
  difficultyProfiles: ['challenge'],
  competencyIds: ['c-dl-attention', 'c-numpy-basics'],
};

// Capsule shape: parameters carry starterCode/tests/seedCases; tests must be
// the verbatim base block plus the seeded extras derived from seedCases.
const FAMILY = makeCaseFamily({
  contract: MHA_CONTRACT,
  cases: MHA_CASES,
  shapeError: 'Multi-Head-Attention-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, _caseId, seedCases) =>
    `# seeded extra cases\n${seedCases.map((entry, i) => seededChecks(entry, i + 1)).join('\n')}`,
  defaultPackages: PACKAGES,
});

export const mhaCaseOk = FAMILY.caseOk;
export const genMhaCase = FAMILY.genCase;
export const solveMhaFamily = FAMILY.solve;
export const generateMhaFamily = FAMILY.generate;
export const FAMILY_SPEC = FAMILY.spec;

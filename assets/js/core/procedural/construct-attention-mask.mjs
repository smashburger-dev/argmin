// Procedural family construct-attention-mask: the task text, starter code and
// reference solver stay fixed; the seed draws fresh mask sizes, length lists,
// score matrices and boolean masks that get appended to the curated base test
// block as literal __check lines. Expected masks are asserted inline against
// np.* references / literal comprehensions and expected softmax weights are
// recomputed inline with the same stability rule (mask as -inf, subtract row
// max, normalize), so the grading contract cannot drift. Mirrors
// formula-descriptive-stats-numpy.mjs.

import { makeCaseFamily } from './case_family_kit.mjs';

import { randInt } from '../generator_draw_kit.mjs';

const PACKAGES = ['numpy'];

const FULL_STARTER = `import numpy as np


def causal_mask(n):
    """Lower-triangular boolean mask: True where key j may be seen by query i (j <= i)."""
    ...


def padding_mask(lengths, L):
    """True where position j is a real token (j < lengths[i]); raise ValueError outside [0, L]."""
    ...


def masked_softmax(S, mask=None):
    """Row-wise stable softmax over scores S; mask True = visible; ValueError on fully masked rows."""
    ...
`;

const PAIR_STARTER = `import numpy as np


def padding_mask(lengths, L):
    ...


def masked_softmax(S, mask):
    ...
`;

const FULL_BASE_TESTS = `__check('kausale Maske 3x3', causal_mask(3).tolist() == [[True, False, False], [True, True, False], [True, True, True]])
__check('kausale Maske Diagonale True', bool(causal_mask(4).diagonal().all()))
__check('Padding-Maske Laengen', padding_mask([2, 3, 0], 3).tolist() == [[True, True, False], [True, True, True], [False, False, False]])
w = masked_softmax([[2.0, 0.0]])
__check('stabile Zeile [2, 0]', np.allclose(w, [[0.881, 0.119]], atol=1e-3))
big = masked_softmax([[1000.0, 999.0]])
__check('grosse Scores ohne Overflow', np.all(np.isfinite(big)))
__check('Zeilensummen 1', np.allclose(masked_softmax([[3.0, 1.0], [0.0, 0.0]]).sum(axis=1), 1.0))
w_m = masked_softmax([[5.0, 1.0], [0.0, 0.0]], mask=[[True, False], [True, True]])
__check('maskierte Zelle Gewicht 0', np.allclose(w_m[0], [1.0, 0.0], atol=1e-12))
try:
    masked_softmax([[1.0, 2.0]], mask=[[False, False]])
    __check('komplett maskierte Zeile -> ValueError', False, 'kein ValueError')
except ValueError:
    __check('komplett maskierte Zeile -> ValueError', True)
try:
    masked_softmax([[1.0, 2.0]], mask=[[True, False, True]])
    __check('Maskenform geprueft -> ValueError', False, 'kein ValueError')
except ValueError:
    __check('Maskenform geprueft -> ValueError', True)
try:
    padding_mask([4], 3)
    __check('Laenge ausserhalb L -> ValueError', False, 'kein ValueError')
except ValueError:
    __check('Laenge ausserhalb L -> ValueError', True)`;

const PAIR_BASE_TESTS = `__check('Padding-Maske', padding_mask([1, 3, 2], 3).tolist() == [[True, False, False], [True, True, True], [True, True, False]])
w = masked_softmax([[2.0, 0.0, -4.0]], [[True, True, False]])
__check('maskiertes Gewicht null', np.allclose(w, [[0.881, 0.119, 0.0]], atol=1e-3))
__check('stabil bei grossen Scores', np.all(np.isfinite(masked_softmax([[1000.0, 999.0]], [[True, True]]))))
try:
    padding_mask([4], 3)
    __check('ungueltige Laenge', False, 'kein ValueError')
except ValueError:
    __check('ungueltige Laenge', True)
try:
    masked_softmax([[1.0, 2.0]], [[False, False]])
    __check('leere Zeile', False, 'kein ValueError')
except ValueError:
    __check('leere Zeile', True)
`;

const FULL_REFERENCE = `import numpy as np

def causal_mask(n):
    """Lower-triangular boolean mask: True where key j may be seen by query i (j <= i)."""
    return np.tril(np.ones((int(n), int(n)), dtype=bool))

def padding_mask(lengths, L):
    """True where position j is a real token (j < lengths[i]); raise ValueError outside [0, L]."""
    lengths = [int(x) for x in lengths]
    if any(l < 0 or l > int(L) for l in lengths):
        raise ValueError("lengths must be within [0, L]")
    return np.array([[j < l for j in range(int(L))] for l in lengths], dtype=bool)

def masked_softmax(S, mask=None):
    """Row-wise stable softmax over scores S; mask True = visible; ValueError on fully masked rows."""
    S = np.asarray(S, dtype=float)
    if S.ndim != 2:
        raise ValueError("S must be 2-d")
    scores = S.copy()
    if mask is not None:
        keep = np.asarray(mask, dtype=bool)
        if keep.shape != scores.shape:
            raise ValueError("mask shape must match S")
        if bool((keep.sum(axis=1) == 0).any()):
            raise ValueError("fully masked row")
        scores = np.where(keep, scores, -np.inf)
    scores = scores - scores.max(axis=1, keepdims=True)
    w = np.exp(scores)
    return w / w.sum(axis=1, keepdims=True)
`;

const PAIR_REFERENCE = `import numpy as np

def padding_mask(lengths, L):
    lengths = [int(x) for x in lengths]
    if any(length < 0 or length > int(L) for length in lengths):
        raise ValueError("lengths must be within [0, L]")
    return np.array([[j < length for j in range(int(L))] for length in lengths], dtype=bool)

def masked_softmax(S, mask):
    scores = np.asarray(S, dtype=float)
    keep = np.asarray(mask, dtype=bool)
    if scores.ndim != 2 or keep.shape != scores.shape:
        raise ValueError("mask shape must match S")
    if bool((keep.sum(axis=1) == 0).any()):
        raise ValueError("fully masked row")
    scores = np.where(keep, scores, -np.inf)
    scores = scores - scores.max(axis=1, keepdims=True)
    weights = np.exp(scores)
    return weights / weights.sum(axis=1, keepdims=True)
`;

const FULL_PROMPT = 'Masken-Bausteine: Implementiere drei Funktionen. <code>causal_mask(n)</code> liefert die $(n, n)$-Bool-Matrix mit <code>True</code> genau dort, wo Key $j$ für Query $i$ sichtbar ist ($j \\le i$). <code>padding_mask(lengths, L)</code> liefert für Sequenzlängen <code>lengths</code> die $(\\texttt{len(lengths)}, L)$-Bool-Matrix mit <code>True</code> an echten Token-Positionen ($j < \\texttt{lengths}[i]$); Längen außerhalb $[0, L]$ werfen <code>ValueError</code>. <code>masked_softmax(S, mask=None)</code> normalisiert eine Score-Matrix zeilenweise und stabil; <code>mask</code> ist <code>True</code> = sichtbar; eine komplett verdeckte Zeile ($0$ sichtbare Zellen) und eine Maskenform, die nicht zu $S$ passt, werfen <code>ValueError</code>. Der Testcode prüft Handwerte (u. a. Scores 1000 gegen 999), Zeilensummen und alle Fehlerfälle.';

const PAIR_PROMPT = 'Implementiere eine Padding-Maske und einen stabilen maskierten Softmax. Echte Tokenpositionen bleiben sichtbar; eine komplett verdeckte Zeile ist ein Fehler.';

const FULL_SOLUTION = `${FULL_REFERENCE}# causal_mask(3) -> [[True, False, False], [True, True, False], [True, True, True]]
# masked_softmax([[2.0, 0.0]]) -> [[0.881, 0.119]]; komplett verdeckte Zeile -> ValueError.`;

const PAIR_SOLUTION = 'Die Padding-Maske markiert genau $j < \\texttt{lengths}[i]$. Der Softmax setzt unsichtbare Scores auf $-\\infty$, zieht pro Zeile das Maximum ab und verweigert leere sichtbare Zeilen.';

// Python literal rendering for the seeded test block (ints, bools, lists).
const pyLit = (value) => {
  if (value === true) return 'True';
  if (value === false) return 'False';
  if (Array.isArray(value)) return `[${value.map(pyLit).join(', ')}]`;
  return String(value);
};

// Shared draw helpers: lengths stay inside [0, L] (the error path gets its
// own out-of-range entry), every mask row keeps at least one visible cell so
// the drawn instance never trips the ValueError guard.
function drawLengths(r) {
  const L = randInt(r, 2, 5);
  const count = randInt(r, 1, 3);
  const lengths = Array.from({ length: count }, () => randInt(r, 0, L));
  return { lengths, L };
}

function drawMaskedScores(r) {
  const rows = randInt(r, 1, 2);
  const cols = randInt(r, 2, 4);
  const scores = Array.from({ length: rows }, () => (
    Array.from({ length: cols }, () => randInt(r, -6, 6))
  ));
  const mask = Array.from({ length: rows }, () => {
    const row = Array.from({ length: cols }, () => r() < 0.6);
    if (!row.some(Boolean)) row[randInt(r, 0, cols - 1)] = true;
    return row;
  });
  return { scores, mask };
}

const drawBadLength = (r, L) => (r() < 0.5 ? L + randInt(r, 1, 2) : -randInt(r, 1, 2));

// Recomputes the stable masked softmax as inline np reference lines — the
// same spec the reference solver implements (mask as -inf, row max, exp,
// normalize).
function softmaxRefLines(entry, index) {
  return [
    `__S${index} = ${pyLit(entry.scores)}`,
    `__M${index} = ${pyLit(entry.mask)}`,
    `__E${index} = np.where(np.asarray(__M${index}, dtype=bool), np.asarray(__S${index}, dtype=float), -np.inf)`,
    `__E${index} = __E${index} - __E${index}.max(axis=1, keepdims=True)`,
    `__W${index} = np.exp(__E${index})`,
    `__W${index} = __W${index} / __W${index}.sum(axis=1, keepdims=True)`,
  ];
}

function fullSeededChecks(entry, index) {
  return [
    `__check('seeded kausal ${index}', causal_mask(${entry.n}).tolist() == np.tril(np.ones((${entry.n}, ${entry.n}), dtype=bool)).tolist())`,
    `__check('seeded padding ${index}', padding_mask(${pyLit(entry.lengths)}, ${entry.L}).tolist() == [[j < l for j in range(${entry.L})] for l in ${pyLit(entry.lengths)}])`,
    ...softmaxRefLines(entry, index),
    `__check('seeded softmax ${index}', np.allclose(masked_softmax(__S${index}, __M${index}), __W${index}))`,
    'try:',
    `    padding_mask(${pyLit(entry.badLengths)}, ${entry.L})`,
    `    __check('seeded laenge fehler ${index}', False, 'kein ValueError')`,
    'except ValueError:',
    `    __check('seeded laenge fehler ${index}', True)`,
  ].join('\n');
}

function pairSeededChecks(entry, index) {
  return [
    `__check('seeded padding ${index}', padding_mask(${pyLit(entry.lengths)}, ${entry.L}).tolist() == [[j < l for j in range(${entry.L})] for l in ${pyLit(entry.lengths)}])`,
    ...softmaxRefLines(entry, index),
    `__check('seeded softmax ${index}', np.allclose(masked_softmax(__S${index}, __M${index}), __W${index}))`,
    'try:',
    `    padding_mask(${pyLit(entry.badLengths)}, ${entry.L})`,
    `    __check('seeded laenge fehler ${index}', False, 'kein ValueError')`,
    'except ValueError:',
    `    __check('seeded laenge fehler ${index}', True)`,
  ].join('\n');
}

// Case definitions: the draw domains produce concrete literals that get baked
// into the test block (honest distinctness). badLengths carries exactly one
// out-of-range entry so the ValueError arm stays deterministic.
export const ATTENTION_MASK_CASES = {
  'construct-causal-padding-mask': {
    difficulty: 'stretch',
    starterCode: FULL_STARTER,
    baseTests: FULL_BASE_TESTS,
    referenceSolver: FULL_REFERENCE,
    prompt: FULL_PROMPT,
    fullSolution: FULL_SOLUTION,
    seededChecks: fullSeededChecks,
    draw(r) {
      const { lengths, L } = drawLengths(r);
      const { scores, mask } = drawMaskedScores(r);
      const badLengths = [...lengths];
      badLengths[randInt(r, 0, badLengths.length - 1)] = drawBadLength(r, L);
      return { n: randInt(r, 2, 6), lengths, L, scores, mask, badLengths };
    },
    extraCount: 2,
  },
  'construct-padding-mask-softmax': {
    difficulty: 'core',
    starterCode: PAIR_STARTER,
    baseTests: PAIR_BASE_TESTS,
    referenceSolver: PAIR_REFERENCE,
    prompt: PAIR_PROMPT,
    fullSolution: PAIR_SOLUTION,
    seededChecks: pairSeededChecks,
    draw(r) {
      const { lengths, L } = drawLengths(r);
      const { scores, mask } = drawMaskedScores(r);
      const badLengths = [...lengths];
      badLengths[randInt(r, 0, badLengths.length - 1)] = drawBadLength(r, L);
      return { lengths, L, scores, mask, badLengths };
    },
    extraCount: 2,
  },
};

export const ATTENTION_MASK_CONTRACT = {
  familyId: 'construct-attention-mask',
  familyGroup: 'construct-program',
  summary: 'Konstruiert Attention-Masken als boolesche Matrizen nach Sichtbarkeitsregeln und führt das vertragsgeprüfte, stabile maskierte Softmax aus.',
  taskArchetype: 'code-tests',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'construct-causal-padding-mask', propertyTest: false },
    { caseId: 'construct-padding-mask-softmax', propertyTest: false },
  ],
  difficultyProfiles: ['stretch', 'core'],
  competencyIds: ['c-dl-attention', 'c-numpy-basics'],
  graderId: 'pyodide',
  activityType: 'python-code',
};

// Capsule shape: parameters carry starterCode/tests/seedCases; tests must be
// the verbatim base block plus the seeded extras derived from seedCases.
const FAMILY = makeCaseFamily({
  contract: ATTENTION_MASK_CONTRACT,
  cases: ATTENTION_MASK_CASES,
  shapeError: 'Attention-Mask-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, _caseId, seedCases) =>
    `# seeded extra cases\n${seedCases.map((entry, i) => caseDef.seededChecks(entry, i + 1)).join('\n')}`,
  defaultPackages: PACKAGES,
});

export const attentionMaskCaseOk = FAMILY.caseOk;
export const genAttentionMaskCase = FAMILY.genCase;
export const solveAttentionMaskFamily = FAMILY.solve;
export const generateAttentionMaskFamily = FAMILY.generate;
export const FAMILY_SPEC = FAMILY.spec;

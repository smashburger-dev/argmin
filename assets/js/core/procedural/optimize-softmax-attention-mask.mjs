// Procedural family optimize-softmax-attention-mask: task text, starter code
// and reference solver stay fixed; the seed draws fresh Q/K/V matrices and
// masks for the scaled attention case plus fresh id sequences for the toy
// forward pass. The draws get appended to the curated base test block as
// literal __check lines whose expected values are asserted inline against the
// __ref_attention / __ref_forward loop references that the base blocks
// already define, so the grading contract cannot drift. Mirrors
// formula-descriptive-stats-numpy.mjs.

import { makeCaseFamily } from './case_family_kit.mjs';

import { randInt } from '../generator_draw_kit.mjs';

const PACKAGES = ['numpy'];

const ATTN_STARTER = `import numpy as np


def attention(Q, K, V, mask=None):
    """Scaled dot-product attention; mask True = visible, False = blocked."""
    Q = np.asarray(Q, dtype=float)
    K = np.asarray(K, dtype=float)
    V = np.asarray(V, dtype=float)
    # scores = Q @ K.T / sqrt(d_k); apply mask as -inf BEFORE the softmax
    # stable row softmax: subtract the row maximum, then normalize
    ...
`;

const ATTN_BASE_TESTS = `def __ref_attention(Q, K, V, mask=None):
    n, d_k = len(Q), len(Q[0])
    out = []
    for i in range(n):
        s = [sum(Q[i][a] * K[j][a] for a in range(d_k)) / math.sqrt(d_k) for j in range(len(K))]
        if mask is not None:
            s = [s[j] if mask[i][j] else float('-inf') for j in range(len(s))]
        m = max(s)
        ex = [math.exp(v - m) for v in s]
        tot = sum(ex)
        w = [e / tot for e in ex]
        out.append([sum(w[j] * V[j][c] for j in range(len(V))) for c in range(len(V[0]))])
    return out

Q = [[1, 1, 0, 0], [0, 0, 1, 1]]
K = [[1, 1, 0, 0], [0, 0, 1, 1]]
V = [[2, 0], [0, 2]]
out = attention(Q, K, V)
__check('Handrechnung Zeile 1', np.allclose(out[0], [1.4621171572600098, 0.5378828427399903], atol=1e-9))
__check('Handrechnung Zeile 2', np.allclose(out[1], [0.5378828427399903, 1.4621171572600098], atol=1e-9))
__check('Form der Ausgabe', out.shape == (2, 2))

causal = [[True, False], [True, True]]
out_m = attention(Q, K, V, mask=causal)
__check('Kausale Maske: Zeile 2 unveraendert', np.allclose(out_m[1], out[1], atol=1e-12))
__check('Kausale Maske: Zeile 1 sieht nur Key 1', np.allclose(out_m[0], [2.0, 0.0], atol=1e-12))

rng = np.random.default_rng(42)
Qr = rng.integers(-3, 4, size=(3, 4)).astype(float)
Kr = rng.integers(-3, 4, size=(4, 4)).astype(float)
Vr = rng.integers(-5, 6, size=(4, 2)).astype(float)
__check('gegen Referenz unmaskiert', np.allclose(attention(Qr, Kr, Vr), __ref_attention(Qr.tolist(), Kr.tolist(), Vr.tolist()), atol=1e-9))
mr = np.tril(np.ones((3, 4), dtype=bool))
mr[0, 0] = True
__check('gegen Referenz mit Maske', np.allclose(attention(Qr, Kr, Vr, mask=mr), __ref_attention(Qr.tolist(), Kr.tolist(), Vr.tolist(), mask=mr.tolist()), atol=1e-9))
__check('Padding-Maske: Value-Zeile unvermischt', np.allclose(attention([[1.0, 0.0]], [[0.0, 1.0], [1.0, 0.0]], [[7.0, 0.0], [0.0, 9.0]], mask=[[False, True]])[0], [0.0, 9.0], atol=1e-12))`;

const TOY_STARTER = `import numpy as np


def toy_forward(ids, weights):
    """Toy forward pass with fixture weights: embed -> one causal attention block -> logits."""
    E = np.asarray(weights["E"], dtype=float)
    Wq = np.asarray(weights["Wq"], dtype=float)
    Wk = np.asarray(weights["Wk"], dtype=float)
    Wv = np.asarray(weights["Wv"], dtype=float)
    Wout = np.asarray(weights["Wout"], dtype=float)
    # stages: embed -> one causal attention block -> logits
    # (score scaling, stable row softmax and masking follow the lesson;
    #  the context is pooled over positions before the output projection)
    ...
`;

const TOY_BASE_TESTS = `E = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1], [1, 1, 0, 0], [0, 0, 1, 1]]
Wq = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]
Wk = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]
Wv = [[1, 2, 0, 0], [2, 1, 0, 0], [0, 0, 1, 2], [0, 0, 2, 1]]
Wout = [[1, 0, 0, 0, 1, 0], [0, 1, 0, 1, 0, 0], [0, 0, 1, 0, 1, 0], [0, 0, 0, 1, 0, 1]]
WEIGHTS = {"E": E, "Wq": Wq, "Wk": Wk, "Wv": Wv, "Wout": Wout}

def __ref_forward(ids, weights):
    import math
    E, Wq, Wk, Wv, Wout = weights["E"], weights["Wq"], weights["Wk"], weights["Wv"], weights["Wout"]
    n, d = len(ids), len(E[0])
    X = [E[i] for i in ids]
    Q = [[sum(X[i][a] * Wq[a][b] for a in range(d)) for b in range(d)] for i in range(n)]
    K = [[sum(X[i][a] * Wk[a][b] for a in range(d)) for b in range(d)] for i in range(n)]
    V = [[sum(X[i][a] * Wv[a][b] for a in range(d)) for b in range(d)] for i in range(n)]
    ctx = []
    for i in range(n):
        s = [sum(Q[i][a] * K[j][a] for a in range(d)) / math.sqrt(d) if j <= i else float('-inf') for j in range(n)]
        m = max(s)
        ex = [math.exp(v - m) for v in s]
        tot = sum(ex)
        w = [e / tot for e in ex]
        ctx.append([sum(w[j] * V[j][c] for j in range(n)) for c in range(d)])
    mean = [sum(ctx[i][c] for i in range(n)) / n for c in range(d)]
    return [sum(mean[a] * Wout[a][b] for a in range(d)) for b in range(len(Wout[0]))]

logits = toy_forward([0, 1, 2], WEIGHTS)
__check('Form: ein Logit je Vokabulareintrag', np.asarray(logits).shape == (6,))
__check('gegen Referenz [0,1,2]', np.allclose(logits, __ref_forward([0, 1, 2], WEIGHTS), atol=1e-9))
__check('gegen Referenz [4,5]', np.allclose(toy_forward([4, 5], WEIGHTS), __ref_forward([4, 5], WEIGHTS), atol=1e-9))
__check('gegen Referenz einzeltoken', np.allclose(toy_forward([3], WEIGHTS), __ref_forward([3], WEIGHTS), atol=1e-9))
__check('argmax der Referenz gleich', int(np.argmax(logits)) == int(np.argmax(__ref_forward([0, 1, 2], WEIGHTS))))
__check('Doppelaufruf identisch', np.array_equal(toy_forward([0, 1, 2], WEIGHTS), toy_forward([0, 1, 2], WEIGHTS)))
W2 = {"E": E, "Wq": Wq, "Wk": Wk, "Wv": [[2 * v for v in row] for row in Wv], "Wout": Wout}
__check('andere Gewichte andere Logits', not np.allclose(toy_forward([0, 1, 2], WEIGHTS), toy_forward([0, 1, 2], W2), atol=1e-9))`;

const ATTN_REFERENCE = `import math
import numpy as np

def attention(Q, K, V, mask=None):
    """Scaled dot-product attention; mask True = visible, False = blocked."""
    Q = np.asarray(Q, dtype=float)
    K = np.asarray(K, dtype=float)
    V = np.asarray(V, dtype=float)
    d_k = Q.shape[1]
    scores = Q @ K.T / np.sqrt(d_k)
    if mask is not None:
        keep = np.asarray(mask, dtype=bool)
        scores = np.where(keep, scores, -np.inf)
    scores = scores - scores.max(axis=1, keepdims=True)
    w = np.exp(scores)
    w = w / w.sum(axis=1, keepdims=True)
    return w @ V
`;

const TOY_REFERENCE = `import numpy as np

def toy_forward(ids, weights):
    """Toy forward pass with fixture weights: embed -> one causal attention block -> logits."""
    E = np.asarray(weights["E"], dtype=float)
    Wq = np.asarray(weights["Wq"], dtype=float)
    Wk = np.asarray(weights["Wk"], dtype=float)
    Wv = np.asarray(weights["Wv"], dtype=float)
    Wout = np.asarray(weights["Wout"], dtype=float)
    X = E[list(ids)]
    n, d = X.shape
    scores = (X @ Wq) @ (X @ Wk).T / np.sqrt(d)
    keep = np.tril(np.ones((n, n), dtype=bool))
    scores = np.where(keep, scores, -np.inf)
    scores = scores - scores.max(axis=1, keepdims=True)
    w = np.exp(scores)
    w = w / w.sum(axis=1, keepdims=True)
    ctx = w @ (X @ Wv)
    return ctx.mean(axis=0) @ Wout
`;

const ATTN_PROMPT = 'Implementiere <code>attention(Q, K, V, mask=None)</code> — Scaled Dot-Product Attention als Funktion. Vertrag: $Q$ liegt als $(n, d_k)$-Matrix vor, $K$ als $(m, d_k)$, $V$ als $(m, d_v)$; die Scores sind $QK^\\top/\\sqrt{d_k}$; das Softmax ist zeilenweise und stabil (Zeilenmaximum abziehen); <code>mask</code> ist optional eine boolesche Matrix $(n, m)$ mit <code>True</code> = sichtbar, <code>False</code> = blockiert — blockierte Scores werden <em>vor</em> dem Softmax auf $-\\infty$ gesetzt. Rückgabe: $A = \\mathrm{softmax}(QK^\\top/\\sqrt{d_k})V$ als $(n, d_v)$-Array. Listen als Eingabe sind erlaubt. Der Testcode enthält eine unabhängige Python-Referenz und prüft Handwerte, Maskenfälle und unbekannte Instanzen.';

const TOY_PROMPT = 'Toy-Forward-Pass: Implementiere <code>toy_forward(ids, weights)</code>. <strong>Dies ist eine Toy-Pipeline mit gestellten Gewichten — sie demonstriert Mechanik, keine Sprachfähigkeit; echte LLM-Inferenz bleibt lokales Projekt.</strong> Vertrag: <code>weights</code> ist ein Dictionary mit den Fixtur-Literalen <code>"E"</code> (V×d-Embedding), <code>"Wq"</code>, <code>"Wk"</code>, <code>"Wv"</code> (je d×d) und <code>"Wout"</code> (d×V). Ablauf: Embedding-Zeilen $X = E[\\texttt{ids}]$; ein einzelner Attention-Kopf auf den Projektionen $XW_Q$, $XW_K$, $XW_V$ mit Divisor $\\sqrt{d}$ und <strong>kausaler Maske</strong> ($-\\infty$ vor dem zeilenweise stabilen Softmax); Kontext zeilenweise mischen; Logits = Zeilenmittel des Kontexts mal $W_{\\text{out}}$ (Vektor der Länge V). Rückgabe: 1-d-Array. Der Testcode hält eine unabhängige Python-Schleifen-Referenz und prüft Handrechnung, Form, Determinismus (Doppelaufruf) und ein Anti-Hardcoding-Argument (andere Gewichte → andere Logits).';

const ATTN_SOLUTION = `${ATTN_REFERENCE}# Die Tests vergleichen gegen eine unabhaengige Python-Schleifen-Referenz:
# attention([[1,1,0,0],[0,0,1,1]], ...) mit V=[[2,0],[0,2]] liefert Zeile 1
# ~ [1.462, 0.538]; mit kausaler Maske sieht Zeile 1 nur Key 1 -> [2, 0].`;

const TOY_SOLUTION = `${TOY_REFERENCE}# toy_forward([0, 1, 2], WEIGHTS) -> 6 Logits; Doppelaufruf liefert byte-identische
# Ergebnisse (fixe Gewichte, kein Zufall) - der Test erzwingt beides gegen die Referenz.`;

// Python literal emitters: ints stay ints, masks render True/False.
const pyNum = (n) => String(n);
const pyVec = (values) => `[${values.map(pyNum).join(', ')}]`;
const pyMat = (rows) => `[${rows.map(pyVec).join(', ')}]`;
const pyBoolMat = (rows) => `[${rows.map((row) => `[${row.map((v) => (v ? 'True' : 'False')).join(', ')}]`).join(', ')}]`;

const drawMatrix = (r, nRows, nCols, lo, hi) =>
  Array.from({ length: nRows }, () => Array.from({ length: nCols }, () => randInt(r, lo, hi)));

// Mask bank: null (unmasked), causal lower triangle, random rows — the random
// variant forces the diagonal True so every query row keeps at least one key.
const ATTN_MASK_KINDS = ['none', 'causal', 'random'];

const drawMask = (r, n, m, kind) => {
  if (kind === 'none') return null;
  if (kind === 'causal') {
    // Rectangular causal mask: query row i sees keys j <= i (tril over n x m).
    return Array.from({ length: n }, (_, i) => Array.from({ length: m }, (_, j) => j <= i));
  }
  // Rectangular masks may have more query rows than keys: pin column
  // min(i, m - 1) so every row keeps at least one visible key.
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: m }, (_, j) => (j === Math.min(i, m - 1) ? true : r() < 0.5)));
};

// Case definitions: the draw domains produce concrete literals that get baked
// into the test block (honest distinctness — the drawn inputs differ, not just
// a seed literal).
export const ATTN_CASES = {
  'scaled-dot-product-attention': {
    difficulty: 'core',
    starterCode: ATTN_STARTER,
    baseTests: ATTN_BASE_TESTS,
    referenceSolver: ATTN_REFERENCE,
    prompt: ATTN_PROMPT,
    fullSolution: ATTN_SOLUTION,
    draw(r) {
      const n = randInt(r, 2, 4);
      const m = randInt(r, 2, 4);
      const dK = randInt(r, 2, 4);
      const dV = randInt(r, 1, 3);
      const maskKind = ATTN_MASK_KINDS[randInt(r, 0, ATTN_MASK_KINDS.length - 1)];
      return {
        Q: drawMatrix(r, n, dK, -3, 3),
        K: drawMatrix(r, m, dK, -3, 3),
        V: drawMatrix(r, m, dV, -5, 5),
        mask: drawMask(r, n, m, maskKind),
      };
    },
    emitChecks(entry, index) {
      const { Q, K, V, mask } = entry;
      const lines = [
        `__Q${index} = ${pyMat(Q)}`,
        `__K${index} = ${pyMat(K)}`,
        `__V${index} = ${pyMat(V)}`,
        `__check('seeded attn ${index}', np.allclose(attention(__Q${index}, __K${index}, __V${index}), __ref_attention(__Q${index}, __K${index}, __V${index}), atol=1e-9))`,
      ];
      if (mask) {
        lines.push(
          `__M${index} = ${pyBoolMat(mask)}`,
          `__check('seeded attn maske ${index}', np.allclose(attention(__Q${index}, __K${index}, __V${index}, mask=__M${index}), __ref_attention(__Q${index}, __K${index}, __V${index}, mask=__M${index}), atol=1e-9))`,
        );
      }
      return lines.join('\n');
    },
    extraCount: 2,
  },
  'toy-forward-pass': {
    difficulty: 'stretch',
    starterCode: TOY_STARTER,
    baseTests: TOY_BASE_TESTS,
    referenceSolver: TOY_REFERENCE,
    prompt: TOY_PROMPT,
    fullSolution: TOY_SOLUTION,
    draw(r) {
      const len = randInt(r, 1, 4);
      return { ids: Array.from({ length: len }, () => randInt(r, 0, 5)) };
    },
    emitChecks(entry, index) {
      return `__check('seeded forward ${index}', np.allclose(toy_forward(${pyVec(entry.ids)}, WEIGHTS), __ref_forward(${pyVec(entry.ids)}, WEIGHTS), atol=1e-9))`;
    },
    extraCount: 3,
  },
};

export const ATTN_CONTRACT = {
  familyId: 'optimize-softmax-attention-mask',
  familyGroup: 'optimize-update',
  summary: 'Berechnet Softmax-Aufmerksamkeit inklusive Maskierung der verbotenen Positionen.',
  taskArchetype: 'code-tests',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'scaled-dot-product-attention', propertyTest: false },
    { caseId: 'toy-forward-pass', propertyTest: false },
  ],
  difficultyProfiles: ['core', 'stretch'],
  competencyIds: ['c-dl-attention', 'c-numpy-basics', 'c-dl-inference'],
};

// Capsule shape: parameters carry starterCode/tests/seedCases; tests must be
// the verbatim base block plus the seeded extras derived from seedCases.
const FAMILY = makeCaseFamily({
  contract: ATTN_CONTRACT,
  cases: ATTN_CASES,
  shapeError: 'Softmax-Attention-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, _caseId, seedCases) =>
    `# seeded extra cases\n${seedCases.map((entry, i) => caseDef.emitChecks(entry, i + 1)).join('\n')}`,
  defaultPackages: PACKAGES,
});

export const attnCaseOk = FAMILY.caseOk;
export const genAttnCase = FAMILY.genCase;
export const solveAttnFamily = FAMILY.solve;
export const generateAttnFamily = FAMILY.generate;
export const FAMILY_SPEC = FAMILY.spec;

// Procedural family formula-lora-delta-apply: the task text, starter code and
// reference solver stay fixed; the seed draws fresh LoRA matrix fixtures
// (rank r, input/output dims, integer scaling alpha/r) that get appended to
// the curated base test block as literal __check lines. Expected values are
// asserted inline against the np.* reference expression (alpha / r) * (B @ A)
// with the same exactness as the base checks, so the grading contract cannot
// drift. Mirrors formula-descriptive-stats-numpy.mjs.

import { makeCaseFamily } from './case_family_kit.mjs';

import { randInt } from '../generator_draw_kit.mjs';

const PACKAGES = ['numpy'];

const CORE_STARTER = `import numpy as np


def lora_delta(A, B, alpha, r):
    """Delta W = (alpha / r) * B @ A with the rank contract checked."""
    A = np.asarray(A, dtype=float)
    B = np.asarray(B, dtype=float)
    # rank contract: A.shape[0] == r and B.shape[1] == r, both 2-d -> else ValueError
    ...


def apply_lora(W, A, B, alpha, r):
    """W' = W + Delta W; Delta shape must match W."""
    W = np.asarray(W, dtype=float)
    # delta = lora_delta(...); shape check against W; return W + delta
    ...
`;

const STRETCH_STARTER = `import numpy as np


def lora_delta(A, B, alpha, r):
    ...


def apply_lora(W, A, B, alpha, r):
    ...
`;

const CORE_BASE_TESTS = `A = [[1, 0, 2], [0, 1, 1]]
B = [[2, 0], [1, 1], [0, 3]]
__check('Delta exakt ganzzahlig', np.array_equal(lora_delta(A, B, 4, 2), np.array([[4.0, 0.0, 8.0], [2.0, 2.0, 6.0], [0.0, 6.0, 6.0]])))
__check('Skalierung alpha/r', np.array_equal(lora_delta(A, B, 8, 2), 2 * lora_delta(A, B, 4, 2)))
__check('alpha gleich r laesst W unveraendert plus Basis-Delta', np.array_equal(lora_delta(A, B, 2, 2), B @ np.asarray(A, dtype=float)))
W = [[1, 1, 1], [1, 1, 1], [1, 1, 1]]
W_new = apply_lora(W, A, B, 4, 2)
__check('apply_lora addiert', np.array_equal(W_new, np.asarray(W) + lora_delta(A, B, 4, 2)))
__check('W wird nicht mutiert', np.array_equal(np.asarray(W), [[1, 1, 1], [1, 1, 1], [1, 1, 1]]))
A_bad = [[1, 0, 2], [0, 1, 1], [1, 1, 1]]
try:
    lora_delta(A_bad, B, 4, 2)
    __check('falscher Rang -> ValueError', False, 'kein ValueError')
except ValueError:
    __check('falscher Rang -> ValueError', True)
try:
    apply_lora([[1, 1], [1, 1]], A, B, 4, 2)
    __check('falsche Form -> ValueError', False, 'kein ValueError')
except ValueError:
    __check('falsche Form -> ValueError', True)
__check('Rang-1 Sonderfall', np.array_equal(lora_delta([[2, 1]], [[3], [1]], 2, 1), np.array([[12.0, 6.0], [4.0, 2.0]])))`;

const STRETCH_BASE_TESTS = `A = [[1, 2], [0, 1]]
B = [[2, 0], [1, 3]]
__check('Delta mit alpha/r', np.array_equal(lora_delta(A, B, 4, 2), np.array([[4.0, 8.0], [2.0, 10.0]])))
__check('alpha verdoppelt Delta', np.array_equal(lora_delta(A, B, 8, 2), 2 * lora_delta(A, B, 4, 2)))
W = [[10, 10], [10, 10]]
__check('Basis plus Delta', np.array_equal(apply_lora(W, A, B, 4, 2), np.asarray(W) + lora_delta(A, B, 4, 2)))
__check('Eingabe unverändert', np.array_equal(np.asarray(W), [[10, 10], [10, 10]]))
try:
    lora_delta([[1, 2, 3]], B, 4, 2)
    __check('Rangfehler', False, 'kein ValueError')
except ValueError:
    __check('Rangfehler', True)
try:
    apply_lora([[1, 2, 3]], A, B, 4, 2)
    __check('Formfehler', False, 'kein ValueError')
except ValueError:
    __check('Formfehler', True)
`;

const CORE_REFERENCE = `import numpy as np

def lora_delta(A, B, alpha, r):
    """Delta W = (alpha / r) * B @ A with the rank contract checked."""
    A = np.asarray(A, dtype=float)
    B = np.asarray(B, dtype=float)
    if A.ndim != 2 or B.ndim != 2:
        raise ValueError("A und B muessen 2-d sein")
    if A.shape[0] != r or B.shape[1] != r:
        raise ValueError("Rang-Vertrag verletzt")
    return (alpha / r) * (B @ A)

def apply_lora(W, A, B, alpha, r):
    """W' = W + Delta W; Delta shape must match W."""
    W = np.asarray(W, dtype=float)
    delta = lora_delta(A, B, alpha, r)
    if delta.shape != W.shape:
        raise ValueError("Delta-Form muss W entsprechen")
    return W + delta
`;

const STRETCH_REFERENCE = `import numpy as np

def lora_delta(A, B, alpha, r):
    A = np.asarray(A, dtype=float)
    B = np.asarray(B, dtype=float)
    if A.ndim != 2 or B.ndim != 2 or A.shape[0] != r or B.shape[1] != r:
        raise ValueError("Rang-Vertrag verletzt")
    return (alpha / r) * (B @ A)

def apply_lora(W, A, B, alpha, r):
    W = np.asarray(W, dtype=float)
    delta = lora_delta(A, B, alpha, r)
    if delta.shape != W.shape:
        raise ValueError("Delta-Form muss W entsprechen")
    return W + delta
`;

const CORE_PROMPT = 'LoRA-Arithmetik exakt: Implementiere <code>lora_delta(A, B, alpha, r)</code> und <code>apply_lora(W, A, B, alpha, r)</code>. Vertrag: $\\Delta W = \\frac{\\alpha}{r}\\,BA$ mit $A$ als $(r, d_{in})$-Matrix und $B$ als $(d_{out}, r)$-Matrix; Verletzungen des Rang-Vertrags (<code>A.shape[0] != r</code> oder <code>B.shape[1] != r</code>) und nicht-2-d-Eingaben werfen <code>ValueError</code>. <code>apply_lora</code> liefert $W + \\Delta W$ und wirft <code>ValueError</code>, wenn die Form von $\\Delta W$ nicht zu $W$ passt; die Eingaben dürfen nicht mutiert werden. Reine Arithmetik an Toy-Maßen — kein echtes Fine-Tuning. Der Testcode rechnet mit ganzzahligen Fixtures (Skalierung $\\alpha/r$ ganzzahlig) exakt, nicht nur näherungsweise.';

const STRETCH_PROMPT = 'Implementiere die LoRA-Aktualisierung $\\Delta W=(\\alpha/r)BA$ und addiere sie auf eine Basis-Matrix, ohne Eingaben zu mutieren.';

const CORE_SOLUTION = `${CORE_REFERENCE}# lora_delta(A, B, 4, 2) mit den Test-Matrizen -> exakt [[4, 0, 8], [2, 2, 6], [0, 6, 6]]
# (B @ A) * 2; apply_lora addiert dieses Delta auf W.`;

const STRETCH_SOLUTION = 'Zuerst werden $B$ und $A$ multipliziert und mit $\\alpha/r$ skaliert. Das Ergebnis muss dieselbe Form wie $W$ besitzen; erst dann wird eine neue Matrix $W+\\Delta W$ zurückgegeben.';

const drawMatrix = (r, rows, cols, lo, hi) =>
  Array.from({ length: rows }, () => Array.from({ length: cols }, () => randInt(r, lo, hi)));

// Case definitions: the draw domains produce consistent LoRA fixtures — A is
// (rank, dIn), B is (dOut, rank), W is (dOut, dIn) and alpha is an integer
// multiple of the rank so the scaling alpha/r stays exact under array_equal
// (the base block demands integer-exact arithmetic). The drawn fixtures get
// baked into the test block as literals (honest distinctness — the drawn
// inputs differ, not just a seed literal).
export const LORA_CASES = {
  'lora-delta-apply': {
    difficulty: 'core',
    starterCode: CORE_STARTER,
    baseTests: CORE_BASE_TESTS,
    referenceSolver: CORE_REFERENCE,
    prompt: CORE_PROMPT,
    fullSolution: CORE_SOLUTION,
    draw(r) {
      const rank = randInt(r, 1, 3);
      const dIn = randInt(r, 2, 4);
      const dOut = randInt(r, 2, 4);
      const alpha = rank * randInt(r, 1, 3);
      return {
        A: drawMatrix(r, rank, dIn, -3, 4),
        B: drawMatrix(r, dOut, rank, -3, 4),
        W: drawMatrix(r, dOut, dIn, 0, 3),
        alpha,
        rank,
      };
    },
    extraCount: 3,
  },
  'lora-delta-scaled-update': {
    difficulty: 'stretch',
    starterCode: STRETCH_STARTER,
    baseTests: STRETCH_BASE_TESTS,
    referenceSolver: STRETCH_REFERENCE,
    prompt: STRETCH_PROMPT,
    fullSolution: STRETCH_SOLUTION,
    draw(r) {
      const rank = randInt(r, 1, 2);
      const dIn = randInt(r, 2, 3);
      const dOut = randInt(r, 2, 3);
      const alpha = rank * randInt(r, 1, 4);
      return {
        A: drawMatrix(r, rank, dIn, -2, 3),
        B: drawMatrix(r, dOut, rank, -2, 3),
        W: drawMatrix(r, dOut, dIn, 0, 4),
        alpha,
        rank,
      };
    },
    extraCount: 3,
  },
};

const pyMatrix = (m) => `[${m.map((row) => `[${row.join(', ')}]`).join(', ')}]`;

// Appends the seeded literal checks: every draw is concrete in the test
// string, expected values via the inline np.* reference (alpha / r) * (B @ A)
// — exact integer arithmetic because alpha is drawn as a multiple of rank.
function seededChecks(entry, index) {
  const A = `__A${index}`;
  const B = `__B${index}`;
  const W = `__W${index}`;
  const ref = `(${entry.alpha} / ${entry.rank}) * (np.asarray(${B}, dtype=float) @ np.asarray(${A}, dtype=float))`;
  return [
    `${A} = ${pyMatrix(entry.A)}`,
    `${B} = ${pyMatrix(entry.B)}`,
    `${W} = ${pyMatrix(entry.W)}`,
    `__check('seeded delta ${index}', np.array_equal(lora_delta(${A}, ${B}, ${entry.alpha}, ${entry.rank}), ${ref}))`,
    `__check('seeded scale ${index}', np.array_equal(lora_delta(${A}, ${B}, ${2 * entry.alpha}, ${entry.rank}), 2 * lora_delta(${A}, ${B}, ${entry.alpha}, ${entry.rank})))`,
    `__check('seeded apply ${index}', np.array_equal(apply_lora(${W}, ${A}, ${B}, ${entry.alpha}, ${entry.rank}), np.asarray(${W}, dtype=float) + ${ref}))`,
  ].join('\n');
}

export const LORA_CONTRACT = {
  familyId: 'formula-lora-delta-apply',
  familyGroup: 'formula-apply',
  summary: 'Wendet die LoRA-Delta-Formel (alpha/r)*B@A an und sichert Rang-, Form- und Dimensionsverträge mit ValueError ab.',
  taskArchetype: 'code-tests',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'lora-delta-apply', propertyTest: false },
    { caseId: 'lora-delta-scaled-update', propertyTest: false },
  ],
  difficultyProfiles: ['core', 'stretch'],
  competencyIds: ['c-dl-finetuning', 'c-numpy-basics'],
  graderId: 'pyodide',
  activityType: 'python-code',
};

// Capsule shape: parameters carry starterCode/tests/seedCases; tests must be
// the verbatim base block plus the seeded extras derived from seedCases.
const FAMILY = makeCaseFamily({
  contract: LORA_CONTRACT,
  cases: LORA_CASES,
  shapeError: 'LoRA-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, _caseId, seedCases) =>
    `# seeded extra cases\n${seedCases.map((entry, i) => seededChecks(entry, i + 1)).join('\n')}`,
  defaultPackages: PACKAGES,
});

export const loraCaseOk = FAMILY.caseOk;
export const genLoraCase = FAMILY.genCase;
export const solveLoraFamily = FAMILY.solve;
export const generateLoraFamily = FAMILY.generate;
export const FAMILY_SPEC = FAMILY.spec;

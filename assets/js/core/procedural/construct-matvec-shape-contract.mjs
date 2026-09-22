// Procedural family construct-matvec-shape-contract: mixed capsule family.
//   - matvec-contract-order (intro, parsons): the five reference lines stay
//     fixed; the seed draws 2 distractor lines from a 5-entry pool and
//     shuffles the displayed initialOrder — the puzzle is the same, the
//     presentation varies.
//   - matvec-code-reference (core, pyodide): base tests are the historical
//     w05-e8 oracle block; the seed draws extra (A, v) probes plus an
//     AssertionError contract path.
//   - final-boss-authored (challenge, pyodide): base tests verbatim plus
//     seeded probes — a compatible matmul pair, a rank-by-construction
//     matrix (drawn target rank 1-3, optional zero row, checked as a
//     (rank, pivot-columns) tuple) and an invertible 2x2 system.
// parameters carry only the drawn values plus the rebuilt artefacts
// (fragments/initialOrder or tests) — nothing answer-relevant leaks.
// Blueprints: reproduce-seeded-split.mjs, classify-eval-hazard.mjs.


import { randInt, nonzeroInt, rng, shuffle, until } from '../generator_draw_kit.mjs';

const DRAW_SCOPE = 'construct-matvec-shape-contract';


const pyList = (rows) => `[${rows.map((row) => (Array.isArray(row) ? pyList(row) : String(row))).join(', ')}]`;

// --- case 1: matvec-contract-order (parsons) ------------------------------------

const ORDER_FRAGMENTS = [
  { id: 'p1', text: 'def matvec(A, v):' },
  { id: 'p2', text: '    A = np.asarray(A)' },
  { id: 'p3', text: '    v = np.asarray(v)' },
  { id: 'p4', text: '    assert A.ndim == 2 and v.ndim == 1 and A.shape[1] == v.shape[0]' },
  { id: 'p5', text: '    return A @ v' },
];

const ORDER_BASE_INITIAL = ['p1', 'd1', 'p3', 'p5', 'p2', 'd2', 'p4'];

// Distractor pool: each line is a plausible wrong variant of the reference
// (swapped roles, operand order, elementwise, wrong dimension, dot-swap).
const DISTRACTOR_POOL = [
  { id: 'd1', text: '    assert v.ndim == 2 and A.ndim == 1 and v.shape[1] == A.shape[0]' },
  { id: 'd2', text: '    return v @ A' },
  { id: 'd3', text: '    return A * v' },
  { id: 'd4', text: '    assert A.shape[0] == v.shape[0]' },
  { id: 'd5', text: '    return np.dot(v, A)' },
];

const ORDER_SOLUTION = ['p1', 'p2', 'p3', 'p4', 'p5'];

// until returns the value directly — reshuffle inside the guard until the
// displayed order differs from the canonical fragment listing.
function drawOrder(r) {
  const pool = shuffle(r, [...DISTRACTOR_POOL]);
  const distractors = pool.slice(0, 2);
  const ids = [...ORDER_FRAGMENTS, ...distractors].map((f) => f.id);
  const initialOrder = until(r, () => shuffle(r, ids), (order) => order.join() !== ids.join(), { scope: DRAW_SCOPE });
  return { distractors, initialOrder };
}

// --- case 3 helpers: pivot oracle for the seeded rank draws -------------------

// JS mirror of the reference pivot rule: the first row at/below the current
// row with |value| > 1e-10 becomes the pivot — swap it up, normalize,
// eliminate below, record the column. The drawn matrices are built from an
// integer echelon basis so every > 1e-10 comparison stays exact.
function rankWithPivots(rows) {
  const M = rows.map((row) => row.map(Number));
  const pivots = [];
  let row = 0;
  for (let col = 0; col < M[0].length && row < M.length; col += 1) {
    const pivot = M.findIndex((entry, i) => i >= row && Math.abs(entry[col]) > 1e-10);
    if (pivot < 0) continue;
    [M[row], M[pivot]] = [M[pivot], M[row]];
    const d = M[row][col];
    M[row] = M[row].map((v) => v / d);
    for (let lower = row + 1; lower < M.length; lower += 1) {
      const f = M[lower][col];
      M[lower] = M[lower].map((v, i) => v - f * M[row][i]);
    }
    pivots.push(col);
    row += 1;
  }
  return { rank: pivots.length, pivots };
}

export const MATVEC_CASES = {
  'matvec-contract-order': {
    caseId: 'matvec-contract-order',
    kind: 'parsons',
    difficulty: 'intro',
    prompt: "Bringe die Zeilen der Referenzimplementierung von `matvec(A, v)` in die richtige Reihenfolge. Zwei Zeilen sind Distraktoren, die nicht zur Lösung gehören — sortiere sie aus.",
    baseFragments: [...ORDER_FRAGMENTS, DISTRACTOR_POOL[0], DISTRACTOR_POOL[1]],
    baseInitialOrder: ORDER_BASE_INITIAL,
    baseSolution: 'Richtige Folge: `def matvec(A, v):` → `A = np.asarray(A)` → `v = np.asarray(v)` → `assert A.ndim == 2 and v.ndim == 1 and A.shape[1] == v.shape[0]` → `return A @ v`. Die Distraktoren prüfen die Dimensionen vertauscht (würde gültige Aufrufe ablehnen) bzw. rechnen `v @ A` (für 1-d v nicht definiert).',
    activityType: 'parsons',
    graderId: 'deterministic',
    buildSolution: (p) => `Richtige Folge: \`def matvec(A, v):\` → \`A = np.asarray(A)\` → \`v = np.asarray(v)\` → \`assert A.ndim == 2 and v.ndim == 1 and A.shape[1] == v.shape[0]\` → \`return A @ v\`. Die Distraktoren (${p.fragments.filter((f) => f.id.startsWith('d')).map((f) => `\`${f.text.trim()}\``).join(' bzw. ')}) gehören nicht zur Lösung.`,
    competencyIds: ['c-numpy-basics', 'c-python-reading'],
    draw: drawOrder,
    checkParams(p) {
      if (!Array.isArray(p.fragments) || !Array.isArray(p.initialOrder)) return false;
      const pLines = p.fragments.filter((f) => f.id.startsWith('p'));
      const dLines = p.fragments.filter((f) => f.id.startsWith('d'));
      if (pLines.length !== 5 || dLines.length !== 2) return false;
      const canonical = new Map([...ORDER_FRAGMENTS, ...DISTRACTOR_POOL].map((f) => [f.id, f.text]));
      for (const f of p.fragments) {
        if (canonical.get(f.id) !== f.text) return false;
      }
      const ids = p.fragments.map((f) => f.id);
      const sorted = [...p.initialOrder].sort();
      if (sorted.join() !== [...ids].sort().join()) return false;
      return p.initialOrder.join() !== ids.join();
    },
  },
  'matvec-code-reference': {
    caseId: 'matvec-code-reference',
    kind: 'code',
    difficulty: 'core',
    packages: ['numpy'],
    starterCode: "import numpy as np\n\ndef matvec(A, v):\n    \"\"\"Return A @ v after checking shapes.\"\"\"\n    # pruefe Shapes, dann berechne\n    ...\n",
    // Historical w05-e8 oracle block — verbatim anchor for this case.
    baseTests: `
import json
import numpy as np

# --- 1) Mehrere gueltige Matrix-Vektor-Produkte (auch nicht quadratisch) ---
__r1 = np.array_equal(matvec([[1, 2], [3, 4]], [1, 1]), np.array([3, 7]))
__check('Korrekt: 2x2-Mal-Vektor', __r1, 'erwartet [3, 7]')
__r2 = np.array_equal(matvec([[2, 0], [0, 3]], [5, -2]), np.array([10, -6]))
__check('Korrekt: zweite 2x2-Matrix', __r2, 'erwartet [10, -6]')
__r3 = np.array_equal(matvec([[1, 2, 3], [4, 5, 6]], [1, 0, -1]), np.array([-2, -2]))
__check('Korrekt: nicht quadratische 2x3-Matrix', __r3, 'erwartet [-2, -2]')

# --- 2) Dimensionsvertraege einzeln: AssertionError fuer jeden unguelten Fall ---
def __expect_assert(label, fn):
    try:
        fn()
        __check(label, False, 'kein AssertionError geworfen')
    except AssertionError:
        __check(label, True)
    except Exception as e:
        __check(label, False, 'falscher Fehlertyp: ' + type(e).__name__)

__expect_assert('Vertrag A.ndim == 2: 1-dimensionales A abgelehnt', lambda: matvec([1, 2], [1, 1]))
__expect_assert('Vertrag A.ndim == 2: 3-dimensionales A abgelehnt', lambda: matvec(np.zeros((2, 2, 2)), [1, 1]))
__expect_assert('Vertrag v.ndim == 1: 2-dimensionales v abgelehnt', lambda: matvec([[1, 2], [3, 4]], [[1], [2]]))
__expect_assert('Vertrag A.shape[1] == v.shape[0]: inkompatible Shapes abgelehnt', lambda: matvec([[1, 2, 3], [4, 5, 6]], [1, 2]))

# --- 3) Listenverarbeitung ueber np.asarray ---
__r4 = matvec([[1, 2], [3, 4]], [1, 1])
__check('Listen als Eingabe akzeptiert (Ergebnis ist ndarray)', isinstance(__r4, np.ndarray) and np.array_equal(__r4, np.array([3, 7])), 'np.asarray vor der Rechnung verwenden')
`,
    referenceSolver: "def matvec(A, v):\n    A = np.asarray(A); v = np.asarray(v)\n    assert A.ndim == 2 and v.ndim == 1 and A.shape[1] == v.shape[0]\n    return A @ v",
    activityType: 'python-code',
    graderId: 'pyodide',
    prompt: "Implementiere `matvec(A, v)`, das $A\\,v$ mit NumPy berechnet und VOR der Berechnung prüft, dass `A` 2-dimensional, `v` 1-dimensional und `A.shape[1] == v.shape[0]` ist — sonst `AssertionError`. Der Testcode ist von deiner Eingabe getrennt und prüft Wert und Shape-Verhalten.",
    fullSolution: "import numpy as np\n\ndef matvec(A, v):\n    A = np.asarray(A)\n    v = np.asarray(v)\n    assert A.ndim == 2 and v.ndim == 1 and A.shape[1] == v.shape[0]\n    return A @ v\n\n# matvec([[1,2],[3,4]], [1,1]) -> array([3, 7])",
    extraCount: 3,
    draw(r) {
      const m = randInt(r, 2, 4);
      const n = randInt(r, 1, 4);
      const A = Array.from({ length: m }, () => Array.from({ length: n }, () => randInt(r, -7, 7)));
      const v = Array.from({ length: n }, () => randInt(r, -7, 7));
      const badV = Array.from({ length: n + 1 }, () => randInt(r, -7, 7));
      return { A, v, badV };
    },
    seededChecks: matvecSeededChecks,
  },
  'final-boss-authored': {
    caseId: 'final-boss-authored',
    kind: 'code',
    difficulty: 'challenge',
    packages: ['numpy'],
    starterCode: "import numpy as np\n\n\ndef shape_safe_matmul(A, B):\n    pass\n\n\ndef rank_with_pivots(A):\n    pass\n\n\ndef solve_system(A, b):\n    pass\n",
    baseTests: "import numpy as np\n\n__check('2x3 @ 3x2', np.array_equal(shape_safe_matmul([[1,2,3],[4,5,6]], [[1,0],[0,1],[1,1]]), np.array([[4,5],[10,11]])))\n__check('rechteckiges Produkt', np.array_equal(shape_safe_matmul([[2,-1]], [[3],[4]]), np.array([[2]])))\ntry:\n    shape_safe_matmul([[1,2]], [[1,2]])\n    __check('inkompatible Shapes abgelehnt', False, 'kein ValueError')\nexcept ValueError:\n    __check('inkompatible Shapes abgelehnt', True)\nexcept Exception as exc:\n    __check('inkompatible Shapes abgelehnt', False, type(exc).__name__)\n__check('Rang 2 bei abhängiger Zeile', rank_with_pivots([[1,0,1],[0,1,1],[1,1,2]]) == (2, [0, 1]))\n__check('Rang 3 bei Vollrang', rank_with_pivots([[2,1,0],[0,3,1],[1,0,2]]) == (3, [0, 1, 2]))\n__check('Rang 1 bei Vielfachen', rank_with_pivots([[1,2],[2,4],[-3,-6]]) == (1, [0]))\n__check('Rang 2 trotz Nullzeile', rank_with_pivots([[0,0,0],[1,0,1],[0,1,1]]) == (2, [0, 1]))\n__check('kein matrix_rank-shortcut', 'matrix_rank' not in rank_with_pivots.__code__.co_names)\n__s1 = solve_system([[2,1],[1,-3]], [5,-8])\n__check('2x2-System', np.allclose(__s1, np.array([1,3])))\n__s2 = solve_system([[3,1,0],[1,4,1],[0,2,5]], [7,12,17])\n__check('3x3-System', np.allclose(np.asarray([[3,1,0],[1,4,1],[0,2,5]]) @ np.asarray(__s2), np.array([7,12,17])))",
    referenceSolver: "def shape_safe_matmul(A, B):\n    A = np.asarray(A)\n    B = np.asarray(B)\n    if A.ndim != 2 or B.ndim != 2 or A.shape[1] != B.shape[0]:\n        raise ValueError(\"inkompatible Shapes\")\n    return A @ B\n\ndef rank_with_pivots(A):\n    M = np.asarray(A, dtype=float).copy()\n    row = 0\n    pivot_cols = []\n    for col in range(M.shape[1]):\n        pivots = np.flatnonzero(np.abs(M[row:, col]) > 1e-10)\n        if not len(pivots):\n            continue\n        pivot = row + pivots[0]\n        M[[row, pivot]] = M[[pivot, row]]\n        M[row] /= M[row, col]\n        for lower in range(row + 1, M.shape[0]):\n            M[lower] -= M[lower, col] * M[row]\n        pivot_cols.append(col)\n        row += 1\n        if row == M.shape[0]:\n            break\n    return row, pivot_cols\n\ndef solve_system(A, b):\n    A = np.asarray(A, dtype=float)\n    b = np.asarray(b, dtype=float)\n    if A.ndim != 2 or A.shape[0] != A.shape[1] or b.shape != (A.shape[0],):\n        raise ValueError(\"inkompatible Shapes\")\n    return np.linalg.solve(A, b)",
    activityType: 'python-code',
    graderId: 'pyodide',
    prompt: "Implementiere drei Funktionen: `shape_safe_matmul(A, B)` prüft 2D-Shapes und multipliziert Matrizen; `rank_with_pivots(A)` bestimmt per Pivot-Elimination (pro Spalte erste Zeile ab der aktuellen mit |wert| > 1e-10 als Pivot, Zeilentausch, normieren, darunter eliminieren) den Rang und gibt das Tupel `(rang, pivot_spalten)` mit sortierter Liste der Pivot-Spaltenindizes zurück; `solve_system(A, b)` löst ein quadratisches System mit eindeutiger Lösung. Die Tests enthalten rechteckige Matrizen, abhängige Zeilen, Nullzeilen und Fehlerfälle.",
    fullSolution: "<pre><code>def shape_safe_matmul(A, B):\n    A = np.asarray(A)\n    B = np.asarray(B)\n    if A.ndim != 2 or B.ndim != 2 or A.shape[1] != B.shape[0]:\n        raise ValueError(\"inkompatible Shapes\")\n    return A @ B\n\ndef rank_with_pivots(A):\n    M = np.asarray(A, dtype=float).copy()\n    row = 0\n    pivot_cols = []\n    for col in range(M.shape[1]):\n        pivots = np.flatnonzero(np.abs(M[row:, col]) &gt; 1e-10)\n        if not len(pivots):\n            continue\n        pivot = row + pivots[0]\n        M[[row, pivot]] = M[[pivot, row]]\n        M[row] /= M[row, col]\n        for lower in range(row + 1, M.shape[0]):\n            M[lower] -= M[lower, col] * M[row]\n        pivot_cols.append(col)\n        row += 1\n        if row == M.shape[0]:\n            break\n    return row, pivot_cols\n\ndef solve_system(A, b):\n    A = np.asarray(A, dtype=float)\n    b = np.asarray(b, dtype=float)\n    if A.ndim != 2 or A.shape[0] != A.shape[1] or b.shape != (A.shape[0],):\n        raise ValueError(\"inkompatible Shapes\")\n    return np.linalg.solve(A, b)</code></pre>",
    extraCount: 3,
    draw(r) {
      const m = randInt(r, 1, 3);
      const k = randInt(r, 2, 3);
      const n = randInt(r, 1, 3);
      const A = Array.from({ length: m }, () => Array.from({ length: k }, () => randInt(r, -5, 5)));
      const B = Array.from({ length: k }, () => Array.from({ length: n }, () => randInt(r, -5, 5)));
      const badB = Array.from({ length: k + 1 }, () => Array.from({ length: n }, () => randInt(r, -5, 5)));
      // rank-by-construction: `targetRank` basis rows in staggered echelon
      // form (unit leading entry, zeros left of it) so the pivot columns are
      // exactly the drawn `cols`; filler rows are small-integer combos and a
      // zero row is inserted at a random position half of the time.
      const targetRank = randInt(r, 1, 3);
      const cols = shuffle(r, [0, 1, 2]).slice(0, targetRank).sort((a, b) => a - b);
      const basis = cols.map((col) => {
        const row = [0, 0, 0];
        row[col] = 1;
        for (let c = col + 1; c < 3; c += 1) row[c] = randInt(r, -3, 3);
        return row;
      });
      const rankRows = basis.map((row) => [...row]);
      while (rankRows.length < 3) {
        const coeffs = basis.map(() => randInt(r, -2, 2));
        if (coeffs.every((c) => c === 0)) coeffs[randInt(r, 0, coeffs.length - 1)] = nonzeroInt(r, -2, 2);
        rankRows.push(basis[0].map((_, i) => coeffs.reduce((sum, c, j) => sum + c * basis[j][i], 0)));
      }
      if (randInt(r, 0, 1) === 1) rankRows.splice(randInt(r, 0, rankRows.length), 0, [0, 0, 0]);
      const { rank, pivots } = rankWithPivots(rankRows);
      // invertible 2x2 via det != 0 guard, plus a matching rhs.
      let M;
      do {
        M = Array.from({ length: 2 }, () => Array.from({ length: 2 }, () => randInt(r, -4, 4)));
      } while (M[0][0] * M[1][1] - M[0][1] * M[1][0] === 0);
      const rhs = [randInt(r, -6, 6), randInt(r, -6, 6)];
      return { A, B, badB, rankRows, rank, pivots, M, rhs };
    },
    seededChecks: bossSeededChecks,
  },
};

// --- seeded test emission --------------------------------------------------------

function matvecSeededChecks(entry, index) {
  return [
    `__sa${index} = ${pyList(entry.A)}`,
    `__sv${index} = ${pyList([entry.v])}`,
    `__check('seeded matvec ${index}', np.array_equal(np.asarray(matvec(__sa${index}, __sv${index}[0])), np.asarray(__sa${index}) @ np.asarray(__sv${index}[0])))`,
    'try:',
    `    matvec(__sa${index}, ${pyList(entry.badV)})`,
    `    __check('seeded matvec-vertrag ${index}', False, 'kein AssertionError')`,
    'except AssertionError:',
    `    __check('seeded matvec-vertrag ${index}', True)`,
    'except Exception as exc:',
    `    __check('seeded matvec-vertrag ${index}', False, type(exc).__name__)`,
  ].join('\n');
}

function bossSeededChecks(entry, index) {
  return [
    `__bA${index} = ${pyList(entry.A)}`,
    `__bB${index} = ${pyList(entry.B)}`,
    `__check('seeded matmul ${index}', np.array_equal(shape_safe_matmul(__bA${index}, __bB${index}), np.asarray(__bA${index}) @ np.asarray(__bB${index})))`,
    'try:',
    `    shape_safe_matmul(__bA${index}, ${pyList(entry.badB)})`,
    `    __check('seeded matmul-vertrag ${index}', False, 'kein ValueError')`,
    'except ValueError:',
    `    __check('seeded matmul-vertrag ${index}', True)`,
    'except Exception as exc:',
    `    __check('seeded matmul-vertrag ${index}', False, type(exc).__name__)`,
    `__check('seeded rang ${index}', rank_with_pivots(${pyList(entry.rankRows)}) == (${entry.rank}, ${pyList(entry.pivots)}))`,
    `__bx${index} = solve_system(${pyList(entry.M)}, ${pyList(entry.rhs)})`,
    `__check('seeded solve ${index}', np.allclose(np.asarray(${pyList(entry.M)}) @ np.asarray(__bx${index}), np.asarray(${pyList(entry.rhs)})))`,
  ].join('\n');
}

// Kit convention: per-case `seededChecks(entry, index)` emitters (same as
// construct-ensemble-predictor-comparison and rank-evidence-table).
function seededBlock(caseDef, seedCases) {
  const checks = seedCases.map((entry, i) => caseDef.seededChecks(entry, i + 1)).join('\n');
  return `# seeded extra cases\n${checks}`;
}

// --- capsule predicates / generators ---------------------------------------------

export function matvecCaseOk(parameters, caseDef) {
  try {
    if (caseDef.kind === 'parsons') return caseDef.checkParams(parameters);
    if (!parameters || typeof parameters !== 'object') return false;
    if (parameters.starterCode !== caseDef.starterCode) return false;
    if (!Array.isArray(parameters.seedCases) || parameters.seedCases.length !== caseDef.extraCount) return false;
    return parameters.tests === `${caseDef.baseTests}\n\n${seededBlock(caseDef, parameters.seedCases)}`;
  } catch { return false; }
}

export function genMatvecCase(seed, caseDef) {
  const r = rng(seed);
  if (caseDef.kind === 'parsons') {
    const drawn = caseDef.draw(r);
    const fragments = [...ORDER_FRAGMENTS, ...drawn.distractors];
    return {
      parameters: { caseId: caseDef.caseId, difficulty: caseDef.difficulty, fragments, initialOrder: drawn.initialOrder },
      expected: { kind: 'ordered-lines', solutionOrder: [...ORDER_SOLUTION], distractors: drawn.distractors.map((f) => f.id) },
      prompt: caseDef.prompt,
      fullSolution: caseDef.buildSolution({ fragments }),
      competencyIds: caseDef.competencyIds,
      activityType: caseDef.activityType,
      graderId: caseDef.graderId,
    };
  }
  const seedCases = Array.from({ length: caseDef.extraCount }, () => caseDef.draw(r));
  return {
    parameters: {
      caseId: caseDef.caseId,
      difficulty: caseDef.difficulty,
      packages: caseDef.packages,
      starterCode: caseDef.starterCode,
      tests: `${caseDef.baseTests}\n\n${seededBlock(caseDef, seedCases)}`,
      seedCases,
    },
    expected: { kind: 'reference-solver', referenceSolver: caseDef.referenceSolver },
    prompt: caseDef.prompt,
    fullSolution: caseDef.fullSolution,
    competencyIds: caseDef.competencyIds,
    activityType: caseDef.activityType,
    graderId: caseDef.graderId,
  };
}

export function solveMatvecFamily(parameters) {
  const caseDef = MATVEC_CASES[parameters?.caseId];
  if (!caseDef || !matvecCaseOk(parameters, caseDef)) {
    throw new Error('construct-matvec-shape-contract: Parameter verletzen die Kapselform');
  }
  if (caseDef.kind === 'parsons') {
    return { solutionOrder: [...ORDER_SOLUTION], distractors: parameters.fragments.filter((f) => f.id.startsWith('d')).map((f) => f.id) };
  }
  return { referenceCode: caseDef.referenceSolver };
}

export const MATVEC_CONTRACT = {
  familyId: 'construct-matvec-shape-contract',
  familyGroup: 'construct-program',
  summary: 'Setzt die matvec-Referenzzeilen in die richtige Reihenfolge, implementiert den Shape-Vertrag und synthetisiert matmul/rank/solve mit Guards.',
  taskArchetype: 'program-ordering',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'matvec-contract-order', propertyTest: false },
    { caseId: 'matvec-code-reference', propertyTest: false },
    { caseId: 'final-boss-authored', propertyTest: false },
  ],
  difficultyProfiles: ['challenge', 'core', 'intro'],
  competencyIds: ['c-numpy-basics', 'c-python-reading'],
  graderId: 'deterministic',
  activityType: 'parsons',
};

export function generateMatvecFamily({ seed, caseId, difficulty }) {
  if (!Number.isSafeInteger(seed)) throw new Error('Seed muss eine ganze Zahl sein');
  const caseDef = MATVEC_CASES[caseId];
  if (!caseDef || caseDef.difficulty !== difficulty) {
    throw new Error(`Unbekannter Fall ${caseId} für Profil ${difficulty}`);
  }
  return genMatvecCase(seed, caseDef);
}

export const FAMILY_SPEC = { ...MATVEC_CONTRACT, generate: generateMatvecFamily, solve: solveMatvecFamily };

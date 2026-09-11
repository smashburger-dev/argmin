// Session-B fresh-variation generators for linear algebra and NumPy
// competencies (W5, ADR-0015). The two matrix/system families wrap the
// existing, property-tested generators from linalg_generators.mjs — same seeds,
// same numbers, same solvers — and only add the seeded prompt and
// fullSolution that the fresh-evidence definitions need. The determinant
// and shape families are new procedural generators with their own
// independent reference solvers.

import { rng, randInt, nonzeroInt } from './generator_draw_kit.mjs';
import { genMatmulEntry, genLinear2 } from './linalg_generators.mjs';


const matrixText = (m) => m.map((row) => `[${row.map((v) => String(v).padStart(3)).join('  ')}]`).join('\n');

// --- c-linalg-matrices: seeded matmul entry (wraps genMatmulEntry) -----------

/** numeric: one entry c_ij of a generated 2x2 matrix product. Parameters
 *  and expected come from the existing genMatmulEntry family (200-seed
 *  property-tested); this wrapper only adds prompt and worked solution. */
export function genMatmulEntryFresh(seed) {
  const base = genMatmulEntry(seed);
  const { A, B, entry } = base.parameters;
  const [i, j] = entry;
  const row = A[i - 1];
  const col = [B[0][j - 1], B[1][j - 1]];
  const expanded = row.map((v, k) => `${v}·${col[k]}`).join(' + ');
  return {
    ...base,
    prompt: `Gegeben sind die Matrizen\n\nA =\n${matrixText(A)}\n\nB =\n${matrixText(B)}\n\nBerechne den Eintrag c_${i}${j} des Produkts C = A·B und gib ihn als ganze Zahl ein.`,
    fullSolution: `c_${i}${j} ist das Skalarprodukt der ${i}. Zeile von A mit der ${j}. Spalte von B: ${expanded} = ${base.expected}.`,
  };
}

// --- c-linalg-gauss: seeded 2x2 system (wraps genLinear2) ----------------------

/** vector: solve a generated 2x2 linear system. Parameters and expected
 *  come from the existing genLinear2 family (unique integer solution,
 *  det ≠ 0); the wrapper renders the system as equations. */
export function genLinear2Fresh(seed) {
  const base = genLinear2(seed);
  const { A, b } = base.parameters;
  const [x, y] = base.expected;
  return {
    ...base,
    prompt: `Löse das lineare Gleichungssystem\n\n  ${A[0][0]}x + ${A[0][1]}y = ${b[0]}\n  ${A[1][0]}x + ${A[1][1]}y = ${b[1]}\n\nmit dem Gauß-Verfahren und gib die Lösung als Paar (x, y) an — in der Schreibweise (x, y).`,
    fullSolution: `Elimination: eine Gleichung mit passendem Faktor von der anderen abziehen, bis eine Gleichung nur noch y enthält; dann zurückeinsetzen. Die Lösung ist x = ${x}, y = ${y} (Probe in beiden Gleichungen einsetzen).`,
  };
}

// --- c-linalg-independence: 2x2 determinant -------------------------------------

/** Independent reference solver: det of a 2x2 matrix (ad - bc). */
export function det2(m) {
  return m[0][0] * m[1][1] - m[0][1] * m[1][0];
}

/** numeric: determinant of a generated 2x2 matrix whose columns are
 *  guaranteed linearly independent (det ≠ 0). Invariants: entries in
 *  [-5, 5] nonzero, det in [-50, 50] nonzero — a wide, non-degenerate
 *  answer space (unlike yes/no independence questions with 50% blind
 *  rate). */
export function genDet2(seed) {
  const r = rng(seed);
  let m;
  let d = 0;
  for (let i = 0; i < 200; i++) {
    m = [
      [nonzeroInt(r, -5, 5), nonzeroInt(r, -5, 5)],
      [nonzeroInt(r, -5, 5), nonzeroInt(r, -5, 5)],
    ];
    d = det2(m);
    if (d !== 0) break;
  }
  if (d === 0) {
    m = [[1, 2], [3, 4]];
    d = det2(m);
  }
  const parameters = { A: m };
  return {
    parameters,
    expected: d,
    prompt: `Die Spalten der Matrix\n\nA =\n${matrixText(m)}\n\nsollen auf lineare Unabhängigkeit geprüft werden. Berechne die Determinante det(A) als ganze Zahl — det(A) ≠ 0 beweist die Unabhängigkeit der Spalten.`,
    fullSolution: `det(A) = a·d − b·c = ${m[0][0]}·${m[1][1]} − ${m[0][1]}·${m[1][0]} = ${m[0][0] * m[1][1]} − ${m[0][1] * m[1][0]} = ${d}. Da det(A) ≠ 0, sind die Spalten linear unabhängig.`,
  };
}

// --- c-numpy-basics: shape contracts ---------------------------------------------

const tupleText = (shape) => `(${shape.join(', ')})`;

/** Independent reference solver: shape arithmetic for the generated
 *  expression family (reshape with -1, row broadcasting, transpose,
 *  outer broadcast). */
export function solveShape(shape, p) {
  if (shape === 'reshape-auto') return [p.rows, p.n / p.rows];
  if (shape === 'row-broadcast') return [p.rows, p.n / p.rows];
  if (shape === 'transpose') return [p.n / p.rows, p.rows];
  return [p.n1, p.n2];
}

/** predict-output: NumPy shape contracts without executing NumPy. The
 *  reshape uses the -1 placeholder so the second dimension must be DERIVED
 *  (n / rows) instead of read off the arguments — the answer tuple never
 *  appears verbatim in the code. Answer space: the full (2..6)x(2..6)
 *  tuple space. */
export function genShapePredict(seed) {
  const r = rng(seed);
  const shape = ['reshape-auto', 'row-broadcast', 'transpose', 'outer'][randInt(r, 0, 3)];
  let parameters;
  if (shape === 'reshape-auto') {
    const rows = randInt(r, 2, 6);
    const cols = randInt(r, 2, 6);
    parameters = { shape, rows, n: rows * cols, snippet: `import numpy as np\na = np.arange(${rows * cols})\nm = a.reshape(${rows}, -1)\nprint(m.shape)` };
  } else if (shape === 'row-broadcast') {
    const rows = randInt(r, 2, 6);
    const cols = randInt(r, 2, 6);
    const n = rows * cols;
    parameters = { shape, rows, n, snippet: `import numpy as np\nm = np.arange(${n}).reshape(${rows}, -1)\nv = np.arange(${cols})\nprint((m + v).shape)` };
  } else if (shape === 'transpose') {
    const rows = randInt(r, 2, 6);
    const cols = randInt(r, 2, 6);
    parameters = { shape, rows, n: rows * cols, snippet: `import numpy as np\nm = np.arange(${rows * cols}).reshape(${rows}, -1)\nprint(m.T.shape)` };
  } else {
    const n1 = randInt(r, 2, 6);
    const n2 = randInt(r, 2, 6);
    parameters = { shape, n1, n2, snippet: `import numpy as np\na = np.arange(${n1})\nb = np.arange(${n2})\nprint((a[:, None] + b[None, :]).shape)` };
  }
  const answer = solveShape(shape, parameters);
  return {
    parameters,
    expected: { output: tupleText(answer) },
    prompt: `Was gibt dieses Programm aus? Das Shape-Tuple in Python-Schreibweise angeben: (zeilen, spalten).`,
    fullSolution: `${shape === 'reshape-auto' ? `arange(${parameters.n}) liefert ${parameters.n} Elemente; reshape(${parameters.rows}, -1) lässt die zweite Dimension aus der Elementzahl berechnen: ${parameters.n}/${parameters.rows} = ${parameters.n / parameters.rows}. Form: (${parameters.rows}, ${parameters.n / parameters.rows}).` : shape === 'row-broadcast' ? `reshape(${parameters.rows}, -1) ergibt die Form (${parameters.rows}, ${parameters.n / parameters.rows}); der Zeilenvektor v mit ${parameters.n / parameters.rows} Einträgen passt auf jede Zeile (Broadcasting) und ändert die Form nicht.` : shape === 'transpose' ? `reshape(${parameters.rows}, -1) ergibt (${parameters.rows}, ${parameters.n / parameters.rows}); .T vertauscht beide Achsen.` : `a[:, None] ist eine Spalte der Form (${parameters.n1}, 1), b[None, :] eine Zeile der Form (1, ${parameters.n2}); die Addition broadcastet beide zum äußeren Produkt der Formen.`} Ausgabe: ${tupleText(answer)}`,
  };
}

export const LINALG_NUMPY_FRESH_GENERATORS = {
  genMatmulEntryFresh,
  genLinear2Fresh,
  genDet2,
  genShapePredict,
};

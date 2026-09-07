// Week-5 exercise generators, reference solvers and input validation.
// Single source of truth: imported by the browser graders AND by the Node
// property tests (tests/w05_generators.test.mjs).

/** Deterministic small PRNG (mulberry32) so seeds behave identically
 *  in browser and Node. */
import { rng, randInt, nonzeroInt } from './w01_generators.mjs';

export { rng };


export function matmul(A, B) {
  const n = A.length, m = B[0].length, k = B.length;
  if (A[0].length !== k) throw new Error('shape mismatch');
  const C = Array.from({ length: n }, () => Array(m).fill(0));
  for (let i = 0; i < n; i++)
    for (let j = 0; j < m; j++)
      for (let t = 0; t < k; t++) C[i][j] += A[i][t] * B[t][j];
  return C;
}

export function dot(u, v) {
  if (u.length !== v.length) throw new Error('length mismatch');
  return u.reduce((s, x, i) => s + x * v[i], 0);
}

// --- Generators (return {parameters, expected, promptFragments}) -----------

/** w05-e1: pick invertible-friendly 2x2 integer matrices and an entry,
 *  invariant: all intermediate products within [-25,25] so mental math is fair. */
export function genMatmulEntry(seed) {
  const r = rng(seed);
  const A = [ [nonzeroInt(r, -4, 4), nonzeroInt(r, -4, 4)], [nonzeroInt(r, -4, 4), nonzeroInt(r, -4, 4)] ];
  const B = [ [nonzeroInt(r, -3, 3), nonzeroInt(r, -3, 3)], [nonzeroInt(r, -3, 3), nonzeroInt(r, -3, 3)] ];
  const entry = [randInt(r, 1, 2), randInt(r, 1, 2)];
  const C = matmul(A, B);
  return { parameters: { A, B, entry }, expected: C[entry[0] - 1][entry[1] - 1] };
}

/** w05-e3: dot product with small ints, invariant: |u_i|,|v_i| <= 5. */
export function genDot(seed) {
  const r = rng(seed);
  const u = [nonzeroInt(r, -5, 5), nonzeroInt(r, -5, 5), nonzeroInt(r, -5, 5)];
  const v = [nonzeroInt(r, -5, 5), nonzeroInt(r, -5, 5), nonzeroInt(r, -5, 5)];
  return { parameters: { u, v }, expected: dot(u, v) };
}

/** w05-e4: dependent pair (b2 = k*b1) or independent pair,
 *  invariant: independent pairs verified via determinant != 0. */
export function genIndependence(seed) {
  const r = rng(seed);
  const dependent = r() < 0.5;
  const b1 = [nonzeroInt(r, -3, 3), nonzeroInt(r, -3, 3)];
  let b2;
  if (dependent) {
    const k = nonzeroInt(r, -3, 3);
    b2 = [k * b1[0], k * b1[1]];
  } else {
    do {
      b2 = [nonzeroInt(r, -4, 4), nonzeroInt(r, -4, 4)];
    } while (b1[0] * b2[1] - b1[1] * b2[0] === 0);
  }
  return { parameters: { vectors: [b1, b2] }, expected: { dependent } };
}

/** w05-e6: 2x2 system with unique INTEGER solution,
 *  invariant: det != 0 and both x*, y* integers in [-9, 9]. */
export function genLinear2(seed) {
  const r = rng(seed);
  for (let attempt = 0; attempt < 200; attempt++) {
    const x = nonzeroInt(r, -9, 9), y = nonzeroInt(r, -9, 9);
    const a11 = nonzeroInt(r, -4, 4), a12 = nonzeroInt(r, -4, 4);
    const a21 = nonzeroInt(r, -4, 4), a22 = nonzeroInt(r, -4, 4);
    const A = [[a11, a12], [a21, a22]];
    const det = a11 * a22 - a12 * a21;
    if (det === 0) continue;
    const b = [a11 * x + a12 * y, a21 * x + a22 * y];
    return { parameters: { A, b }, expected: [x, y] };
  }
  throw new Error('no instance in 200 attempts');
}

/** Exact solver for 2x2 systems by Cramer's rule (reference solver). */
export function solveLinear2(A, b) {
  const det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
  if (det === 0) throw new Error('singular');
  const x = (b[0] * A[1][1] - A[0][1] * b[1]) / det;
  const y = (A[0][0] * b[1] - b[0] * A[1][0]) / det;
  if (!Number.isInteger(x) || !Number.isInteger(y)) throw new Error('non-integer solution');
  return [x, y];
}

/** Rank of an integer matrix by exact fraction-free Gaussian elimination
 *  (reference solver; Bareiss-style row reduction with integer pivoting). */
export function rank(A) {
  const m = A.map((row) => [...row]);
  const rows = m.length, cols = m[0].length;
  let r = 0;
  for (let c = 0; c < cols && r < rows; c++) {
    // pick pivot row with nonzero entry (prefer smallest absolute value to
    // keep intermediate integers small)
    let piv = -1, best = Infinity;
    for (let i = r; i < rows; i++) {
      if (m[i][c] !== 0 && Math.abs(m[i][c]) < best) { best = Math.abs(m[i][c]); piv = i; }
    }
    if (piv === -1) continue;
    [m[r], m[piv]] = [m[piv], m[r]];
    for (let i = r + 1; i < rows; i++) {
      if (m[i][c] === 0) continue;
      const f = m[i][c], p = m[r][c];
      for (let j = c; j < cols; j++) m[i][j] = m[i][j] * p - m[r][j] * f;
    }
    r += 1;
  }
  return r;
}

/** w05-e10: 3x3 integer matrix with a controlled rank in {1, 2, 3},
 *  invariant: entries bounded |a_ij| <= 6, no obvious row multiples unless
 *  rank 1, verified against the rank() reference solver. */
export function genRank3(seed) {
  const r = rng(seed);
  const target = [1, 2, 3][randInt(r, 0, 2)];
  const randRow = () => [nonzeroInt(r, -4, 4), nonzeroInt(r, -4, 4), nonzeroInt(r, -4, 4)];
  const scale = (row, k) => row.map((x) => x * k);
  const add = (a, b) => a.map((x, i) => x + b[i]);
  let A;
  if (target === 1) {
    const r1 = randRow();
    A = [r1, scale(r1, nonzeroInt(r, -2, 2)), scale(r1, nonzeroInt(r, -2, 2))];
  } else if (target === 2) {
    let r1, r2;
    do {
      r1 = randRow(); r2 = randRow();
    } while (r1[0] * r2[1] - r1[1] * r2[0] === 0 && r1[0] * r2[2] - r1[2] * r2[0] === 0 && r1[1] * r2[2] - r1[2] * r2[1] === 0);
    const a = nonzeroInt(r, -1, 1), b = nonzeroInt(r, -1, 1);
    A = [r1, r2, add(scale(r1, a), scale(r2, b))];
  } else {
    do {
      A = [randRow(), randRow(), randRow()];
    } while (rank(A) !== 3);
  }
  return { parameters: { A, expectedRank: rank(A) }, expected: rank(A) };
}

export function genColumnCombination(seed) {
  const { parameters, expected } = genLinear2(seed);
  const { A, b } = parameters;
  return {
    parameters,
    expected,
    prompt: `Die Spalten von A sind a₁ = (${A[0][0]}, ${A[1][0]}) und a₂ = (${A[0][1]}, ${A[1][1]}). Finde die Koeffizienten (x₁, x₂), sodass x₁·a₁ + x₂·a₂ = (${b[0]}, ${b[1]}).`,
    fullSolution: `Die Koeffizienten sind (x₁, x₂) = (${expected[0]}, ${expected[1]}). Die Probe A·x ergibt (${b[0]}, ${b[1]}).`,
  };
}

// --- Input validation for deterministic answers ----------------------------

/** Accepts "7", " 7 ", "7,0"? no — integer only; rejects "", fractions. */
export function parseIntegerAnswer(raw) {
  const t = String(raw).trim();
  if (!/^-?\d{1,6}$/.test(t)) return { ok: false, error: 'Bitte eine ganze Zahl eingeben.' };
  return { ok: true, value: parseInt(t, 10) };
}

/** Accepts "(1, 3)", "1 3", "1,3" -> [1,3]; validates two integers. */
export function parseIntegerPair(raw) {
  const t = String(raw).trim().replace(/^\(|\)$/g, '');
  const parts = t.split(/[\s,;]+/).filter(Boolean);
  if (parts.length !== 2) return { ok: false, error: 'Zwei ganze Zahlen eingeben, z. B. (1, 3).' };
  const nums = parts.map((p) => parseIntegerAnswer(p));
  if (nums.some((n) => !n.ok)) return { ok: false, error: 'Beide Einträge müssen ganze Zahlen sein.' };
  return { ok: true, value: nums.map((n) => n.value) };
}

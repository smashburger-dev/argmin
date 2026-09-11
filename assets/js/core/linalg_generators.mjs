// Week-5 exercise generators, reference solvers and input validation.
// Single source of truth: imported by the browser graders AND by the Node
// property tests (tests/linalg_generators.test.mjs).

/** Deterministic small PRNG (mulberry32) so seeds behave identically
 *  in browser and Node. */
import { rng, randInt, nonzeroInt, until, clean } from './generator_draw_kit.mjs';

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

/** Pilot-Kapseln für transform-rank-dependence-rowops (v2-Bounds 7/5/20):
 *  je Profil genau eine Kapsel mit dims, Zielrang, Bound und Fallbindung. */
export const RANK_CAPSULES = {
  core: { dims: [3, 3], targetRank: 2, bound: 7, caseId: 'rank-3x3-staircase' },
  stretch: { dims: [3, 3], targetRank: 3, bound: 5, caseId: 'rank-3x3-full' },
  challenge: { dims: [3, 4], targetRank: 1, bound: 20, caseId: 'rank-3x4-line' },
};

const rankLatex = (A) => A.map((row) => row.join('&')).join('\\\\');

/** Dims-agnostischer Rang-Sampler über scale/add/fresh, bound-sicher:
 *  scale wählt k nur aus dem bound-verträglichen Bereich (Reject statt
 *  Überlauf), add/fresh laufen über until-Retry mit hartem Fehler.
 *  Einträge meiden ±Zielrang, damit der Prompt die Antwort nicht nennt
 *  (clean-Guard als zweite Stufe). */
export function genRankCapsule(seed, { dims, targetRank, bound }) {
  const r = rng(seed);
  const [nrows, ncols] = dims;
  const randEntry = () => {
    let value = 0;
    do { value = randInt(r, -bound, bound); } while (Math.abs(value) === targetRank);
    return value;
  };
  const randRow = () => Array.from({ length: ncols }, randEntry);
  const nonzeroRow = () => {
    let row = randRow();
    while (row.every((value) => value === 0)) row = randRow();
    return row;
  };
  const scaleBounded = (row) => {
    const peak = Math.max(...row.map((value) => Math.abs(value)));
    const k = nonzeroInt(r, -Math.floor(bound / peak), Math.floor(bound / peak));
    return row.map((value) => value * k);
  };
  const buildCandidate = () => {
    if (targetRank === 1) {
      const first = nonzeroRow();
      return [first, ...Array.from({ length: nrows - 1 }, () => scaleBounded(first))];
    }
    if (targetRank === 2) {
      const first = randRow(), second = randRow();
      const combos = Array.from({ length: nrows - 2 }, () => {
        let a = 0, b = 0;
        while (a === 0 && b === 0) { a = randInt(r, -1, 1); b = randInt(r, -1, 1); }
        return first.map((value, i) => a * value + b * second[i]);
      });
      return [first, second, ...combos];
    }
    return Array.from({ length: nrows }, randRow);
  };
  const hygienic = (A) => A.some((row) => row.some((value) => value !== 0))
    && (targetRank === 1 || new Set(A.map((row) => row.join(','))).size === A.length);
  const build = () => {
    const A = until(r, buildCandidate, (candidate) => (
      Math.max(...candidate.flat().map((value) => Math.abs(value))) <= bound
      && rank(candidate) === targetRank
      && hygienic(candidate)
    ), { scope: 'genRankCapsule' });
    const expected = rank(A);
    return {
      parameters: { A },
      expected,
      prompt: `Bestimme den Rang der Matrix \\[A=\\begin{pmatrix}${rankLatex(A)}\\end{pmatrix}\\] mit Gauß-Elimination (Zeilenstufenform) und gib ihn als ganze Zahl ein.`,
      fullSolution: `Nach Elimination bleiben genau ${expected} Pivotzeile(n); alle übrigen Zeilen sind Linearkombinationen dieser Pivotzeilen. Daher ist $\\operatorname{rang}(A)=${expected}$.`,
    };
  };
  return clean(r, build, { scope: 'genRankCapsule' });
}

/** Kapseln für classify-independence-multiple: je Profil genau eine Kapsel
 *  mit Art, Bound und Fallbindung (intro/core/stretch → Doppel/Negativ/Tripel).
 *  Bounds decken die 27 kuratierten Orakel ab (intro maxAbs 12 über Faktor 4). */
export const INDEPENDENCE_CAPSULES = {
  intro: { kind: 'dependent-pair', bound: 12, caseId: 'dependent-pair-double' },
  core: { kind: 'independent-pair', bound: 5, caseId: 'independent-pair-negative' },
  stretch: { kind: 'dependent-triple', bound: 5, caseId: 'dependent-triple-span' },
};

const INDEPENDENCE_FACTORS = [-4, -3, -2, -1, 2, 3, 4];

export const maxAbsVectors = (vectors) => Math.max(...vectors.flat().map((value) => Math.abs(value)));

/** Unabhängiger Schlüssel: Vielfaches k mit b2 = k·b1, sonst Fehler. */
export function dependenceFactor(b1, b2) {
  const i = b1[0] !== 0 ? 0 : 1;
  if (b1[i] === 0) throw new Error('Nullvektor hat kein Vielfaches');
  if (b2[i] % b1[i] !== 0) throw new Error('kein ganzzahliges Vielfaches');
  const k = b2[i] / b1[i];
  if (b2[0] !== k * b1[0] || b2[1] !== k * b1[1]) throw new Error('kein Vielfaches');
  return k;
}

/** Unabhängiger Schlüssel: Rang-2-Nachweis für ein Vektorpaar über 2×2-Minoren. */
export function pairIndependent([v1, v2]) {
  for (let i = 0; i < v1.length; i += 1) {
    for (let j = i + 1; j < v1.length; j += 1) {
      if (v1[i] * v2[j] - v1[j] * v2[i] !== 0) return true;
    }
  }
  return false;
}

/** Kapselform: Bound plus Art-Nachweis (Vielfaches, Determinante, Summe). */
export function independenceShapeOk(vectors, capsule) {
  if (maxAbsVectors(vectors) > capsule.bound) return false;
  if (capsule.kind === 'dependent-pair') {
    try {
      const k = dependenceFactor(vectors[0], vectors[1]);
      return k !== 0 && k !== 1;
    } catch { return false; }
  }
  if (capsule.kind === 'independent-pair') {
    return vectors[0][0] * vectors[1][1] - vectors[0][1] * vectors[1][0] !== 0;
  }
  const [v1, v2, v3] = vectors;
  return v3.every((value, i) => value === v1[i] + v2[i]) && pairIndependent([v1, v2]);
}

const vecText = (v) => `(${v.join(',')})`;

export const independencePrompt = (vectors, capsule) => {
  if (capsule.kind === 'dependent-pair') return `Sind $b_1=${vecText(vectors[0])}$, $b_2=${vecText(vectors[1])}$ linear unabhängig?`;
  if (capsule.kind === 'independent-pair') return `Sind $u=${vecText(vectors[0])}$ und $v=${vecText(vectors[1])}$ linear unabhängig?`;
  return `Sind $v_1=${vecText(vectors[0])}$, $v_2=${vecText(vectors[1])}$ und $v_3=${vecText(vectors[2])}$ linear unabhängig?`;
};

export const independenceSolution = (vectors, capsule) => {
  if (capsule.kind === 'dependent-pair') {
    const k = dependenceFactor(vectors[0], vectors[1]);
    return `$b_2=${k}\\,b_1$, also gibt es eine nichttriviale Linearkombination und die Vektoren sind abhängig.`;
  }
  if (capsule.kind === 'independent-pair') {
    const det = vectors[0][0] * vectors[1][1] - vectors[0][1] * vectors[1][0];
    return `Die Determinante der beiden Vektoren ist ${det} und damit ungleich null. Deshalb sind $u$ und $v$ linear unabhängig.`;
  }
  return `Es gilt komponentenweise $v_3=v_1+v_2=${vecText(vectors[2])}$. Die Vektoren erfüllen also eine nichttriviale Relation und sind abhängig.`;
};

/** Ein Template: options[0] ist korrekt, Texte wörtlich aus den Bestandfällen. */
export const independenceOptions = (vectors, capsule) => {
  if (capsule.kind === 'dependent-pair') {
    const k = dependenceFactor(vectors[0], vectors[1]);
    return [
      `Nein — $b_2 = ${k}\\,b_1$, also ist die Menge abhängig.`,
      'Ja — beide Vektoren sind vom Nullvektor verschieden.',
      'Ja — zwei Vektoren im $\\mathbb{R}^2$ sind immer unabhängig.',
      'Das lässt sich ohne Rechnung nicht entscheiden.',
    ];
  }
  if (capsule.kind === 'independent-pair') {
    return [
      'Ja; kein skalarer Faktor macht aus $u$ den Vektor $v$.',
      'Nein, weil beide Vektoren in $\\mathbb{R}^2$ liegen.',
      'Nein, weil $v=3u$ gilt.',
      'Das lässt sich nur mit einer Determinante einer $3\\times3$-Matrix entscheiden.',
    ];
  }
  return [
    'Nein, weil $v_3=v_1+v_2$ gilt.',
    'Ja, weil kein Vektor der Nullvektor ist.',
    'Ja, weil drei Vektoren in $\\mathbb{R}^3$ immer eine Basis bilden.',
    'Nein, aber nur weil $v_1$ und $v_2$ parallel sind.',
  ];
};

const drawIndependenceVectors = (r, capsule) => {
  if (capsule.kind === 'dependent-pair') {
    const b1 = [nonzeroInt(r, -5, 5), nonzeroInt(r, -5, 5)];
    const k = INDEPENDENCE_FACTORS[randInt(r, 0, INDEPENDENCE_FACTORS.length - 1)];
    return [b1, b1.map((value) => value * k)];
  }
  if (capsule.kind === 'independent-pair') {
    return [
      [nonzeroInt(r, -5, 5), nonzeroInt(r, -5, 5)],
      [nonzeroInt(r, -5, 5), nonzeroInt(r, -5, 5)],
    ];
  }
  const v1 = [randInt(r, -5, 5), randInt(r, -5, 5), randInt(r, -5, 5)];
  const v2 = [randInt(r, -5, 5), randInt(r, -5, 5), randInt(r, -5, 5)];
  return [v1, v2, v1.map((value, i) => value + v2[i])];
};

/** Kit-Hook: Seed zieht den Vektorsatz (until-Retry wie im bisherigen
 *  Kapsel-Sampler; die Antwortposition rotiert im Kit). */
export const drawIndependenceParameters = (r, capsule) => ({
  vectors: until(r, () => drawIndependenceVectors(r, capsule),
    (candidate) => independenceShapeOk(candidate, capsule), { scope: 'genIndependenceCapsule' }),
});

/** Kapseln für classify-matrix-shape: je Profil genau eine Kapsel mit
 *  Shape-Art, dims-Bereichen und Fallbindung (intro/core/stretch →
 *  Produkt/Addition/Vektor-Kette). Bereiche decken die 27 kuratierten
 *  Orakel ab (Produkt m 2-6/k 2-5/n 2-5, Addition 2-7, Vektor k 2-10);
 *  der Vektor-Bereich ist bis 12 geweitet, damit der Distinct-Boden (40)
 *  gegen 11 mal 4 Zellen hält. */
export const MATRIX_SHAPE_CAPSULES = {
  intro: { kind: 'product', rows: [2, 6], inner: [2, 5], cols: [2, 5], caseId: 'shape-product-drawn' },
  core: { kind: 'add', dims: [2, 7], caseId: 'shape-add-broadcast-trap' },
  stretch: { kind: 'vector', inner: [2, 12], caseId: 'shape-vector-matmul-chain' },
};

const inDimRange = (value, [lo, hi]) => Number.isInteger(value) && value >= lo && value <= hi;

const productShapeOk = (dimsA, dimsB, capsule) => {
  if (dimsA.length !== 2 || dimsB.length !== 2) return false;
  const [m, k] = dimsA;
  const [inner, n] = dimsB;
  if (k !== inner || m === n) return false;
  return inDimRange(m, capsule.rows) && inDimRange(k, capsule.inner) && inDimRange(n, capsule.cols);
};

const addShapeOk = (dimsA, dimsB, capsule) => {
  if (dimsA.length !== 2 || dimsB.length !== 2) return false;
  if (dimsA[0] !== dimsB[0] || dimsA[1] !== dimsB[1] || dimsA[0] === dimsA[1]) return false;
  return inDimRange(dimsA[0], capsule.dims) && inDimRange(dimsA[1], capsule.dims);
};

const vectorShapeOk = (dimsA, dimsB, capsule) => {
  if (dimsA.length !== 2 || dimsB.length !== 2) return false;
  if (dimsA[0] !== 1 || dimsB[1] !== 1 || dimsA[1] !== dimsB[0]) return false;
  return inDimRange(dimsA[1], capsule.inner);
};

/** Valide-Shape-Tupel-Constraint (Bound-Gate sinngemäß): Produkt braucht
 *  gleiche Innendims und verschiedene Außendims (sonst wäre BA definiert),
 *  Addition braucht gleiche Shapes ohne Quadrat (sonst kollidiert der
 *  Dreh-Distraktor mit dem Schlüssel), die Vektorkette braucht 1×k/k×1. */
export function matrixShapeOk(dimsA, dimsB, capsule) {
  if (!Array.isArray(dimsA) || !Array.isArray(dimsB)) return false;
  if (capsule.kind === 'product') return productShapeOk(dimsA, dimsB, capsule);
  if (capsule.kind === 'add') return addShapeOk(dimsA, dimsB, capsule);
  if (capsule.kind === 'vector') return vectorShapeOk(dimsA, dimsB, capsule);
  return false;
}

const shapePair = ([rows, cols]) => `$${rows}\\times${cols}$`;

export const matrixShapePrompt = (dimsA, dimsB, capsule) => {
  if (capsule.kind === 'product') return `$A$ ist eine ${shapePair(dimsA)}-Matrix und $B$ eine ${shapePair(dimsB)}-Matrix. Welche Aussage ist korrekt?`;
  if (capsule.kind === 'add') return `$A$ ist eine ${shapePair(dimsA)}-Matrix und $B$ ebenfalls. Welche Aussage zur Addition ist korrekt?`;
  return `$A$ ist eine ${shapePair(dimsA)}-Matrix und $B$ eine ${shapePair(dimsB)}-Matrix. Welche Aussage über $AB$ und $BA$ stimmt?`;
};

export const matrixShapeSolution = (dimsA, dimsB, capsule) => {
  if (capsule.kind === 'product') {
    const [m, k] = dimsA;
    const n = dimsB[1];
    return `Spaltenzahl($A$)=${k} = Zeilenzahl($B$)=${k}, also ist $AB$ definiert mit Form ${shapePair([m, n])}. Für $BA$ müssten ${n} und ${m} übereinstimmen; das tun sie nicht, also ist $BA$ undefiniert.`;
  }
  if (capsule.kind === 'add') {
    return `Matrixaddition ist für gleiche Shapes definiert. Daher ist $A+B$ eine ${shapePair(dimsA)}-Matrix; die Formen müssen hier exakt übereinstimmen.`;
  }
  const k = dimsA[1];
  return `Bei $AB$ liefern die äußeren Dimensionen die Form $1\\times1$; bei $BA$ liefern sie ${shapePair([k, k])}. Beide Produkte sind definiert, weil die inneren Dimensionen übereinstimmen.`;
};

/** Ein Template: options[0] ist korrekt, Texte wörtlich aus den Bestandfällen. */
export const matrixShapeOptions = (dimsA, dimsB, capsule) => {
  if (capsule.kind === 'product') {
    const [m, k] = dimsA;
    const n = dimsB[1];
    return [
      `$AB$ ist definiert und hat die Form ${shapePair([m, n])}; $BA$ ist nicht definiert.`,
      '$AB$ und $BA$ sind beide definiert.',
      `$AB$ ist definiert und hat die Form ${shapePair([k, k])}.`,
      'Keines der Produkte ist definiert.',
    ];
  }
  if (capsule.kind === 'add') {
    const [rows, cols] = dimsA;
    return [
      `$A+B$ ist definiert und hat die Form ${shapePair([rows, cols])}; beide Operanden haben dieselbe Form.`,
      `$A+B$ ist eine ${shapePair([cols, rows])}-Matrix, weil sich die Dimensionen beim Addieren drehen.`,
      '$A+B$ ist immer definiert, weil NumPy jede Matrixaddition broadcastet.',
      '$A+B$ ist nicht definiert, weil Addition nur für quadratische Matrizen erlaubt ist.',
    ];
  }
  const k = dimsA[1];
  return [
    `$AB$ ist $1\\times1$ und $BA$ ist ${shapePair([k, k])}; beide Produkte sind definiert.`,
    `Nur $AB$ ist definiert und hat die Form $1\\times${k + 1}$.`,
    'Nur $BA$ ist definiert und hat die Form $1\\times1$.',
    `Beide Produkte sind ${shapePair([k, k])}, weil B ${k} Zeilen hat.`,
  ];
};

const drawMatrixDims = (r, capsule) => {
  if (capsule.kind === 'product') {
    const m = randInt(r, capsule.rows[0], capsule.rows[1]);
    const k = randInt(r, capsule.inner[0], capsule.inner[1]);
    const n = randInt(r, capsule.cols[0], capsule.cols[1]);
    return [[m, k], [k, n]];
  }
  if (capsule.kind === 'add') {
    const shape = [randInt(r, capsule.dims[0], capsule.dims[1]), randInt(r, capsule.dims[0], capsule.dims[1])];
    return [shape, [...shape]];
  }
  const k = randInt(r, capsule.inner[0], capsule.inner[1]);
  return [[1, k], [k, 1]];
};

/** Kit-Hook: Seed zieht das Shape-Tupel (until-Retry wie im bisherigen
 *  Kapsel-Sampler; die Antwortposition rotiert im Kit). */
export const drawMatrixShapeParameters = (r, capsule) => {
  const [dimsA, dimsB] = until(r, () => drawMatrixDims(r, capsule),
    (candidate) => matrixShapeOk(candidate[0], candidate[1], capsule), { scope: 'genMatrixShapeCapsule' });
  return { dimsA, dimsB };
};

/** Kapseln für classify-column-combination: je Profil genau eine Kapsel
 *  mit Art, Bound und Fallbindung (core/intro/stretch → Koeffizienten/
 *  Wahl/Shape-Debug). Die Zahlenbank deckt die 18 kuratierten 2×2-Orakel
 *  ab (Spalteneinträge ≤ 5, Ziel ≤ 12, Lösung ≤ 3, beide
 *  Lösungskomponenten ungleich 0), die Shape-Bank die 9 kuratierten
 *  (m,n)-Orakel (2 bis 7 je Achse). */
export const COLUMN_COMBINATION_CAPSULES = {
  core: { kind: 'coefficients', bound: 12, caseId: 'column-coefficients-double' },
  intro: { kind: 'choice', bound: 12, caseId: 'column-choice-authored' },
  stretch: { kind: 'shape-debug', rows: [2, 7], cols: [2, 7], caseId: 'shape-debug-authored' },
};

export const COLUMN_IDS = {
  coefficients: ['a', 'b', 'c', 'd'],
  choice: ['both-one', 'first-only', 'second-only', 'swapped-target'],
  'shape-debug': ['matmul-contract', 'reshape-any', 'sum-all', 'transpose'],
};

const vec2Text = (v) => `(${v.join(',')})`;

/** Unabhängiger Schlüssel: Lösung des 2×2-Systems über Cramers Regel
 *  (Referenz gegen die konstruktive Zahlenbank). */
export function solveColumnSystem(s1, s2, target) {
  return solveLinear2([[s1[0], s2[0]], [s1[1], s2[1]]], target);
}

const drawColumnSystem = (r) => {
  const s1 = [nonzeroInt(r, -5, 5), nonzeroInt(r, -5, 5)];
  const s2 = [nonzeroInt(r, -5, 5), nonzeroInt(r, -5, 5)];
  const solution = [nonzeroInt(r, -3, 3), nonzeroInt(r, -3, 3)];
  const target = [
    solution[0] * s1[0] + solution[1] * s2[0],
    solution[0] * s1[1] + solution[1] * s2[1],
  ];
  return { s1, s2, target, solution };
};

const absMax2 = (v) => Math.max(...v.map((value) => Math.abs(value)));

/** Kapselform über den gespeicherten Parametern: det ≠ 0 (Solver wirft
 *  bei singulär/nicht-ganzzahlig), Spalten ≤ 5, Ziel im Bound, Lösung
 *  beidseitig ungleich 0; beim baren Wahltext zusätzlich vier paarweise
 *  verschiedene Antworttexte (Ziel trifft nie einen Distraktor). */
export function columnInstanceOk(parameters, capsule) {
  try {
    if (capsule.kind === 'shape-debug') {
      return shapeDebugOk(parameters?.matrixRows, parameters?.matrixColumns, capsule);
    }
    const s1 = capsule.kind === 'choice' ? parameters?.a1 : parameters?.s1;
    const s2 = capsule.kind === 'choice' ? parameters?.a2 : parameters?.s2;
    const { target } = parameters || {};
    for (const v of [s1, s2, target]) {
      if (!Array.isArray(v) || v.length !== 2 || !v.every(Number.isInteger)) return false;
    }
    if (absMax2(s1) > 5 || absMax2(s2) > 5) return false;
    if (absMax2(target) > capsule.bound) return false;
    const [x, y] = solveColumnSystem(s1, s2, target);
    if (Math.abs(x) > 3 || Math.abs(y) > 3 || x === 0 || y === 0) return false;
    if (capsule.kind === 'choice') {
      const texts = new Set([`${x},${y}`, `${x},0`, `0,${y}`, `${target[0]},${target[1]}`]);
      if (texts.size !== 4) return false;
    }
    return true;
  } catch { return false; }
}

const shapeDebugOk = (m, n, capsule) => Number.isInteger(m)
  && Number.isInteger(n)
  && m >= capsule.rows[0] && m <= capsule.rows[1]
  && n >= capsule.cols[0] && n <= capsule.cols[1];

/** Ein Template je Art: options[0] ist korrekt, Texte wörtlich aus den
 *  Bestandsvarianten (Koeffizienten-Gleichung, bares Paar, matmul-Vertrag
 *  mit Ausgabe-Shape). */
export const columnOptions = (system, capsule) => {
  if (capsule.kind === 'shape-debug') {
    const { m, n } = system;
    return [
      `A und v mit \`np.asarray\` normalisieren, \`A.ndim == 2\`, \`v.ndim == 1\` und \`A.shape[1] == v.shape[0]\` prüfen, dann \`A @ v\` mit Ausgabe-Shape \`(${m},)\` zurückgeben`,
      `Beide Eingaben immer auf \`(${n},${n})\` umformen und danach \`A * v\` verwenden`,
      '`(A * v).sum()` zurückgeben, unabhängig von der erwarteten Ausgabe-Shape',
      'Nur `A.T * v` verwenden; NumPy erkennt den Vertrag automatisch.',
    ];
  }
  const { s1, s2, target, solution: [x, y] } = system;
  if (capsule.kind === 'choice') {
    return [
      `$x_1=${x}, x_2=${y}$`,
      `$x_1=${x}, x_2=0$`,
      `$x_1=0, x_2=${y}$`,
      `$x_1=${target[0]}, x_2=${target[1]}$`,
    ];
  }
  return [
    `$(a,b) = (${x},${y})$: $${x}${vec2Text(s1)} + ${y}${vec2Text(s2)} = ${vec2Text(target)}$.`,
    `$(a,b) = (${y},${x})$: Koeffizienten in Spaltenreihenfolge.`,
    `$(a,b) = (${target.join(',')})$: Zielvektor als Koeffizienten.`,
    `$(a,b) = (${x},0)$: nur die erste Spalte trägt.`,
  ];
};

export const columnPrompt = (system, capsule) => {
  if (capsule.kind === 'shape-debug') {
    const { m, n } = system;
    return `Eine Funktion soll für eine Matrix A mit Shape (m,n)=(${m},${n}) und einen Vektor v mit Shape (${n},) das Matrix-Vektor-Produkt liefern. Welche Änderung behebt den fachlichen Fehler in \`return A * v\` und schützt zugleich den Vertrag?`;
  }
  const { s1, s2, target } = system;
  if (capsule.kind === 'choice') {
    return `Für $a_1=${vec2Text(s1)}^T$ und $a_2=${vec2Text(s2)}^T$ gilt $b=${vec2Text(target)}^T$. Welche Koeffizienten erfüllen $x_1a_1+x_2a_2=b$?`;
  }
  return `Gegeben $s_1=${vec2Text(s1)}$, $s_2=${vec2Text(s2)}$ und $w=${vec2Text(target)}$. Schreibe $w$ als Kombination der Spalten: $w = a\\,s_1 + b\\,s_2$. Welches Paar $(a,b)$ stimmt?`;
};

export const columnSolution = (system, capsule) => {
  if (capsule.kind === 'shape-debug') {
    return 'Das Hadamard-Produkt ist hier nicht der gewünschte Vertrag. Nach Shape-Prüfung liefert `A @ v` einen Vektor mit einer Komponente pro Matrixzeile.';
  }
  const { s1, s2, target, solution: [x, y] } = system;
  const equation = `${x}${vec2Text(s1)} + ${y}${vec2Text(s2)} = ${vec2Text(target)}`;
  if (capsule.kind === 'choice') return `${equation}; daher gilt $x_1=${x}$ und $x_2=${y}$.`;
  return `Einsetzen zeigt: ${equation}. Deshalb sind die Koeffizienten $(a,b)=(${x},${y})$.`;
};

/** Rekonstruiert die interne System-Sicht aus den gespeicherten Parametern:
 *  (m,n) für shape-debug, Spaltenpaar plus nachgerechnete Lösung für die
 *  Zahlenbank-Arten (choice benennt die Spalten a1/a2). */
export const columnSystemOf = (parameters, capsule) => {
  if (capsule.kind === 'shape-debug') {
    return { m: parameters.matrixRows, n: parameters.matrixColumns };
  }
  const s1 = capsule.kind === 'choice' ? parameters.a1 : parameters.s1;
  const s2 = capsule.kind === 'choice' ? parameters.a2 : parameters.s2;
  const { target } = parameters;
  return { s1, s2, target, solution: solveColumnSystem(s1, s2, target) };
};

/** Kit-Hook: Seed wählt 2×2-System bzw. (m,n)-Tupel (until-Retry wie im
 *  bisherigen Kapsel-Sampler; die Antwortposition rotiert im Kit). */
export const drawColumnCombinationParameters = (r, capsule) => {
  if (capsule.kind === 'shape-debug') {
    return {
      matrixRows: randInt(r, capsule.rows[0], capsule.rows[1]),
      matrixColumns: randInt(r, capsule.cols[0], capsule.cols[1]),
    };
  }
  const drawn = until(r, () => drawColumnSystem(r),
    (candidate) => {
      const system = { ...candidate };
      if (capsule.kind === 'choice') {
        const texts = new Set([
          `${system.solution[0]},${system.solution[1]}`,
          `${system.solution[0]},0`,
          `0,${system.solution[1]}`,
          `${system.target[0]},${system.target[1]}`,
        ]);
        if (texts.size !== 4) return false;
      }
      return (candidate.s1[0] * candidate.s2[1] - candidate.s1[1] * candidate.s2[0]) !== 0
        && absMax2(candidate.target) <= capsule.bound;
    }, { scope: 'genColumnCombinationCapsule' });
  return capsule.kind === 'choice'
    ? { a1: drawn.s1, a2: drawn.s2, target: drawn.target }
    : { s1: drawn.s1, s2: drawn.s2, target: drawn.target };
};

/** Kapseln für classify-row-operation-validity: je Profil genau eine Kapsel
 *  mit Art, Bound und Fallbindung (core/intro → Gleichungssystem/
 *  Multiplikator). Die Zahlenbank deckt die 9 kuratierten
 *  Gleichungs-Orakel ab (Koeffizienten ungleich 0 und ≤ 5, rechte Seiten
 *  ≤ 9, det ≠ 0) und die 9 kuratierten Multiplikator-Orakel (1 bis 9,
 *  Kapsel bis 12 für den Distinct-Boden). */
export const ROW_OPERATION_CAPSULES = {
  core: { kind: 'equations', bound: 9, caseId: 'valid-operation-rhs' },
  intro: { kind: 'multiplier', min: 1, max: 12, caseId: 'row-operation-choice-contract' },
};

export const ROW_OPERATION_IDS = {
  equations: ['a', 'b', 'c', 'd'],
  multiplier: ['row-add', 'zero-row', 'left-only', 'delete'],
};

const linEq = ([a, b, c]) => `$${a}x${b < 0 ? `${b}y` : `+${b}y`}=${c}$`;

/** Unabhängiger Schlüssel: getragene Zeile II − 2·I aus den
 *  Fallparametern (Referenz gegen die konstruktive Zahlenbank). */
export function rowCarried([first, second]) {
  const [a, b, c] = first;
  const [d, e, f] = second;
  return [d - 2 * a, e - 2 * b, f - 2 * c];
}

/** Kapselform über den gespeicherten Parametern: Bound plus det ≠ 0
 *  (sonst wäre das Streichen einer Zeile kein eindeutiger Fehler) und
 *  Koeffizienten ungleich 0 (sonst sähe der Prompt kaputt aus);
 *  beim Multiplikator der kuratierte Bereich 1 bis 12. */
export function rowOperationInstanceOk(parameters, capsule) {
  if (capsule.kind === 'multiplier') {
    const { multiplier } = parameters || {};
    return Number.isInteger(multiplier) && multiplier >= capsule.min && multiplier <= capsule.max;
  }
  const { equations } = parameters || {};
  if (!Array.isArray(equations) || equations.length !== 2) return false;
  for (const row of equations) {
    if (!Array.isArray(row) || row.length !== 3 || !row.every(Number.isInteger)) return false;
    if (row.some((value) => Math.abs(value) > capsule.bound)) return false;
  }
  const [[a, b], [d, e]] = equations;
  if (a === 0 || b === 0 || d === 0 || e === 0) return false;
  return a * e - b * d !== 0;
}

/** Ein Template je Art: options[0] ist korrekt, Texte wörtlich aus den
 *  Bestandsvarianten (getragene Gleichung, Z-Notation mit Multiplikator). */
export const rowOperationOptions = (system, capsule) => {
  if (capsule.kind === 'multiplier') {
    return [
      `$Z_2 \\leftarrow Z_2-${system.multiplier}Z_1$`,
      '$Z_2 \\leftarrow 0\\cdot Z_2$',
      'Nur die Koeffizienten links verändern, nicht die rechte Seite.',
      'Eine unbequeme Gleichung löschen.',
    ];
  }
  const [cx, cy, cr] = rowCarried(system.equations);
  return [
    `II \\leftarrow II - 2\\cdot I, rechte Seite mitgeführt: $${cx}x${cy < 0 ? `${cy}y` : `+${cy}y`}=${cr}$.`,
    'I \\leftarrow 0\\cdot I, danach ist das System einfacher.',
    `II \\leftarrow II - 2\\cdot('linke Seite von I'), rechte Seite bleibt ${system.equations[1][2]}.`,
    'II streichen — I allein bestimmt die Lösung.',
  ];
};

export const rowOperationPrompt = (system, capsule) => {
  if (capsule.kind === 'multiplier') {
    return 'Welche Zeilenoperation erhält die Lösungsmenge eines linearen Gleichungssystems sicher?';
  }
  const [first, second] = system.equations;
  return `System: ${linEq(first)}, ${linEq(second)}. Welche Zeilenoperation erhält garantiert die Lösungsmenge?`;
};

export const rowOperationSolution = (system, capsule) => {
  if (capsule.kind === 'multiplier') {
    return `Das Addieren eines Vielfachen einer Zeile zu einer anderen ist äquivalent. Daher erhält $Z_2 \\leftarrow Z_2-${system.multiplier}Z_1$ die Lösungsmenge.`;
  }
  const [, , cr] = rowCarried(system.equations);
  return `Eine Zeilenoperation muss die gesamte zweite Gleichung verändern: II ← II − 2·I. Damit wird die rechte Seite zu ${cr}; die Lösungsmenge bleibt erhalten.`;
};

/** Rekonstruiert die interne System-Sicht aus den gespeicherten Parametern
 *  (Multiplikator bzw. Gleichungspaar je Kapselart). */
export const rowOperationSystemOf = (parameters, capsule) => (capsule.kind === 'multiplier'
  ? { multiplier: parameters.multiplier }
  : { equations: parameters.equations });

const drawEquations = (r) => {
  const row = () => [nonzeroInt(r, -5, 5), nonzeroInt(r, -5, 5), nonzeroInt(r, -9, 9)];
  return [row(), row()];
};

/** Kit-Hook: Seed wählt Gleichungssystem bzw. Multiplikator (until-Retry
 *  wie im bisherigen Kapsel-Sampler; die Antwortposition rotiert im Kit). */
export const drawRowOperationParameters = (r, capsule) => (capsule.kind === 'multiplier'
  ? { multiplier: randInt(r, capsule.min, capsule.max) }
  : {
    equations: until(r, () => drawEquations(r),
      (candidate) => rowOperationInstanceOk({ equations: candidate }, capsule),
      { scope: 'genRowOperationCapsule' }),
  });

/** Kapseln für classify-rank-solution-case: je Profil genau eine Kapsel
 *  mit Echelon-Art, Bound und Fallbindung (core/stretch → a/b/c/d und
 *  Symbol-IDs). Die Zahlenbank deckt die 18 kuratierten Orakel ab
 *  (Koeffizienten -3 bis 7, Kapsel bis 7 für den Distinct-Boden). Beide
 *  Templates lesen Rang 2 mit freier Variable aus der Stufenform; die
 *  Texte sind wörtlich aus den beiden Basisfällen. */
export const RANK_SOLUTION_CAPSULES = {
  core: { kind: 'echelon-abcd', bound: 7, caseId: 'echelon-read-rank-case' },
  stretch: { kind: 'echelon-symbolic', bound: 7, caseId: 'rank-system-authored' },
};

export const RANK_SOLUTION_IDS = {
  'echelon-abcd': ['a', 'b', 'c', 'd'],
  'echelon-symbolic': ['rank-two-free', 'rank-three-unique', 'contradiction', 'rank-zero'],
};

/** Kapselform über den gespeicherten Parametern: vier ganze Koeffizienten
 *  im Bound (0 zulässig, alle 18 Orakel liegen bei -3 bis 7). */
export function rankSolutionInstanceOk(parameters, capsule) {
  const coeffs = parameters?.systemCoefficients;
  if (!Array.isArray(coeffs) || coeffs.length !== 4) return false;
  if (!coeffs.every(Number.isInteger)) return false;
  return Math.max(...coeffs.map((value) => Math.abs(value))) <= capsule.bound;
}

/** Ein Template je Art: options[0] ist korrekt, Texte wörtlich aus den
 *  beiden Basisfällen (Zahlen-Fall mit $z$, Symbol-Fall ohne $z$). */
export const rankSolutionOptions = (capsule) => {
  if (capsule.kind === 'echelon-symbolic') {
    return [
      'Rang 2, eine freie Variable und unendlich viele Lösungen',
      'Rang 3 und genau eine Lösung',
      'Keine Lösung, weil die letzte Zeile nur Nullen enthält',
      'Rang 0, weil eine Nullzeile vorkommt',
    ];
  }
  return [
    'Rang 2, $z$ frei, unendlich viele Lösungen.',
    'Rang 3, keine freie Variable, genau eine Lösung.',
    'Keine Lösung, die Nullzeile ist ein Widerspruch.',
    'Rang 2 und genau eine Lösung.',
  ];
};

export const rankSolutionPrompt = ([a, b, c, d], capsule) => {
  if (capsule.kind === 'echelon-symbolic') {
    return `Nach korrekter Gauß-Elimination eines Systems mit drei Variablen entsteht $\\left(\\begin{array}{ccc|c}1&0&${a}&${b}\\\\0&1&${c}&${d}\\\\0&0&0&0\\end{array}\\right)$. Welche Diagnose ist vollständig korrekt?`;
  }
  return `Das System in $x,y,z$ steht in Zeilenstufenform: \\[\\begin{array}{rrr|r}1&0&${a}&${b}\\\\0&1&${c}&${d}\\\\0&0&0&0\\end{array}\\] Was folgt für Rang, freie Variable und Lösungsfall?`;
};

export const rankSolutionSolution = (capsule) => {
  if (capsule.kind === 'echelon-symbolic') {
    return 'Es gibt zwei Pivotpositionen, also Rang 2. Bei drei Variablen bleibt eine Variable frei. Die Nullzeile bedeutet $0=0$ und erzeugt keinen Widerspruch; daher gibt es unendlich viele Lösungen.';
  }
  return 'Zwei Pivotzeilen, also Rang 2. Drei Variablen minus Rang 2: $z$ ist frei, unendlich viele Lösungen. Die Nullzeile liest sich als $0=0$, nicht als Widerspruch.';
};

/** Kit-Hook: Seed wählt die vier Koeffizienten der Stufenform (die
 *  Antwortposition rotiert im Kit). */
export const drawRankSolutionParameters = (r, capsule) => ({
  systemCoefficients: [
    randInt(r, -capsule.bound, capsule.bound),
    randInt(r, -capsule.bound, capsule.bound),
    randInt(r, -capsule.bound, capsule.bound),
    randInt(r, -capsule.bound, capsule.bound),
  ],
});

/** Kapseln für classify-shape-contract: je Profil genau eine Kapsel mit
 *  Shape-Art, dims-Bereichen und Fallbindung (intro/core/stretch →
 *  Bias-Broadcast/Transformer-QKV/Token-Embedding). Bereiche decken die
 *  27 kuratierten Orakel ab (Broadcast Batch 4-64/in 5-13/out 3-24,
 *  QKV B 1-8/T 3-13/d 8-32/p 2-16, Embedding B 1-8/T 3-12/d 6-32);
 *  Ungleichungen (in≠out, T≠d, p≠d) halten Schlüssel und Distraktoren
 *  semantisch disjunkt. */
export const CLASSIFY_SHAPE_CAPSULES = {
  intro: { kind: 'bias-broadcast', batch: [4, 64], inputFeatures: [5, 13], outputFeatures: [3, 24], caseId: 'shape-bias-broadcast-mc' },
  core: { kind: 'transformer-qkv', batch: [1, 8], seqLen: [3, 13], modelDim: [8, 32], projDim: [2, 16], caseId: 'shape-transformer-qkv' },
  stretch: { kind: 'token-embedding', batch: [1, 8], seqLen: [3, 12], embedDim: [6, 32], caseId: 'shape-token-batch-flatten' },
};

export const SHAPE_CONTRACT_IDS = ['a', 'b', 'c', 'd'];

const shapeOf = (dims) => `$(${dims.join(',')})$`;

const broadcastShapeOk = (parameters, capsule) => {
  const { batch, inputFeatures, outputFeatures } = parameters || {};
  if (!inDimRange(batch, capsule.batch) || !inDimRange(inputFeatures, capsule.inputFeatures)
    || !inDimRange(outputFeatures, capsule.outputFeatures)) return false;
  return batch !== inputFeatures && inputFeatures !== outputFeatures;
};

const qkvShapeOk = (parameters, capsule) => {
  const inputShape = parameters?.inputShape;
  const projectionWidth = parameters?.projectionWidth;
  if (!Array.isArray(inputShape) || inputShape.length !== 3) return false;
  const [batch, seqLen, modelDim] = inputShape;
  if (!inDimRange(batch, capsule.batch) || !inDimRange(seqLen, capsule.seqLen)
    || !inDimRange(modelDim, capsule.modelDim) || !inDimRange(projectionWidth, capsule.projDim)) return false;
  return seqLen !== modelDim && projectionWidth !== modelDim;
};

const embeddingShapeOk = (parameters, capsule) => {
  const { batch, tokens, embeddingWidth } = parameters || {};
  if (!inDimRange(batch, capsule.batch) || !inDimRange(tokens, capsule.seqLen)
    || !inDimRange(embeddingWidth, capsule.embedDim)) return false;
  return tokens !== embeddingWidth;
};

/** Valide-Shape-Tupel-Constraint (Bound-Gate sinngemäß): Broadcast braucht
 *  verschiedene Feature-Dimensionen (sonst wäre der Bias-Distraktor
 *  mehrdeutig), QKV verschiedene T/d/p-Achsen (sonst kollidiert der
 *  Schlüssel mit Prompt oder Distraktor), Embedding T≠d. */
export function classifyShapeOk(parameters, capsule) {
  if (!parameters || typeof parameters !== 'object') return false;
  if (capsule.kind === 'bias-broadcast') return broadcastShapeOk(parameters, capsule);
  if (capsule.kind === 'transformer-qkv') return qkvShapeOk(parameters, capsule);
  if (capsule.kind === 'token-embedding') return embeddingShapeOk(parameters, capsule);
  return false;
}

export const classifyShapeSystem = (parameters, capsule) => {
  if (capsule.kind === 'transformer-qkv') {
    const [batch, seqLen, modelDim] = parameters.inputShape;
    return { batch, seqLen, modelDim, projectionWidth: parameters.projectionWidth };
  }
  if (capsule.kind === 'token-embedding') {
    return { batch: parameters.batch, tokens: parameters.tokens, embedDim: parameters.embeddingWidth };
  }
  return { batch: parameters.batch, inputFeatures: parameters.inputFeatures, outputFeatures: parameters.outputFeatures };
};

export const classifyShapeParameters = (system, capsule) => {
  if (capsule.kind === 'transformer-qkv') {
    return { inputShape: [system.batch, system.seqLen, system.modelDim], projectionWidth: system.projectionWidth };
  }
  if (capsule.kind === 'token-embedding') {
    return { batch: system.batch, tokens: system.tokens, embeddingWidth: system.embedDim };
  }
  return { batch: system.batch, inputFeatures: system.inputFeatures, outputFeatures: system.outputFeatures };
};

/** Ein Template je Art: options[0] ist korrekt, Texte wörtlich aus den
 *  Bestandsvarianten (Broadcast-Begründung, QKV-Tupel mit
 *  Gewichtsform-Distraktor aus dem Basisfall, Embedding-Tupel). */
export const classifyShapeOptions = (system, capsule) => {
  if (capsule.kind === 'transformer-qkv') {
    const { batch, seqLen, modelDim, projectionWidth } = system;
    return [
      `${shapeOf([batch, seqLen, projectionWidth])}`,
      `${shapeOf([batch, modelDim, projectionWidth])}`,
      `${shapeOf([seqLen, projectionWidth])}`,
      `${shapeOf([modelDim, projectionWidth])}`,
    ];
  }
  if (capsule.kind === 'token-embedding') {
    const { batch, tokens, embedDim } = system;
    return [
      `${shapeOf([batch, tokens, embedDim])}`,
      `${shapeOf([batch, embedDim, tokens])}`,
      `${shapeOf([tokens, embedDim])}`,
      `${shapeOf([batch, tokens])}`,
    ];
  }
  const { batch, inputFeatures, outputFeatures } = system;
  return [
    `${shapeOf([batch, outputFeatures])} — die Batch-Dimension bleibt außen, die Feature-Dimension wird von ${inputFeatures} auf ${outputFeatures} umprojiziert; $b$ wird zeilenweise broadcastet.`,
    `Die Operation ist unzulässig — ${shapeOf([batch, inputFeatures])} und ${shapeOf([inputFeatures, outputFeatures])} passen nicht zusammen, Broadcast regelt das nicht.`,
    `${shapeOf([inputFeatures, outputFeatures])} — das Ergebnis erbt die Form der Gewichtsmatrix, der Batch geht verloren.`,
    `${shapeOf([batch, inputFeatures])} — der Bias ändert die Form nicht, also bleibt die Eingabeform stehen.`,
  ];
};

export const classifyShapePrompt = (system, capsule) => {
  if (capsule.kind === 'transformer-qkv') {
    const { batch, seqLen, modelDim, projectionWidth } = system;
    return `Ein Batch $X$ hat Shape $(B,T,d)=(${batch},${seqLen},${modelDim})$; $W_Q$ hat Shape $(${modelDim},${projectionWidth})$. Welche Shape besitzt $Q=XW_Q$?`;
  }
  if (capsule.kind === 'token-embedding') {
    const { batch, tokens, embedDim } = system;
    return `Ein Tokenizer liefert IDs mit Shape $(B,T)=(${batch},${tokens})$; ein Embedding mit Breite $d=${embedDim}$ ersetzt jede ID durch einen Vektor. Welche Shape hat die eingebettete Sequenz?`;
  }
  const { batch, inputFeatures, outputFeatures } = system;
  return `Ein Batch hat die Form $X \\in \\mathbb{R}^{${batch} \\times ${inputFeatures}}$, die Gewichtsmatrix eines linearen Layers $W \\in \\mathbb{R}^{${inputFeatures} \\times ${outputFeatures}}}$ und der Bias $b \\in \\mathbb{R}^{${outputFeatures}}}$. Welche Form hat $XW+b$, und warum?`;
};

export const classifyShapeSolution = (system, capsule) => {
  if (capsule.kind === 'transformer-qkv') {
    const { batch, seqLen, modelDim, projectionWidth } = system;
    return `Die Projektion wirkt auf die letzte Achse: jede der ${batch}·${seqLen} Tokenpositionen wird von ${modelDim} auf ${projectionWidth} Merkmale abgebildet. Daher hat $Q$ Shape ${shapeOf([batch, seqLen, projectionWidth])}.`;
  }
  if (capsule.kind === 'token-embedding') {
    const { batch, tokens, embedDim } = system;
    return `Jede der ${batch} Sequenzen enthält ${tokens} Token, und jedes Token wird durch einen Vektor der Breite ${embedDim} ersetzt. Die Shape ist daher ${shapeOf([batch, tokens, embedDim])}.`;
  }
  const { batch, outputFeatures } = system;
  return `$XW$ hat Form $${batch}\\times${outputFeatures}$; der Bias mit Form $${outputFeatures}$ wird über die ${batch} Zeilen gebroadcastet. Ergebnis: ${shapeOf([batch, outputFeatures])}.`;
};

const drawClassifyShapeSystem = (r, capsule) => {
  if (capsule.kind === 'transformer-qkv') {
    return {
      batch: randInt(r, capsule.batch[0], capsule.batch[1]),
      seqLen: randInt(r, capsule.seqLen[0], capsule.seqLen[1]),
      modelDim: randInt(r, capsule.modelDim[0], capsule.modelDim[1]),
      projectionWidth: randInt(r, capsule.projDim[0], capsule.projDim[1]),
    };
  }
  if (capsule.kind === 'token-embedding') {
    return {
      batch: randInt(r, capsule.batch[0], capsule.batch[1]),
      tokens: randInt(r, capsule.seqLen[0], capsule.seqLen[1]),
      embedDim: randInt(r, capsule.embedDim[0], capsule.embedDim[1]),
    };
  }
  return {
    batch: randInt(r, capsule.batch[0], capsule.batch[1]),
    inputFeatures: randInt(r, capsule.inputFeatures[0], capsule.inputFeatures[1]),
    outputFeatures: randInt(r, capsule.outputFeatures[0], capsule.outputFeatures[1]),
  };
};

/** Kit-Hook: Seed wählt das Shape-System und liefert die gespeicherten
 *  Parameter (until-Retry wie im bisherigen Kapsel-Sampler; die
 *  Antwortposition rotiert im Kit). */
export const drawClassifyShapeParameters = (r, capsule) => classifyShapeParameters(
  until(r, () => drawClassifyShapeSystem(r, capsule),
    (candidate) => classifyShapeOk(classifyShapeParameters(candidate, capsule), capsule),
    { scope: 'genClassifyShapeCapsule' }),
  capsule,
);

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

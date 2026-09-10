// Pilot-Familie transform-rank-dependence-rowops: Kapsel-Gates.
// Run: node --test tests/linalg_rank_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { genRankCapsule, RANK_CAPSULES, rank } from '../assets/js/core/linalg_generators.mjs';
import { standaloneNumberPresent } from '../assets/js/core/generator_draw_kit.mjs';
import {
  RANK_CONTRACT,
  generateRankFamily,
  solveRankFamily,
} from '../assets/js/core/foundations_linalg_families.mjs';
import { LINALG_FAMILIES } from '../assets/js/domain/foundations_linalg_registry.mjs';

// --- 27 statische Orakel aus dem Content-Stand vor dem Strip -----------------
// Je Fall 9 Varianten mit Zielrang und v2-Bound (7/5/20). Regel: Kapsel
// weiten, nie Orakel umschreiben — der Sampler muss diese Bounds halten.
const ORACLES = [
  {
    caseId: 'rank-3x3-staircase', targetRank: 2, bound: 7, matrices: [
      [[2, 1, 1], [1, 2, 0], [3, 3, 1]],
      [[1, 2, 3], [2, 1, 4], [3, 3, 7]],
      [[3, 1, 2], [2, 4, -1], [5, 5, 1]],
      [[1, -1, 2], [2, 3, 1], [3, 2, 3]],
      [[4, 1, 0], [2, 3, 1], [6, 4, 1]],
      [[2, 5, 1], [1, 1, 3], [3, 6, 4]],
      [[1, 3, -2], [2, 1, 4], [3, 4, 2]],
      [[5, 2, 1], [1, 4, 0], [6, 6, 1]],
      [[2, -1, 3], [4, 1, 0], [6, 0, 3]],
    ],
  },
  {
    caseId: 'rank-3x3-full', targetRank: 3, bound: 5, matrices: [
      [[1, 2, 0], [0, 1, 3], [2, 0, 1]],
      [[2, 1, 0], [0, 3, 1], [1, 0, 2]],
      [[1, -1, 2], [2, 1, 0], [0, 3, 1]],
      [[3, 0, 1], [1, 2, 0], [0, 1, 4]],
      [[2, 4, 1], [0, 3, 2], [1, 0, 2]],
      [[1, 0, 2], [2, 1, 1], [0, 3, 4]],
      [[4, 1, 0], [1, 3, 2], [2, 0, 5]],
      [[2, -1, 0], [1, 2, 3], [0, 1, 2]],
      [[1, 3, 2], [0, 2, 1], [2, 0, 4]],
    ],
  },
  {
    caseId: 'rank-3x4-line', targetRank: 1, bound: 20, matrices: [
      [[1, 2, 3, 4], [2, 4, 6, 8], [-1, -2, -3, -4]],
      [[2, 1, 3, 5], [6, 3, 9, 15], [-4, -2, -6, -10]],
      [[1, -2, 4, 3], [-2, 4, -8, -6], [3, -6, 12, 9]],
      [[3, 1, 2, 4], [6, 2, 4, 8], [6, 2, 4, 8]],
      [[2, 4, 1, -1], [-2, -4, -1, 1], [6, 12, 3, -3]],
      [[1, 3, -2, 5], [4, 12, -8, 20], [-2, -6, 4, -10]],
      [[4, 1, 2, 3], [-8, -2, -4, -6], [4, 1, 2, 3]],
      [[2, -1, 3, 4], [6, -3, 9, 12], [4, -2, 6, 8]],
      [[1, 5, 2, -3], [-3, -15, -6, 9], [2, 10, 4, -6]],
    ],
  },
];

const maxAbs = (A) => Math.max(...A.flat().map((value) => Math.abs(value)));

/** Unabhängiger Rang über Bruch-Gauss (Referenz gegen den Bareiss-Solver). */
const gcd = (a, b) => (b === 0 ? Math.abs(a) : gcd(b, a % b));
const frac = (n, d = 1) => {
  if (d === 0) throw new Error('Division durch 0');
  if (d < 0) { n = -n; d = -d; }
  const g = gcd(Math.abs(n), d) || 1;
  return { n: n / g, d: d / g };
};
const fadd = (a, b) => frac(a.n * b.d + b.n * a.d, a.d * b.d);
const fmul = (a, b) => frac(a.n * b.n, a.d * b.d);
const fdiv = (a, b) => {
  if (b.n === 0) throw new Error('Division durch 0');
  return frac(a.n * b.d, a.d * b.n);
};
const isZero = (a) => a.n === 0;
function rankFraction(A) {
  const m = A.map((row) => row.map((value) => frac(value)));
  const rows = m.length, cols = m[0].length;
  let r = 0;
  for (let c = 0; c < cols && r < rows; c += 1) {
    let piv = -1;
    for (let i = r; i < rows; i += 1) {
      if (!isZero(m[i][c])) { piv = i; break; }
    }
    if (piv === -1) continue;
    [m[r], m[piv]] = [m[piv], m[r]];
    for (let i = r + 1; i < rows; i += 1) {
      if (isZero(m[i][c])) continue;
      const f = fdiv(m[i][c], m[r][c]);
      for (let j = c; j < cols; j += 1) m[i][j] = fadd(m[i][j], fmul({ n: -1, d: 1 }, fmul(f, m[r][j])));
    }
    r += 1;
  }
  return r;
}

const CAPSULE_KEYS = ['core', 'stretch', 'challenge'];
const CASE_FOR = { core: 'rank-3x3-staircase', stretch: 'rank-3x3-full', challenge: 'rank-3x4-line' };

test('Orakel-27: alle statischen Matrizen solver-bestätigt und innerhalb 7/5/20', () => {
  let count = 0;
  for (const oracle of ORACLES) {
    assert.equal(oracle.matrices.length, 9, `${oracle.caseId}: 9 Varianten`);
    for (const A of oracle.matrices) {
      assert.equal(rank(A), oracle.targetRank, `${oracle.caseId}: Rang`);
      assert.equal(rankFraction(A), oracle.targetRank, `${oracle.caseId}: Bruch-Gauss`);
      assert.ok(maxAbs(A) <= oracle.bound, `${oracle.caseId}: maxAbs im Bound`);
      count += 1;
    }
  }
  assert.equal(count, 27);
});

test('Kapseltabelle: Bounds 7/5/20 mit Fallbindung', () => {
  assert.deepEqual(RANK_CAPSULES.core, { dims: [3, 3], targetRank: 2, bound: 7, caseId: 'rank-3x3-staircase' });
  assert.deepEqual(RANK_CAPSULES.stretch, { dims: [3, 3], targetRank: 3, bound: 5, caseId: 'rank-3x3-full' });
  assert.deepEqual(RANK_CAPSULES.challenge, { dims: [3, 4], targetRank: 1, bound: 20, caseId: 'rank-3x4-line' });
});

test('Kapsel-Constraints: Form, Rang, Bound, Hygiene über je 200 Seeds', () => {
  for (const key of CAPSULE_KEYS) {
    const capsule = RANK_CAPSULES[key];
    for (let seed = 0; seed < 200; seed += 1) {
      const { parameters: { A }, expected } = genRankCapsule(seed, capsule);
      assert.equal(A.length, capsule.dims[0], `${key}:${seed}: Zeilen`);
      for (const row of A) assert.equal(row.length, capsule.dims[1], `${key}:${seed}: Spalten`);
      for (const row of A) for (const value of row) assert.ok(Number.isInteger(value), `${key}:${seed}: ganzzahlig`);
      assert.equal(rank(A), capsule.targetRank, `${key}:${seed}: Zielrang`);
      assert.equal(expected, capsule.targetRank, `${key}:${seed}: Expected`);
      assert.ok(maxAbs(A) <= capsule.bound, `${key}:${seed}: Bound`);
      assert.ok(A.some((row) => row.some((value) => value !== 0)), `${key}:${seed}: keine Nullmatrix`);
      const seen = new Set(A.map((row) => row.join(',')));
      if (capsule.targetRank !== 1) assert.equal(seen.size, A.length, `${key}:${seed}: keine Doppelzeile`);
    }
  }
});

test('Solver-Agreement 3x200: rank() gegen Bruch-Gauss ohne Abweichung', () => {
  for (const key of CAPSULE_KEYS) {
    const capsule = RANK_CAPSULES[key];
    for (let seed = 0; seed < 200; seed += 1) {
      const { parameters: { A }, expected } = genRankCapsule(seed, capsule);
      assert.equal(rankFraction(A), expected, `${key}:${seed}`);
    }
  }
});

test('Bound-Compliance 3x200: null Samples über dem Kapsel-Bound', () => {
  for (const key of CAPSULE_KEYS) {
    const capsule = RANK_CAPSULES[key];
    let violations = 0;
    for (let seed = 0; seed < 200; seed += 1) {
      if (maxAbs(genRankCapsule(seed, capsule).parameters.A) > capsule.bound) violations += 1;
    }
    assert.equal(violations, 0, `${key}: Bound-Verletzungen`);
  }
});

test('Leak: Prompt nennt die Antwort nie, Modulo-Klassen halten nichts zurück', () => {
  for (const key of CAPSULE_KEYS) {
    const capsule = RANK_CAPSULES[key];
    const byModulo = new Map();
    for (let seed = 0; seed < 200; seed += 1) {
      const { prompt, expected } = genRankCapsule(seed, capsule);
      assert.ok(!standaloneNumberPresent(prompt, expected), `${key}:${seed}: Antwort im Prompt`);
      const bucket = seed % 8;
      if (!byModulo.has(bucket)) byModulo.set(bucket, new Set());
      byModulo.get(bucket).add(prompt);
    }
    for (const [bucket, prompts] of byModulo) {
      assert.ok(prompts.size >= 10, `${key}: Modulo-Klasse ${bucket} hält nur ${prompts.size} distinct`);
    }
  }
});

test('negative Seeds: gültig und deterministisch', () => {
  for (const key of CAPSULE_KEYS) {
    const capsule = RANK_CAPSULES[key];
    for (let seed = -50; seed < 0; seed += 1) {
      const first = genRankCapsule(seed, capsule);
      assert.deepEqual(first, genRankCapsule(seed, capsule), `${key}:${seed}: deterministisch`);
      assert.equal(rank(first.parameters.A), capsule.targetRank, `${key}:${seed}: Zielrang`);
      assert.ok(maxAbs(first.parameters.A) <= capsule.bound, `${key}:${seed}: Bound`);
    }
  }
});

test('Familien-Block: Dispatch, Contract, Solve', () => {
  assert.equal(RANK_CONTRACT.familyId, 'transform-rank-dependence-rowops');
  assert.equal(RANK_CONTRACT.authorityMode, 'seeded');
  assert.deepEqual(RANK_CONTRACT.difficultyProfiles, ['core', 'stretch', 'challenge']);
  assert.deepEqual(RANK_CONTRACT.caseTypes.map((item) => item.caseId).sort(), Object.values(CASE_FOR).sort());
  for (const key of CAPSULE_KEYS) {
    const generated = generateRankFamily({ seed: 11, caseId: CASE_FOR[key], difficulty: key });
    assert.equal(generated.expected.kind, 'integer');
    assert.equal(generated.expected.value, RANK_CAPSULES[key].targetRank);
    assert.deepEqual(solveRankFamily(generated.parameters), { value: RANK_CAPSULES[key].targetRank });
    assert.ok(generated.prompt.length > 20);
    assert.deepEqual(generateRankFamily({ seed: 11, caseId: CASE_FOR[key], difficulty: key }), generated);
  }
  assert.throws(() => generateRankFamily({ seed: 0, caseId: 'rank-3x3-staircase', difficulty: 'stretch' }), /Unbekannter Fall/);
  assert.throws(() => generateRankFamily({ seed: 0, caseId: 'rank-3x3-full', difficulty: 'intro' }), /Unbekannt/);
  assert.throws(() => generateRankFamily({ seed: 0, caseId: 'rank-3x3-staircase', difficulty: 'intro' }), /Unbekannt/);
});

test('Familien-Block: Registry löst, gradet und bleibt deterministisch', async () => {
  const instance = LINALG_FAMILIES.instantiate('transform-rank-dependence-rowops', 11, 'core', 'rank-3x3-staircase');
  assert.equal(instance.expectedAnswer.value, 2);
  const right = await LINALG_FAMILIES.grade(instance, '2');
  assert.equal(right.correct, true);
  const wrong = await LINALG_FAMILIES.grade(instance, '3');
  assert.equal(wrong.correct, false);
});

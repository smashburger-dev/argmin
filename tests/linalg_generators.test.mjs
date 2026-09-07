// Property-based tests for the week-5 generators and graders.
// Run: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  rng, matmul, dot, genMatmulEntry, genDot, genIndependence, genLinear2, genColumnCombination,
  solveLinear2, parseIntegerAnswer, parseIntegerPair, genRank3, rank,
} from '../assets/js/core/linalg_generators.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { legacyOracle } from './helpers/legacy_oracle.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Deterministic PRNG reproduces sequences.
test('rng is deterministic for a seed', () => {
  const a = rng(42), b = rng(42);
  for (let i = 0; i < 10; i++) assert.equal(a(), b());
});

// Reference implementations are cross-checked against a naive implementation.
test('matmul matches naive computation on random matrices', () => {
  const r = rng(7);
  for (let t = 0; t < 100; t++) {
    const A = [[r(), r()], [r(), r()]].map((row) => row.map((x) => Math.round(x * 6 - 3)));
    const B = [[r(), r()], [r(), r()]].map((row) => row.map((x) => Math.round(x * 6 - 3)));
    const C = matmul(A, B);
    assert.equal(C.length, 2); assert.equal(C[0].length, 2);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      let s = 0;
      for (let k = 0; k < 2; k++) s += A[i][k] * B[k][j];
      assert.equal(C[i][j], s);
    }
  }
});

test('genMatmulEntry: 200 seeds, expected value matches direct computation, range invariant', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const { parameters, expected } = genMatmulEntry(seed);
    const C = matmul(parameters.A, parameters.B);
    assert.equal(expected, C[parameters.entry[0] - 1][parameters.entry[1] - 1]);
    // invariant: mental-math bound |c_ij| <= 50
    for (const row of C) for (const v of row) assert.ok(Math.abs(v) <= 50, `seed ${seed} value ${v}`);
  }
});

test('genDot: 200 seeds, expected equals dot(), components bounded', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const { parameters: { u, v }, expected } = genDot(seed);
    assert.equal(expected, dot(u, v));
    for (const x of [...u, ...v]) assert.ok(Math.abs(x) <= 5);
    assert.equal(u.length, 3);
  }
});

test('genIndependence: 300 seeds, determinant test agrees with expected flag', () => {
  for (let seed = 1; seed <= 300; seed++) {
    const { parameters: { vectors: [b1, b2] }, expected } = genIndependence(seed);
    const det = b1[0] * b2[1] - b1[1] * b2[0];
    assert.equal(det === 0, expected.dependent, `seed ${seed}`);
  }
});

test('genLinear2: 500 seeds, unique integer solution in [-9,9], solver agrees', () => {
  for (let seed = 1; seed <= 500; seed++) {
    const { parameters: { A, b }, expected } = genLinear2(seed);
    const det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
    assert.notEqual(det, 0);
    assert.deepEqual(solveLinear2(A, b), expected);
    for (const x of expected) { assert.ok(Number.isInteger(x)); assert.ok(Math.abs(x) <= 9); }
    // edge case: no division by zero in solver (det != 0 guaranteed above)
  }
});

test('genColumnCombination: 300 seeds preserve Ax=b and vary deterministically', () => {
  for (let seed = 1; seed <= 300; seed++) {
    const first = genColumnCombination(seed);
    const second = genColumnCombination(seed);
    assert.deepEqual(first, second);
    assert.deepEqual(solveLinear2(first.parameters.A, first.parameters.b), first.expected);
    assert.match(first.prompt, /Spalten von A/);
  }
});

test('parseIntegerAnswer accepts clean integers, rejects garbage', () => {
  assert.deepEqual(parseIntegerAnswer(' 7 '), { ok: true, value: 7 });
  assert.deepEqual(parseIntegerAnswer('-12'), { ok: true, value: -12 });
  assert.equal(parseIntegerAnswer('3.5').ok, false);
  assert.equal(parseIntegerAnswer('abc').ok, false);
  assert.equal(parseIntegerAnswer('').ok, false);
  assert.equal(parseIntegerAnswer('1e5').ok, false);
});

test('parseIntegerPair accepts (1, 3) variants, rejects wrong arity', () => {
  assert.deepEqual(parseIntegerPair('(1, 3)').value, [1, 3]);
  assert.deepEqual(parseIntegerPair('1 3').value, [1, 3]);
  assert.deepEqual(parseIntegerPair('-2,4').value, [-2, 4]);
  assert.equal(parseIntegerPair('1').ok, false);
  assert.equal(parseIntegerPair('1,2,3').ok, false);
  assert.equal(parseIntegerPair('1,x').ok, false);
});

// Consistency: exercise JSON parameters agree with generators (no stale seeds).
test('week05.json fixed instances match generators and solvers', () => {
  const week = legacyOracle.weeks.w05;
  const by = Object.fromEntries(week.exercises.map((e) => [e.exerciseId, e]));
  // e1: parameters fix A/B; expected via matmul
  const e1 = by['w05-e1'];
  assert.equal(matmul(e1.parameters.A, e1.parameters.B)[0][1], 1);
  // e3: dot product of the fixed vectors
  assert.equal(dot(by['w05-e3'].parameters.u, by['w05-e3'].parameters.v), -8);
  // e6: solver reproduces stated solution
  const e6 = by['w05-e6'];
  assert.deepEqual(solveLinear2(e6.parameters.A, e6.parameters.b), e6.expectedAnswer.solution);
  // e10: rank of the fixed matrix matches the stated expectedRank
  const e10 = by['w05-e10'];
  assert.equal(rank(e10.parameters.A), e10.parameters.expectedRank);
  // e11/e12/e13: fixed instances match their generators' expectation
  const e11 = by['w05-e11'];
  assert.deepEqual(solveLinear2(e11.parameters.A, e11.parameters.b), e11.expectedAnswer.solution);
  const e12 = by['w05-e12'];
  const c12 = matmul(e12.parameters.A, e12.parameters.B);
  assert.equal(c12[e12.parameters.entry[0] - 1][e12.parameters.entry[1] - 1], -4);
  const e13 = by['w05-e13'];
  assert.equal(dot(e13.parameters.u, e13.parameters.v), 22);
});

// --- rank reference solver ---------------------------------------------------

test('rank: agrees with determinant and construction on known matrices', () => {
  assert.equal(rank([[1, 0], [0, 1]]), 2);
  assert.equal(rank([[1, 2], [2, 4]]), 1);
  assert.equal(rank([[0, 0], [0, 0]]), 0);
  assert.equal(rank([[1, 2, 3], [4, 5, 6], [7, 8, 9]]), 2); // classic singular 3x3
  assert.equal(rank([[2, 1, 1], [1, 2, 0], [3, 3, 1]]), 2); // row3 = row1 + row2
  assert.equal(rank([[2, 1], [1, 2], [3, 3]]), 2); // tall matrix
  assert.equal(rank([[1, 2, 3]]), 1); // single row
  assert.equal(rank([[1], [2], [3]]), 1); // single column
  // full-rank 3x3 (det != 0)
  assert.equal(rank([[2, 0, 0], [0, 3, 0], [0, 0, 4]]), 3);
});

test('genRank3: 300 seeds, produced rank equals target, entries bounded', () => {
  for (let seed = 1; seed <= 300; seed++) {
    const { parameters: { A, expectedRank }, expected } = genRank3(seed);
    assert.equal(expected, expectedRank, `seed ${seed}`);
    assert.ok(expectedRank >= 1 && expectedRank <= 3, `seed ${seed} rank out of range`);
    for (const row of A) for (const v of row) assert.ok(Math.abs(v) <= 12, `seed ${seed} entry ${v}`);
    // cross-check via a second, independent path: all 2x2 minors vanish iff rank < 2 etc.
    // (cheap spot check: rank via row-reduction is already cross-checked above;
    // here verify the generator's own consistency invariant)
    assert.equal(rank(A), expectedRank, `seed ${seed} solver disagrees`);
  }
});

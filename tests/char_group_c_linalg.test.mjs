// Characterization tests: existing W5 (Lineare Algebra + NumPy) contract.
// Session B extends the seeded definitions — these tests pin the CURRENT
// behavior so regressions surface. Product code is never mocked; everything
// runs through the real graders, adapters and generators.
//
// Solver independence: the verification helpers below (naiveMatmul, naiveDot,
// det2, naiveMatvec, rankByMinors3) are small independent implementations.
// The product solvers (matmul/dot/rank/solveLinear2 in w05_generators.mjs)
// are deliberately NOT imported here — expected values are re-derived.
//
// Run: node --test tests/char_group_c_linalg.test.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { graders, buildPythonTests } from '../assets/js/core/graders.js';
import { instantiateLegacyExercise } from '../assets/js/core/legacy_exercise_adapter.mjs';
import {
  genMatmulEntry,
  genDot,
  genLinear2,
  genIndependence,
  genRank3,
} from '../assets/js/core/w05_generators.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const week = JSON.parse(readFileSync(join(root, 'content/exercises/w05.json'), 'utf8'));
const byId = Object.fromEntries(week.exercises.map((e) => [e.exerciseId, e]));
const defDir = 'content/exercise-definitions/linear-algebra';
const loadDef = (file) => JSON.parse(readFileSync(join(root, defDir, file), 'utf8'));

const grade = (exercise, answer) => graders.deterministic.grade(exercise, answer);

// --- independent solvers (no product imports for verification) ---------------

const naiveMatmul = (A, B) =>
  Array.from({ length: A.length }, (_, i) =>
    Array.from({ length: B[0].length }, (_, j) => {
      let s = 0;
      for (let t = 0; t < B.length; t++) s += A[i][t] * B[t][j];
      return s;
    }));
const naiveMatvec = (A, x) => A.map((row) => row.reduce((s, a, i) => s + a * x[i], 0));
const naiveDot = (u, v) => u.reduce((s, x, i) => s + x * v[i], 0);
const det2 = (rows, r0, r1, c0, c1) =>
  rows[r0][c0] * rows[r1][c1] - rows[r0][c1] * rows[r1][c0];
const det3 = (A) =>
  A[0][0] * det2(A, 1, 2, 1, 2) - A[0][1] * det2(A, 1, 2, 0, 2) + A[0][2] * det2(A, 1, 2, 0, 1);

/** Rank of a 3x3 integer matrix via determinant minors (independent of the
 *  product's fraction-free Gaussian elimination). */
function rankByMinors3(A) {
  if (det3(A) !== 0) return 3;
  for (let r0 = 0; r0 < 3; r0++) for (let r1 = r0 + 1; r1 < 3; r1++)
    for (let c0 = 0; c0 < 3; c0++) for (let c1 = c0 + 1; c1 < 3; c1++)
      if (det2(A, r0, r1, c0, c1) !== 0) return 2;
  return A.some((row) => row.some((v) => v !== 0)) ? 1 : 0;
}

// --- 1. w05.json: deterministic numeric tasks --------------------------------

test('w05 numeric e1/e3/e10/e12/e13: grader accepts the documented answers, rejects wrong ones', async () => {
  // correct answers re-derived with the independent solvers, not read from
  // the product: e1 c12, e3 u.v, e10 rank, e12 c11, e13 u.v
  const e1 = byId['w05-e1'];
  const expectedE1 = naiveMatmul(e1.parameters.A, e1.parameters.B)[0][1];
  const e3 = byId['w05-e3'];
  const expectedE3 = naiveDot(e3.parameters.u, e3.parameters.v);
  const e10 = byId['w05-e10'];
  const expectedE10 = rankByMinors3(e10.parameters.A);
  const e12 = byId['w05-e12'];
  const expectedE12 = naiveMatmul(e12.parameters.A, e12.parameters.B)[0][0];
  const e13 = byId['w05-e13'];
  const expectedE13 = naiveDot(e13.parameters.u, e13.parameters.v);
  assert.deepEqual(
    { e1: expectedE1, e3: expectedE3, e10: expectedE10, e12: expectedE12, e13: expectedE13 },
    { e1: 1, e3: -8, e10: 2, e12: -4, e13: 22 },
  );

  const cases = [
    ['w05-e1', '1', '4'],
    ['w05-e3', '-8', '9'],
    ['w05-e10', '2', '3'],
    ['w05-e12', '-4', '4'],
    ['w05-e13', '22', '14'],
  ];
  for (const [id, correctAnswer, wrongAnswer] of cases) {
    const exercise = byId[id];
    const right = await grade(exercise, correctAnswer);
    assert.equal(right.correct, true, `${id} correct answer must pass`);
    assert.equal(right.errorType, null, `${id}`);
    assert.ok(String(right.verdictText).startsWith('Richtig'), `${id}`);

    const wrong = await grade(exercise, wrongAnswer);
    assert.equal(wrong.correct, false, `${id} wrong answer must fail`);
    assert.equal(wrong.errorType, 'wrong-value', `${id}`);
  }
  // tolerance mode exact-integer: non-integer and non-numeric input rejected
  for (const id of ['w05-e1', 'w05-e3', 'w05-e10', 'w05-e12', 'w05-e13']) {
    const invalid = await grade(byId[id], '3.5');
    assert.equal(invalid.correct, false, `${id} 3.5`);
    assert.equal(invalid.errorType, 'invalid-input', `${id} 3.5 must be invalid-input`);
    const garbage = await grade(byId[id], 'abc');
    assert.equal(garbage.errorType, 'invalid-input', `${id} abc`);
  }
  // feedbackRules of the `value === N` form fire as diagnosis for listed
  // values only. Session B re-derived the authored rules from the actual
  // instances (c11 = 2 for e1 — the old key 4 matched nothing).
  const listed = await grade(byId['w05-e1'], '2');
  assert.equal(typeof listed.diagnosis, 'string');
  assert.ok(listed.diagnosis.length > 0, 'e1 value 2 has an authored rule');
  assert.match(listed.diagnosis, /c_\{11\}/, 'e1 rule explains the c11 confusion');
  const unlisted = await grade(byId['w05-e1'], '99');
  assert.equal(unlisted.diagnosis, null);
});

// --- 2. w05.json: deterministic single-choice tasks ---------------------------

test('w05 single-choice e2/e4: correct choice passes, distractors fail with wrong-choice', async () => {
  const cases = [
    ['w05-e2', 'a'],
    ['w05-e4', 'a'],
  ];
  for (const [id, correctId] of cases) {
    const exercise = byId[id];
    assert.equal(exercise.expectedAnswer.correctChoice, correctId, `${id} documented choice`);
    const right = await grade(exercise, correctId);
    assert.equal(right.correct, true, `${id}`);
    assert.equal(right.errorType, null);
    assert.ok(String(right.verdictText).startsWith('Richtig'), `${id}`);
    for (const choice of exercise.choices) {
      if (choice.id === correctId) continue;
      const wrong = await grade(exercise, choice.id);
      assert.equal(wrong.correct, false, `${id} ${choice.id}`);
      assert.equal(wrong.errorType, 'wrong-choice', `${id} ${choice.id}`);
    }
    const unknown = await grade(exercise, 'zzz');
    assert.equal(unknown.correct, false, `${id}`);
    assert.equal(unknown.errorType, 'invalid-input', `${id} unknown choice id`);
  }
  // legacy `choice === 'x'` feedback rules fire as diagnosis
  const diagnosed = await grade(byId['w05-e2'], 'b');
  assert.equal(typeof diagnosed.diagnosis, 'string');
  assert.ok(diagnosed.diagnosis.length > 0, 'e2 choice b has an authored rule');
  const correct = await grade(byId['w05-e2'], 'a');
  assert.equal(correct.diagnosis, null);
});

// --- 3. w05.json: deterministic vector tasks (solveLinear2 recomputation) ----

test('w05 vector e6/e11: grader recomputes the solution from parameters and detects swapped pairs', async () => {
  const cases = [
    ['w05-e6', [1, 3], [3, 1], [2, 3]],
    ['w05-e11', [8, 4], [4, 8], [0, 0]],
  ];
  for (const [id, solution, swappedPair, wrongPair] of cases) {
    const exercise = byId[id];
    const { A, b } = exercise.parameters;
    // independent verification: det != 0 and A*expected === b, and the
    // documented solution matches the independent solve
    assert.notEqual(det2(A, 0, 1, 0, 1), 0, `${id} singular`);
    assert.deepEqual(naiveMatvec(A, solution), b, `${id} A*expected must equal b`);
    assert.deepEqual(exercise.expectedAnswer.solution, solution, `${id} documented solution`);

    const right = await grade(exercise, `(${solution[0]}, ${solution[1]})`);
    assert.equal(right.correct, true, `${id}`);
    assert.equal(right.errorType, null);
    assert.ok(String(right.verdictText).startsWith('Richtig'), `${id}`);
    // the "1 3" whitespace form parses to the same pair
    assert.equal((await grade(exercise, `${solution[0]} ${solution[1]}`)).correct, true, `${id} bare pair`);

    const swapped = await grade(exercise, `(${swappedPair[0]}, ${swappedPair[1]})`);
    assert.equal(swapped.correct, false, `${id} swapped`);
    assert.equal(swapped.errorType, 'swapped', `${id} swapped pair must be errorType swapped`);
    assert.ok(String(swapped.diagnosis).includes('Reihenfolge'), `${id} swapped diagnosis`);

    const wrong = await grade(exercise, `(${wrongPair[0]}, ${wrongPair[1]})`);
    assert.equal(wrong.correct, false, `${id}`);
    assert.equal(wrong.errorType, 'wrong-value', `${id}`);
    assert.equal(wrong.diagnosis, null, `${id}`);

    const invalid = await grade(exercise, 'x');
    assert.equal(invalid.correct, false, `${id}`);
    assert.equal(invalid.errorType, 'invalid-input', `${id}`);
    const nonInteger = await grade(exercise, '1.5, 3');
    assert.equal(nonInteger.errorType, 'invalid-input', `${id} non-integer component`);
  }
});

// --- 4. w05.json / final-boss: pyodide task structure (no worker in Node) ----

test('w05 pyodide tasks e5/e8 keep their grader contract, packages and reference solver', async () => {
  const e5 = byId['w05-e5'];
  assert.equal(e5.grader, 'pyodide-sympy');
  assert.equal(typeof graders['pyodide-sympy']?.grade, 'function');
  assert.equal(graders['pyodide-sympy'].needsWorker, true);
  assert.equal(e5.expectedAnswer.kind, 'expression');
  assert.equal(e5.expectedAnswer.expression, 'x**2 + x - 6');
  assert.match(e5.expectedAnswer.equivalence, /simplify\(expand\(student\) - expand\(expected\)\) == 0/);

  const e8 = byId['w05-e8'];
  assert.equal(e8.grader, 'pyodide');
  assert.equal(typeof graders.pyodide?.grade, 'function');
  assert.equal(graders.pyodide.needsWorker, true);
  assert.deepEqual(e8.parameters.packages, ['numpy']);
  assert.ok(e8.parameters.packages.length > 0);
  assert.equal(e8.expectedAnswer.kind, 'reference-solver');
  // reference solver exists and encodes the shape contract
  assert.match(e8.expectedAnswer.referenceSolver, /assert A\.ndim == 2 and v\.ndim == 1 and A\.shape\[1\] == v\.shape\[0\]/);
  assert.match(e8.expectedAnswer.referenceSolver, /return A @ v/);
  // deterministic tests: built-in w05-e8 block (no parameters.tests override)
  const tests = buildPythonTests(e8);
  assert.equal(typeof tests, 'string');
  assert.ok(tests.trim().length > 0, 'e8 must resolve non-empty tests');
  assert.match(tests, /matvec/);
  assert.match(tests, /AssertionError/);
  assert.match(tests, /np\.asarray/);
  assert.match(tests, /Unbekannte Instanz/); // hardcoded-solution guard
});

test('final-boss definition declares non-empty deterministic tests, packages and a reference solution', () => {
  const boss = loadDef('final-boss.json');
  assert.equal(boss.definitionId, 'f-linalg-final-boss-01');
  assert.equal(boss.activityType, 'python-code');
  assert.equal(boss.graderId, 'pyodide');
  assert.ok(boss.parameters.tests.trim().length > 0, 'parameters.tests must not be empty');
  assert.deepEqual(boss.parameters.packages, ['numpy']);
  for (const fn of ['shape_safe_matmul', 'gauss_rank', 'solve_system']) {
    assert.ok(boss.parameters.tests.includes(fn), `tests must exercise ${fn}`);
    assert.ok(boss.expectedAnswer.requiredFunctions.includes(fn), `requiredFunctions must list ${fn}`);
    assert.ok(boss.fullSolution.includes(`def ${fn}(`), `fullSolution must contain reference ${fn}`);
  }
  assert.match(boss.parameters.tests, /inkompatible Shapes abgelehnt/);
  assert.ok((boss.parameters.tests.match(/__check\(/g) || []).length >= 6);
});

// --- 5. exercise-definitions/linear-algebra: single-choice grading -----------

test('linalg single-choice definitions grade the authored answer correct and every distractor wrong', async () => {
  const files = {
    'column-choice.json': 'f-linalg-column-choice-01',
    'shape-debug.json': 'f-linalg-shape-debug-01',
    'rank-system-debug.json': 'f-linalg-rank-system-debug-01',
    'gauss-operation-choice.json': 'f-gauss-operation-choice-01',
  };
  for (const [file, definitionId] of Object.entries(files)) {
    const def = loadDef(file);
    assert.equal(def.definitionId, definitionId, file);
    assert.equal(def.activityType, 'single-choice', file);
    assert.equal(def.graderId, 'deterministic', file);
    // exactly one authored correct choice, consistent with expectedAnswer
    const marked = def.choices.filter((c) => c.correct);
    assert.equal(marked.length, 1, `${file} needs exactly one correct choice`);
    assert.equal(marked[0].id, def.expectedAnswer.choiceId, `${file} choice marks vs expectedAnswer`);

    const right = await grade(def, def.expectedAnswer.choiceId);
    assert.equal(right.correct, true, `${file} authored answer`);
    assert.equal(right.errorType, null);
    for (const choice of def.choices) {
      if (choice.id === def.expectedAnswer.choiceId) continue;
      const wrong = await grade(def, choice.id);
      assert.equal(wrong.correct, false, `${file} ${choice.id}`);
      assert.equal(wrong.errorType, 'wrong-choice', `${file} ${choice.id}`);
    }
    const unknown = await grade(def, 'does-not-exist');
    assert.equal(unknown.correct, false, file);
    assert.equal(unknown.errorType, 'invalid-input', `${file} unknown choice id`);
  }
});

// --- 6. column-vector: genColumnCombination instantiation contract ----------

test('column-vector: default seed reproduces the documented instance, other seeds do not', async () => {
  const def = loadDef('column-vector.json');
  assert.equal(def.definitionId, 'f-linalg-column-vector-01');
  assert.equal(def.activityType, 'vector');
  assert.equal(def.graderId, 'deterministic');
  assert.equal(def.generatorId, 'genColumnCombination');
  assert.equal(def.deterministicSeed, 5601);

  // documented instance in the JSON: A=[[1,-1],[3,-4]], b=[6,17], solution [7,1]
  assert.deepEqual(def.parameters, { A: [[1, -1], [3, -4]], b: [6, 17] });
  assert.deepEqual(def.expectedAnswer.solution, [7, 1]);
  // independent math check of the documented instance
  assert.notEqual(det2(def.parameters.A, 0, 1, 0, 1), 0);
  assert.deepEqual(naiveMatvec(def.parameters.A, [7, 1]), def.parameters.b);

  const inst = instantiateLegacyExercise(def);
  assert.equal(inst.instanceId, 'f-linalg-column-vector-01:5601');
  assert.equal(inst.seed, 5601);
  assert.equal(inst.deterministicSeed, 5601);
  assert.deepEqual(inst.parameters, def.parameters, 'default seed must reproduce documented parameters');
  assert.deepEqual(inst.expectedAnswer.solution, [7, 1]);
  assert.deepEqual(inst.expectedAnswer.value, [7, 1]);
  assert.equal(inst.expectedAnswer.kind, 'integer-pair');
  assert.match(inst.prompt, /Spalten von A/); // generator prompt replaces the authored one
  // instantiation must not mutate the definition
  assert.deepEqual(def.parameters, { A: [[1, -1], [3, -4]], b: [6, 17] });

  const right = await grade(inst, '(7, 1)');
  assert.equal(right.correct, true);
  const swapped = await grade(inst, '(1, 7)');
  assert.equal(swapped.correct, false);
  assert.equal(swapped.errorType, 'swapped');
  const wrong = await grade(inst, '2, 3');
  assert.equal(wrong.correct, false);
  assert.equal(wrong.errorType, 'wrong-value');

  // a different seed yields a different documented instance that still grades
  const other = instantiateLegacyExercise(def, 9211);
  assert.notDeepEqual(other.parameters, def.parameters, 'seed 9211 must differ from seed 5601');
  assert.deepEqual(naiveMatvec(other.parameters.A, other.expectedAnswer.solution), other.parameters.b);
  assert.equal((await grade(other, other.expectedAnswer.solution.join(','))).correct, true);
});

// --- 7. generator solver independence (50 seeds, independent re-derivation) ---

test('genMatmulEntry/genDot/genLinear2/genIndependence/genRank3: expected matches independent solvers over 50 seeds', () => {
  const seeds = Array.from({ length: 50 }, (_, i) => 1 + i * 41);
  for (const seed of seeds) {
    // genMatmulEntry
    const mm = genMatmulEntry(seed);
    const { A, B, entry } = mm.parameters;
    const C = naiveMatmul(A, B);
    assert.equal(mm.expected, C[entry[0] - 1][entry[1] - 1], `genMatmulEntry seed ${seed}`);
    for (const i of [0, 1]) {
      assert.ok(Number.isInteger(entry[i]) && entry[i] >= 1 && entry[i] <= 2, `genMatmulEntry entry range seed ${seed}`);
    }
    for (const row of A) for (const v of row) {
      assert.ok(Number.isInteger(v) && v !== 0 && Math.abs(v) <= 4, `genMatmulEntry A bound seed ${seed}`);
    }
    for (const row of B) for (const v of row) {
      assert.ok(Number.isInteger(v) && v !== 0 && Math.abs(v) <= 3, `genMatmulEntry B bound seed ${seed}`);
    }
    for (const row of C) for (const v of row) assert.ok(Math.abs(v) <= 50, `genMatmulEntry |c|<=50 seed ${seed} got ${v}`);

    // genDot
    const dp = genDot(seed);
    assert.equal(dp.expected, naiveDot(dp.parameters.u, dp.parameters.v), `genDot seed ${seed}`);
    assert.equal(dp.parameters.u.length, 3);
    for (const x of [...dp.parameters.u, ...dp.parameters.v]) {
      assert.ok(Number.isInteger(x) && x !== 0 && Math.abs(x) <= 5, `genDot bound seed ${seed}`);
    }

    // genLinear2: unique integer solution — det != 0 and A*expected === b
    const l2 = genLinear2(seed);
    const { A: LA, b: lb } = l2.parameters;
    assert.notEqual(det2(LA, 0, 1, 0, 1), 0, `genLinear2 det seed ${seed}`);
    assert.deepEqual(naiveMatvec(LA, l2.expected), lb, `genLinear2 A*expected===b seed ${seed}`);
    for (const x of l2.expected) {
      assert.ok(Number.isInteger(x) && Math.abs(x) <= 9, `genLinear2 solution bound seed ${seed}`);
    }
    for (const row of LA) for (const v of row) assert.ok(Number.isInteger(v) && v !== 0 && Math.abs(v) <= 4, `genLinear2 A bound seed ${seed}`);
    for (const v of lb) assert.ok(Math.abs(v) <= 72, `genLinear2 b bound seed ${seed} got ${v}`);

    // genIndependence: dependent <=> det(b1,b2) === 0 for nonzero b1
    const ind = genIndependence(seed);
    const [b1, b2] = ind.parameters.vectors;
    for (const x of b1) assert.ok(Number.isInteger(x) && x !== 0 && Math.abs(x) <= 3, `genIndependence b1 seed ${seed}`);
    assert.equal(det2([b1, b2], 0, 1, 0, 1) === 0, ind.expected.dependent, `genIndependence det<->flag seed ${seed}`);
    assert.ok(b2[0] !== 0 || b2[1] !== 0, `genIndependence b2 nonzero seed ${seed}`);

    // genRank3: rank via minors agrees, rank stays in {1,2,3}
    const rk = genRank3(seed);
    const RA = rk.parameters.A;
    assert.equal(RA.length, 3);
    for (const row of RA) {
      assert.equal(row.length, 3);
      for (const v of row) assert.ok(Number.isInteger(v) && Math.abs(v) <= 12, `genRank3 entry bound seed ${seed} got ${v}`);
    }
    assert.equal(rk.expected, rankByMinors3(RA), `genRank3 independent rank seed ${seed}`);
    assert.ok(rk.expected >= 1 && rk.expected <= 3, `genRank3 rank range seed ${seed}`);
    assert.equal(rk.parameters.expectedRank, rk.expected, `genRank3 expectedRank param seed ${seed}`);
  }
});

// --- 8. seed stability and spread ---------------------------------------------

test('generators are seed-stable: same seed, identical instance (200 seeds each)', () => {
  const generators = { genMatmulEntry, genDot, genLinear2, genIndependence, genRank3 };
  for (const [name, generator] of Object.entries(generators)) {
    for (let seed = 1; seed <= 200; seed++) {
      assert.deepEqual(generator(seed), generator(seed), `${name} seed ${seed} not reproducible`);
    }
  }
});

test('genMatmulEntry and genDot produce more than 20 distinct expected values over 200 seeds', (t) => {
  const seeds = Array.from({ length: 200 }, (_, i) => i + 1);
  const distinct = (values) => new Set(values.map((v) => JSON.stringify(v))).size;

  const mmExpected = seeds.map((s) => genMatmulEntry(s).expected);
  const dotExpected = seeds.map((s) => genDot(s).expected);
  assert.ok(distinct(mmExpected) > 20, `genMatmulEntry only ${distinct(mmExpected)} distinct expected values`);
  assert.ok(distinct(dotExpected) > 20, `genDot only ${distinct(dotExpected)} distinct expected values`);

  // distribution documentation only (known open topic — no threshold asserted):
  const rankDist = {};
  const indepDist = { dependent: 0, independent: 0 };
  const l2Expected = new Set();
  for (const s of seeds) {
    const rk = genRank3(s).expected;
    rankDist[rk] = (rankDist[rk] || 0) + 1;
    indepDist[genIndependence(s).expected.dependent ? 'dependent' : 'independent'] += 1;
    l2Expected.add(JSON.stringify(genLinear2(s).expected));
  }
  t.diagnostic(`genRank3 rank distribution over 200 seeds: ${JSON.stringify(rankDist)}`);
  t.diagnostic(`genIndependence distribution over 200 seeds: ${JSON.stringify(indepDist)}`);
  t.diagnostic(`genLinear2 distinct expected pairs over 200 seeds: ${l2Expected.size} (documentation only)`);
  t.diagnostic(`genMatmulEntry distinct: ${distinct(mmExpected)}, genDot distinct: ${distinct(dotExpected)}`);
});

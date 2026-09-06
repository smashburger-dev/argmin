// Property-based tests for the week-1 generators (Abruf-Algebra) and their
// grader wiring. Run: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  rng, W01_SEED_GENERATORS, genLinearEquation, genLinearBothSides, genPowerExpr, genLogExpr,
  solveLinearEquation, solveLinearEquationBothSides, logInt,
} from '../assets/js/core/w01_generators.mjs';
import { graders } from '../assets/js/core/graders.js';
import { legacyOracle } from './helpers/legacy_oracle.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// --- determinism ----------------------------------------------------------------

test('w01 rng is identical to the w05 mulberry32 (same seed, same sequence)', async () => {
  const { rng: rng05 } = await import('../assets/js/core/w05_generators.mjs');
  const a = rng(1234), b = rng05(1234);
  for (let i = 0; i < 20; i++) assert.equal(a(), b());
});

test('same seed produces the identical prompt and expected value (all generators)', () => {
  for (const gen of Object.values(W01_SEED_GENERATORS)) {
    for (const seed of [1, 7, 42, 811, 822, 833, 999999]) {
      assert.deepEqual(gen(seed), gen(seed), `${gen.name} seed ${seed}`);
    }
  }
});

test('different seeds produce different prompts at least once in 20 seeds', () => {
  for (const gen of Object.values(W01_SEED_GENERATORS)) {
    const prompts = new Set();
    for (let seed = 1; seed <= 20; seed++) prompts.add(gen(seed).prompt);
    assert.ok(prompts.size >= 10, `${gen.name}: only ${prompts.size} distinct prompts in 20 seeds`);
  }
});

// --- invariants over 200 seeds (documented in authoring-guide §8) ------------------

test('genLinearEquation: 200 seeds, integer solution in [-9,9], no division by zero, solver agrees', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const { parameters: p, expected, prompt } = genLinearEquation(seed);
    assert.ok(Number.isInteger(expected), `seed ${seed}: expected not integer`);
    assert.ok(expected >= -9 && expected <= 9, `seed ${seed}: x=${expected} out of range`);
    assert.ok(typeof prompt === 'string' && prompt.includes('x'), `seed ${seed}: prompt malformed`);
    if (p.shape === 'simple') {
      assert.ok(p.a !== 0);
      assert.equal(solveLinearEquation(p.a, p.b, p.c), expected);
      assert.equal(p.a * expected + p.b, p.c); // the equation actually holds
    } else {
      assert.ok(p.a !== 0 && p.a !== p.c, `seed ${seed}: a===c would divide by zero`);
      assert.equal(solveLinearEquationBothSides(p.a, p.b, p.c, p.d), expected);
      assert.equal(p.a * expected + p.b, p.c * expected + p.d); // holds
    }
    // mental-math bound: all printed coefficients stay small
    for (const v of [p.a, p.b]) assert.ok(Math.abs(v) <= 12, `seed ${seed}: coefficient ${v}`);
  }
});

test('genLinearBothSides: 300 seeds keep an integer solution and solver agreement', () => {
  for (let seed = 1; seed <= 300; seed++) {
    const first = genLinearBothSides(seed);
    assert.deepEqual(first, genLinearBothSides(seed));
    const { a, b, c, d } = first.parameters;
    assert.notEqual(a, c);
    assert.equal(solveLinearEquationBothSides(a, b, c, d), first.expected);
    assert.equal(a * first.expected + b, c * first.expected + d);
  }
});

test('genPowerExpr: 200 seeds, exponent answer in range, laws hold, bases in {2,3,5,10}', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const { parameters: p, expected, prompt } = genPowerExpr(seed);
    assert.ok([2, 3, 5, 10].includes(p.base), `seed ${seed}: base ${p.base}`);
    if (p.shape === 'product') {
      assert.equal(expected, p.m + p.n);
      assert.ok(p.m + p.n <= 8, `seed ${seed}: m+n=${p.m + p.n} not hand-computable`);
      assert.equal(p.base ** expected, p.base ** p.m * p.base ** p.n); // law verified numerically
    } else {
      assert.equal(expected, p.m * p.k);
      assert.ok(p.m * p.k <= 10, `seed ${seed}: m*k=${p.m * p.k} not hand-computable`);
      assert.equal(p.base ** expected, (p.base ** p.m) ** p.k);
    }
    assert.ok(prompt.includes(`${p.base}^`) || prompt.includes(`${p.base})^`), `seed ${seed}: prompt misses base`);
  }
});

test('genLogExpr: 200 seeds, argument > 0 and exact power, result integer, arg <= 10000', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const { parameters: p, expected, prompt } = genLogExpr(seed);
    assert.ok(expected >= 1 && Number.isInteger(expected), `seed ${seed}`);
    if (p.shape === 'single') {
      assert.equal(expected, logInt(p.base, p.base ** p.k));
      assert.ok(p.base ** p.k <= 10000, `seed ${seed}: argument too large`);
    } else {
      assert.equal(expected, p.m + p.n);
      assert.ok(p.base ** p.m <= 10000 && p.base ** p.n <= 10000, `seed ${seed}: argument too large`);
    }
    // argument strictly positive and a true power of the base
    assert.ok((p.base ** (p.shape === 'single' ? p.k : p.m)) > 0);
    assert.ok(prompt.includes('log'), `seed ${seed}: prompt misses log`);
  }
});

// --- grader wiring: 20 seeds per generator against the REAL deterministic grader ----

test('seeded numeric exercises grade correctly against the deterministic grader (20 seeds each)', async () => {
  const cases = [
    ['genLinearEquation', genLinearEquation],
    ['genPowerExpr', genPowerExpr],
    ['genLogExpr', genLogExpr],
  ];
  for (const [name, gen] of cases) {
    for (let i = 0; i < 20; i++) {
      const seed = 1 + i * 137; // spread across the space
      const inst = gen(seed);
      const exercise = {
        exerciseId: `probe-${name}`, type: 'numeric', grader: 'deterministic',
        deterministicSeed: seed, parameters: { seedGenerator: name },
      };
      const right = await graders.deterministic.grade(exercise, String(inst.expected));
      assert.equal(right.correct, true, `${name} seed ${seed}: correct answer graded wrong`);
      const wrong = await graders.deterministic.grade(exercise, String(inst.expected + 1));
      assert.equal(wrong.correct, false, `${name} seed ${seed}: wrong answer graded correct`);
    }
  }
});

test('seeded grader path: a re-rolled seed changes the expected value (runtime contract)', async () => {
  const a = genLinearEquation(811), b = genLinearEquation(812);
  const exercise = { exerciseId: 'probe-reroll', type: 'numeric', grader: 'deterministic',
    deterministicSeed: 811, parameters: { seedGenerator: 'genLinearEquation' } };
  const before = await graders.deterministic.grade(exercise, String(a.expected));
  const after = await graders.deterministic.grade(
    { ...exercise, deterministicSeed: 812 }, String(a.expected));
  if (a.expected !== b.expected) {
    assert.equal(before.correct, true);
    assert.equal(after.correct, false, 'old answer must not satisfy the new seed');
  }
});

// --- edge cases -------------------------------------------------------------------

test('w01-e1 fixed diagnose instance grades through the real grader (expectedAnswer.value authoritative)', async () => {
  const week = legacyOracle.weeks.w01;
  const e1 = week.exercises.find((e) => e.exerciseId === 'w01-e1');
  // consistency: parameters must actually solve to the documented value
  assert.equal(solveLinearEquation(e1.parameters.a, e1.parameters.b, e1.parameters.c), e1.expectedAnswer.value);
  const right = await graders.deterministic.grade(e1, String(e1.expectedAnswer.value));
  assert.equal(right.correct, true);
  const wrong = await graders.deterministic.grade(e1, '3');
  assert.equal(wrong.correct, false);
  assert.match(wrong.diagnosis || '', /Rechenweg|35/); // authored feedbackRule fires
});

test('reference solvers throw on the degenerate cases generators exclude', () => {
  assert.throws(() => solveLinearEquation(0, 1, 5), /division/);
  assert.throws(() => solveLinearEquationBothSides(3, 1, 3, 5), /division/);
  assert.throws(() => logInt(2, 5), /Logarithmus/); // 5 is no power of 2
  assert.equal(logInt(10, 1000), 3);
});

// --- w01.json consistency: documented prompts/seeds match the generators -----------

test('w01.json seeded exercises match generator output for their documented seed', () => {
  const week = legacyOracle.weeks.w01;
  const by = Object.fromEntries(week.exercises.map((e) => [e.exerciseId, e]));
  for (const [id, genName] of [['w01-e8', 'genLinearEquation'], ['w01-e9', 'genPowerExpr'], ['w01-e10', 'genLogExpr']]) {
    const e = by[id];
    const inst = W01_SEED_GENERATORS[genName](e.deterministicSeed);
    assert.equal(e.parameters.seedGenerator, genName);
    assert.equal(e.prompt, inst.prompt, `${id}: documented prompt is stale (seed drift)`);
    assert.equal(e.expectedAnswer.defaultSeed, e.deterministicSeed);
    assert.equal(e.expectedAnswer.defaultExpected, inst.expected, `${id}: documented default expected drift`);
  }
  // diagnose tasks refuse mastery on the exercise level (authoring-guide §5)
  assert.equal(by['w01-e1'].masteryEligible, false);
  assert.equal(by['w01-e2'].masteryEligible, false);
  // gate evidence must be mastery-capable types
  const cur = JSON.parse(readFileSync(join(root, 'content/curriculum.json'), 'utf8'));
  const w1 = cur.weeks.find((w) => w.weekId === 'w01');
  for (const id of w1.gate.evidenceExerciseIds) {
    assert.equal(by[id].masteryEligible, undefined, `${id}: gate evidence must not carry masteryEligible:false`);
    assert.notEqual(by[id].grader, 'manual-rubric');
  }
  // minutes: exercises nested inside the 600-minute unit budget (w05 pattern)
  const unitSum = w1.learningUnits.reduce((s, u) => s + u.minutes, 0);
  assert.equal(unitSum, 600);
});

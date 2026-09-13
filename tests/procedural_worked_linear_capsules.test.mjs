// Procedural family worked-example-fading-linear-equations: capsule gates,
// including the challenge-profile case fade-two-sided (a*x + b = c*x + d —
// six signed gaps over two separate equivalence steps; the sign decision on
// the operations and the merged coefficient stays with the learner).
// Run: node --test tests/procedural_worked_linear_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as mod from '../assets/js/core/procedural/worked-example-fading-linear-equations.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const doc = JSON.parse(readFileSync(join(root, 'content/families/worked-example-fading-linear-equations.json'), 'utf8'));

const ONE_SIDED_CASES = doc.cases.filter((item) => item.caseId !== 'fade-two-sided').map((item) => item.caseId);

test('anchor: contract null, doc bodies are solver-consistent', () => {
  assert.equal(doc.contract, null);
  assert.equal(doc.cases.length, 4);
  for (const docCase of doc.cases) {
    // The doc mirrors ONE captured draw — the honest invariant is that the
    // mirrored body solves itself and fits the capsule shape.
    assert.ok(mod.linearFadingParamsOk(docCase.parameters), `${docCase.caseId}: shape`);
    const solved = mod.solveWorkedLinearFading(docCase.parameters);
    assert.deepEqual(solved.answers, docCase.expected.gaps.map((gap) => gap.answer), `${docCase.caseId}: Solver`);
    const markers = docCase.prompt.split('[[gap]]').length - 1;
    assert.equal(markers, docCase.expected.gaps.length, `${docCase.caseId}: Marker`);
  }
  const twoSided = doc.cases.find((item) => item.caseId === 'fade-two-sided');
  assert.equal(twoSided.challengeEligible, true, 'two-sided: challenge flag');
  assert.equal(twoSided.difficultyProfile, 'challenge', 'two-sided: profile');
  const seed0 = mod.generateWorkedLinearFadingFamily({ seed: 0, caseId: 'fade-two-sided', difficulty: 'challenge' });
  assert.deepEqual(twoSided.parameters, seed0.parameters, 'two-sided: parameters = seed 0');
  assert.equal(twoSided.prompt, seed0.prompt, 'two-sided: prompt = seed 0');
  assert.equal(twoSided.fullSolution, seed0.fullSolution, 'two-sided: solution = seed 0');
});

test('two-sided: mutual gate between case and challenge profile', () => {
  for (const caseId of ONE_SIDED_CASES) {
    assert.throws(
      () => mod.generateWorkedLinearFadingFamily({ seed: 0, caseId, difficulty: 'challenge' }),
      /Unbekannter Fall/,
      `${caseId}@challenge darf nicht instanziieren`,
    );
  }
  for (const difficulty of ['intro', 'core', 'stretch']) {
    assert.throws(
      () => mod.generateWorkedLinearFadingFamily({ seed: 0, caseId: 'fade-two-sided', difficulty }),
      /Unbekannter Fall/,
      `two-sided@${difficulty} darf nicht instanziieren`,
    );
  }
});

test('two-sided challenge: 200 seeds — six gaps, solver agrees, invariants hold', () => {
  const seen = new Set();
  let negativeC = 0;
  let negativeM = 0;
  let halfX = 0;
  for (let seed = 0; seed < 200; seed += 1) {
    const inst = mod.generateWorkedLinearFadingFamily({ seed, caseId: 'fade-two-sided', difficulty: 'challenge' });
    const p = inst.parameters;
    assert.ok(mod.linearFadingParamsOk(p), `${seed}: shape`);
    const gaps = inst.expected.gaps;
    assert.equal(gaps.length, 6, `${seed}: sechs Lücken`);
    const markers = inst.prompt.split('[[gap]]').length - 1;
    assert.equal(markers, 6, `${seed}: Marker-Anzahl`);
    const solved = mod.solveWorkedLinearFading(p);
    assert.deepEqual(solved.answers, gaps.map((gap) => gap.answer), `${seed}: Solver`);
    // Draw invariants: a != c (unique solution), nontrivial coefficients,
    // d == b + (a-c)*x2/2 so the last line divides into integer/half x.
    assert.notEqual(p.a, p.c, `${seed}: a != c`);
    assert.notEqual(Math.abs(p.a - p.c), 1, `${seed}: |a-c| != 1`);
    assert.ok(Math.abs(p.c) >= 2, `${seed}: |c| >= 2`);
    assert.notEqual(p.b, 0, `${seed}: b != 0`);
    assert.notEqual(p.d, 0, `${seed}: d != 0`);
    assert.equal((p.a - p.c) * p.x2, 2 * (p.d - p.b), `${seed}: Konsistenz`);
    assert.equal(gaps[0].answer, String(-p.c), `${seed}: opx = -c`);
    assert.equal(gaps[1].answer, String(p.a - p.c), `${seed}: coef`);
    assert.equal(gaps[2].answer, String(-p.b), `${seed}: opc = -b`);
    assert.equal(gaps[4].answer, String(p.d - p.b), `${seed}: m2 = d-b`);
    seen.add(JSON.stringify(p));
    if (p.c < 0) negativeC += 1;
    if (p.d - p.b < 0) negativeM += 1;
    if (p.x2 % 2 !== 0) halfX += 1;
  }
  assert.ok(seen.size >= 100, `nur ${seen.size} distinct draws`);
  // The sign decision must actually occur — without negative draws the
  // signed gaps would be vacuous; half-integer x must show up too.
  assert.ok(negativeC > 0 && negativeM > 0 && halfX > 0, `keine Vorzeichen-/Halbwert-Varianz (${negativeC}/${negativeM}/${halfX})`);
});

test('two-sided challenge: deterministic across regeneration', () => {
  const a = mod.generateWorkedLinearFadingFamily({ seed: 42, caseId: 'fade-two-sided', difficulty: 'challenge' });
  const b = mod.generateWorkedLinearFadingFamily({ seed: 42, caseId: 'fade-two-sided', difficulty: 'challenge' });
  assert.deepEqual(a, b);
});

test('one-sided capsules keep their profile mapping', () => {
  for (const { caseId, difficultyProfile: difficulty } of doc.cases.filter((item) => item.caseId !== 'fade-two-sided')) {
    const inst = mod.generateWorkedLinearFadingFamily({ seed: 5, caseId, difficulty });
    assert.ok(inst.expected.gaps.length >= 1);
    const solved = mod.solveWorkedLinearFading(inst.parameters);
    assert.deepEqual(solved.answers, inst.expected.gaps.map((gap) => gap.answer), `${caseId}: Solver`);
  }
});

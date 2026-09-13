// Procedural family worked-example-fading-distributive: capsule gates,
// including the challenge-profile case distribute-double-gap (plan v3:
// challenge fading = 5-8 gaps over genuinely separate reasoning stages).
// Run: node --test tests/procedural_worked_fading_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as mod from '../assets/js/core/procedural/worked-example-fading-distributive.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const doc = JSON.parse(readFileSync(join(root, 'content/families/worked-example-fading-distributive.json'), 'utf8'));

const SINGLE_CASES = doc.cases.filter((item) => item.caseId !== 'distribute-double-gap').map((item) => item.caseId);

test('anchor: contract null, doc bodies are solver-consistent', () => {
  assert.equal(doc.contract, null);
  assert.equal(doc.cases.length, 4);
  for (const docCase of doc.cases) {
    // The doc mirrors ONE captured draw, not seed 0 — the honest invariant
    // is that the mirrored body solves itself and fits the capsule shape.
    assert.ok(mod.distributiveFadingParamsOk(docCase.parameters), `${docCase.caseId}: shape`);
    const solved = mod.solveWorkedDistributiveFading(docCase.parameters);
    assert.deepEqual(solved.answers, docCase.expected.gaps.map((gap) => gap.answer), `${docCase.caseId}: Solver`);
    const markers = docCase.prompt.split('[[gap]]').length - 1;
    assert.equal(markers, docCase.expected.gaps.length, `${docCase.caseId}: Marker`);
  }
});

test('double-gap: mutual gate between case and challenge profile', () => {
  for (const caseId of SINGLE_CASES) {
    assert.throws(
      () => mod.generateWorkedDistributiveFadingFamily({ seed: 0, caseId, difficulty: 'challenge' }),
      /Unbekannter Fall/,
      `${caseId}@challenge darf nicht instanziieren`,
    );
  }
  for (const difficulty of ['intro', 'core', 'stretch']) {
    assert.throws(
      () => mod.generateWorkedDistributiveFadingFamily({ seed: 0, caseId: 'distribute-double-gap', difficulty }),
      /Unbekannter Fall/,
      `double@${difficulty} darf nicht instanziieren`,
    );
  }
});

test('double-gap challenge: 200 seeds — six gaps, solver agrees, shape holds', () => {
  const seen = new Set();
  let negativeIn1 = 0;
  let negativeConstSum = 0;
  for (let seed = 0; seed < 200; seed += 1) {
    const inst = mod.generateWorkedDistributiveFadingFamily({ seed, caseId: 'distribute-double-gap', difficulty: 'challenge' });
    assert.ok(mod.distributiveFadingParamsOk(inst.parameters), `${seed}: shape`);
    const gaps = inst.expected.gaps;
    assert.equal(gaps.length, 6, `${seed}: sechs Lücken`);
    const markers = inst.prompt.split('[[gap]]').length - 1;
    assert.equal(markers, 6, `${seed}: Marker-Anzahl`);
    const solved = mod.solveWorkedDistributiveFading(inst.parameters);
    assert.deepEqual(solved.answers, gaps.map((gap) => gap.answer), `${seed}: Solver`);
    const { a, p, q, c, m, n } = inst.parameters;
    assert.equal(gaps[0].answer, String(a * p), `${seed}: lead1`);
    assert.equal(gaps[1].answer, String(a * q), `${seed}: in1 vorzeichenbehaftet`);
    assert.equal(gaps[4].answer, String(a * p + c * m), `${seed}: leadSum`);
    assert.equal(gaps[5].answer, String(a * q + c * n), `${seed}: constSum vorzeichenbehaftet`);
    seen.add(JSON.stringify(inst.parameters));
    if (Number(gaps[1].answer) < 0) negativeIn1 += 1;
    if (Number(gaps[5].answer) < 0) negativeConstSum += 1;
  }
  assert.ok(seen.size >= 100, `nur ${seen.size} distinct draws`);
  // The sign decision must actually occur — without negative draws the
  // sign-bearing gaps would be vacuous.
  assert.ok(negativeIn1 > 0 && negativeConstSum > 0, `keine negativen Lückenwerte gezogen (${negativeIn1}/${negativeConstSum})`);
});

test('double-gap challenge: deterministic across regeneration', () => {
  const a = mod.generateWorkedDistributiveFadingFamily({ seed: 42, caseId: 'distribute-double-gap', difficulty: 'challenge' });
  const b = mod.generateWorkedDistributiveFadingFamily({ seed: 42, caseId: 'distribute-double-gap', difficulty: 'challenge' });
  assert.deepEqual(a, b);
});

test('single-bracket capsules keep their profile mapping', () => {
  for (const { caseId, difficultyProfile: difficulty } of doc.cases.filter((item) => item.caseId !== 'distribute-double-gap')) {
    const inst = mod.generateWorkedDistributiveFadingFamily({ seed: 5, caseId, difficulty });
    assert.ok(inst.expected.gaps.length >= 1);
    const solved = mod.solveWorkedDistributiveFading(inst.parameters);
    assert.deepEqual(solved.answers, inst.expected.gaps.map((gap) => gap.answer), `${caseId}: Solver`);
  }
});

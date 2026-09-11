// Procedural family construct-freeze-assert-guard: capsule gates.
// Run: node --test tests/procedural_freeze_guard_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FAMILY_SPEC,
  FREEZE_GUARD_CASES,
  FREEZE_GUARD_CONTRACT,
  freezeCaseOk,
  genFreezeGuardCase,
  generateFreezeGuardFamily,
  solveFreezeGuardFamily,
} from '../assets/js/core/procedural/construct-freeze-assert-guard.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PARSONS = FREEZE_GUARD_CASES['freeze-assert-parsons'];
const DEMO = FREEZE_GUARD_CASES['demo-from-frozen-report'];
const PARSONS_POOL = [...PARSONS.solutionOrder, ...PARSONS.distractors];
const drawParsons = (seed) => generateFreezeGuardFamily({ seed, caseId: 'freeze-assert-parsons', difficulty: 'stretch' });
const drawDemo = (seed) => generateFreezeGuardFamily({ seed, caseId: 'demo-from-frozen-report', difficulty: 'core' });

test('anchor: contract null, both cases preserved verbatim', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/construct-freeze-assert-guard.json'), 'utf8'));
  assert.equal(doc.contract, null);
  assert.equal(doc.cases.length, 2);
  const parsons = doc.cases.find((item) => item.caseId === 'freeze-assert-parsons');
  const demo = doc.cases.find((item) => item.caseId === 'demo-from-frozen-report');
  assert.ok(parsons && demo, 'anchors missing');
  assert.deepEqual(PARSONS.fragments, parsons.parameters.fragments, 'parsons: fragments verbatim');
  assert.deepEqual(PARSONS.solutionOrder, parsons.expected.solutionOrder, 'parsons: order verbatim');
  assert.deepEqual(PARSONS.distractors, parsons.expected.distractors, 'parsons: distractors verbatim');
  assert.equal(PARSONS.prompt, parsons.prompt, 'parsons: prompt verbatim');
  assert.equal(PARSONS.fullSolution, parsons.fullSolution, 'parsons: solution verbatim');
  assert.equal(DEMO.starterCode, demo.parameters.starterCode, 'demo: starter verbatim');
  assert.equal(DEMO.baseTests, demo.parameters.tests, 'demo: base tests verbatim');
  assert.equal(DEMO.referenceSolver, demo.expected.referenceSolver, 'demo: solver verbatim');
  assert.equal(DEMO.prompt, demo.prompt, 'demo: prompt verbatim');
  assert.equal(DEMO.fullSolution, demo.fullSolution, 'demo: solution verbatim');
});

test('capsule shape: generated instances satisfy freezeCaseOk over 200 seeds per case', () => {
  for (let seed = 0; seed < 200; seed += 1) {
    const parsons = drawParsons(seed);
    assert.ok(freezeCaseOk(parsons.parameters, PARSONS), `parsons:${seed}: shape`);
    assert.deepEqual(parsons.parameters.fragments, PARSONS.fragments);
    const order = parsons.parameters.initialOrder;
    assert.deepEqual([...order].sort(), [...PARSONS_POOL].sort(), `parsons:${seed}: permutation of pool`);
    assert.ok(order.some((id, index) => id !== PARSONS_POOL[index]), `parsons:${seed}: non-identity order`);
    assert.equal(parsons.expected.kind, 'ordered-lines');
    assert.deepEqual(parsons.expected.solutionOrder, PARSONS.solutionOrder);
    assert.equal(parsons.activityType, 'parsons');
    assert.equal(parsons.graderId, 'deterministic');
    const demo = drawDemo(seed);
    assert.ok(freezeCaseOk(demo.parameters, DEMO), `demo:${seed}: shape`);
    assert.ok(demo.parameters.tests.startsWith(DEMO.baseTests), `demo:${seed}: base block kept`);
    assert.ok(demo.parameters.tests.includes('# seeded extra cases'), `demo:${seed}: seeded block`);
    assert.equal(demo.expected.referenceSolver, DEMO.referenceSolver);
    assert.equal(demo.prompt, DEMO.prompt);
    assert.equal(demo.activityType, 'python-code');
    assert.equal(demo.graderId, 'pyodide');
  }
});

test('seeded draws stay inside the declared domains', () => {
  for (let seed = 0; seed < 200; seed += 1) {
    const demo = drawDemo(seed);
    assert.equal(demo.parameters.seedCases.length, 2, `${seed}: two extras`);
    for (const entry of demo.parameters.seedCases) {
      const keys = Object.keys(entry.bericht);
      assert.ok(keys.length >= 2 && keys.length <= 3, `${seed}: bericht has 2-3 metrics`);
      assert.ok(Object.values(entry.bericht).every((v) => Number.isFinite(v) && v > 0), `${seed}: positive finite metrics`);
      assert.notDeepEqual(entry.frisch, entry.bericht, `${seed}: mutation keeps bericht != frisch`);
    }
    assert.ok(demo.parameters.tests.includes('__raised'), `${seed}: raise helper emitted`);
    assert.ok(demo.parameters.tests.includes('seeded abweichung'), `${seed}: deviation arm asserted`);
  }
});

test('distinct floor: at least 40 distinct parameter sets per case over 200 seeds', () => {
  const parsonsSeen = new Set();
  const demoSeen = new Set();
  for (let seed = 0; seed < 200; seed += 1) {
    parsonsSeen.add(JSON.stringify(drawParsons(seed).parameters));
    demoSeen.add(JSON.stringify(drawDemo(seed).parameters));
  }
  assert.ok(parsonsSeen.size >= 40, `parsons: only ${parsonsSeen.size} distinct`);
  assert.ok(demoSeen.size >= 40, `demo: only ${demoSeen.size} distinct`);
});

test('determinism: same seed reproduces identical output, negative seeds valid', () => {
  for (let seed = -20; seed < 20; seed += 1) {
    assert.deepEqual(genFreezeGuardCase(seed, PARSONS), genFreezeGuardCase(seed, PARSONS), `parsons:${seed}`);
    assert.ok(freezeCaseOk(genFreezeGuardCase(seed, PARSONS).parameters, PARSONS), `parsons:${seed}: shape`);
    assert.deepEqual(genFreezeGuardCase(seed, DEMO), genFreezeGuardCase(seed, DEMO), `demo:${seed}`);
    assert.ok(freezeCaseOk(genFreezeGuardCase(seed, DEMO).parameters, DEMO), `demo:${seed}: shape`);
  }
});

test('solver consistency: solve returns order for parsons and reference code for demo', () => {
  for (let seed = 0; seed < 50; seed += 1) {
    assert.deepEqual(solveFreezeGuardFamily(drawParsons(seed).parameters), { solutionOrder: PARSONS.solutionOrder });
    assert.deepEqual(solveFreezeGuardFamily(drawDemo(seed).parameters), { referenceCode: DEMO.referenceSolver });
  }
});

test('family block: dispatch, contract, errors', () => {
  assert.equal(FREEZE_GUARD_CONTRACT.familyId, 'construct-freeze-assert-guard');
  assert.equal(FREEZE_GUARD_CONTRACT.familyGroup, 'construct-program');
  assert.equal(FREEZE_GUARD_CONTRACT.authorityMode, 'seeded');
  assert.equal(FREEZE_GUARD_CONTRACT.masteryEligible, true);
  assert.deepEqual(FREEZE_GUARD_CONTRACT.difficultyProfiles, ['core', 'stretch']);
  assert.deepEqual(FREEZE_GUARD_CONTRACT.caseTypes.map((item) => item.caseId).sort(), ['demo-from-frozen-report', 'freeze-assert-parsons']);
  assert.deepEqual(FREEZE_GUARD_CONTRACT.competencyIds, ['c-capstone-pipeline', 'c-python-functions']);
  assert.equal(FAMILY_SPEC.generate, generateFreezeGuardFamily);
  assert.equal(FAMILY_SPEC.solve, solveFreezeGuardFamily);
  assert.throws(() => generateFreezeGuardFamily({ seed: 0, caseId: 'freeze-assert-parsons', difficulty: 'core' }), /Unbekannter Fall/);
  assert.throws(() => generateFreezeGuardFamily({ seed: 0, caseId: 'nope', difficulty: 'stretch' }), /Unbekannter Fall/);
  assert.throws(() => generateFreezeGuardFamily({ seed: 0.5, caseId: 'freeze-assert-parsons', difficulty: 'stretch' }), /Seed/);
  assert.throws(() => solveFreezeGuardFamily({}), /Kapselform/);
});

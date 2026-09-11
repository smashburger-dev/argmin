// Procedural family construct-matvec-shape-contract: capsule gates.
// Mixed family: one parsons case (matvec-contract-order) plus two
// python-code cases — bespoke gates instead of the shared suites.
// Run: node --test tests/procedural_matvec_shape_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as mod from '../assets/js/core/procedural/construct-matvec-shape-contract.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const doc = JSON.parse(readFileSync(join(root, 'content/families/construct-matvec-shape-contract.json'), 'utf8'));

const CASES = [
  { caseId: 'matvec-contract-order', difficulty: 'intro' },
  { caseId: 'matvec-code-reference', difficulty: 'core' },
  { caseId: 'final-boss-authored', difficulty: 'challenge' },
];

test('anchor: contract null, case anchors verbatim', () => {
  assert.equal(doc.contract, null);
  assert.equal(doc.cases.length, 3);
  const order = doc.cases.find((c) => c.caseId === 'matvec-contract-order');
  assert.deepEqual(order.parameters.fragments, mod.MATVEC_CASES['matvec-contract-order'].baseFragments, 'parsons fragments verbatim');
  assert.deepEqual(order.parameters.initialOrder, mod.MATVEC_CASES['matvec-contract-order'].baseInitialOrder, 'parsons initialOrder verbatim');
  assert.equal(order.expected.kind, 'ordered-lines');
  assert.deepEqual(order.expected.solutionOrder, ['p1', 'p2', 'p3', 'p4', 'p5']);
  const ref = doc.cases.find((c) => c.caseId === 'matvec-code-reference');
  const def = mod.MATVEC_CASES['matvec-code-reference'];
  assert.equal(ref.parameters.starterCode, def.starterCode, 'starter verbatim');
  assert.equal(ref.expected.referenceSolver, def.referenceSolver, 'solver verbatim');
  assert.equal(ref.prompt, def.prompt, 'prompt verbatim');
  assert.equal(ref.fullSolution, def.fullSolution, 'solution verbatim');
  const boss = doc.cases.find((c) => c.caseId === 'final-boss-authored');
  const bdef = mod.MATVEC_CASES['final-boss-authored'];
  assert.equal(boss.parameters.tests, bdef.baseTests, 'boss base tests verbatim');
  assert.equal(boss.expected.referenceSolver, bdef.referenceSolver, 'boss solver verbatim');
});

test('parsons capsule: 200 seeds — fragments canonical, order is a real shuffle', () => {
  const def = mod.MATVEC_CASES['matvec-contract-order'];
  const seen = new Set();
  for (let seed = 0; seed < 200; seed += 1) {
    const generated = mod.genMatvecCase(seed, def);
    assert.ok(mod.matvecCaseOk(generated.parameters, def), `${seed}: shape`);
    const d = generated.parameters.fragments.filter((f) => f.id.startsWith('d'));
    assert.equal(d.length, 2, `${seed}: zwei Distraktoren`);
    assert.deepEqual(generated.expected.solutionOrder, ['p1', 'p2', 'p3', 'p4', 'p5']);
    assert.deepEqual(generated.expected.distractors, d.map((f) => f.id));
    assert.equal(generated.parameters.initialOrder.length, 7, `${seed}: sieben Zeilen`);
    seen.add(generated.parameters.initialOrder.join());
  }
  assert.ok(seen.size >= 40, `nur ${seen.size} distincte Reihenfolgen`);
});

test('code capsules: 200 seeds — tests rebuilt, solver consistent', () => {
  for (const item of CASES.slice(1)) {
    const def = mod.MATVEC_CASES[item.caseId];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = mod.genMatvecCase(seed, def);
      assert.ok(mod.matvecCaseOk(generated.parameters, def), `${item.caseId}:${seed}: shape`);
      assert.ok(generated.parameters.tests.startsWith(def.baseTests), `${item.caseId}:${seed}: base block`);
      assert.ok(generated.parameters.tests.includes('# seeded extra cases'), `${item.caseId}:${seed}: seeded block`);
      assert.deepEqual(mod.solveMatvecFamily(generated.parameters), { referenceCode: def.referenceSolver });
      assert.equal(generated.activityType, 'python-code');
      assert.equal(generated.graderId, 'pyodide');
    }
  }
});

test('determinism and dispatch errors', () => {
  for (const item of CASES) {
    const def = mod.MATVEC_CASES[item.caseId];
    for (let seed = -20; seed < 20; seed += 1) {
      assert.deepEqual(mod.genMatvecCase(seed, def), mod.genMatvecCase(seed, def), `${item.caseId}:${seed}`);
    }
    const viaFamily = mod.generateMatvecFamily({ seed: 7, caseId: item.caseId, difficulty: item.difficulty });
    assert.deepEqual(viaFamily, mod.generateMatvecFamily({ seed: 7, caseId: item.caseId, difficulty: item.difficulty }));
  }
  assert.throws(() => mod.generateMatvecFamily({ seed: 0, caseId: 'matvec-contract-order', difficulty: 'core' }), /Unbekannter Fall/);
  assert.throws(() => mod.generateMatvecFamily({ seed: 0, caseId: 'nope', difficulty: 'intro' }), /Unbekannter Fall/);
  assert.throws(() => mod.generateMatvecFamily({ seed: 0.5, caseId: 'matvec-contract-order', difficulty: 'intro' }), /Seed/);
  assert.throws(() => mod.solveMatvecFamily({}), /Kapselform/);
});

test('family block: contract fields match the case bodies', () => {
  assert.equal(mod.MATVEC_CONTRACT.familyId, 'construct-matvec-shape-contract');
  assert.equal(mod.MATVEC_CONTRACT.authorityMode, 'seeded');
  const expectedMastery = doc.cases.some((c) => c.graderId !== 'manual-rubric' && c.masteryEligible === true);
  assert.equal(mod.MATVEC_CONTRACT.masteryEligible, expectedMastery);
  assert.deepEqual(mod.MATVEC_CONTRACT.caseTypes.map((c) => c.caseId), CASES.map((c) => c.caseId));
  assert.equal(mod.FAMILY_SPEC.generate, mod.generateMatvecFamily);
  assert.equal(mod.FAMILY_SPEC.solve, mod.solveMatvecFamily);
});

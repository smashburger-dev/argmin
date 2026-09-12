// Procedural family optimize-gradient-update-rule: capsule gates.
// Mixed family: one single-choice case plus three python-code cases.
// Run: node --test tests/procedural_gradient_update_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as mod from '../assets/js/core/procedural/optimize-gradient-update-rule.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const doc = JSON.parse(readFileSync(join(root, 'content/families/optimize-gradient-update-rule.json'), 'utf8'));

const CODE_CASES = ['fit-linear-gradient-loop', 'head-only-finetune', 'lora-fit-toy'];

test('anchor: contract null, case anchors verbatim', () => {
  assert.equal(doc.contract, null);
  assert.equal(doc.cases.length, 4);
  const sign = doc.cases.find((c) => c.caseId === 'sign-and-scale-of-update');
  assert.deepEqual(sign.parameters, { gradW: 4, lr: 0.1 });
  // base draw parameters must be reachable and correct
  const baseParams = { gradW: 4, lr: 0.1 };
  assert.equal(mod.signCorrectText(baseParams), sign.choices.find((c) => c.correct).text, 'base correct text');
  for (const caseId of CODE_CASES) {
    const body = doc.cases.find((c) => c.caseId === caseId);
    const def = mod.UPDATE_CASES[caseId];
    assert.equal(body.parameters.starterCode, def.starterCode, `${caseId}: starter verbatim`);
    assert.equal(body.parameters.tests, def.baseTests, `${caseId}: base tests verbatim`);
    assert.equal(body.expected.referenceSolver, def.referenceSolver, `${caseId}: solver verbatim`);
    assert.equal(body.prompt, def.prompt, `${caseId}: prompt verbatim`);
    assert.equal(body.fullSolution, def.fullSolution, `${caseId}: solution verbatim`);
  }
});

test('choice capsule: 200 seeds — four distinct options, key matches', () => {
  const def = mod.UPDATE_CASES['sign-and-scale-of-update'];
  const seen = new Set();
  for (let seed = 0; seed < 200; seed += 1) {
    const g = mod.genUpdateCase(seed, def);
    assert.ok(mod.updateCaseOk(g.parameters, def), `${seed}: shape`);
    assert.equal(g.choices.length, 4);
    assert.equal(new Set(g.choices.map((c) => c.text)).size, 4, `${seed}: eindeutige Texte`);
    const correct = g.choices.filter((c) => c.correct);
    assert.equal(correct.length, 1);
    assert.equal(correct[0].text, mod.signCorrectText(g.parameters));
    assert.ok(!g.prompt.includes(correct[0].text.split('—')[0].trim()), `${seed}: Schlüssel im Prompt`);
    seen.add(JSON.stringify([g.parameters, g.choices.map((c) => c.id)]));
  }
  assert.ok(seen.size >= 40, `nur ${seen.size} distinct`);
});

test('code capsules: 200 seeds — tests rebuilt, solver consistent, contract paths', () => {
  for (const caseId of CODE_CASES) {
    const def = mod.UPDATE_CASES[caseId];
    const seen = new Set();
    for (let seed = 0; seed < 200; seed += 1) {
      const g = mod.genUpdateCase(seed, def);
      assert.ok(mod.updateCaseOk(g.parameters, def), `${caseId}:${seed}: shape`);
      assert.ok(g.parameters.tests.startsWith(def.baseTests), `${caseId}:${seed}: base block`);
      assert.ok(g.parameters.tests.includes('# seeded extra cases'), `${caseId}:${seed}: seeded block`);
      assert.ok(g.parameters.tests.includes(`__ref_${def.refNames[0]}`), `${caseId}:${seed}: ref copy`);
      assert.deepEqual(mod.solveUpdateFamily(g.parameters), { referenceCode: def.referenceSolver });
      assert.equal(g.activityType, 'python-code');
      assert.equal(g.graderId, 'pyodide');
      seen.add(JSON.stringify(g.parameters.seedCases));
    }
    assert.ok(seen.size >= 40, `${caseId}: nur ${seen.size} distinct`);
  }
});

test('determinism and dispatch errors', () => {
  for (const caseId of ['sign-and-scale-of-update', ...CODE_CASES]) {
    const def = mod.UPDATE_CASES[caseId];
    for (let seed = -20; seed < 20; seed += 1) {
      assert.deepEqual(mod.genUpdateCase(seed, def), mod.genUpdateCase(seed, def), `${caseId}:${seed}`);
    }
  }
  assert.throws(() => mod.generateUpdateFamily({ seed: 0, caseId: 'sign-and-scale-of-update', difficulty: 'stretch' }), /Unbekannter Fall/);
  assert.throws(() => mod.generateUpdateFamily({ seed: 0, caseId: 'nope', difficulty: 'intro' }), /Unbekannter Fall/);
  assert.throws(() => mod.generateUpdateFamily({ seed: 0.5, caseId: 'sign-and-scale-of-update', difficulty: 'intro' }), /Seed/);
  assert.throws(() => mod.solveUpdateFamily({}), /Unbekannter Fall/);
});

test('family block: contract fields match the case bodies', () => {
  assert.equal(mod.UPDATE_CONTRACT.familyId, 'optimize-gradient-update-rule');
  assert.equal(mod.UPDATE_CONTRACT.authorityMode, 'seeded');
  const expectedMastery = doc.cases.some((c) => c.graderId !== 'manual-rubric' && c.masteryEligible === true);
  assert.equal(mod.UPDATE_CONTRACT.masteryEligible, expectedMastery);
  assert.deepEqual(mod.UPDATE_CONTRACT.caseTypes.map((c) => c.caseId), ['sign-and-scale-of-update', ...CODE_CASES]);
  assert.equal(mod.FAMILY_SPEC.generate, mod.generateUpdateFamily);
  assert.equal(mod.FAMILY_SPEC.solve, mod.solveUpdateFamily);
});

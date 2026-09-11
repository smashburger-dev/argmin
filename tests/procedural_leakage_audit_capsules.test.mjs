// Procedural family validate-leakage-rule-audit: capsule gates.
// Run: node --test tests/procedural_leakage_audit_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FAMILY_SPEC,
  LEAKAGE_AUDIT_CASES,
  LEAKAGE_AUDIT_CONTRACT,
  genLeakageAuditCase,
  generateLeakageAuditFamily,
  leakageAuditCaseOk,
  solveLeakageAuditFamily,
} from '../assets/js/core/procedural/validate-leakage-rule-audit.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CASE_IDS = ['pipeline-leakage-audit', 'pipeline-clean-split'];

test('anchor: contract null, cases fully preserved as oracle', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/validate-leakage-rule-audit.json'), 'utf8'));
  assert.equal(doc.contract, null);
  assert.equal(doc.cases.length, 2);
  for (const caseId of CASE_IDS) {
    const body = doc.cases.find((item) => item.caseId === caseId);
    assert.ok(body, `${caseId}: anchor missing`);
    assert.ok(body.parameters.tests.includes('__check'), `${caseId}: base tests preserved`);
    assert.equal(body.expected.kind, 'reference-solver');
    assert.ok(body.expected.referenceSolver.length > 50, `${caseId}: reference solver preserved`);
  }
  // base test blocks and prompts must equal the module constants verbatim
  for (const caseId of CASE_IDS) {
    const body = doc.cases.find((item) => item.caseId === caseId);
    const def = LEAKAGE_AUDIT_CASES[caseId];
    assert.equal(body.parameters.tests, def.baseTests, `${caseId}: base tests verbatim`);
    assert.equal(body.parameters.starterCode, def.starterCode, `${caseId}: starter verbatim`);
    assert.deepEqual(body.parameters.packages, def.packages, `${caseId}: packages verbatim`);
    assert.equal(body.prompt, def.prompt, `${caseId}: prompt verbatim`);
    assert.equal(body.expected.referenceSolver, def.referenceSolver, `${caseId}: solver verbatim`);
    assert.equal(body.fullSolution, def.fullSolution, `${caseId}: solution verbatim`);
  }
});

test('capsule shape: generated parameters satisfy leakageAuditCaseOk over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = LEAKAGE_AUDIT_CASES[caseId];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genLeakageAuditCase(seed, def);
      assert.ok(leakageAuditCaseOk(generated.parameters, def), `${caseId}:${seed}: shape`);
      assert.ok(generated.parameters.tests.startsWith(def.baseTests), `${caseId}:${seed}: base block kept`);
      assert.ok(generated.parameters.tests.includes('# seeded extra cases'), `${caseId}:${seed}: seeded block`);
      assert.ok(generated.parameters.tests.includes('__ref_audit_pipeline'), `${caseId}:${seed}: inline oracle`);
      assert.equal(generated.expected.referenceSolver, def.referenceSolver);
      assert.equal(generated.prompt, def.prompt);
    }
  }
});

test('seeded draws stay inside the declared domains', () => {
  for (let seed = 0; seed < 200; seed += 1) {
    const stretch = genLeakageAuditCase(seed, LEAKAGE_AUDIT_CASES['pipeline-leakage-audit']);
    for (const entry of stretch.parameters.seedCases) {
      assert.ok(entry.steps.length >= 3 && entry.steps.length <= 6, 'stretch pipeline length');
      for (const step of entry.steps) {
        assert.ok(typeof step.step === 'string' && typeof step.action === 'string', 'dict step shape');
        assert.ok(step.action.length > 5, 'action non-trivial');
      }
    }
    const challenge = genLeakageAuditCase(seed, LEAKAGE_AUDIT_CASES['pipeline-clean-split']);
    for (const entry of challenge.parameters.seedCases) {
      assert.ok(entry.steps.length >= 3 && entry.steps.length <= 6, 'challenge pipeline length');
      assert.ok(entry.steps.every((step) => typeof step === 'string' && step.length > 5), 'string steps');
    }
  }
});

test('distinct floor: at least 40 distinct parameter sets per case over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = LEAKAGE_AUDIT_CASES[caseId];
    const seen = new Set();
    for (let seed = 0; seed < 200; seed += 1) {
      seen.add(JSON.stringify(generateLeakageAuditFamily({ seed, caseId, difficulty: def.difficulty }).parameters));
    }
    assert.ok(seen.size >= 40, `${caseId}: only ${seen.size} distinct`);
  }
});

test('determinism: same seed reproduces identical output, negative seeds valid', () => {
  for (const caseId of CASE_IDS) {
    const def = LEAKAGE_AUDIT_CASES[caseId];
    for (let seed = -20; seed < 20; seed += 1) {
      assert.deepEqual(genLeakageAuditCase(seed, def), genLeakageAuditCase(seed, def), `${caseId}:${seed}`);
    }
  }
});

test('solver consistency: solve returns the case reference solver', () => {
  for (const caseId of CASE_IDS) {
    const def = LEAKAGE_AUDIT_CASES[caseId];
    for (let seed = 0; seed < 50; seed += 1) {
      const generated = generateLeakageAuditFamily({ seed, caseId, difficulty: def.difficulty });
      assert.deepEqual(solveLeakageAuditFamily(generated.parameters), { referenceCode: def.referenceSolver });
    }
  }
});

test('family block: dispatch, contract, errors', () => {
  assert.equal(LEAKAGE_AUDIT_CONTRACT.familyId, 'validate-leakage-rule-audit');
  assert.equal(LEAKAGE_AUDIT_CONTRACT.authorityMode, 'seeded');
  assert.equal(LEAKAGE_AUDIT_CONTRACT.activityType, 'python-code');
  assert.equal(LEAKAGE_AUDIT_CONTRACT.graderId, 'pyodide');
  assert.equal(LEAKAGE_AUDIT_CONTRACT.masteryEligible, true);
  assert.deepEqual(LEAKAGE_AUDIT_CONTRACT.difficultyProfiles, ['stretch', 'challenge']);
  assert.equal(FAMILY_SPEC.generate, generateLeakageAuditFamily);
  assert.throws(() => generateLeakageAuditFamily({ seed: 0, caseId: 'pipeline-leakage-audit', difficulty: 'challenge' }), /Unbekannter Fall/);
  assert.throws(() => generateLeakageAuditFamily({ seed: 0, caseId: 'nope', difficulty: 'stretch' }), /Unbekannt/);
  assert.throws(() => generateLeakageAuditFamily({ seed: 0.5, caseId: 'pipeline-leakage-audit', difficulty: 'stretch' }), /Seed/);
  assert.throws(() => solveLeakageAuditFamily({}), /Kapselform/);
});

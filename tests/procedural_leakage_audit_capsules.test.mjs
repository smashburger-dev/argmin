// Procedural family validate-leakage-rule-audit: capsule gates.
// Run: node --test tests/procedural_leakage_audit_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import * as mod from '../assets/js/core/procedural/validate-leakage-rule-audit.mjs';
import { codeCapsuleSuite } from './procedural_capsule_suites.mjs';

codeCapsuleSuite('validate-leakage-rule-audit', mod, [
  { caseId: 'pipeline-leakage-audit', difficulty: 'stretch' },
  { caseId: 'pipeline-clean-split', difficulty: 'challenge' },
], { difficultyProfiles: ['stretch', 'challenge'] });

test('seeded draws stay inside the declared domains', () => {
  for (let seed = 0; seed < 200; seed += 1) {
    const stretch = mod.genLeakageAuditCase(seed, 'pipeline-leakage-audit', mod.LEAKAGE_AUDIT_CASES['pipeline-leakage-audit']);
    assert.ok(stretch.parameters.tests.includes('# seeded extra cases'), `${seed}: seeded block`);
    assert.ok(stretch.parameters.tests.includes('__ref_audit_pipeline'), `${seed}: inline oracle`);
    for (const entry of stretch.parameters.seedCases) {
      assert.ok(entry.steps.length >= 3 && entry.steps.length <= 6, 'stretch pipeline length');
      for (const step of entry.steps) {
        assert.ok(typeof step.step === 'string' && typeof step.action === 'string', 'dict step shape');
        assert.ok(step.action.length > 5, 'action non-trivial');
      }
    }
    const challenge = mod.genLeakageAuditCase(seed, 'pipeline-clean-split', mod.LEAKAGE_AUDIT_CASES['pipeline-clean-split']);
    assert.ok(challenge.parameters.tests.includes('# seeded extra cases'), `${seed}: seeded block`);
    assert.ok(challenge.parameters.tests.includes('__ref_audit_pipeline'), `${seed}: inline oracle`);
    for (const entry of challenge.parameters.seedCases) {
      assert.ok(entry.steps.length >= 3 && entry.steps.length <= 6, 'challenge pipeline length');
      assert.ok(entry.steps.every((step) => typeof step === 'string' && step.length > 5), 'string steps');
    }
  }
});

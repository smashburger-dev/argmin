// Procedural family rank-evidence-table: capsule gates.
// Run: node --test tests/procedural_evidence_table_capsules.test.mjs
// Registry wiring is done centrally by the parent — this test only checks the
// module surface plus the JSON anchors.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as mod from '../assets/js/core/procedural/rank-evidence-table.mjs';
import { codeCapsuleSuite } from './procedural_capsule_suites.mjs';

codeCapsuleSuite('rank-evidence-table', mod, [
  { caseId: 'evidence-table-ranking', difficulty: 'challenge' },
], { familyGroup: 'aggregate-count', difficultyProfiles: ['challenge'] });

test('seeded draws stay inside the declared domains', () => {
  const def = mod.EVIDENCE_TABLE_CASES['evidence-table-ranking'];
  for (let seed = 0; seed < 200; seed += 1) {
    const generated = mod.genEvidenceTableCase(seed, 'evidence-table-ranking', def);
    assert.ok(generated.parameters.tests.includes('# seeded extra cases'), `${seed}: seeded block`);
    assert.ok(generated.parameters.tests.includes('seeded tabelle 1'), `${seed}: seeded checks`);
    for (const entry of generated.parameters.seedCases) {
      assert.ok(entry.papers.length >= 3 && entry.papers.length <= 6, 'paper count');
      const ids = entry.papers.map((p) => p.paperId);
      assert.equal(new Set(ids).size, ids.length, 'paperIds unique');
      for (const p of entry.papers) {
        assert.match(p.paperId, /^[a-z]+-\d{4}$/, 'paperId shape');
        assert.ok(typeof p.metric === 'string' && p.metric.length > 0, 'metric set');
        assert.ok(typeof p.baseline === 'number' && p.baseline >= 0, 'baseline domain');
        assert.ok(typeof p.system === 'number' && p.system >= 0, 'system domain');
      }
      // every drawn paper must be baked into the emitted test block
      for (const p of entry.papers) {
        assert.ok(generated.parameters.tests.includes(`"paperId": "${p.paperId}"`), `${p.paperId}: literal baked`);
      }
    }
  }
});

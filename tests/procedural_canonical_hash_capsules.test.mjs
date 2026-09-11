// Procedural family reproduce-canonical-hash-verify: capsule gates.
// Run: node --test tests/procedural_canonical_hash_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import * as mod from '../assets/js/core/procedural/reproduce-canonical-hash-verify.mjs';
import { codeCapsuleSuite } from './procedural_capsule_suites.mjs';

const ANSWER_POOL = [
  'Die Lieferzeit betraegt 3 Werktage.',
  'Die Frist endet nach 30 Tagen.',
  'Der Vertrag laeuft 12 Monate.',
  'Die Garantie deckt Herstellungsfehler ab.',
  'Die Rueckgabe ist 14 Tage lang moeglich.',
  'Der Support antwortet innerhalb von 24 Stunden.',
  'Die Kuendigungsfrist betraegt 4 Wochen.',
  'Die Aktivierung erfolgt nach der Anmeldung.',
];
const SOURCE_POOL = ['faq-3', 'vertrag-1', 'vertrag-2', 'agb-7', 'handbuch-2'];

codeCapsuleSuite('reproduce-canonical-hash-verify', mod, [
  { caseId: 'canonical-hash-verify', difficulty: 'core' },
], { difficultyProfiles: ['core'] });

test('seeded draws stay inside the declared domains', () => {
  const def = mod.HASH_CASES['canonical-hash-verify'];
  for (let seed = 0; seed < 200; seed += 1) {
    const generated = mod.genHashCase(seed, 'canonical-hash-verify', def);
    assert.ok(generated.parameters.tests.includes('# seeded extra cases'), `${seed}: seeded block`);
    assert.ok(generated.parameters.tests.includes('__ref_build_golden'), `${seed}: inline oracle`);
    assert.ok(generated.parameters.tests.includes('hashlib.sha256'), `${seed}: digest recomputed inline`);
    assert.equal(generated.parameters.seedCases.length, 3, 'three draws per capsule');
    for (const entry of generated.parameters.seedCases) {
      assert.ok(entry.entries.length >= 2 && entry.entries.length <= 5, 'entry count 2-5');
      const ids = entry.entries.map((e) => e.id);
      assert.equal(new Set(ids).size, ids.length, 'ids unique');
      for (const item of entry.entries) {
        assert.match(item.id, /^(faq|vertrag|agb|handbuch)-\d{2}$/, `id shape: ${item.id}`);
        assert.ok(ANSWER_POOL.includes(item.antwort), `antwort pool: ${item.antwort}`);
        assert.ok(item.quellen.length >= 1 && item.quellen.length <= 2, 'quellen 1-2');
        assert.equal(new Set(item.quellen).size, item.quellen.length, 'quellen unique');
        assert.ok(item.quellen.every((q) => SOURCE_POOL.includes(q)), 'quellen domain');
      }
    }
  }
});

test('family extras: task archetype and contract competencies', () => {
  assert.equal(mod.HASH_CONTRACT.taskArchetype, 'code-test');
  assert.deepEqual(mod.HASH_CONTRACT.competencyIds, ['c-python-functions', 'c-research-capstone']);
});

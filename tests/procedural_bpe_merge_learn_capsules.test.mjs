// Procedural family optimize-bpe-merge-learn: capsule gates.
// Run: node --test tests/procedural_bpe_merge_learn_capsules.test.mjs
// Registry wiring is done centrally by the parent — this test only checks the
// module surface plus the JSON anchors.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as mod from '../assets/js/core/procedural/optimize-bpe-merge-learn.mjs';
import { codeCapsuleSuite } from './procedural_capsule_suites.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

codeCapsuleSuite('optimize-bpe-merge-learn', mod, [
  { caseId: 'bpe-merge-learn', difficulty: 'challenge' },
], { difficultyProfiles: ['challenge'] });

test('anchor extras: difficulty profile, contract competencies and case types', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/optimize-bpe-merge-learn.json'), 'utf8'));
  const body = doc.cases.find((item) => item.caseId === 'bpe-merge-learn');
  assert.equal(body.difficultyProfile, mod.LEARN_CASES['bpe-merge-learn'].difficulty, 'difficulty');
  assert.deepEqual(mod.LEARN_CONTRACT.competencyIds, ['c-dl-tokenizer', 'c-python-collections']);
  assert.deepEqual(mod.LEARN_CONTRACT.caseTypes, [{ caseId: 'bpe-merge-learn', propertyTest: false }]);
});

test('seeded draws stay inside the declared domains', () => {
  const def = mod.LEARN_CASES['bpe-merge-learn'];
  for (let seed = 0; seed < 200; seed += 1) {
    const generated = mod.genLearnCase(seed, 'bpe-merge-learn', def);
    assert.ok(generated.parameters.tests.includes('# seeded extra cases'), `${seed}: seeded block`);
    assert.ok(generated.parameters.tests.includes('def __ref_learn('), `${seed}: ref preamble`);
    assert.equal(generated.parameters.seedCases.length, 3, 'extraCount');
    for (const entry of generated.parameters.seedCases) {
      assert.ok(entry.corpus.length >= 4 && entry.corpus.length <= 12, `corpus length: ${entry.corpus.length}`);
      const counts = new Map();
      for (const word of entry.corpus) {
        assert.match(word, /^[abelnorstw]{3,5}$/, `word shape: ${word}`);
        counts.set(word, (counts.get(word) || 0) + 1);
      }
      // every stem repeats at least twice so a merge with count >= 2 exists
      for (const count of counts.values()) {
        assert.ok(count >= 2, 'each stem repeated >= 2');
      }
      assert.ok(counts.size >= 2 && counts.size <= 4, `distinct stems: ${counts.size}`);
      assert.ok(entry.numMerges >= 2 && entry.numMerges <= 6, `numMerges: ${entry.numMerges}`);
    }
  }
});

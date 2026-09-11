// Procedural family transform-bpe-merge-apply: capsule gates.
// Run: node --test tests/procedural_bpe_merge_apply_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import * as mod from '../assets/js/core/procedural/transform-bpe-merge-apply.mjs';
import { codeCapsuleSuite } from './procedural_capsule_suites.mjs';

// genBpeCase/bpeCaseOk take the canonical caseId-in-the-middle arity from the
// shared case-family kit ((seed, caseId, def) / (parameters, caseId, def)),
// so the suite surface is the module namespace itself.
const suiteMod = { ...mod };

codeCapsuleSuite('transform-bpe-merge-apply', suiteMod, [
  { caseId: 'bpe-merge-apply', difficulty: 'stretch' },
  { caseId: 'bpe-merge-tie-order', difficulty: 'stretch' },
], { difficultyProfiles: ['stretch', 'core'] });

test('seeded draws stay inside the declared domains', () => {
  const wordChars = new Set(['a', 'b', 'e', 'l', 'o', 's', 't', 'w']);
  const tieChars = new Set(['a', 'b', 'c']);
  for (let seed = 0; seed < 200; seed += 1) {
    const core = mod.genBpeCase(seed, 'bpe-merge-apply', mod.BPE_CASES['bpe-merge-apply']);
    assert.ok(core.parameters.tests.includes('# seeded extra cases'), `${seed}: seeded block`);
    for (const entry of core.parameters.seedCases) {
      assert.ok(entry.word.length >= 3 && entry.word.length <= 6, 'word length');
      assert.ok([...entry.word].every((ch) => wordChars.has(ch)), 'word alphabet');
      assert.ok(entry.merges.length >= 2 && entry.merges.length <= 4, 'merge count');
      assert.ok(entry.merges.every(([a, b]) => a.length >= 1 && b.length >= 1), 'merge pairs non-empty');
    }
    const tie = mod.genBpeCase(seed, 'bpe-merge-tie-order', mod.BPE_CASES['bpe-merge-tie-order']);
    assert.ok(tie.parameters.tests.includes('# seeded extra cases'), `${seed}: seeded block`);
    for (const entry of tie.parameters.seedCases) {
      assert.ok(entry.symbols.length >= 3 && entry.symbols.length <= 6, 'symbols length');
      assert.ok(entry.symbols.every((s) => tieChars.has(s)), 'symbols alphabet');
      assert.ok(entry.merges.length >= 1 && entry.merges.length <= 3, 'tie merge count');
    }
  }
});

test('family extras: spec carries the family id', () => {
  assert.equal(mod.FAMILY_SPEC.familyId, 'transform-bpe-merge-apply');
});

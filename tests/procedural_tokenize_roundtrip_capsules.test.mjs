// Procedural family transform-tokenize-roundtrip: capsule gates (python-code).
// Run: node --test tests/procedural_tokenize_roundtrip_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import * as mod from '../assets/js/core/procedural/transform-tokenize-roundtrip.mjs';
import {
  TOKENIZE_CASES,
  genTokenizeCase,
} from '../assets/js/core/procedural/transform-tokenize-roundtrip.mjs';
import { codeCapsuleSuite } from './procedural_capsule_suites.mjs';

const CASE_IDS = ['char-encode-roundtrip', 'subword-unk-roundtrip'];

codeCapsuleSuite('transform-tokenize-roundtrip', mod, [
  { caseId: 'char-encode-roundtrip', difficulty: 'core' },
  { caseId: 'subword-unk-roundtrip', difficulty: 'stretch' },
], { difficultyProfiles: ['core', 'stretch'] });

test('capsule extras: seeded block marker stays emitted', () => {
  for (const caseId of CASE_IDS) {
    const def = TOKENIZE_CASES[caseId];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genTokenizeCase(seed, caseId, def);
      assert.ok(generated.parameters.tests.includes('# seeded extra cases'), `${caseId}:${seed}: seeded block`);
    }
  }
});

test('seeded draws stay inside the declared domains', () => {
  const charVocab = new Set(['a', 'b', 'c', 'd', 'e', 'l', 'o', 's', 't', 'w']);
  const knownTokens = new Set(['<pad>', '<unk>', 'hello', 'world']);
  for (let seed = 0; seed < 200; seed += 1) {
    const core = genTokenizeCase(seed, 'char-encode-roundtrip', TOKENIZE_CASES['char-encode-roundtrip']);
    for (const entry of core.parameters.seedCases) {
      assert.ok(entry.words.length >= 1 && entry.words.length <= 3, 'core word count');
      for (const word of entry.words) {
        assert.ok(word.length >= 1 && word.length <= 5, 'core word length');
        assert.ok([...word].every((ch) => charVocab.has(ch)), `core char in vocab: ${word}`);
      }
    }
    const stretch = genTokenizeCase(seed, 'subword-unk-roundtrip', TOKENIZE_CASES['subword-unk-roundtrip']);
    for (const entry of stretch.parameters.seedCases) {
      assert.ok(entry.tokens.length >= 2 && entry.tokens.length <= 4, 'stretch token count');
      assert.ok(entry.tokens.every((t) => typeof t === 'string' && t.length > 0), 'stretch tokens non-empty');
      assert.ok(entry.tokens.some((t) => !knownTokens.has(t)) || entry.tokens.some((t) => knownTokens.has(t)), 'stretch token mix');
    }
  }
});

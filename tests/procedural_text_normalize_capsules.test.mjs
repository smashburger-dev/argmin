// Procedural family validate-text-normalize-match: capsule gates (python-code).
// Run: node --test tests/procedural_text_normalize_capsules.test.mjs
// Registry wiring is done centrally by the parent — this test only checks the
// module surface plus the JSON anchors.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as mod from '../assets/js/core/procedural/validate-text-normalize-match.mjs';
import {
  TEXT_MATCH_CASES,
  genTextMatchCase,
} from '../assets/js/core/procedural/validate-text-normalize-match.mjs';
import { codeCapsuleSuite } from './procedural_capsule_suites.mjs';

codeCapsuleSuite('validate-text-normalize-match', mod, [
  { caseId: 'text-normalize-match', difficulty: 'core' },
], { familyGroup: 'validate-contract', difficultyProfiles: ['core'] });

test('seeded draws stay inside the declared domains', () => {
  const def = TEXT_MATCH_CASES['text-normalize-match'];
  for (let seed = 0; seed < 200; seed += 1) {
    const generated = genTextMatchCase(seed, 'text-normalize-match', def);
    for (const entry of generated.parameters.seedCases) {
      assert.ok(typeof entry.frage === 'string' && entry.frage.length > 5, 'frage non-empty');
      const { text, uv, dv, kaputt } = entry.hypothesen;
      // well-formed hypothesis keeps the fixed word-index split intact
      assert.match(text, /^Je \S+ .+, desto \S+ .+/u, 'Je-desto shape');
      const kern = text.replace(/\.$/, '');
      const [front, back] = kern.split(', desto ');
      assert.ok(front.startsWith('Je '), 'front starts with Je');
      assert.equal(front.split(' ').slice(2).join(' ').toLowerCase(), uv, 'uv = words from index 2');
      assert.equal(back.split(' ').slice(1).join(' ').toLowerCase(), dv, 'dv = words from index 1');
      // malformed input must hit the ValueError path of the contract:
      // len(split(', desto ')) != 2 or the front part does not start 'Je '
      const kaputtParts = kaputt.split(', desto ');
      assert.ok(kaputtParts.length !== 2 || !kaputtParts[0].startsWith('Je '), 'kaputt is malformed');
      // drawn literals are baked into the emitted test block
      assert.ok(generated.parameters.tests.includes(JSON.stringify(entry.frage)), 'frage literal baked');
      assert.ok(generated.parameters.tests.includes(JSON.stringify(text)), 'hypothesis literal baked');
    }
    assert.ok(generated.parameters.tests.includes('__ref_is_testable'), 'ref copy emitted');
    assert.ok(generated.parameters.tests.includes('__ref_extract_variables'), 'ref copy emitted');
    assert.ok(generated.parameters.tests.includes('seeded je-desto fehler 1'), 'ValueError path check emitted');
  }
});

test('capsule extras: seeded markers stay embedded in the emitted tests', () => {
  const def = TEXT_MATCH_CASES['text-normalize-match'];
  for (let seed = 0; seed < 200; seed += 1) {
    const generated = genTextMatchCase(seed, 'text-normalize-match', def);
    assert.ok(generated.parameters.tests.includes('# seeded extra cases'), `${seed}: seeded block`);
    assert.ok(generated.parameters.tests.includes('seeded testbar 1'), `${seed}: seeded checks`);
  }
});

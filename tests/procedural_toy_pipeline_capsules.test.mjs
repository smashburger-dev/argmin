// Procedural family compose-toy-inference-pipeline: capsule gates (python-code).
// Run: node --test tests/procedural_toy_pipeline_capsules.test.mjs
// Registry wiring is done centrally by the parent — this test only checks the
// module surface plus the JSON anchors.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as mod from '../assets/js/core/procedural/compose-toy-inference-pipeline.mjs';
import {
  TOY_PIPELINE_CASES,
  TOY_PIPELINE_CONTRACT,
  genToyPipelineCase,
} from '../assets/js/core/procedural/compose-toy-inference-pipeline.mjs';
import { codeCapsuleSuite } from './procedural_capsule_suites.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CASE_ID = 'toy-inference-pipeline';
const TOY_LETTERS = new Set(['a', 'b', 'e', 'l', 'o', 's', 't']);

codeCapsuleSuite('compose-toy-inference-pipeline', mod, [
  { caseId: 'toy-inference-pipeline', difficulty: 'challenge' },
], { familyGroup: 'construct-program', difficultyProfiles: ['challenge'] });

test('anchor extras: ref oracle copy stays inside the pinned base tests', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/compose-toy-inference-pipeline.json'), 'utf8'));
  const body = doc.cases.find((item) => item.caseId === CASE_ID);
  assert.ok(body.parameters.tests.includes('def __ref_run'), `${CASE_ID}: ref oracle preserved`);
});

test('capsule extras: seeded block marker and seeded checks stay emitted', () => {
  const def = TOY_PIPELINE_CASES[CASE_ID];
  for (let seed = 0; seed < 200; seed += 1) {
    const generated = genToyPipelineCase(seed, CASE_ID, def);
    assert.ok(generated.parameters.tests.includes('# seeded extra cases'), `${seed}: seeded block`);
    assert.ok(generated.parameters.tests.includes('seeded tokens 1'), `${seed}: seeded checks`);
  }
});

test('seeded draws stay inside the declared domains', () => {
  const def = TOY_PIPELINE_CASES['toy-inference-pipeline'];
  for (let seed = 0; seed < 200; seed += 1) {
    const generated = genToyPipelineCase(seed, 'toy-inference-pipeline', def);
    assert.equal(generated.parameters.seedCases.length, 3, 'extraCount');
    for (const [i, entry] of generated.parameters.seedCases.entries()) {
      const words = entry.text.split(' ');
      assert.ok(words.length >= 1 && words.length <= 3, 'word count');
      for (const word of words) {
        assert.ok(word.length >= 1 && word.length <= 4, `word length: ${word}`);
        assert.ok([...word].every((ch) => TOY_LETTERS.has(ch)), `encodable word: ${word}`);
      }
      assert.ok(Number.isInteger(entry.maxLen) && entry.maxLen >= 3 && entry.maxLen <= 16, 'maxLen range');
      // the drawn literals are baked into the test block
      const index = i + 1;
      assert.ok(
        generated.parameters.tests.includes(`__t${index} = ${JSON.stringify(entry.text)}`),
        `${seed}:${index}: text literal`,
      );
      assert.ok(
        generated.parameters.tests.includes(`__ref_run(__t${index}, WEIGHTS, ${entry.maxLen}, 0)`),
        `${seed}:${index}: maxLen literal`,
      );
    }
  }
});

test('family extras: contract archetype, competencies and case types', () => {
  assert.equal(TOY_PIPELINE_CONTRACT.taskArchetype, 'code-tests');
  assert.deepEqual(TOY_PIPELINE_CONTRACT.competencyIds, ['c-dl-inference', 'c-dl-attention', 'c-dl-tokenizer']);
  assert.deepEqual(TOY_PIPELINE_CONTRACT.caseTypes, [
    { caseId: 'toy-inference-pipeline', propertyTest: false },
  ]);
});

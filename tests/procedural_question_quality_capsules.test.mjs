// Procedural family classify-question-quality: capsule gates (single-choice).
// Run: node --test tests/procedural_question_quality_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as mod from '../assets/js/core/procedural/classify-question-quality.mjs';
import {
  QUESTION_QUALITY_CAPSULES,
  QUESTION_QUALITY_CONTRACT,
  generateQuestionQualityFamily,
} from '../assets/js/core/procedural/classify-question-quality.mjs';
import { choiceCapsuleSuite } from './procedural_capsule_suites.mjs';

choiceCapsuleSuite('classify-question-quality', mod, [
  { caseId: 'question-quality-check', difficulty: 'intro' },
], { familyGroup: 'classify-concept', difficultyProfiles: ['intro'] });

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CASE_ID = 'question-quality-check';
const CAPSULE = QUESTION_QUALITY_CAPSULES.intro;
const draw = (seed) => generateQuestionQualityFamily({ seed, caseId: CASE_ID, difficulty: 'intro' });

test('anchor extras: pinned profile and key position of the oracle case', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/classify-question-quality.json'), 'utf8'));
  assert.equal(doc.cases.length, 1);
  const body = doc.cases.find((item) => item.caseId === CASE_ID);
  assert.equal(body.difficultyProfile, 'intro');
  assert.equal(body.expected.correctChoice, 'a');
});

test('bank extras: 12-16 scenarios, exactly one oracle row, no filler texts', () => {
  assert.equal(CAPSULE.caseId, CASE_ID);
  assert.ok(CAPSULE.bank.length >= 12 && CAPSULE.bank.length <= 16, `bank size ${CAPSULE.bank.length}`);
  assert.equal(CAPSULE.bank.filter((item) => item.key === 'base').length, 1, 'exactly one oracle row');
  for (const entry of CAPSULE.bank) {
    for (const text of [entry.correct, ...entry.wrong]) {
      assert.ok(text.length > 10, `${entry.key}: no filler text`);
    }
  }
});

test('capsule extras: parameter keys stay minimal, texts come from the bank row', () => {
  for (let seed = 0; seed < 200; seed += 1) {
    const generated = draw(seed);
    assert.deepEqual(Object.keys(generated.parameters).sort(), ['caseId', 'difficulty', 'scenario'], `${seed}: parameter keys`);
    const entry = CAPSULE.bank.find((item) => item.key === generated.parameters.scenario);
    assert.equal(generated.prompt, entry.prompt, `${seed}: prompt from bank row`);
    assert.equal(generated.fullSolution, entry.solution, `${seed}: solution from bank row`);
  }
});

test('contract extras: competencies the suite does not pin', () => {
  assert.deepEqual(QUESTION_QUALITY_CONTRACT.competencyIds, ['c-research-question']);
});

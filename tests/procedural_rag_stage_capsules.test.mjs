// Procedural family classify-rag-stage: capsule gates (single-choice).
// Run: node --test tests/procedural_rag_stage_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as mod from '../assets/js/core/procedural/classify-rag-stage.mjs';
import {
  RAG_STAGE_CAPSULES,
  RAG_STAGE_CONTRACT,
  generateRagStageFamily,
} from '../assets/js/core/procedural/classify-rag-stage.mjs';
import { choiceCapsuleSuite } from './procedural_capsule_suites.mjs';

choiceCapsuleSuite('classify-rag-stage', mod, [
  { caseId: 'rag-stage-separation', difficulty: 'intro' },
], { familyGroup: 'classify-concept', difficultyProfiles: ['intro'] });

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CASE_ID = 'rag-stage-separation';
const CAPSULE = RAG_STAGE_CAPSULES.intro;
const draw = (seed) => generateRagStageFamily({ seed, caseId: CASE_ID, difficulty: 'intro' });

test('anchor extras: pinned profile and key position of the oracle case', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/classify-rag-stage.json'), 'utf8'));
  assert.equal(doc.cases.length, 1);
  const body = doc.cases.find((item) => item.caseId === CASE_ID);
  assert.equal(body.difficultyProfile, 'intro');
  assert.equal(body.choices.find((choice) => choice.correct).id, 'c');
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
  assert.deepEqual(RAG_STAGE_CONTRACT.competencyIds, ['c-genai-rag']);
});

// Procedural family classify-rag-stage: capsule gates.
// Run: node --test tests/procedural_rag_stage_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FAMILY_SPEC,
  RAG_STAGE_CAPSULES,
  RAG_STAGE_CONTRACT,
  genRagStageCapsule,
  generateRagStageFamily,
  ragStageCapsuleOk,
  ragStageCorrectText,
  solveRagStageFamily,
} from '../assets/js/core/procedural/classify-rag-stage.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CASE_ID = 'rag-stage-separation';
const CAPSULE = RAG_STAGE_CAPSULES.intro;
const draw = (seed) => generateRagStageFamily({ seed, caseId: CASE_ID, difficulty: 'intro' });

test('anchor: contract null, base case preserved verbatim as bank oracle', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/classify-rag-stage.json'), 'utf8'));
  assert.equal(doc.contract, null);
  assert.equal(doc.cases.length, 1);
  const body = doc.cases.find((item) => item.caseId === CASE_ID);
  assert.ok(body, `${CASE_ID}: anchor missing`);
  assert.equal(body.difficultyProfile, 'intro');
  assert.equal(body.expected.correctChoice, 'c');
  const base = CAPSULE.bank.find((item) => item.key === 'base');
  assert.equal(base.prompt, body.prompt, 'base: prompt verbatim');
  assert.equal(base.solution, body.fullSolution, 'base: solution verbatim');
  assert.equal(base.correct, body.choices.find((choice) => choice.correct).text, 'base: correct text verbatim');
  assert.deepEqual(base.wrong, body.choices.filter((choice) => !choice.correct).map((choice) => choice.text), 'base: distractors verbatim');
});

test('bank: 12-16 scenarios, unique keys, four distinct option texts each', () => {
  assert.equal(CAPSULE.caseId, CASE_ID);
  assert.ok(CAPSULE.bank.length >= 12 && CAPSULE.bank.length <= 16, `bank size ${CAPSULE.bank.length}`);
  assert.equal(new Set(CAPSULE.bank.map((item) => item.key)).size, CAPSULE.bank.length, 'keys unique');
  assert.equal(CAPSULE.bank.filter((item) => item.key === 'base').length, 1, 'exactly one oracle row');
  for (const entry of CAPSULE.bank) {
    const options = [entry.correct, ...entry.wrong];
    assert.equal(entry.wrong.length, 3, `${entry.key}: three distractors`);
    assert.equal(new Set(options).size, 4, `${entry.key}: distinct option texts`);
    assert.ok(entry.prompt.length > 20, `${entry.key}: prompt`);
    assert.ok(entry.solution.length > 20, `${entry.key}: solution`);
    for (const text of options) assert.ok(text.length > 10, `${entry.key}: no filler text`);
  }
});

test('capsule shape: generated instances satisfy ragStageCapsuleOk over 200 seeds', () => {
  for (let seed = 0; seed < 200; seed += 1) {
    const generated = draw(seed);
    assert.ok(ragStageCapsuleOk(generated.parameters, CAPSULE), `${seed}: shape`);
    assert.deepEqual(Object.keys(generated.parameters).sort(), ['caseId', 'difficulty', 'scenario'], `${seed}: parameter keys`);
    assert.equal(generated.choices.length, 4, `${seed}: four choices`);
    assert.equal(new Set(generated.choices.map((choice) => choice.text)).size, 4, `${seed}: unique texts`);
    const correct = generated.choices.filter((choice) => choice.correct);
    assert.equal(correct.length, 1, `${seed}: exactly one correct`);
    assert.equal(generated.expected.correctChoice, correct[0].id, `${seed}: key points at correct choice`);
    assert.equal(correct[0].text, ragStageCorrectText(generated.parameters, CAPSULE), `${seed}: key text`);
    const entry = CAPSULE.bank.find((item) => item.key === generated.parameters.scenario);
    assert.equal(generated.prompt, entry.prompt, `${seed}: prompt from bank row`);
    assert.equal(generated.fullSolution, entry.solution, `${seed}: solution from bank row`);
  }
});

test('distinct floor: at least 40 distinct instances over 200 seeds', () => {
  const seen = new Set();
  for (let seed = 0; seed < 200; seed += 1) {
    const generated = draw(seed);
    seen.add(JSON.stringify([generated.prompt, generated.parameters, generated.expected]));
  }
  assert.ok(seen.size >= 40, `only ${seen.size} distinct`);
});

test('determinism: same seed reproduces identical output, negative seeds valid', () => {
  for (let seed = -50; seed < 50; seed += 1) {
    assert.deepEqual(genRagStageCapsule(seed, CAPSULE), genRagStageCapsule(seed, CAPSULE), `${seed}: gen deterministic`);
    assert.ok(ragStageCapsuleOk(genRagStageCapsule(seed, CAPSULE).parameters, CAPSULE), `${seed}: shape`);
    assert.deepEqual(draw(seed), draw(seed), `${seed}: family deterministic`);
  }
});

test('solver consistency: solve returns the correct choice text', () => {
  for (let seed = 0; seed < 200; seed += 1) {
    const generated = draw(seed);
    const correct = generated.choices.find((choice) => choice.correct);
    assert.deepEqual(solveRagStageFamily(generated.parameters), { correctText: correct.text }, `${seed}: solve`);
  }
});

test('leak/rotation: prompt never names the key text, positions rotate', () => {
  const counts = { a: 0, b: 0, c: 0, d: 0 };
  const byModulo = new Map();
  for (let seed = 0; seed < 200; seed += 1) {
    const generated = draw(seed);
    const correct = generated.choices.find((choice) => choice.correct);
    assert.ok(!generated.prompt.includes(correct.text), `${seed}: key text in prompt`);
    counts[generated.expected.correctChoice] += 1;
    const bucket = seed % 8;
    if (!byModulo.has(bucket)) byModulo.set(bucket, new Set());
    byModulo.get(bucket).add(JSON.stringify([generated.prompt, generated.parameters, generated.expected]));
  }
  for (const [id, count] of Object.entries(counts)) {
    assert.ok(count >= 40 && count <= 60, `position ${id} only ${count}x`);
  }
  for (const [bucket, instances] of byModulo) {
    assert.ok(instances.size >= 10, `modulo class ${bucket} holds only ${instances.size} distinct`);
  }
});

test('family block: dispatch, contract, errors', () => {
  assert.equal(RAG_STAGE_CONTRACT.familyId, 'classify-rag-stage');
  assert.equal(RAG_STAGE_CONTRACT.familyGroup, 'classify-concept');
  assert.equal(RAG_STAGE_CONTRACT.authorityMode, 'seeded');
  assert.equal(RAG_STAGE_CONTRACT.activityType, 'single-choice');
  assert.equal(RAG_STAGE_CONTRACT.graderId, 'deterministic');
  assert.equal(RAG_STAGE_CONTRACT.masteryEligible, false);
  assert.deepEqual(RAG_STAGE_CONTRACT.difficultyProfiles, ['intro']);
  assert.deepEqual(RAG_STAGE_CONTRACT.caseTypes.map((item) => item.caseId), [CASE_ID]);
  assert.deepEqual(RAG_STAGE_CONTRACT.competencyIds, ['c-genai-rag']);
  assert.equal(FAMILY_SPEC.generate, generateRagStageFamily);
  assert.equal(FAMILY_SPEC.solve, solveRagStageFamily);
  assert.throws(() => generateRagStageFamily({ seed: 0, caseId: CASE_ID, difficulty: 'core' }), /Unbekannter Fall/);
  assert.throws(() => generateRagStageFamily({ seed: 0, caseId: 'nope', difficulty: 'intro' }), /Unbekannter Fall/);
  assert.throws(() => generateRagStageFamily({ seed: 0.5, caseId: CASE_ID, difficulty: 'intro' }), /Seed/);
  assert.throws(() => solveRagStageFamily({}), /Unbekannter Fall/);
  assert.throws(() => solveRagStageFamily({ caseId: CASE_ID, scenario: 'nope' }), /Kapselform/);
});

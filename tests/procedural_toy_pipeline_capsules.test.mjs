// Procedural family compose-toy-inference-pipeline: capsule gates.
// Run: node --test tests/procedural_toy_pipeline_capsules.test.mjs
// Registry wiring is done centrally by the parent — this test only checks the
// module surface plus the JSON anchors.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FAMILY_SPEC,
  TOY_PIPELINE_CASES,
  TOY_PIPELINE_CONTRACT,
  genToyPipelineCase,
  generateToyPipelineFamily,
  solveToyPipelineFamily,
  toyPipelineCaseOk,
} from '../assets/js/core/procedural/compose-toy-inference-pipeline.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CASE_IDS = ['toy-inference-pipeline'];
const TOY_LETTERS = new Set(['a', 'b', 'e', 'l', 'o', 's', 't']);

test('anchor: contract null, cases fully preserved as oracle', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/compose-toy-inference-pipeline.json'), 'utf8'));
  assert.equal(doc.contract, null);
  assert.equal(doc.cases.length, 1);
  for (const caseId of CASE_IDS) {
    const body = doc.cases.find((item) => item.caseId === caseId);
    assert.ok(body, `${caseId}: anchor missing`);
    assert.ok(body.parameters.tests.includes('__check'), `${caseId}: base tests preserved`);
    assert.ok(body.parameters.tests.includes('def __ref_run'), `${caseId}: ref oracle preserved`);
    assert.equal(body.expected.kind, 'reference-solver');
    assert.ok(body.expected.referenceSolver.length > 50, `${caseId}: reference solver preserved`);
  }
  // base test blocks and prompts must equal the module constants verbatim
  for (const caseId of CASE_IDS) {
    const body = doc.cases.find((item) => item.caseId === caseId);
    const def = TOY_PIPELINE_CASES[caseId];
    assert.equal(body.parameters.tests, def.baseTests, `${caseId}: base tests verbatim`);
    assert.equal(body.parameters.starterCode, def.starterCode, `${caseId}: starter verbatim`);
    assert.equal(body.prompt, def.prompt, `${caseId}: prompt verbatim`);
    assert.equal(body.fullSolution, def.fullSolution, `${caseId}: fullSolution verbatim`);
    assert.equal(body.expected.referenceSolver, def.referenceSolver, `${caseId}: solver verbatim`);
  }
});

test('capsule shape: generated parameters satisfy toyPipelineCaseOk over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = TOY_PIPELINE_CASES[caseId];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genToyPipelineCase(seed, def);
      assert.ok(toyPipelineCaseOk(generated.parameters, def), `${caseId}:${seed}: shape`);
      assert.ok(generated.parameters.tests.startsWith(def.baseTests), `${caseId}:${seed}: base block kept`);
      assert.ok(generated.parameters.tests.includes('# seeded extra cases'), `${caseId}:${seed}: seeded block`);
      assert.ok(generated.parameters.tests.includes(`seeded tokens 1`), `${caseId}:${seed}: seeded checks`);
      assert.equal(generated.expected.referenceSolver, def.referenceSolver);
      assert.equal(generated.prompt, def.prompt);
    }
  }
});

test('seeded draws stay inside the declared domains', () => {
  const def = TOY_PIPELINE_CASES['toy-inference-pipeline'];
  for (let seed = 0; seed < 200; seed += 1) {
    const generated = genToyPipelineCase(seed, def);
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

test('distinct floor: at least 40 distinct parameter sets per case over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = TOY_PIPELINE_CASES[caseId];
    const seen = new Set();
    for (let seed = 0; seed < 200; seed += 1) {
      seen.add(JSON.stringify(generateToyPipelineFamily({ seed, caseId, difficulty: def.difficulty }).parameters));
    }
    assert.ok(seen.size >= 40, `${caseId}: only ${seen.size} distinct`);
  }
});

test('determinism: same seed reproduces identical output, negative seeds valid', () => {
  for (const caseId of CASE_IDS) {
    const def = TOY_PIPELINE_CASES[caseId];
    for (let seed = -20; seed < 20; seed += 1) {
      assert.deepEqual(genToyPipelineCase(seed, def), genToyPipelineCase(seed, def), `${caseId}:${seed}`);
    }
  }
});

test('solver consistency: solve returns the case reference solver', () => {
  for (const caseId of CASE_IDS) {
    const def = TOY_PIPELINE_CASES[caseId];
    for (let seed = 0; seed < 50; seed += 1) {
      const generated = generateToyPipelineFamily({ seed, caseId, difficulty: def.difficulty });
      assert.deepEqual(solveToyPipelineFamily(generated.parameters), { referenceCode: def.referenceSolver });
    }
  }
});

test('family block: dispatch, contract, errors', () => {
  assert.equal(TOY_PIPELINE_CONTRACT.familyId, 'compose-toy-inference-pipeline');
  assert.equal(TOY_PIPELINE_CONTRACT.familyGroup, 'construct-program');
  assert.equal(TOY_PIPELINE_CONTRACT.authorityMode, 'seeded');
  assert.equal(TOY_PIPELINE_CONTRACT.activityType, 'python-code');
  assert.equal(TOY_PIPELINE_CONTRACT.graderId, 'pyodide');
  assert.equal(TOY_PIPELINE_CONTRACT.masteryEligible, true);
  assert.deepEqual(TOY_PIPELINE_CONTRACT.difficultyProfiles, ['challenge']);
  assert.deepEqual(TOY_PIPELINE_CONTRACT.competencyIds, ['c-dl-inference', 'c-dl-attention', 'c-dl-tokenizer']);
  assert.deepEqual(TOY_PIPELINE_CONTRACT.caseTypes, [
    { caseId: 'toy-inference-pipeline', propertyTest: false },
  ]);
  assert.equal(FAMILY_SPEC.generate, generateToyPipelineFamily);
  assert.equal(FAMILY_SPEC.solve, solveToyPipelineFamily);
  assert.throws(() => generateToyPipelineFamily({ seed: 0, caseId: 'toy-inference-pipeline', difficulty: 'core' }), /Unbekannter Fall/);
  assert.throws(() => generateToyPipelineFamily({ seed: 0, caseId: 'nope', difficulty: 'challenge' }), /Unbekannter Fall/);
  assert.throws(() => generateToyPipelineFamily({ seed: 0.5, caseId: 'toy-inference-pipeline', difficulty: 'challenge' }), /Seed/);
  assert.throws(() => solveToyPipelineFamily({}), /Kapselform/);
});

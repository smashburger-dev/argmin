// Procedural family aggregate-detector-eval-compare: capsule gates.
// Run: node --test tests/procedural_detector_eval_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DETECTOR_EVAL_CASES,
  DETECTOR_EVAL_CONTRACT,
  FAMILY_SPEC,
  detectorEvalCaseOk,
  genDetectorEvalCase,
  generateDetectorEvalFamily,
  solveDetectorEvalFamily,
} from '../assets/js/core/procedural/aggregate-detector-eval-compare.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CASE_IDS = ['run-eval-compare-rulesets', 'detector-table-best-f1'];

test('anchor: contract null, cases fully preserved as oracle', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/aggregate-detector-eval-compare.json'), 'utf8'));
  assert.equal(doc.contract, null);
  assert.equal(doc.cases.length, 2);
  for (const caseId of CASE_IDS) {
    const body = doc.cases.find((item) => item.caseId === caseId);
    assert.ok(body, `${caseId}: anchor missing`);
    assert.ok(body.parameters.tests.includes('__check'), `${caseId}: base tests preserved`);
    assert.equal(body.expected.kind, 'reference-solver');
    assert.ok(body.expected.referenceSolver.length > 50, `${caseId}: reference solver preserved`);
  }
  // base test blocks and prompts must equal the module constants verbatim
  for (const caseId of CASE_IDS) {
    const body = doc.cases.find((item) => item.caseId === caseId);
    const def = DETECTOR_EVAL_CASES[caseId];
    assert.equal(body.parameters.tests, def.baseTests, `${caseId}: base tests verbatim`);
    assert.equal(body.parameters.starterCode, def.starterCode, `${caseId}: starter verbatim`);
    assert.equal(body.prompt, def.prompt, `${caseId}: prompt verbatim`);
    assert.equal(body.expected.referenceSolver, def.referenceSolver, `${caseId}: solver verbatim`);
    assert.equal(body.fullSolution, def.fullSolution, `${caseId}: solution verbatim`);
  }
});

test('capsule shape: generated parameters satisfy detectorEvalCaseOk over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = DETECTOR_EVAL_CASES[caseId];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genDetectorEvalCase(seed, def);
      assert.ok(detectorEvalCaseOk(generated.parameters, def), `${caseId}:${seed}: shape`);
      assert.ok(generated.parameters.tests.startsWith(def.baseTests), `${caseId}:${seed}: base block kept`);
      assert.ok(generated.parameters.tests.includes('# seeded extra cases'), `${caseId}:${seed}: seeded block`);
      assert.equal(generated.expected.referenceSolver, def.referenceSolver);
      assert.equal(generated.prompt, def.prompt);
    }
  }
});

test('seeded draws stay inside the declared domains', () => {
  const SOURCES = ['faq-3', 'faq-7', 'vertrag-1'];
  const LABELS = new Set(['formatfehler', 'quellos', 'off-topic', 'halluziniert', 'falsch-faktisch', 'unvollständig']);
  for (let seed = 0; seed < 200; seed += 1) {
    const evalCase = genDetectorEvalCase(seed, DETECTOR_EVAL_CASES['run-eval-compare-rulesets']);
    for (const entry of evalCase.parameters.seedCases) {
      assert.ok(entry.records.length >= 4 && entry.records.length <= 6, 'eval record count');
      for (const rec of entry.records) {
        assert.ok(LABELS.has(rec.label), `label domain: ${rec.label}`);
        assert.ok(typeof rec.answer === 'string' && typeof rec.gold === 'string', 'record text');
        assert.ok(rec.citations.every((c) => SOURCES.includes(c) || typeof c === 'string'), 'citation domain');
      }
    }
    const tableCase = genDetectorEvalCase(seed, DETECTOR_EVAL_CASES['detector-table-best-f1']);
    for (const entry of tableCase.parameters.seedCases) {
      assert.ok(entry.corpus.length >= 5 && entry.corpus.length <= 7, 'corpus size');
      assert.ok(entry.corpus.some((item) => item.label) , 'at least one positive');
      assert.deepEqual(Object.keys(entry.ruleSets).sort(), ['locker', 'streng'], 'two named rule sets');
      assert.ok(entry.ruleSets.streng.length >= 2 && entry.ruleSets.streng.length <= 3, 'streng rules');
      assert.ok(entry.ruleSets.locker.length === 2, 'locker rules');
    }
  }
});

test('distinct floor: at least 40 distinct parameter sets per case over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = DETECTOR_EVAL_CASES[caseId];
    const seen = new Set();
    for (let seed = 0; seed < 200; seed += 1) {
      seen.add(JSON.stringify(generateDetectorEvalFamily({ seed, caseId, difficulty: def.difficulty }).parameters));
    }
    assert.ok(seen.size >= 40, `${caseId}: only ${seen.size} distinct`);
  }
});

test('determinism: same seed reproduces identical output, negative seeds valid', () => {
  for (const caseId of CASE_IDS) {
    const def = DETECTOR_EVAL_CASES[caseId];
    for (let seed = -20; seed < 20; seed += 1) {
      assert.deepEqual(genDetectorEvalCase(seed, def), genDetectorEvalCase(seed, def), `${caseId}:${seed}`);
    }
  }
});

test('solver consistency: solve returns the case reference solver', () => {
  for (const caseId of CASE_IDS) {
    const def = DETECTOR_EVAL_CASES[caseId];
    for (let seed = 0; seed < 50; seed += 1) {
      const generated = generateDetectorEvalFamily({ seed, caseId, difficulty: def.difficulty });
      assert.deepEqual(solveDetectorEvalFamily(generated.parameters), { referenceCode: def.referenceSolver });
    }
  }
});

test('oracle key: seeded checks embed the drawn scenario and expectations', () => {
  for (const caseId of CASE_IDS) {
    const def = DETECTOR_EVAL_CASES[caseId];
    const generated = genDetectorEvalCase(3, def);
    for (let i = 0; i < def.extraCount; i += 1) {
      assert.ok(generated.parameters.tests.includes(`seeded`) && generated.parameters.tests.includes(`${i + 1}'`), `${caseId}: check ${i + 1} present`);
    }
  }
  // the eval case references the base-block fixtures and the drawn records
  const evalGenerated = genDetectorEvalCase(3, DETECTOR_EVAL_CASES['run-eval-compare-rulesets']);
  assert.ok(evalGenerated.parameters.tests.includes('run_eval(__r1, RULES_FULL)'));
  assert.ok(evalGenerated.parameters.tests.includes('compare_rulesets(__r1, RULES_FULL, RULES_NO_NUMBERS)'));
  const tableGenerated = genDetectorEvalCase(3, DETECTOR_EVAL_CASES['detector-table-best-f1']);
  assert.ok(tableGenerated.parameters.tests.includes('detector_table(__c1, __s1)'));
  assert.ok(tableGenerated.parameters.tests.includes('best_by_f1(__t1)'));
});

test('family block: dispatch, contract, errors', () => {
  assert.equal(DETECTOR_EVAL_CONTRACT.familyId, 'aggregate-detector-eval-compare');
  assert.equal(DETECTOR_EVAL_CONTRACT.authorityMode, 'seeded');
  assert.equal(DETECTOR_EVAL_CONTRACT.activityType, 'python-code');
  assert.equal(DETECTOR_EVAL_CONTRACT.graderId, 'pyodide');
  assert.equal(DETECTOR_EVAL_CONTRACT.masteryEligible, true);
  assert.deepEqual(DETECTOR_EVAL_CONTRACT.difficultyProfiles, ['challenge']);
  assert.deepEqual(DETECTOR_EVAL_CONTRACT.competencyIds, ['c-genai-eval', 'c-ml-erroranalysis', 'c-genai-security', 'c-testing-debugging']);
  assert.throws(() => generateDetectorEvalFamily({ seed: 0, caseId: 'run-eval-compare-rulesets', difficulty: 'core' }), /Unbekannter Fall/);
  assert.throws(() => generateDetectorEvalFamily({ seed: 0, caseId: 'nope', difficulty: 'challenge' }), /Unbekannter Fall/);
  assert.throws(() => generateDetectorEvalFamily({ seed: 0.5, caseId: 'run-eval-compare-rulesets', difficulty: 'challenge' }), /Seed/);
  assert.throws(() => solveDetectorEvalFamily({}), /Kapselform/);
  assert.equal(typeof FAMILY_SPEC.generate, 'function');
  assert.equal(typeof FAMILY_SPEC.solve, 'function');
});

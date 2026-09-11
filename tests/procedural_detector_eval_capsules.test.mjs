// Procedural family aggregate-detector-eval-compare: capsule gates.
// Run: node --test tests/procedural_detector_eval_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import * as mod from '../assets/js/core/procedural/aggregate-detector-eval-compare.mjs';
import { codeCapsuleSuite } from './procedural_capsule_suites.mjs';

const CASE_IDS = ['run-eval-compare-rulesets', 'detector-table-best-f1'];

codeCapsuleSuite('aggregate-detector-eval-compare', mod, [
  { caseId: 'run-eval-compare-rulesets', difficulty: 'challenge' },
  { caseId: 'detector-table-best-f1', difficulty: 'challenge' },
], { difficultyProfiles: ['challenge'] });

test('seeded draws stay inside the declared domains', () => {
  const SOURCES = ['faq-3', 'faq-7', 'vertrag-1'];
  const LABELS = new Set(['formatfehler', 'quellos', 'off-topic', 'halluziniert', 'falsch-faktisch', 'unvollständig']);
  for (let seed = 0; seed < 200; seed += 1) {
    const evalCase = mod.genDetectorEvalCase(seed, 'run-eval-compare-rulesets', mod.DETECTOR_EVAL_CASES['run-eval-compare-rulesets']);
    assert.ok(evalCase.parameters.tests.includes('# seeded extra cases'), `${seed}: seeded block`);
    for (const entry of evalCase.parameters.seedCases) {
      assert.ok(entry.records.length >= 4 && entry.records.length <= 6, 'eval record count');
      for (const rec of entry.records) {
        assert.ok(LABELS.has(rec.label), `label domain: ${rec.label}`);
        assert.ok(typeof rec.answer === 'string' && typeof rec.gold === 'string', 'record text');
        assert.ok(rec.citations.every((c) => SOURCES.includes(c) || typeof c === 'string'), 'citation domain');
      }
    }
    const tableCase = mod.genDetectorEvalCase(seed, 'detector-table-best-f1', mod.DETECTOR_EVAL_CASES['detector-table-best-f1']);
    assert.ok(tableCase.parameters.tests.includes('# seeded extra cases'), `${seed}: seeded block`);
    for (const entry of tableCase.parameters.seedCases) {
      assert.ok(entry.corpus.length >= 5 && entry.corpus.length <= 7, 'corpus size');
      assert.ok(entry.corpus.some((item) => item.label) , 'at least one positive');
      assert.deepEqual(Object.keys(entry.ruleSets).sort(), ['locker', 'streng'], 'two named rule sets');
      assert.ok(entry.ruleSets.streng.length >= 2 && entry.ruleSets.streng.length <= 3, 'streng rules');
      assert.ok(entry.ruleSets.locker.length === 2, 'locker rules');
    }
  }
});

test('oracle key: seeded checks embed the drawn scenario and expectations', () => {
  for (const caseId of CASE_IDS) {
    const def = mod.DETECTOR_EVAL_CASES[caseId];
    const generated = mod.genDetectorEvalCase(3, caseId, def);
    for (let i = 0; i < def.extraCount; i += 1) {
      assert.ok(generated.parameters.tests.includes(`seeded`) && generated.parameters.tests.includes(`${i + 1}'`), `${caseId}: check ${i + 1} present`);
    }
  }
  // the eval case references the base-block fixtures and the drawn records
  const evalGenerated = mod.genDetectorEvalCase(3, 'run-eval-compare-rulesets', mod.DETECTOR_EVAL_CASES['run-eval-compare-rulesets']);
  assert.ok(evalGenerated.parameters.tests.includes('run_eval(__r1, RULES_FULL)'));
  assert.ok(evalGenerated.parameters.tests.includes('compare_rulesets(__r1, RULES_FULL, RULES_NO_NUMBERS)'));
  const tableGenerated = mod.genDetectorEvalCase(3, 'detector-table-best-f1', mod.DETECTOR_EVAL_CASES['detector-table-best-f1']);
  assert.ok(tableGenerated.parameters.tests.includes('detector_table(__c1, __s1)'));
  assert.ok(tableGenerated.parameters.tests.includes('best_by_f1(__t1)'));
});

test('family extras: contract competencies', () => {
  assert.deepEqual(mod.DETECTOR_EVAL_CONTRACT.competencyIds, ['c-genai-eval', 'c-ml-erroranalysis', 'c-genai-security', 'c-testing-debugging']);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  generateFormulaRatioPercentMetricFamily,
  generateFormulaStatFromTableFamily,
  solveFormulaRatioPercentMetric,
  solveFormulaStatFromTable,
} from '../assets/js/core/data_ml_families.mjs';
import {
  genBaselineLedger,
  genPipelineStages,
  genEvalRates,
} from '../assets/js/core/capstone_generators.mjs';
import {
  generateValidateCountFamily,
  solveValidateCount,
} from '../assets/js/core/foundations_construct_families.mjs';
import { configureExerciseFamilies } from '../assets/js/domain/exercise_registry.mjs';
import { registerStaticCases } from '../assets/js/domain/family_registry.mjs';
import './helpers/register_static_cases.mjs';
import { legacyOracle } from './helpers/legacy_oracle.mjs';

const root = join(new URL('..', import.meta.url).pathname);
const legacy = Object.fromEntries([34, 35, 37].map((week) => [week, legacyOracle.weeks[`w${week}`]]));
const familyDocs = [
  'formula-ratio-percent-metric',
  'formula-stat-from-table',
  'aggregate-validate-and-count-records',
  'validate-required-field-raise',
  'construct-freeze-assert-guard',
  'aggregate-evidence-rule-audit',
].map((familyId) => JSON.parse(readFileSync(join(root, `content/families/${familyId}.json`), 'utf8')));
for (const doc of familyDocs) registerStaticCases(doc.familyId, doc.cases);
const families = configureExerciseFamilies(familyDocs);

const seeded = [
  {
    caseId: 'baseline-ledger-rates', week: 34, seed: 3411,
    generate: generateFormulaRatioPercentMetricFamily, solve: solveFormulaRatioPercentMetric,
    generator: genBaselineLedger,
    intro: (p) => p.shape === 'naive-percent', stretch: (p) => p.shape === 'gap-promille',
  },
  {
    caseId: 'pipeline-stage-audit', week: 35, seed: 3511,
    generate: generateFormulaStatFromTableFamily, solve: solveFormulaStatFromTable,
    generator: genPipelineStages,
    intro: (p) => p.shape === 'valid-count', stretch: (p) => p.shape === 'missing-hashes',
  },
  {
    caseId: 'eval-batch-rates', week: 37, seed: 3711,
    generate: generateFormulaStatFromTableFamily, solve: solveFormulaStatFromTable,
    generator: genEvalRates,
    intro: (p) => p.shape === 'retrieval-error-count' || p.shape === 'answer-error-count',
    stretch: (p) => p.shape === 'answer-rate-percent' || p.shape === 'retrieval-hit-percent',
  },
];

for (const item of seeded) {
  test(`${item.caseId}: independent solver and exact predicates over 200 seeds`, () => {
    for (const difficulty of ['intro', 'stretch']) {
      const accepts = difficulty === 'intro' ? item.intro : item.stretch;
      for (let seed = 0; seed < 200; seed += 1) {
        const generated = item.generate({ seed, caseId: item.caseId, difficulty });
        assert.equal(accepts(generated.parameters), true);
        assert.equal(item.solve(generated.parameters).value, generated.expected.value);
      }
    }
  });

  test(`${item.caseId}: canonical seed matches legacy defaultExpected`, () => {
    const legacyCase = legacy[item.week].exercises[1];
    const generated = item.generate({ seed: item.seed, caseId: item.caseId, difficulty: 'core' });
    assert.equal(generated.expected.value, legacyCase.expectedAnswer.defaultExpected);
  });

  test(`${item.caseId}: raw predicate acceptance is reported and above 10 percent`, () => {
    for (const predicate of [item.intro, item.stretch]) {
      let accepted = 0;
      for (let seed = 0; seed < 2000; seed += 1) accepted += predicate(item.generator(seed).parameters) ? 1 : 0;
      console.log(`${item.caseId}: ${accepted}/2000 (${(accepted / 20).toFixed(2)}%)`);
      assert.ok(accepted >= 200);
    }
  });
}





test('Parsons family hosts W35 e5 and W39 e4 static cases', () => {
  const parsons = families.instantiate('construct-freeze-assert-guard', 0, 'stretch', 'freeze-assert-parsons');
  assert.equal(parsons.activityType, 'parsons');
  assert.equal(parsons.expectedAnswer.kind, 'ordered-lines');
  const python = families.instantiate('construct-freeze-assert-guard', 0, 'core', 'demo-from-frozen-report');
  assert.equal(python.activityType, 'python-code');
});

test('code-trace grader accepts authored string variables with or without quotes', async () => {
  const { graders } = await import('../assets/js/core/graders.js');
  const exercise = {
    type: 'code-trace',
    parameters: { variables: [{ name: 'status_zeile', value: 'ok fehler timeout' }, { name: 'summe', value: 7 }] },
  };
  const grade = (status_zeile) => graders.deterministic.grade(exercise, { status_zeile, summe: '7' });
  assert.equal((await grade('ok fehler timeout')).correct, true);
  assert.equal((await grade("'ok fehler timeout'")).correct, true);
  assert.equal((await grade('ok fehler')).correct, false);
});

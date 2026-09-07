import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  generateAggregateTopkRelevanceArithmeticFamily,
  generateValidateGoalshiftFlagRulesFamily,
  generateFormulaStatFromTableFamily,
  generateAggregateConfusionMetricFamily,
  generateFormulaRatioPercentMetricFamily,
  solveAggregateTopkRelevanceArithmetic,
  solveValidateGoalshiftFlagRules,
  solveFormulaStatFromTable,
  solveAggregateConfusionMetric,
  solveFormulaRatioPercentMetric,
} from '../assets/js/core/data_ml_families.mjs';
import { genRecallAtK, genF1orPrecision, genInjectionFlagCount, genAllowedActionCount } from '../assets/js/core/genai_research_generators.mjs';
import { genProtocolShifts, genCardAudit, genSubgroupCost, protocolShiftFlags, countCardDefects, subgroupRatePerMille } from '../assets/js/core/capstone_generators.mjs';
import { configureExerciseFamilies } from '../assets/js/domain/exercise_registry.mjs';
import { registerStaticCases } from '../assets/js/domain/family_registry.mjs';
import { TRACE_ASSIGNMENT_CONTRACT } from '../assets/js/core/foundations_trace_families.mjs';
import { legacyOracle } from './helpers/legacy_oracle.mjs';

const root = join(new URL('..', import.meta.url).pathname);
const legacy = Object.fromEntries([27, 28, 29, 30, 31, 32, 33].map((week) => [week, legacyOracle.weeks[`w${week}`]]));
const familyDocs = readdirSync(join(root, 'content/families')).filter((name) => name.endsWith('.json')).map((name) => JSON.parse(readFileSync(join(root, 'content/families', name), 'utf8')));
for (const doc of familyDocs) registerStaticCases(doc.familyId, doc.cases);
const families = configureExerciseFamilies(familyDocs);

const seeded = [
  { name: 'recall-at-k-window', week: 27, source: 'w27-e2', generate: generateAggregateTopkRelevanceArithmeticFamily, solve: solveAggregateTopkRelevanceArithmetic, generator: genRecallAtK, intro: (p) => p.shape === 'hits', stretch: (p) => p.shape === 'percent' || p.shape === 'irrelevant' },
  { name: 'answer-filter-precision-recall-f1', week: 28, source: 'w28-e2', generate: (x) => generateAggregateConfusionMetricFamily({ ...x, caseId: 'answer-filter-precision-recall-f1' }), solve: solveAggregateConfusionMetric, generator: genF1orPrecision, intro: (p) => p.shape === 'precision', stretch: (p) => p.shape === 'f1' },
  { name: 'injection-filter-counts', week: 29, source: 'w29-e2', generate: (x) => generateAggregateConfusionMetricFamily({ ...x, caseId: 'injection-filter-counts' }), solve: solveAggregateConfusionMetric, generator: genInjectionFlagCount, intro: (p) => p.shape === 'missed' || p.shape === 'false-alarms', stretch: (p) => p.shape === 'caught-percent' },
  { name: 'allowed-action-count', week: 30, source: 'w30-e2', generate: generateFormulaRatioPercentMetricFamily, solve: solveFormulaRatioPercentMetric, generator: genAllowedActionCount, intro: (p) => p.shape === 'allowed', stretch: (p) => p.shape === 'percent' },
  { name: 'protocol-shift-flag-count', week: 31, source: 'w31-e2', generate: generateValidateGoalshiftFlagRulesFamily, solve: solveValidateGoalshiftFlagRules, generator: genProtocolShifts, intro: (p) => protocolShiftFlags(p.versionen.a, p.versionen.b).length === 1, stretch: (p) => protocolShiftFlags(p.versionen.a, p.versionen.b).length >= 3 },
  { name: 'card-audit-missing-count', week: 32, source: 'w32-e2', generate: generateFormulaStatFromTableFamily, solve: solveFormulaStatFromTable, generator: genCardAudit, intro: (p) => p.karten.length === 1, stretch: (p) => p.karten.length === 2 },
  { name: 'subgroup-rate-gap-permille', week: 33, source: 'w33-e2', generate: (x) => generateAggregateConfusionMetricFamily({ ...x, caseId: 'subgroup-rate-gap-permille' }), solve: solveAggregateConfusionMetric, generator: genSubgroupCost, intro: (p) => p.shape === 'fpr-diff', stretch: (p) => p.shape === 'selrate-diff' },
];

for (const item of seeded) {
  test(`${item.name}: independent solver and profiles over 200 seeds`, () => {
    for (const difficulty of ['intro', 'stretch']) {
      let accepted = 0;
      for (let seed = 0; seed < 200; seed += 1) {
        const instance = item.generate({ seed, caseId: item.name, difficulty });
        assert.equal(item.solve(instance.parameters).value, instance.expected.value, `${item.name}:${difficulty}:${seed}`);
        const profile = difficulty === 'intro' ? item.intro : item.stretch;
        assert.equal(profile(instance.parameters), true);
        accepted += 1;
      }
      assert.equal(accepted, 200);
    }
  });
}







test('W27-W33 static registrations and module placements resolve', () => {
  const modules = ['lm-genai-rag', 'lm-genai-eval', 'lm-genai-security', 'lm-genai-prototype', 'lm-research-question', 'lm-research-cards', 'lm-research-responsible'];
  for (const moduleId of modules) {
    const doc = JSON.parse(readFileSync(join(root, 'content/modules', `${moduleId}.json`), 'utf8'));
    assert.equal(doc.placements.length, 7, moduleId);
    for (const placement of doc.placements) {
      const instance = families.instantiate(placement.familyId, placement.seed, placement.difficulty, placement.caseId);
      assert.equal(instance.caseId, placement.caseId);
    }
    assert.equal(doc.placements[1].seed, Number(`${moduleId.includes('genai-rag') ? 27 : moduleId.includes('genai-eval') ? 28 : moduleId.includes('genai-security') ? 29 : moduleId.includes('genai-prototype') ? 30 : moduleId.includes('research-question') ? 31 : moduleId.includes('research-cards') ? 32 : 33}11`));
  }
});

test('E12 and E13 static trace registrations preserve their overrides', () => {
  const cardAudit = families.instantiate('formula-stat-from-table', 0, 'intro', 'card-audit-missing-count');
  assert.deepEqual(cardAudit.competencyIds, ['c-research-cards']);

  const metricTrace = families.instantiate('trace-assignment-state', 0, 'core', 'metric-name-normalize-trace');
  assert.deepEqual(metricTrace.competencyIds, ['c-research-question', 'c-python-reading']);
  assert.deepEqual(metricTrace.expectedAnswer, {
    kind: 'output-lines',
    output: 'die chunkgröße\n' +
      'der anteil korrekter antworten\n' +
      'die überlappung\n' +
      'die recall@5-quote',
  });
  assert.ok(TRACE_ASSIGNMENT_CONTRACT.caseTypes.some((caseType) => caseType.caseId === 'metric-name-normalize-trace' && caseType.propertyTest === false));
});

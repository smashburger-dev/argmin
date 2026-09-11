// Procedural family aggregate-grouped-metrics-report: capsule gates (python-code).
// Run: node --test tests/procedural_aggregate_grouped_metrics_capsules.test.mjs
import * as mod from '../assets/js/core/procedural/aggregate-grouped-metrics-report.mjs';
import { codeCapsuleSuite } from './procedural_capsule_suites.mjs';

codeCapsuleSuite('aggregate-grouped-metrics-report', mod, [
  { caseId: 'hypothesis-report-groups', difficulty: 'stretch' },
  { caseId: 'subgroup-error-rates-numpy', difficulty: 'core', competencyIds: ['c-ml-erroranalysis'] },
  { caseId: 'categorize-errors-report', difficulty: 'stretch', competencyIds: ['c-ml-erroranalysis'] },
  { caseId: 'subgroup-recall-report', difficulty: 'core', competencyIds: ['c-capstone-pipeline', 'c-genai-security'] },
]);

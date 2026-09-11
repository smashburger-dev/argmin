// Procedural family validate-report-guard-compose: capsule gates (python-code).
// Run: node --test tests/procedural_report_guard_capsules.test.mjs
import * as mod from '../assets/js/core/procedural/validate-report-guard-compose.mjs';
import { codeCapsuleSuite } from './procedural_capsule_suites.mjs';

codeCapsuleSuite('validate-report-guard-compose', mod, [
  { caseId: 'report-guard-compose', difficulty: 'challenge', competencyIds: ['c-research-responsible', 'c-genai-eval'] },
  { caseId: 'baseline-report', difficulty: 'challenge', competencyIds: ['c-research-capstone', 'c-genai-eval'] },
]);

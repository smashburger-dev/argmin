// Procedural family reproduce-run-digest-assert: capsule gates (python-code).
// Run: node --test tests/procedural_run_digest_capsules.test.mjs
import * as mod from '../assets/js/core/procedural/reproduce-run-digest-assert.mjs';
import { codeCapsuleSuite } from './procedural_capsule_suites.mjs';

codeCapsuleSuite('reproduce-run-digest-assert', mod, [
  { caseId: 'run-digest-assert', difficulty: 'stretch', competencyIds: ['c-research-capstone', 'c-python-functions'] },
  { caseId: 'pipeline-freeze-report', difficulty: 'challenge', competencyIds: ['c-capstone-pipeline', 'c-ml-repro'] },
  { caseId: 'reproduction-verdict-rules', difficulty: 'challenge', competencyIds: ['c-capstone-pipeline', 'c-ml-repro'] },
]);

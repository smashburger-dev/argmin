// Procedural family reproduce-seeded-experiment-report: capsule gates (python-code).
// Run: node --test tests/procedural_seeded_experiment_capsules.test.mjs
import * as mod from '../assets/js/core/procedural/reproduce-seeded-experiment-report.mjs';
import { codeCapsuleSuite } from './procedural_capsule_suites.mjs';

codeCapsuleSuite('reproduce-seeded-experiment-report', mod, [
  { caseId: 'seeded-experiment-manifest', difficulty: 'core', competencyIds: ['c-ml-repro', 'c-numpy-basics'] },
  { caseId: 'repro-report-table-check', difficulty: 'stretch', competencyIds: ['c-ml-repro', 'c-numpy-basics'] },
]);

// Procedural family trace-toposort-dependency-order: capsule gates.
// Run: node --test tests/procedural_toposort_capsules.test.mjs
import * as mod from '../assets/js/core/procedural/trace-toposort-dependency-order.mjs';
import { predictCapsuleSuite } from './procedural_capsule_suites.mjs';

predictCapsuleSuite('trace-toposort-dependency-order', mod, [
  { caseId: 'toposort-dependency-order', difficulty: 'core', competencyIds: ['c-capstone-pipeline', 'c-python-reading'] },
]);

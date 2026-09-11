// Procedural family trace-training-loop-count: capsule gates.
// Run: node --test tests/procedural_training_loop_capsules.test.mjs
import * as mod from '../assets/js/core/procedural/trace-training-loop-count.mjs';
import { predictCapsuleSuite } from './procedural_capsule_suites.mjs';

predictCapsuleSuite('trace-training-loop-count', mod, [
  { caseId: 'training-loop-count', difficulty: 'core', competencyIds: ['c-dl-training', 'c-python-reading'] },
  { caseId: 'training-loop-drop-last', difficulty: 'core', competencyIds: ['c-dl-training', 'c-python-reading'] },
  { caseId: 'training-loop-early-stop-counter', difficulty: 'stretch', competencyIds: ['c-dl-training', 'c-python-reading'] },
]);

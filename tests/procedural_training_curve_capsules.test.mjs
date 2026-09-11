// Procedural family classify-training-curve: capsule gates (single-choice).
// Run: node --test tests/procedural_training_curve_capsules.test.mjs
import * as mod from '../assets/js/core/procedural/classify-training-curve.mjs';
import { choiceCapsuleSuite } from './procedural_capsule_suites.mjs';

choiceCapsuleSuite('classify-training-curve', mod, [
  { caseId: 'training-curve-diagnosis', difficulty: 'intro', competencyIds: ['c-dl-training'] },
  { caseId: 'training-curve-overfit', difficulty: 'core', competencyIds: ['c-dl-training'] },
  { caseId: 'training-curve-underfit', difficulty: 'stretch', competencyIds: ['c-dl-training'] },
]);

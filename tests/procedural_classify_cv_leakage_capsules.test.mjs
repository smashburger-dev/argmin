// Procedural family classify-cv-leakage: capsule gates (single-choice).
// Run: node --test tests/procedural_classify_cv_leakage_capsules.test.mjs
import * as mod from '../assets/js/core/procedural/classify-cv-leakage.mjs';
import { choiceCapsuleSuite } from './procedural_capsule_suites.mjs';

choiceCapsuleSuite('classify-cv-leakage', mod, [
  { caseId: 'impute-before-split', difficulty: 'core', competencyIds: ['c-ml-cv'] },
  { caseId: 'target-encoding-leakage', difficulty: 'core', competencyIds: ['c-ml-regularization'] },
]);

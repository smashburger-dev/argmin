// Procedural family classify-dropout-regime: capsule gates (single-choice).
// Run: node --test tests/procedural_dropout_regime_capsules.test.mjs
import * as mod from '../assets/js/core/procedural/classify-dropout-regime.mjs';
import { choiceCapsuleSuite } from './procedural_capsule_suites.mjs';

choiceCapsuleSuite('classify-dropout-regime', mod, [
  { caseId: 'dropout-regime', difficulty: 'intro', competencyIds: ['c-dl-regularization'] },
  { caseId: 'dropout-inverted-scale', difficulty: 'core', competencyIds: ['c-dl-regularization'] },
  { caseId: 'dropout-eval-mode', difficulty: 'stretch', competencyIds: ['c-dl-regularization'] },
]);

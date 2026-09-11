// Procedural family classify-eval-hazard: capsule gates (single-choice).
// Run: node --test tests/procedural_classify_eval_hazard_capsules.test.mjs
import * as mod from '../assets/js/core/procedural/classify-eval-hazard.mjs';
import { choiceCapsuleSuite } from './procedural_capsule_suites.mjs';

choiceCapsuleSuite('classify-eval-hazard', mod, [
  { caseId: 'eval-hazard-taxonomy', difficulty: 'intro' },
]);

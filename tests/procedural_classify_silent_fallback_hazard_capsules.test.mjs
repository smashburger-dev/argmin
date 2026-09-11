// Procedural family classify-silent-fallback-hazard: capsule gates (single-choice).
// Run: node --test tests/procedural_classify_silent_fallback_hazard_capsules.test.mjs
import * as mod from '../assets/js/core/procedural/classify-silent-fallback-hazard.mjs';
import { choiceCapsuleSuite } from './procedural_capsule_suites.mjs';

choiceCapsuleSuite('classify-silent-fallback-hazard', mod, [
  { caseId: 'silent-fallback-hazard', difficulty: 'intro' },
]);

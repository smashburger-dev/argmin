// Procedural family classify-freeze-purpose: capsule gates (single-choice).
// Run: node --test tests/procedural_classify_freeze_purpose_capsules.test.mjs
import * as mod from '../assets/js/core/procedural/classify-freeze-purpose.mjs';
import { choiceCapsuleSuite } from './procedural_capsule_suites.mjs';

choiceCapsuleSuite('classify-freeze-purpose', mod, [
  { caseId: 'freeze-purpose', difficulty: 'intro' },
]);

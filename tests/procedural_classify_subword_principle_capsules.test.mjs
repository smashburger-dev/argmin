// Procedural family classify-subword-principle: capsule gates (single-choice).
// Run: node --test tests/procedural_classify_subword_principle_capsules.test.mjs
import * as mod from '../assets/js/core/procedural/classify-subword-principle.mjs';
import { choiceCapsuleSuite } from './procedural_capsule_suites.mjs';

choiceCapsuleSuite('classify-subword-principle', mod, [
  { caseId: 'subword-oov-robustness', difficulty: 'intro' },
  { caseId: 'subword-unknown-piece', difficulty: 'core' },
  { caseId: 'subword-boundary-sharing', difficulty: 'stretch' },
]);

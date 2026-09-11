// Procedural family construct-linalg-contract-synthesis: capsule gates (single-choice).
// Run: node --test tests/procedural_construct_linalg_synthesis_capsules.test.mjs
import * as mod from '../assets/js/core/procedural/construct-linalg-contract-synthesis.mjs';
import { choiceCapsuleSuite } from './procedural_capsule_suites.mjs';

choiceCapsuleSuite('construct-linalg-contract-synthesis', mod, [
  { caseId: 'synthesis-three-contracts', difficulty: 'challenge' },
  { caseId: 'synthesis-singular-guard', difficulty: 'core' },
  { caseId: 'synthesis-row-swap', difficulty: 'stretch' },
]);

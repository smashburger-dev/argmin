// Procedural family classify-freeze-scope: capsule gates (single-choice).
// Run: node --test tests/procedural_freeze_scope_capsules.test.mjs
import * as mod from '../assets/js/core/procedural/classify-freeze-scope.mjs';
import { choiceCapsuleSuite } from './procedural_capsule_suites.mjs';

choiceCapsuleSuite('classify-freeze-scope', mod, [
  { caseId: 'freeze-scope', difficulty: 'intro', competencyIds: ['c-capstone-pipeline'] },
]);

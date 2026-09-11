// Procedural family classify-attention-roles: capsule gates (single-choice).
// Run: node --test tests/procedural_attention_roles_capsules.test.mjs
import * as mod from '../assets/js/core/procedural/classify-attention-roles.mjs';
import { choiceCapsuleSuite } from './procedural_capsule_suites.mjs';

choiceCapsuleSuite('classify-attention-roles', mod, [
  { caseId: 'attention-role-values', difficulty: 'intro', competencyIds: ['c-dl-attention'] },
  { caseId: 'attention-role-batch', difficulty: 'core', competencyIds: ['c-dl-attention'] },
  { caseId: 'attention-role-padding', difficulty: 'stretch', competencyIds: ['c-dl-attention'] },
]);

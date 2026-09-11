// Procedural family classify-backprop-path-rule: capsule gates (single-choice).
// Run: node --test tests/procedural_backprop_path_capsules.test.mjs
import * as mod from '../assets/js/core/procedural/classify-backprop-path-rule.mjs';
import { choiceCapsuleSuite } from './procedural_capsule_suites.mjs';

choiceCapsuleSuite('classify-backprop-path-rule', mod, [
  { caseId: 'backprop-path-rule', difficulty: 'intro', competencyIds: ['c-dl-autograd'] },
  { caseId: 'backprop-chain-rule', difficulty: 'core', competencyIds: ['c-dl-autograd'] },
  { caseId: 'backprop-detached-branch', difficulty: 'stretch', competencyIds: ['c-dl-autograd'] },
]);

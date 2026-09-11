// Procedural family classify-decoding-strategy: capsule gates (single-choice).
// Run: node --test tests/procedural_decoding_strategy_capsules.test.mjs
import * as mod from '../assets/js/core/procedural/classify-decoding-strategy.mjs';
import { choiceCapsuleSuite } from './procedural_capsule_suites.mjs';

choiceCapsuleSuite('classify-decoding-strategy', mod, [
  { caseId: 'greedy-decoding', difficulty: 'intro', competencyIds: ['c-dl-inference'] },
  { caseId: 'decoding-temperature-low', difficulty: 'core', competencyIds: ['c-dl-inference'] },
  { caseId: 'decoding-top-k', difficulty: 'stretch', competencyIds: ['c-dl-inference'] },
]);

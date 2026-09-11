// Procedural family classify-fairness-aggregation: capsule gates (single-choice).
// Run: node --test tests/procedural_classify_fairness_aggregation_capsules.test.mjs
import * as mod from '../assets/js/core/procedural/classify-fairness-aggregation.mjs';
import { choiceCapsuleSuite } from './procedural_capsule_suites.mjs';

choiceCapsuleSuite('classify-fairness-aggregation', mod, [
  { caseId: 'overall-accuracy-hides-subgroups', difficulty: 'intro' },
  { caseId: 'fairness-aggregation', difficulty: 'intro', competencyIds: ['c-research-responsible'] },
]);

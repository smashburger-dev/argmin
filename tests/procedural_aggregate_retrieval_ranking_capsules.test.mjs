// Procedural family aggregate-retrieval-ranking-metric: capsule gates (python-code).
// Run: node --test tests/procedural_aggregate_retrieval_ranking_capsules.test.mjs
import * as mod from '../assets/js/core/procedural/aggregate-retrieval-ranking-metric.mjs';
import { codeCapsuleSuite } from './procedural_capsule_suites.mjs';

codeCapsuleSuite('aggregate-retrieval-ranking-metric', mod, [
  { caseId: 'retrieval-ranking-recall', difficulty: 'stretch', competencyIds: ['c-genai-rag', 'c-numpy-basics'] },
  { caseId: 'retrieval-evaluate-queries', difficulty: 'challenge', competencyIds: ['c-genai-rag', 'c-numpy-basics'] },
]);

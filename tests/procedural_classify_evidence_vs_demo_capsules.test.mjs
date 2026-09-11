// Procedural family classify-evidence-vs-demo: capsule gates (single-choice).
// Run: node --test tests/procedural_classify_evidence_vs_demo_capsules.test.mjs
import * as mod from '../assets/js/core/procedural/classify-evidence-vs-demo.mjs';
import { choiceCapsuleSuite } from './procedural_capsule_suites.mjs';

choiceCapsuleSuite('classify-evidence-vs-demo', mod, [
  { caseId: 'evidence-vs-demo', difficulty: 'intro', competencyIds: ['c-capstone-pipeline'] },
  { caseId: 'demo-vs-evidence', difficulty: 'intro', competencyIds: ['c-capstone-pipeline', 'c-ml-repro'] },
]);

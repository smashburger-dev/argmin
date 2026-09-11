// Procedural family classify-tool-policy: capsule gates (single-choice).
// Run: node --test tests/procedural_classify_tool_policy_capsules.test.mjs
import * as mod from '../assets/js/core/procedural/classify-tool-policy.mjs';
import { choiceCapsuleSuite } from './procedural_capsule_suites.mjs';

choiceCapsuleSuite('classify-tool-policy', mod, [
  { caseId: 'tool-policy-least-privilege', difficulty: 'intro' },
]);

// Procedural family classify-rule-cascade-priority: capsule gates (python-code).
// Run: node --test tests/procedural_rule_cascade_capsules.test.mjs
import * as mod from '../assets/js/core/procedural/classify-rule-cascade-priority.mjs';
import { codeCapsuleSuite } from './procedural_capsule_suites.mjs';

codeCapsuleSuite('classify-rule-cascade-priority', mod, [
  { caseId: 'error-taxonomy-classify', difficulty: 'core', competencyIds: ['c-genai-eval', 'c-python-functions'] },
  { caseId: 'permission-policy-check', difficulty: 'stretch', competencyIds: ['c-genai-security', 'c-testing-debugging'] },
]);

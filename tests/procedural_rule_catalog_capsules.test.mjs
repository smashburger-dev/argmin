// Procedural family validate-rule-catalog-scan: capsule gates (python-code).
// Run: node --test tests/procedural_rule_catalog_capsules.test.mjs
import * as mod from '../assets/js/core/procedural/validate-rule-catalog-scan.mjs';
import { codeCapsuleSuite } from './procedural_capsule_suites.mjs';

codeCapsuleSuite('validate-rule-catalog-scan', mod, [
  { caseId: 'card-secret-scan', difficulty: 'stretch', competencyIds: ['c-research-cards', 'c-genai-security'] },
  { caseId: 'cross-card-consistency', difficulty: 'challenge', competencyIds: ['c-research-cards', 'c-genai-security'] },
  { caseId: 'freeze-checker', difficulty: 'core', competencyIds: ['c-capstone-pipeline', 'c-python-functions'] },
  { caseId: 'pin-version-check', difficulty: 'stretch', competencyIds: ['c-capstone-pipeline', 'c-ml-repro'] },
]);

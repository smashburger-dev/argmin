// Procedural family construct-secure-prototype-contract: capsule gates (python-code).
// Run: node --test tests/procedural_construct_secure_prototype_contract_capsules.test.mjs
import * as mod from '../assets/js/core/procedural/construct-secure-prototype-contract.mjs';
import { codeCapsuleSuite } from './procedural_capsule_suites.mjs';

codeCapsuleSuite('construct-secure-prototype-contract', mod, [
  { caseId: 'secure-prototype-contract', difficulty: 'stretch', competencyIds: ['c-genai-prototype', 'c-python-functions'] },
]);

// Procedural family construct-stub-prototype-contract: capsule gates (python-code).
// Run: node --test tests/procedural_construct_stub_prototype_contract_capsules.test.mjs
import * as mod from '../assets/js/core/procedural/construct-stub-prototype-contract.mjs';
import { codeCapsuleSuite } from './procedural_capsule_suites.mjs';

codeCapsuleSuite('construct-stub-prototype-contract', mod, [
  { caseId: 'stub-prototype-contract', difficulty: 'core', competencyIds: ['c-genai-prototype', 'c-python-functions'] },
]);

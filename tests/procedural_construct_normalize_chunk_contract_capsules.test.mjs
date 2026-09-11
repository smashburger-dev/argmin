// Procedural family construct-normalize-chunk-contract: capsule gates (python-code).
// Run: node --test tests/procedural_construct_normalize_chunk_contract_capsules.test.mjs
import * as mod from '../assets/js/core/procedural/construct-normalize-chunk-contract.mjs';
import { codeCapsuleSuite } from './procedural_capsule_suites.mjs';

codeCapsuleSuite('construct-normalize-chunk-contract', mod, [
  { caseId: 'normalize-chunk-contract', difficulty: 'core', competencyIds: ['c-genai-rag', 'c-python-functions'] },
]);

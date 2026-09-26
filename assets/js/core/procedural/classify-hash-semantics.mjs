// Procedural family classify-hash-semantics: the seed draws a scenario from
// the curated bank and rotates the answer position via buildRotatedChoices.
// The bank keeps the curated base example verbatim as oracle (key 'base') —
// same prompt, same four option texts, same solution — plus new German
// scenarios that probe the same concept (integrity proof via canonical
// serialization: order-invariant, change-sensitive, comparability anchor).
// parameters carry only the scenario key, so nothing answer-relevant leaks
// into instance.parameters. Mirrors genSvmMarginCapsule in
// data_ml_families.mjs.

import { makeChoiceFamily } from '../generator_draw_kit.mjs';

import bank from '../../../../content/banks/classify-hash-semantics.json' with { type: 'json' };

export const HASH_SEMANTICS_CAPSULES = bank.capsules;

export const HASH_SEMANTICS_CONTRACT = {
  familyId: 'classify-hash-semantics',
  familyGroup: 'classify-concept',
  summary: 'Ordnet Hash-Fixierung als Integritäts- und Vergleichbarkeitsregel einer Capstone-Baseline ein.',
  taskArchetype: 'choice-diagnose',
  authorityMode: 'seeded',
  masteryEligible: false,
  caseTypes: [
    { caseId: 'hash-semantics-baseline', propertyTest: false },
  ],
  difficultyProfiles: ['intro'],
  competencyIds: ['c-research-capstone'],
};

export const FAMILY_SPEC = makeChoiceFamily({
  contract: HASH_SEMANTICS_CONTRACT,
  capsules: HASH_SEMANTICS_CAPSULES,
  shapeError: 'Hash-Semantik-Parameter verletzen die Kapselform',
});


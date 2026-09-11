// Procedural family construct-linalg-contract-synthesis: the seed draws a
// scenario from the curated bank and rotates the answer position via
// buildRotatedChoices. The bank keeps the curated base example verbatim as
// oracle (key 'base') — same prompt, same four option texts, same solution —
// plus new German scenarios that drill contract thinking in linear algebra:
// validate-then-compute ordering, pivot/row-swap semantics, singular guards,
// and why "compute first, check later" is not a contract. Capsules are keyed
// by difficulty (one case per profile). parameters carry only the scenario
// key, so nothing answer-relevant leaks into instance.parameters.
// Blueprint: classify-eval-hazard.mjs.

import { makeChoiceFamily } from '../generator_draw_kit.mjs';

import bank from '../../../../content/banks/construct-linalg-contract-synthesis.json' with { type: 'json' };

export const LINALG_SYNTH_CAPSULES = bank.capsules;

export const LINALG_SYNTH_CONTRACT = {
  familyId: 'construct-linalg-contract-synthesis',
  familyGroup: 'construct-program',
  summary: 'Wählt die Implementierung, die den Vertrag für lineare Algebra (Shape-Guards, Rang mit Zeilentausch, solve mit Singularitäts-Guard) wirklich erfüllt.',
  taskArchetype: 'choice-diagnose',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'synthesis-three-contracts', propertyTest: false },
    { caseId: 'synthesis-singular-guard', propertyTest: false },
    { caseId: 'synthesis-row-swap', propertyTest: false },
  ],
  difficultyProfiles: ['challenge', 'core', 'stretch'],
  competencyIds: ['c-numpy-basics', 'c-linalg-gauss'],
  graderId: 'deterministic',
  activityType: 'single-choice',
};

const FAMILY_IMPL = makeChoiceFamily({
  contract: LINALG_SYNTH_CONTRACT,
  capsules: LINALG_SYNTH_CAPSULES,
  shapeError: 'Linalg-Synthese-Parameter verletzen die Kapselform',
});

export const linalgSynthCapsuleOk = FAMILY_IMPL.capsuleOk;
export const linalgSynthCorrectText = FAMILY_IMPL.correctText;
export const genLinalgSynthCapsule = FAMILY_IMPL.genCapsule;
export const generateLinalgSynthFamily = FAMILY_IMPL.generate;
export const solveLinalgSynthFamily = FAMILY_IMPL.solve;
export const FAMILY_SPEC = FAMILY_IMPL.spec;

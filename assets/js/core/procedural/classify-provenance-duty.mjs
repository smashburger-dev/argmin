// Procedural family classify-provenance-duty: the seed draws a scenario from
// the curated bank and rotates the answer position via buildRotatedChoices.
// The bank keeps the curated base example verbatim as oracle (key 'base') —
// same prompt, same four option texts, same solution — plus new German
// scenarios that assign a usage to its provenance-duty class (prüfbarer
// Vertrag: Provenienz, Zweck, Evaluationsrahmen, Grenzen). parameters carry
// only the scenario key, so nothing answer-relevant leaks into
// instance.parameters. Mirrors genSvmMarginCapsule in data_ml_generators.mjs.

import { makeChoiceFamily } from '../generator_draw_kit.mjs';

import bank from '../../../../content/banks/classify-provenance-duty.json' with { type: 'json' };

export const PROVENANCE_DUTY_CAPSULES = bank.capsules;

export const PROVENANCE_DUTY_CONTRACT = {
  familyId: 'classify-provenance-duty',
  familyGroup: 'classify-concept',
  summary: 'Ordnet eine Verwendung der passenden Provenance-Pflichtklasse zu.',
  taskArchetype: 'choice-diagnose',
  authorityMode: 'seeded',
  masteryEligible: false,
  caseTypes: [
    { caseId: 'provenance-duty', propertyTest: false },
  ],
  difficultyProfiles: ['intro'],
  competencyIds: ['c-research-cards'],
  graderId: 'deterministic',
  activityType: 'single-choice',
};

const FAMILY_IMPL = makeChoiceFamily({
  contract: PROVENANCE_DUTY_CONTRACT,
  capsules: PROVENANCE_DUTY_CAPSULES,
  shapeError: 'Provenienz-Pflicht-Parameter verletzen die Kapselform',
});

export const provenanceDutyCapsuleOk = FAMILY_IMPL.capsuleOk;
export const provenanceDutyCorrectText = FAMILY_IMPL.correctText;
export const genProvenanceDutyCapsule = FAMILY_IMPL.genCapsule;
export const generateProvenanceDutyFamily = FAMILY_IMPL.generate;
export const solveProvenanceDutyFamily = FAMILY_IMPL.solve;
export const FAMILY_SPEC = FAMILY_IMPL.spec;

// Procedural family classify-silent-fallback-hazard: the seed draws a
// scenario from the curated bank and rotates the answer position via
// buildRotatedChoices. The bank keeps the curated base example verbatim as
// oracle (key 'base') — same prompt, same four option texts, same solution —
// plus new German scenarios that probe the same concept (a silent fallback
// hides a stage failure behind an ordinary value; the fix is a named status
// sentinel the caller can check and the runner can report). parameters carry
// only the scenario key, so nothing answer-relevant leaks into
// instance.parameters. Mirrors genSvmMarginCapsule in data_ml_generators.mjs.

import { makeChoiceFamily } from '../generator_draw_kit.mjs';

import bank from '../../../../content/banks/classify-silent-fallback-hazard.json' with { type: 'json' };

export const SILENT_FALLBACK_CAPSULES = bank.capsules;

export const SILENT_FALLBACK_CONTRACT = {
  familyId: 'classify-silent-fallback-hazard',
  familyGroup: 'classify-concept',
  summary: 'Erkennt stille Fallbacks als Gefahr für die Aussagekraft eines reproduzierbaren Stage-Runners.',
  taskArchetype: 'choice-diagnose',
  authorityMode: 'seeded',
  masteryEligible: false,
  caseTypes: [
    { caseId: 'silent-fallback-hazard', propertyTest: false },
  ],
  difficultyProfiles: ['intro'],
  competencyIds: ['c-capstone-pipeline'],
};

const FAMILY_IMPL = makeChoiceFamily({
  contract: SILENT_FALLBACK_CONTRACT,
  capsules: SILENT_FALLBACK_CAPSULES,
  shapeError: 'Silent-Fallback-Parameter verletzen die Kapselform',
});

export const silentFallbackCapsuleOk = FAMILY_IMPL.capsuleOk;
export const silentFallbackCorrectText = FAMILY_IMPL.correctText;
export const genSilentFallbackCapsule = FAMILY_IMPL.genCapsule;
export const generateSilentFallbackFamily = FAMILY_IMPL.generate;
export const solveSilentFallbackFamily = FAMILY_IMPL.solve;
export const FAMILY_SPEC = FAMILY_IMPL.spec;

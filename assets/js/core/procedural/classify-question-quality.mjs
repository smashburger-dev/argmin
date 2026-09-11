// Procedural family classify-question-quality: the seed draws a scenario from
// the curated bank and rotates the answer position via buildRotatedChoices.
// The bank keeps the curated base example verbatim as oracle (key 'base') —
// same prompt, same four option texts, same solution — plus new German
// question quartets in which exactly one formulation carries a fixed metric,
// a fixed comparison and a falsifiable prediction. parameters carry only the
// scenario key, so nothing answer-relevant leaks into instance.parameters.
// Mirrors genSvmMarginCapsule in data_ml_generators.mjs.

import { makeChoiceFamily } from '../generator_draw_kit.mjs';

import bank from '../../../../content/banks/classify-question-quality.json' with { type: 'json' };

export const QUESTION_QUALITY_CAPSULES = bank.capsules;

export const QUESTION_QUALITY_CONTRACT = {
  familyId: 'classify-question-quality',
  familyGroup: 'classify-concept',
  summary: 'Ordnet eine Fragestellung ihrer Qualitätsklasse zu.',
  taskArchetype: 'choice-diagnose',
  authorityMode: 'seeded',
  masteryEligible: false,
  caseTypes: [
    { caseId: 'question-quality-check', propertyTest: false },
  ],
  difficultyProfiles: ['intro'],
  competencyIds: ['c-research-question'],
};

const FAMILY_IMPL = makeChoiceFamily({
  contract: QUESTION_QUALITY_CONTRACT,
  capsules: QUESTION_QUALITY_CAPSULES,
  shapeError: 'Frage-Qualitäts-Parameter verletzen die Kapselform',
});

export const questionQualityCapsuleOk = FAMILY_IMPL.capsuleOk;
export const questionQualityCorrectText = FAMILY_IMPL.correctText;
export const genQuestionQualityCapsule = FAMILY_IMPL.genCapsule;
export const generateQuestionQualityFamily = FAMILY_IMPL.generate;
export const solveQuestionQualityFamily = FAMILY_IMPL.solve;
export const FAMILY_SPEC = FAMILY_IMPL.spec;

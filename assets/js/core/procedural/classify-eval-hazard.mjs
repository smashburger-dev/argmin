// Procedural family classify-eval-hazard: the seed draws a scenario from the
// curated bank and rotates the answer position via buildRotatedChoices. The
// bank keeps the curated base example verbatim as oracle (key 'base') — same
// prompt, same four option texts, same solution — plus new German scenarios
// that walk the error taxonomy (formatfehler, quellos, off-topic,
// halluziniert, falsch-faktisch, unvollständig) including the cascade
// priority of the documented rule order. parameters carry only the scenario
// key, so nothing answer-relevant leaks into instance.parameters. Mirrors
// genSvmMarginCapsule in data_ml_generators.mjs.

import { makeChoiceFamily } from '../generator_draw_kit.mjs';

import bank from '../../../../content/banks/classify-eval-hazard.json' with { type: 'json' };

export const EVAL_HAZARD_CAPSULES = bank.capsules;

export const EVAL_HAZARD_CONTRACT = {
  familyId: 'classify-eval-hazard',
  familyGroup: 'classify-concept',
  summary: 'Ordnet eine Evaluationssituation dem passenden Eval-Hazard zu.',
  taskArchetype: 'choice-diagnose',
  authorityMode: 'seeded',
  masteryEligible: false,
  caseTypes: [
    { caseId: 'eval-hazard-taxonomy', propertyTest: false },
  ],
  difficultyProfiles: ['intro'],
  competencyIds: ['c-genai-eval'],
};

const FAMILY_IMPL = makeChoiceFamily({
  contract: EVAL_HAZARD_CONTRACT,
  capsules: EVAL_HAZARD_CAPSULES,
  shapeError: 'Eval-Hazard-Parameter verletzen die Kapselform',
  keyBy: 'caseId',
});

export const evalHazardCapsuleOk = FAMILY_IMPL.capsuleOk;
export const evalHazardCorrectText = FAMILY_IMPL.correctText;
export const genEvalHazardCapsule = FAMILY_IMPL.genCapsule;
export const generateEvalHazardFamily = FAMILY_IMPL.generate;
export const solveEvalHazardFamily = FAMILY_IMPL.solve;
export const FAMILY_SPEC = FAMILY_IMPL.spec;

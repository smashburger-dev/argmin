// Procedural family classify-rag-stage: the seed draws a scenario from the
// curated bank and rotates the answer position via buildRotatedChoices. The
// bank keeps the curated base example verbatim as oracle (key 'base') — same
// prompt, same four option texts, same solution — plus new German scenarios
// that assign a processing step to its RAG stage (indexing, retrieval,
// generation, evaluation) or probe why the stages are measured separately.
// parameters carry only the scenario key, so nothing answer-relevant leaks
// into instance.parameters. Mirrors genSvmMarginCapsule in
// data_ml_generators.mjs.

import { makeChoiceFamily } from '../generator_draw_kit.mjs';

import bank from '../../../../content/banks/classify-rag-stage.json' with { type: 'json' };

export const RAG_STAGE_CAPSULES = bank.capsules;

export const RAG_STAGE_CONTRACT = {
  familyId: 'classify-rag-stage',
  familyGroup: 'classify-concept',
  summary: 'Ordnet einen Verarbeitungsschritt der passenden RAG-Stage zu.',
  taskArchetype: 'choice-diagnose',
  authorityMode: 'seeded',
  masteryEligible: false,
  caseTypes: [
    { caseId: 'rag-stage-separation', propertyTest: false },
  ],
  difficultyProfiles: ['intro'],
  competencyIds: ['c-genai-rag'],
};

const FAMILY_IMPL = makeChoiceFamily({
  contract: RAG_STAGE_CONTRACT,
  capsules: RAG_STAGE_CAPSULES,
  shapeError: 'RAG-Stage-Parameter verletzen die Kapselform',
});

export const ragStageCapsuleOk = FAMILY_IMPL.capsuleOk;
export const ragStageCorrectText = FAMILY_IMPL.correctText;
export const genRagStageCapsule = FAMILY_IMPL.genCapsule;
export const generateRagStageFamily = FAMILY_IMPL.generate;
export const solveRagStageFamily = FAMILY_IMPL.solve;
export const FAMILY_SPEC = FAMILY_IMPL.spec;

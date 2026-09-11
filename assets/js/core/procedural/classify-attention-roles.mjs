// Procedural family classify-attention-roles: the seed draws a scenario
// from the per-case curated bank and rotates the answer position via
// buildRotatedChoices. Each bank keeps its curated base example verbatim as
// oracle (key 'base') — same prompt, same four option texts, same solution —
// plus new German scenarios that probe the Q/K/V role separation:
//   - attention-role-values (intro): V carries the content that softmax
//     weights mix; scores and weights come only from Q and K.
//   - attention-role-batch (core): shape bookkeeping for (B,T,d) with
//     d_k != d_v — V decides the output feature width.
//   - attention-role-padding (stretch): a padding mask removes illegal
//     scores; V still supplies the content of the visible keys.
// parameters carry only the scenario key, so nothing answer-relevant leaks
// into instance.parameters. Mirrors genSvmMarginCapsule in
// data_ml_generators.mjs.

import { makeChoiceFamily } from '../generator_draw_kit.mjs';

import bank from '../../../../content/banks/classify-attention-roles.json' with { type: 'json' };

export const ATTENTION_ROLES_CAPSULES = bank.capsules;

export const ATTENTION_ROLES_CONTRACT = {
  familyId: 'classify-attention-roles',
  familyGroup: 'classify-concept',
  summary: 'Ordnet Tensorrollen den Aufmerksamkeitsrollen zu.',
  taskArchetype: 'single-choice',
  authorityMode: 'seeded',
  masteryEligible: false,
  caseTypes: [
    { caseId: 'attention-role-values', propertyTest: false },
    { caseId: 'attention-role-batch', propertyTest: false },
    { caseId: 'attention-role-padding', propertyTest: false },
  ],
  difficultyProfiles: ['intro', 'core', 'stretch'],
  competencyIds: ['c-dl-attention'],
};

const FAMILY_IMPL = makeChoiceFamily({
  contract: ATTENTION_ROLES_CONTRACT,
  capsules: ATTENTION_ROLES_CAPSULES,
  shapeError: 'Attention-Rollen-Parameter verletzen die Kapselform',
});

export const attentionRolesCapsuleOk = FAMILY_IMPL.capsuleOk;
export const attentionRolesCorrectText = FAMILY_IMPL.correctText;
export const genAttentionRolesCapsule = FAMILY_IMPL.genCapsule;
export const generateAttentionRolesFamily = FAMILY_IMPL.generate;
export const solveAttentionRolesFamily = FAMILY_IMPL.solve;
export const FAMILY_SPEC = FAMILY_IMPL.spec;

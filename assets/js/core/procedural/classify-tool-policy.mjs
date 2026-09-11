// Procedural family classify-tool-policy: the seed draws a scenario from the
// curated bank and rotates the answer position via buildRotatedChoices. The
// bank keeps the curated base example verbatim as oracle (key 'base') — same
// prompt, same four option texts, same solution — plus new German scenarios
// that probe the same concept (least privilege for agent tools: allowlist
// registration, argument scope, default-deny for unknown calls, technical
// enforcement over prompt requests). parameters carry only the scenario key,
// so nothing answer-relevant leaks into instance.parameters. Mirrors
// genSvmMarginCapsule in data_ml_generators.mjs.

import { makeChoiceFamily } from '../generator_draw_kit.mjs';

import bank from '../../../../content/banks/classify-tool-policy.json' with { type: 'json' };

export const TOOL_POLICY_CAPSULES = bank.capsules;

export const TOOL_POLICY_CONTRACT = {
  familyId: 'classify-tool-policy',
  familyGroup: 'classify-concept',
  summary: 'Ordnet einen Tool-Einsatz der passenden Policy-Klasse zu.',
  taskArchetype: 'choice-diagnose',
  authorityMode: 'seeded',
  masteryEligible: false,
  caseTypes: [
    { caseId: 'tool-policy-least-privilege', propertyTest: false },
  ],
  difficultyProfiles: ['intro'],
  competencyIds: ['c-genai-prototype'],
};

const FAMILY_IMPL = makeChoiceFamily({
  contract: TOOL_POLICY_CONTRACT,
  capsules: TOOL_POLICY_CAPSULES,
  shapeError: 'Tool-Policy-Parameter verletzen die Kapselform',
});

export const toolPolicyCapsuleOk = FAMILY_IMPL.capsuleOk;
export const toolPolicyCorrectText = FAMILY_IMPL.correctText;
export const genToolPolicyCapsule = FAMILY_IMPL.genCapsule;
export const generateToolPolicyFamily = FAMILY_IMPL.generate;
export const solveToolPolicyFamily = FAMILY_IMPL.solve;
export const FAMILY_SPEC = FAMILY_IMPL.spec;

// Procedural family classify-backprop-path-rule: the seed draws a scenario
// from the per-case curated bank and rotates the answer position via
// buildRotatedChoices. Each bank keeps its curated base example verbatim as
// oracle (key 'base') — same prompt, same four option texts, same solution —
// plus new German scenarios that walk the chain-rule contract:
//   - backprop-path-rule (intro): local × upstream along a single path;
//     addition belongs to forks with several paths into L.
//   - backprop-chain-rule (core): numeric two-hop chains — inner and outer
//     factor multiply, evaluated at the given point.
//   - backprop-detached-branch (stretch): stop_gradient cuts a branch out of
//     the graph; forward value survives, gradient does not.
// parameters carry only the scenario key, so nothing answer-relevant leaks
// into instance.parameters. Mirrors genSvmMarginCapsule in
// data_ml_generators.mjs.

import { makeChoiceFamily } from '../generator_draw_kit.mjs';

import bank from '../../../../content/banks/classify-backprop-path-rule.json' with { type: 'json' };

export const BACKPROP_PATH_CAPSULES = bank.capsules;

export const BACKPROP_PATH_CONTRACT = {
  familyId: 'classify-backprop-path-rule',
  familyGroup: 'classify-concept',
  summary: 'Ordnet eine Kettenregel-Situation der richtigen Verknüpfungsregel auf Pfaden und über parallele Zweige zu.',
  taskArchetype: 'choice-diagnose',
  authorityMode: 'seeded',
  masteryEligible: false,
  caseTypes: [
    { caseId: 'backprop-path-rule', propertyTest: false },
    { caseId: 'backprop-chain-rule', propertyTest: false },
    { caseId: 'backprop-detached-branch', propertyTest: false },
  ],
  difficultyProfiles: ['intro', 'core', 'stretch'],
  competencyIds: ['c-dl-autograd'],
  graderId: 'deterministic',
  activityType: 'single-choice',
};

const FAMILY_IMPL = makeChoiceFamily({
  contract: BACKPROP_PATH_CONTRACT,
  capsules: BACKPROP_PATH_CAPSULES,
  shapeError: 'Backprop-Pfad-Parameter verletzen die Kapselform',
});

export const backpropPathCapsuleOk = FAMILY_IMPL.capsuleOk;
export const backpropPathCorrectText = FAMILY_IMPL.correctText;
export const genBackpropPathCapsule = FAMILY_IMPL.genCapsule;
export const generateBackpropPathFamily = FAMILY_IMPL.generate;
export const solveBackpropPathFamily = FAMILY_IMPL.solve;
export const FAMILY_SPEC = FAMILY_IMPL.spec;

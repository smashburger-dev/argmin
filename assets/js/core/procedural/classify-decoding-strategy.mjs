// Procedural family classify-decoding-strategy: the seed draws a scenario
// from the per-case curated bank and rotates the answer position via
// buildRotatedChoices. Each bank keeps its curated base example verbatim as
// oracle (key 'base') — same prompt, same four option texts, same solution —
// plus new German scenarios that probe the decoding mechanics:
//   - greedy-decoding (intro): argmax per step, fully deterministic, stops
//     at <eos> or max_len — no sampling, no lookahead, no backtracking.
//   - decoding-temperature-low (core): logits are divided by T before
//     softmax; T<1 sharpens, T>1 flattens, T→0 becomes greedy.
//   - decoding-top-k (stretch): a hard rank filter keeps the k best tokens;
//     the surviving mass is renormalized, selection stays stochastic.
// parameters carry only the scenario key, so nothing answer-relevant leaks
// into instance.parameters. Mirrors genSvmMarginCapsule in
// data_ml_generators.mjs.

import { makeChoiceFamily } from '../generator_draw_kit.mjs';

import bank from '../../../../content/banks/classify-decoding-strategy.json' with { type: 'json' };

export const DECODING_STRATEGY_CAPSULES = bank.capsules;

export const DECODING_STRATEGY_CONTRACT = {
  familyId: 'classify-decoding-strategy',
  familyGroup: 'classify-concept',
  summary: 'Ordnet ein Decodierverhalten der passenden Decodierstrategie zu.',
  taskArchetype: 'single-choice',
  authorityMode: 'seeded',
  masteryEligible: false,
  caseTypes: [
    { caseId: 'greedy-decoding', propertyTest: false },
    { caseId: 'decoding-temperature-low', propertyTest: false },
    { caseId: 'decoding-top-k', propertyTest: false },
  ],
  difficultyProfiles: ['intro', 'core', 'stretch'],
  competencyIds: ['c-dl-inference'],
};

const FAMILY_IMPL = makeChoiceFamily({
  contract: DECODING_STRATEGY_CONTRACT,
  capsules: DECODING_STRATEGY_CAPSULES,
  shapeError: 'Decoding-Strategie-Parameter verletzen die Kapselform',
});

export const decodingStrategyCapsuleOk = FAMILY_IMPL.capsuleOk;
export const decodingStrategyCorrectText = FAMILY_IMPL.correctText;
export const genDecodingStrategyCapsule = FAMILY_IMPL.genCapsule;
export const generateDecodingStrategyFamily = FAMILY_IMPL.generate;
export const solveDecodingStrategyFamily = FAMILY_IMPL.solve;
export const FAMILY_SPEC = FAMILY_IMPL.spec;

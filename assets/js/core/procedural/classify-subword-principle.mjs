// Procedural family classify-subword-principle: the seed draws a scenario
// from the per-case curated bank and rotates the answer position via
// buildRotatedChoices. Each bank keeps its curated base example verbatim as
// oracle (key 'base') — same prompt, same four option texts, same solution —
// plus new German scenarios that probe the same subword principle:
//   - subword-oov-robustness (intro): rare/unknown words decompose into
//     known pieces down to characters — no <unk>, longer sequences.
//   - subword-unknown-piece (core): a fixed vocabulary of pieces can still
//     represent an unknown full form (no runtime vocab growth).
//   - subword-boundary-sharing (stretch): shared pieces let statistical
//     knowledge transfer between related word forms.
// parameters carry only the scenario key, so nothing answer-relevant leaks
// into instance.parameters. Mirrors genSvmMarginCapsule in
// data_ml_generators.mjs.

import { makeChoiceFamily } from '../generator_draw_kit.mjs';

import bank from '../../../../content/banks/classify-subword-principle.json' with { type: 'json' };

export const SUBWORD_CAPSULES = bank.capsules;

export const SUBWORD_CONTRACT = {
  familyId: 'classify-subword-principle',
  familyGroup: 'classify-concept',
  summary: 'Ordnet ein Tokenisierungsverhalten dem passenden Subword-Prinzip zu.',
  taskArchetype: 'single-choice',
  authorityMode: 'seeded',
  masteryEligible: false,
  caseTypes: [
    { caseId: 'subword-oov-robustness', propertyTest: false },
    { caseId: 'subword-unknown-piece', propertyTest: false },
    { caseId: 'subword-boundary-sharing', propertyTest: false },
  ],
  difficultyProfiles: ['intro', 'core', 'stretch'],
  competencyIds: ['c-dl-tokenizer'],
  graderId: 'deterministic',
  activityType: 'single-choice',
};

const FAMILY_IMPL = makeChoiceFamily({
  contract: SUBWORD_CONTRACT,
  capsules: SUBWORD_CAPSULES,
  shapeError: 'Subword-Parameter verletzen die Kapselform',
});

export const subwordCapsuleOk = FAMILY_IMPL.capsuleOk;
export const subwordCorrectText = FAMILY_IMPL.correctText;
export const genSubwordCapsule = FAMILY_IMPL.genCapsule;
export const generateSubwordFamily = FAMILY_IMPL.generate;
export const solveSubwordFamily = FAMILY_IMPL.solve;
export const FAMILY_SPEC = FAMILY_IMPL.spec;

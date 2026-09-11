// Procedural family classify-fairness-aggregation: the seed draws a scenario
// from the curated bank and rotates the answer position via
// buildRotatedChoices. Each case keeps its curated base example verbatim as
// oracle (key 'base') — same prompt, same four option texts, same solution —
// plus new German scenarios: overall-accuracy-hides-subgroups drills the
// weighted-average effect with small numeric examples, fairness-aggregation
// probes why per-group FPR reporting is mandatory. parameters carry only the
// scenario key, so nothing answer-relevant leaks into instance.parameters.
// Mirrors genSvmMarginCapsule in data_ml_generators.mjs.

import { makeChoiceFamily } from '../generator_draw_kit.mjs';

import bank from '../../../../content/banks/classify-fairness-aggregation.json' with { type: 'json' };

export const FAIRNESS_AGG_CAPSULES = bank.capsules;

export const FAIRNESS_AGG_CONTRACT = {
  familyId: 'classify-fairness-aggregation',
  familyGroup: 'classify-concept',
  summary: 'Erkennt, warum Gesamtmetriken Fehler kleiner Teilgruppen verdecken können.',
  taskArchetype: 'choice-diagnose',
  authorityMode: 'seeded',
  masteryEligible: false,
  caseTypes: [
    { caseId: 'overall-accuracy-hides-subgroups', propertyTest: false },
    { caseId: 'fairness-aggregation', propertyTest: false },
  ],
  difficultyProfiles: ['intro'],
  competencyIds: ['c-ml-erroranalysis'],
  graderId: 'deterministic',
  activityType: 'single-choice',
};

const FAMILY_IMPL = makeChoiceFamily({
  contract: FAIRNESS_AGG_CONTRACT,
  capsules: FAIRNESS_AGG_CAPSULES,
  shapeError: 'Fairness-Aggregations-Parameter verletzen die Kapselform',
  keyBy: 'caseId',
});

export const fairnessAggCapsuleOk = FAMILY_IMPL.capsuleOk;
export const fairnessAggCorrectText = FAMILY_IMPL.correctText;
export const genFairnessAggCapsule = FAMILY_IMPL.genCapsule;
export const generateFairnessAggFamily = FAMILY_IMPL.generate;
export const solveFairnessAggFamily = FAMILY_IMPL.solve;
export const FAMILY_SPEC = FAMILY_IMPL.spec;

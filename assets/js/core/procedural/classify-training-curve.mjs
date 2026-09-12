// Procedural family classify-training-curve: the seed draws a scenario
// from the per-case curated bank and rotates the answer position via
// buildRotatedChoices. Each bank keeps its curated base example verbatim as
// oracle (key 'base') plus new German curve scenarios:
//   - training-curve-diagnosis (intro): full curve lists — overfit turn,
//     underfit plateau, oscillation, divergence, healthy convergence.
//   - training-curve-overfit (core): growing gaps, memorization, remedies
//     (early stop, regularization, data) and their measurable effect.
//   - training-curve-underfit (stretch): high parallel losses, capacity
//     limits, over-regularization, feature quality, optimizer checks.
// parameters carry only the scenario key, so nothing answer-relevant leaks
// into instance.parameters. Mirrors genSvmMarginCapsule in
// data_ml_generators.mjs.

import { makeChoiceFamily } from '../generator_draw_kit.mjs';

import bank from '../../../../content/banks/classify-training-curve.json' with { type: 'json' };

export const TRAINING_CURVE_CAPSULES = bank.capsules;

export const TRAINING_CURVE_CONTRACT = {
  familyId: 'classify-training-curve',
  familyGroup: 'classify-concept',
  summary: 'Diagnostiziert Lernkurven: Overfitting-Lücke, Underfitting-Plateau, Oszillation und gesunde Konvergenz.',
  taskArchetype: 'choice-diagnose',
  authorityMode: 'seeded',
  masteryEligible: false,
  caseTypes: [
    { caseId: 'training-curve-diagnosis', propertyTest: false },
    { caseId: 'training-curve-overfit', propertyTest: false },
    { caseId: 'training-curve-underfit', propertyTest: false },
  ],
  difficultyProfiles: ['intro', 'core', 'stretch'],
  competencyIds: ['c-dl-training'],
};

const FAMILY_IMPL = makeChoiceFamily({
  contract: TRAINING_CURVE_CONTRACT,
  capsules: TRAINING_CURVE_CAPSULES,
  shapeError: 'Training-Curve-Parameter verletzen die Kapselform',
});

export const trainingCurveCapsuleOk = FAMILY_IMPL.capsuleOk;
export const trainingCurveCorrectText = FAMILY_IMPL.correctText;
export const genTrainingCurveCapsule = FAMILY_IMPL.genCapsule;
export const generateTrainingCurveFamily = FAMILY_IMPL.generate;
export const solveTrainingCurveFamily = FAMILY_IMPL.solve;
export const FAMILY_SPEC = FAMILY_IMPL.spec;

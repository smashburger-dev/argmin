// Procedural family classify-dropout-regime: the seed draws a scenario
// from the per-case curated bank and rotates the answer position via
// buildRotatedChoices. Each bank keeps its curated base example verbatim as
// oracle (key 'base') plus new German scenarios:
//   - dropout-regime (intro): what inverted dropout does in the inference
//     pass vs. the training pass — masks off, scaling already amortized.
//   - dropout-inverted-scale (core): the factor 1/(1-p) on surviving
//     activations for drawn dropout rates.
//   - dropout-eval-mode (stretch): eval-mode semantics — deterministic
//     forward, full activation, regime flags vs. no_grad.
// parameters carry only the scenario key, so nothing answer-relevant leaks
// into instance.parameters. Mirrors genSvmMarginCapsule in
// data_ml_generators.mjs.

import { makeChoiceFamily } from '../generator_draw_kit.mjs';

import bank from '../../../../content/banks/classify-dropout-regime.json' with { type: 'json' };

export const DROPOUT_REGIME_CAPSULES = bank.capsules;

export const DROPOUT_REGIME_CONTRACT = {
  familyId: 'classify-dropout-regime',
  familyGroup: 'classify-concept',
  summary: 'Ordnet ein Dropout-Verhalten dem korrekten Regime (Training vs. Eval) zu.',
  taskArchetype: 'choice-diagnose',
  authorityMode: 'seeded',
  masteryEligible: false,
  caseTypes: [
    { caseId: 'dropout-regime', propertyTest: false },
    { caseId: 'dropout-inverted-scale', propertyTest: false },
    { caseId: 'dropout-eval-mode', propertyTest: false },
  ],
  difficultyProfiles: ['intro', 'core', 'stretch'],
  competencyIds: ['c-dl-regularization'],
};

const FAMILY_IMPL = makeChoiceFamily({
  contract: DROPOUT_REGIME_CONTRACT,
  capsules: DROPOUT_REGIME_CAPSULES,
  shapeError: 'Dropout-Regime-Parameter verletzen die Kapselform',
});

export const dropoutRegimeCapsuleOk = FAMILY_IMPL.capsuleOk;
export const dropoutRegimeCorrectText = FAMILY_IMPL.correctText;
export const genDropoutRegimeCapsule = FAMILY_IMPL.genCapsule;
export const generateDropoutRegimeFamily = FAMILY_IMPL.generate;
export const solveDropoutRegimeFamily = FAMILY_IMPL.solve;
export const FAMILY_SPEC = FAMILY_IMPL.spec;

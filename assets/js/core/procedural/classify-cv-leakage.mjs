// Procedural family classify-cv-leakage: the seed draws a scenario from the
// curated bank and rotates the answer position via buildRotatedChoices. Both
// cases keep the curated base example verbatim as oracle (key 'base') plus
// the nine authored variants and new scenarios: case one walks statistic
// leakage before the split (imputation/scaling mechanisms fitted on all
// rows), case two walks target-derived feature columns in a ridge pipeline.
// parameters carry only the scenario key, so nothing answer-relevant leaks
// into instance.parameters. Mirrors classify-eval-hazard.mjs.

import { makeChoiceFamily } from '../generator_draw_kit.mjs';

import bank from '../../../../content/banks/classify-cv-leakage.json' with { type: 'json' };

export const CV_LEAKAGE_CAPSULES = bank.capsules;

export const CV_LEAKAGE_CONTRACT = {
  familyId: 'classify-cv-leakage',
  familyGroup: 'classify-concept',
  summary: 'Erkennt Daten-Leakage an der Grenze zwischen Training und Test.',
  taskArchetype: 'single-choice',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'impute-before-split' },
    { caseId: 'target-encoding-leakage' },
  ],
  difficultyProfiles: ['core'],
  competencyIds: ['c-ml-cv', 'c-ml-regularization'],
};

const FAMILY_IMPL = makeChoiceFamily({
  contract: CV_LEAKAGE_CONTRACT,
  capsules: CV_LEAKAGE_CAPSULES,
  shapeError: 'CV-Leakage-Parameter verletzen die Kapselform',
  keyBy: 'caseId',
});

export const cvLeakageCapsuleOk = FAMILY_IMPL.capsuleOk;
export const cvLeakageCorrectText = FAMILY_IMPL.correctText;
export const genCvLeakageCapsule = FAMILY_IMPL.genCapsule;
export const generateCvLeakageFamily = FAMILY_IMPL.generate;
export const solveCvLeakageFamily = FAMILY_IMPL.solve;
export const FAMILY_SPEC = FAMILY_IMPL.spec;

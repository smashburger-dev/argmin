// Procedural family classify-freeze-purpose: the seed draws a scenario from
// the curated bank and rotates the answer position via buildRotatedChoices.
// The bank keeps the curated base example verbatim as oracle (key 'base') —
// same prompt, same four option texts, same solution — plus new German
// scenarios on why a hash freeze exists: comparability of runs, loud failure
// on silent goal shifts, and the explicit non-purposes (speed, copyright,
// secrecy). parameters carry only the scenario key, so nothing
// answer-relevant leaks into instance.parameters. Mirrors
// genSvmMarginCapsule in data_ml_generators.mjs.

import { makeChoiceFamily } from '../generator_draw_kit.mjs';

import bank from '../../../../content/banks/classify-freeze-purpose.json' with { type: 'json' };

export const FREEZE_PURPOSE_CAPSULES = bank.capsules;

export const FREEZE_PURPOSE_CONTRACT = {
  familyId: 'classify-freeze-purpose',
  familyGroup: 'classify-concept',
  summary: 'Ordnet den Zweck eines eingefrorenen Prüfstands in einer deterministischen Auswertung ein.',
  taskArchetype: 'choice-diagnose',
  authorityMode: 'seeded',
  masteryEligible: false,
  caseTypes: [
    { caseId: 'freeze-purpose', propertyTest: false },
  ],
  difficultyProfiles: ['intro'],
  competencyIds: ['c-capstone-pipeline', 'c-genai-security'],
};

const FAMILY_IMPL = makeChoiceFamily({
  contract: FREEZE_PURPOSE_CONTRACT,
  capsules: FREEZE_PURPOSE_CAPSULES,
  shapeError: 'Freeze-Purpose-Parameter verletzen die Kapselform',
  keyBy: 'caseId',
});

export const freezePurposeCapsuleOk = FAMILY_IMPL.capsuleOk;
export const freezePurposeCorrectText = FAMILY_IMPL.correctText;
export const genFreezePurposeCapsule = FAMILY_IMPL.genCapsule;
export const generateFreezePurposeFamily = FAMILY_IMPL.generate;
export const solveFreezePurposeFamily = FAMILY_IMPL.solve;
export const FAMILY_SPEC = FAMILY_IMPL.spec;

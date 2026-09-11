// Procedural family classify-freeze-scope: the seed draws a scenario
// from the curated bank and rotates the answer position via
// buildRotatedChoices. The bank keeps the curated base example verbatim as
// oracle (key 'base') plus new German scenarios probing what belongs in a
// capstone scope freeze (hashes, versions, exclusions, timing).
// parameters carry only the scenario key, so nothing answer-relevant leaks
// into instance.parameters. Mirrors genSvmMarginCapsule in
// data_ml_generators.mjs.

import { makeChoiceFamily } from '../generator_draw_kit.mjs';

import bank from '../../../../content/banks/classify-freeze-scope.json' with { type: 'json' };

export const FREEZE_SCOPE_CAPSULES = bank.capsules;

export const FREEZE_SCOPE_CONTRACT = {
  familyId: 'classify-freeze-scope',
  familyGroup: 'classify-concept',
  summary: 'Ordnet Artefakte und Regeln dem Capstone-Scope-Freeze zu.',
  taskArchetype: 'choice-diagnose',
  authorityMode: 'seeded',
  masteryEligible: false,
  caseTypes: [
    { caseId: 'freeze-scope', propertyTest: false },
  ],
  difficultyProfiles: ['intro'],
  competencyIds: ['c-capstone-pipeline'],
};

const FAMILY_IMPL = makeChoiceFamily({
  contract: FREEZE_SCOPE_CONTRACT,
  capsules: FREEZE_SCOPE_CAPSULES,
  shapeError: 'Freeze-Scope-Parameter verletzen die Kapselform',
});

export const freezeScopeCapsuleOk = FAMILY_IMPL.capsuleOk;
export const freezeScopeCorrectText = FAMILY_IMPL.correctText;
export const genFreezeScopeCapsule = FAMILY_IMPL.genCapsule;
export const generateFreezeScopeFamily = FAMILY_IMPL.generate;
export const solveFreezeScopeFamily = FAMILY_IMPL.solve;
export const FAMILY_SPEC = FAMILY_IMPL.spec;

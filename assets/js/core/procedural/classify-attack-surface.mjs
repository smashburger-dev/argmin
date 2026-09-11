// Procedural family classify-attack-surface: the seed draws a scenario from
// the curated bank and rotates the answer position via buildRotatedChoices.
// The bank keeps the curated base example verbatim as oracle (key 'base') —
// same prompt, same four option texts, same solution — plus new German
// incident descriptions that classify an attack by its surface (trust
// boundary), separating entry method from damage channel. parameters carry
// only the scenario key, so nothing answer-relevant leaks into
// instance.parameters. Mirrors genSvmMarginCapsule in
// data_ml_generators.mjs.

import { makeChoiceFamily } from '../generator_draw_kit.mjs';

import bank from '../../../../content/banks/classify-attack-surface.json' with { type: 'json' };

export const ATTACK_SURFACE_CAPSULES = bank.capsules;

export const ATTACK_SURFACE_CONTRACT = {
  familyId: 'classify-attack-surface',
  familyGroup: 'classify-concept',
  summary: 'Ordnet eine Angriffsbeschreibung der passenden Angriffsfläche zu.',
  taskArchetype: 'choice-diagnose',
  authorityMode: 'seeded',
  masteryEligible: false,
  caseTypes: [
    { caseId: 'attack-surface-taxonomy', propertyTest: false },
  ],
  difficultyProfiles: ['intro'],
  competencyIds: ['c-genai-security'],
};

const FAMILY_IMPL = makeChoiceFamily({
  contract: ATTACK_SURFACE_CONTRACT,
  capsules: ATTACK_SURFACE_CAPSULES,
  shapeError: 'Angriffsflächen-Parameter verletzen die Kapselform',
});

export const attackSurfaceCapsuleOk = FAMILY_IMPL.capsuleOk;
export const attackSurfaceCorrectText = FAMILY_IMPL.correctText;
export const genAttackSurfaceCapsule = FAMILY_IMPL.genCapsule;
export const generateAttackSurfaceFamily = FAMILY_IMPL.generate;
export const solveAttackSurfaceFamily = FAMILY_IMPL.solve;
export const FAMILY_SPEC = FAMILY_IMPL.spec;

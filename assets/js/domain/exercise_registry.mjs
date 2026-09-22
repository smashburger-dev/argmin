import { createFamilyRegistry, familyHint, familyMaxHints as baseFamilyMaxHints, familyIdTokens, staticFamilySpec } from './family_registry.mjs';
import {
  GIT_OPERATION_CONTRACT,
  generateGitOperationFamily,
  solveGitOperation,
} from '../core/foundations_fresh_generators.mjs';
import { FOUNDATIONS_CHOICE_FAMILY_SPECS } from '../core/foundations_choice_families.mjs';
import { FOUNDATIONS_CONSTRUCT_SPECS } from './foundations_construct_registry.mjs';
import { TRACE_FAMILY_SPECS } from './foundations_trace_registry.mjs';
import { LINALG_FAMILY_SPECS } from './foundations_linalg_registry.mjs';
import { DATA_ML_FAMILY_SPECS } from '../core/data_ml_families.mjs';
import { PROCEDURAL_FAMILY_SPECS } from './procedural_registry.mjs';

export { createFamilyRegistry, familyHint, familyIdTokens };

// The instantiated exercise does not carry `summary` — the level-1 hint is
// the family contract's summary, which views resolve separately (same as
// they do for familyHint). familyMaxHints(instance) therefore resolves it
// from the registry by familyId so callers can pass the raw instance; an
// explicit instance.summary wins. Semantics: number of sequential hint
// levels familyHint actually serves under a neutral (pre-attempt) context
// — 1 + authored hints + level-2 activity fallback coverage, 0 when even
// level 1 is dead. Context-refined hints (e.g. numeric up/down after a
// wrong answer) are not counted: a floor, not a ceiling.
export const familyMaxHints = (instance) => baseFamilyMaxHints({
  ...instance,
  summary: instance?.summary ?? EXERCISE_FAMILIES.get(instance?.familyId)?.summary,
});

const jsFamilySpecs = [
  {
    ...GIT_OPERATION_CONTRACT,
    generate: generateGitOperationFamily,
    solve: solveGitOperation,
  },
  // S4D1: sieben statische choice-diagnose-Familien (Foundations).
  ...FOUNDATIONS_CHOICE_FAMILY_SPECS.map(({ contract, generate, solve }) => ({ ...contract, generate, solve })),
  // S4D1: zehn Konstruktions- und Prüf-Familien (Foundations).
  ...FOUNDATIONS_CONSTRUCT_SPECS,
  // S4D1: sechs Trace-Familien (Foundations).
  ...TRACE_FAMILY_SPECS,
  // S4D5: elf Linalg-Familien.
  ...LINALG_FAMILY_SPECS,
  // S4D8: zwanzig Daten-/ML-Familien.
  ...DATA_ML_FAMILY_SPECS,
  // Prozedurale Einzel-Module (pro Familie eine Datei in core/procedural/).
  ...PROCEDURAL_FAMILY_SPECS,
];

export let EXERCISE_FAMILIES = createFamilyRegistry(jsFamilySpecs);

export function configureExerciseFamilies(staticDocs = []) {
  EXERCISE_FAMILIES = createFamilyRegistry([
    ...jsFamilySpecs,
    ...staticDocs.filter((doc) => doc?.contract).map(staticFamilySpec),
  ]);
  return EXERCISE_FAMILIES;
}

export const instantiate = (familyId, seed, difficulty, caseId) => (
  EXERCISE_FAMILIES.instantiate(familyId, seed, difficulty, caseId)
);

// S4D0: Familieninstanz -> S3-Schreibpfad. definitionId ist stabil je Fall
// (Familie:Fall); instanceId baut der Store als definitionId:cycleId:seed.
// Ein Fall teilt sich die Review-Gruppe über Profile hinweg: ein Reveal
// disqualifiziert den Fall in allen Profilen (beabsichtigt, gleiche
// Fallfrage). Hinweise/Offenlegung für Varianten kommen je Domäne (S4D1+).
export function familyEventInput(instance, extra = {}) {
  if (!instance || typeof instance.familyId !== 'string' || typeof instance.caseId !== 'string') {
    throw new Error('Familieninstanz braucht familyId und caseId');
  }
  const definitionId = `${instance.familyId}:${instance.caseId}`;
  return {
    activityId: instance.familyId,
    definitionId,
    exerciseId: definitionId,
    competencyIds: [...(instance.competencyIds || [])],
    seed: instance.seed ?? 0,
    masteryEligible: instance.masteryEligible === true,
    ...(extra.context ? { context: String(extra.context) } : {}),
  };
}
export const grade = (instance, answer) => EXERCISE_FAMILIES.grade(instance, answer);
export const assertFamilyPlacement = (placement) => EXERCISE_FAMILIES.assertFamilyPlacement(placement);

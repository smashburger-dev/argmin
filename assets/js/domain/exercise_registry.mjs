import { instantiateLegacyExercise } from '../core/legacy_exercise_adapter.mjs';
import { createFamilyRegistry, familyHint, familyIdTokens } from './family_registry.mjs';
import {
  GIT_OPERATION_CONTRACT,
  generateGitOperationFamily,
  solveGitOperation,
} from '../core/foundations_fresh_generators.mjs';
import { FOUNDATIONS_CHOICE_FAMILY_SPECS } from '../core/foundations_choice_families.mjs';
import { FOUNDATIONS_CONSTRUCT_SPECS } from './foundations_construct_registry.mjs';
import { TRACE_FAMILY_SPECS } from './foundations_trace_registry.mjs';
import { LINALG_FAMILY_SPECS } from './foundations_linalg_registry.mjs';

export { createFamilyRegistry, familyHint, familyIdTokens };

export const EXERCISE_FAMILIES = createFamilyRegistry([
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
  // S4D5: Skalarprodukt-Familie (linalg).
  ...LINALG_FAMILY_SPECS,
]);

export const instantiate = (familyId, seed, difficulty, caseId) => (
  EXERCISE_FAMILIES.instantiate(familyId, seed, difficulty, caseId)
);

// S4D0: Familieninstanz -> S3-Schreibpfad. definitionId ist stabil je Fall
// (Familie:Fall); instanceId baut der Store als definitionId:cycleId:seed.
// Ein Fall teilt sich die Review-Gruppe über Profile hinweg: ein Reveal
// disqualifiziert den Fall in allen Profilen (beabsichtigt, gleiche
// Fallfrage). Hinweise/Offenlegung für Varianten kommen je Domäne (S4D1+).
export function familyEventInput(instance) {
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
  };
}
export const grade = (instance, answer) => EXERCISE_FAMILIES.grade(instance, answer);
export const assertFamilyPlacement = (placement) => EXERCISE_FAMILIES.assertFamilyPlacement(placement);

export class ExerciseRegistry {
  constructor(definitions) {
    this.byId = new Map();
    for (const definition of definitions) {
      if (!definition?.definitionId || this.byId.has(definition.definitionId)) {
        throw new Error(`fehlende oder doppelte Definition ${definition?.definitionId || '(leer)'}`);
      }
      this.byId.set(definition.definitionId, definition);
    }
  }

  get size() {
    return this.byId.size;
  }

  get(definitionId) {
    return this.byId.get(definitionId) || null;
  }

  forCompetency(competencyId) {
    return [...this.byId.values()]
      .filter((definition) => definition.competencyIds.includes(competencyId))
      .sort((a, b) => a.definitionId.localeCompare(b.definitionId));
  }

  instantiate(definitionId, seed) {
    const definition = this.byId.get(definitionId);
    if (!definition) throw new Error(`Unbekannte Definition ${definitionId}`);
    return instantiateLegacyExercise(definition, seed ?? definition.deterministicSeed);
  }
}

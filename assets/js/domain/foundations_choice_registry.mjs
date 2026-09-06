// S4D1 Choice-Registry: Einstiegspunkt für die sieben statischen
// choice-diagnose-Familien aus foundations_choice_families.mjs.
//
// Dünner Adapter über die zentrale Registry (exercise_registry.mjs):
// keine eigene Runtime, damit es genau eine Familien-Semantik gibt.
// Die Vollzugs-Entscheidung (welche Familie wohin mergt) bleibt S4D.
import {
  createFamilyRegistry,
  familyIdTokens,
} from './family_registry.mjs';
import { FOUNDATIONS_CHOICE_FAMILY_SPECS } from '../core/foundations_choice_families.mjs';

export { createFamilyRegistry, familyIdTokens };

export const FOUNDATIONS_CHOICE_FAMILIES = createFamilyRegistry(
  FOUNDATIONS_CHOICE_FAMILY_SPECS.map(({ contract, generate, solve }) => ({ ...contract, generate, solve })),
);

export const instantiate = (familyId, seed, difficulty, caseId) => (
  FOUNDATIONS_CHOICE_FAMILIES.instantiate(familyId, seed, difficulty, caseId)
);

export const grade = (instance, answer) => FOUNDATIONS_CHOICE_FAMILIES.grade(instance, answer);
export const assertFamilyPlacement = (placement) => FOUNDATIONS_CHOICE_FAMILIES.assertFamilyPlacement(placement);

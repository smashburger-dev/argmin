// S4D1 Trace-Familien: eigene Family-Registry für die sechs
// Foundations-Trace-Familien. Ruft nur createFamilyRegistry auf — die
// zentrale EXERCISE_FAMILIES-Registry bleibt unverändert.

import { createFamilyRegistry } from './family_registry.mjs';
import {
  TRACE_FAMILY_CONTRACTS,
  TRACE_FAMILY_RUNTIME,
} from '../core/foundations_trace_families.mjs';

export const TRACE_FAMILY_SPECS = TRACE_FAMILY_CONTRACTS.map((contract) => ({
  ...contract,
  generate: TRACE_FAMILY_RUNTIME[contract.familyId].generate,
  solve: TRACE_FAMILY_RUNTIME[contract.familyId].solve,
}));

export const TRACE_FAMILIES = createFamilyRegistry(TRACE_FAMILY_SPECS);

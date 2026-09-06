// S4D1 Konstrukt-Familien: Registry der Foundations-Konstruktions- und
// Prüf-Familien. Enthält AUSSCHLIESSLICH createFamilyRegistry([...]) über
// die Verträge, Generatoren und Solver aus
// assets/js/core/foundations_construct_families.mjs (kein UI, kein Ledger,
// kein Build-, kein Content-Eingriff).

import { createFamilyRegistry } from './family_registry.mjs';
import {
  LINEAR_ISOLATE_CONTRACT,
  generateLinearIsolateFamily,
  solveLinearIsolate,
  POWER_LOG_CONTRACT,
  generatePowerLogFamily,
  solvePowerLogExponent,
  EXPRESSION_CANONICAL_CONTRACT,
  generateExpressionCanonicalFamily,
  solveExpressionCanonical,
  VALIDATE_COUNT_CONTRACT,
  generateValidateCountFamily,
  solveValidateCount,
  REGRESSION_SUITE_CONTRACT,
  generateRegressionSuiteFamily,
  solveRegressionSuite,
  TEST_STRUCTURE_CONTRACT,
  generateTestStructureFamily,
  solveTestStructure,
  GUARDED_LOOP_CONTRACT,
  generateGuardedLoopFamily,
  solveGuardedLoop,
  REQUIRED_FIELD_CONTRACT,
  generateRequiredFieldFamily,
  solveRequiredField,
  BUGFIX_WORKFLOW_CONTRACT,
  generateBugfixWorkflowFamily,
  solveBugfixWorkflow,
  TEST_DESIGN_COVERAGE_CONTRACT,
  generateTestDesignCoverageFamily,
  solveTestDesignCoverage,
} from '../core/foundations_construct_families.mjs';

export const FOUNDATIONS_CONSTRUCT_SPECS = [
  { ...LINEAR_ISOLATE_CONTRACT, generate: generateLinearIsolateFamily, solve: solveLinearIsolate },
  { ...POWER_LOG_CONTRACT, generate: generatePowerLogFamily, solve: solvePowerLogExponent },
  { ...EXPRESSION_CANONICAL_CONTRACT, generate: generateExpressionCanonicalFamily, solve: solveExpressionCanonical },
  { ...VALIDATE_COUNT_CONTRACT, generate: generateValidateCountFamily, solve: solveValidateCount },
  { ...REGRESSION_SUITE_CONTRACT, generate: generateRegressionSuiteFamily, solve: solveRegressionSuite },
  { ...TEST_STRUCTURE_CONTRACT, generate: generateTestStructureFamily, solve: solveTestStructure },
  { ...GUARDED_LOOP_CONTRACT, generate: generateGuardedLoopFamily, solve: solveGuardedLoop },
  { ...REQUIRED_FIELD_CONTRACT, generate: generateRequiredFieldFamily, solve: solveRequiredField },
  { ...BUGFIX_WORKFLOW_CONTRACT, generate: generateBugfixWorkflowFamily, solve: solveBugfixWorkflow },
  { ...TEST_DESIGN_COVERAGE_CONTRACT, generate: generateTestDesignCoverageFamily, solve: solveTestDesignCoverage },
];

export const FOUNDATIONS_CONSTRUCT_FAMILIES = createFamilyRegistry(FOUNDATIONS_CONSTRUCT_SPECS);

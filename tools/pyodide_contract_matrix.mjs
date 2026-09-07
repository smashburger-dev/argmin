#!/usr/bin/env node
// Pyodide contract matrix (ADR-0013 inherited-debt A):
// inventories every pyodide-graded exercise definition across the authored
// week packs, groups them into unique worker test contracts, and writes a
// machine-readable matrix. The browser smoke (tests/e2e/pyodide-contracts.spec.ts)
// turns this matrix into tests/e2e/pyodide-contract-receipt.json; the node test
// tests/pyodide_contract_matrix.test.mjs refuses untested families.
//
// A unique test contract is the full protocol-relevant shape: grader, package
// list, workspace shape (files/entrypoint), and where the test code comes from.

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPythonTests, buildSympyEquivalenceRun } from '../assets/js/core/graders.js';
import { compileContent } from './compile_content.mjs';
import { EXERCISE_FAMILIES } from '../assets/js/domain/exercise_registry.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export function contractKey(exercise) {
  const parameters = exercise.parameters || {};
  return JSON.stringify({
    grader: exercise.grader,
    packages: parameters.packages || [],
    hasWorkspaceFiles: Boolean(parameters.files?.length),
    hasEntrypoint: Boolean(parameters.entrypoint),
    testSource: typeof parameters.tests === 'string' && parameters.tests.trim() ? 'inline' : 'fixed',
    hasReferenceSolver: Boolean(exercise.expectedAnswer?.referenceSolver),
  });
}

export function buildPyodideContractMatrix(projectRoot = root) {
  const definitions = [];
  const bundle = compileContent({ projectRoot, profile: 'public' });
  for (const activity of bundle.familyActivities) {
    const instance = EXERCISE_FAMILIES.instantiate(
      activity.familyId,
      activity.seed,
      activity.difficulty,
      activity.caseId,
    );
    if (instance.graderId !== 'pyodide' && instance.graderId !== 'pyodide-sympy') continue;
    definitions.push(buildDefinition(activity, instance));
  }
  for (const definition of definitions) {
    definition.verificationHash = createHash('sha256').update(JSON.stringify({
      definitionId: definition.definitionId,
      packages: definition.packages,
      tests: definition.tests,
      referenceSolver: definition.referenceSolver,
      contract: definition.contract,
    })).digest('hex');
  }
  const contracts = [];
  for (const definition of definitions) {
    let entry = contracts.find((item) => item.contractId === definition.contract);
    if (!entry) {
      entry = { contractId: definition.contract, definitionIds: [] };
      contracts.push(entry);
    }
    entry.definitionIds.push(definition.definitionId);
  }
  return { schemaVersion: 1, generatedFrom: 'content/families/*.json', definitionCount: definitions.length, contractCount: contracts.length, contracts, definitions };
}

function buildDefinition(activity, instance) {
  const base = { definitionId: activity.definitionId, competencyIds: activity.competencyIds, contract: contractKey({ ...instance, grader: instance.graderId }) };
  if (instance.graderId === 'pyodide-sympy') {
    const run = buildSympyEquivalenceRun(instance.expectedAnswer?.expression ?? '', instance.expectedAnswer?.expression ?? '');
    return { ...base, packages: run.packages, tests: run.tests, referenceSolver: run.code };
  }
  return { ...base, packages: instance.parameters?.packages || [], tests: buildPythonTests({ ...instance, grader: instance.graderId }), referenceSolver: instance.expectedAnswer?.referenceSolver || instance.fullSolution || '' };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const out = process.argv[2] || join(root, 'tests/e2e/pyodide-contract-matrix.json');
  const matrix = buildPyodideContractMatrix();
  writeFileSync(out, JSON.stringify(matrix, null, 2) + '\n');
  console.log(`Pyodide-Vertragsmatrix: ${matrix.definitionCount} Definitionen in ${matrix.contractCount} Verträgen -> ${out}`);
}

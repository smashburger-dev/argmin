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
import { catalogRoot, discoverJson } from './content_roots.mjs';

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
  const contentRoot = join(projectRoot, 'content');
  const catalog = JSON.parse(readFileSync(join(contentRoot, 'catalog.json'), 'utf8'));
  const definitions = [];
  for (const packFile of catalog.legacy.exerciseFiles) {
    const pack = JSON.parse(readFileSync(join(contentRoot, packFile), 'utf8'));
    for (const exercise of pack.exercises || []) {
      // pyodide-sympy runs the same module-worker contract (graders.js
      // registers it with needsWorker: true) — excluding it here would
      // leave 3 definitions without browser-receipt coverage.
      if (exercise.grader !== 'pyodide' && exercise.grader !== 'pyodide-sympy') continue;
      // pyodide-sympy definitions verify through the exact equivalence
      // program the grader ships: the reference run proves the expected
      // expression equivalent to itself, the spec's broken run proves a
      // non-sympy program cannot fake the receipt.
      if (exercise.grader === 'pyodide-sympy') {
        const run = buildSympyEquivalenceRun(exercise.expectedAnswer?.expression ?? '', exercise.expectedAnswer?.expression ?? '');
        definitions.push({
          definitionId: exercise.exerciseId,
          weekId: pack.weekId,
          competencyIds: exercise.skillIds || [],
          packages: run.packages,
          tests: run.tests,
          referenceSolver: run.code,
          contract: contractKey(exercise),
        });
        continue;
      }
      definitions.push({
        definitionId: exercise.exerciseId,
        weekId: pack.weekId,
        competencyIds: exercise.skillIds || [],
        packages: exercise.parameters?.packages || [],
        tests: buildPythonTests(exercise),
        referenceSolver: exercise.expectedAnswer?.referenceSolver || exercise.fullSolution || '',
        contract: contractKey(exercise),
      });
    }
  }
  // Authored exercise definitions carry the same worker contract under
  // graderId; without them the matrix would under-report pyodide families.
  // Their solutions are stored as HTML in fullSolution — extract the code.
  const htmlToCode = (html) => String(html || '')
    .replace(/<pre[^>]*>/gi, '').replace(/<code[^>]*>/gi, '').replace(/<\/code>/gi, '').replace(/<\/pre>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
    .replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').trim();
  for (const definitionFile of discoverJson(contentRoot, catalogRoot(catalog, 'exerciseDefinitions'))) {
    const definition = JSON.parse(readFileSync(join(contentRoot, definitionFile), 'utf8'));
    if (definition.graderId !== 'pyodide' && definition.graderId !== 'pyodide-sympy') continue;
    if (definition.graderId === 'pyodide-sympy') {
      const run = buildSympyEquivalenceRun(definition.expectedAnswer?.expression ?? '', definition.expectedAnswer?.expression ?? '');
      definitions.push({
        definitionId: definition.definitionId,
        weekId: definition.legacyWeekId || null,
        competencyIds: definition.competencyIds || [],
        packages: run.packages,
        tests: run.tests,
        referenceSolver: run.code,
        contract: contractKey({ ...definition, grader: definition.graderId }),
      });
      continue;
    }
    definitions.push({
      definitionId: definition.definitionId,
      weekId: definition.legacyWeekId || null,
      competencyIds: definition.competencyIds || [],
      packages: definition.parameters?.packages || [],
      tests: buildPythonTests({ ...definition, grader: definition.graderId }),
      referenceSolver: definition.expectedAnswer?.referenceSolver
        || htmlToCode(definition.fullSolution)
        || '',
      contract: contractKey({ ...definition, grader: definition.graderId }),
    });
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
  return { schemaVersion: 1, generatedFrom: 'content/exercises/*.json', definitionCount: definitions.length, contractCount: contracts.length, contracts, definitions };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const out = process.argv[2] || join(root, 'tests/e2e/pyodide-contract-matrix.json');
  const matrix = buildPyodideContractMatrix();
  writeFileSync(out, JSON.stringify(matrix, null, 2) + '\n');
  console.log(`Pyodide-Vertragsmatrix: ${matrix.definitionCount} Definitionen in ${matrix.contractCount} Verträgen -> ${out}`);
}

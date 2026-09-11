import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPyodideContractMatrix } from '../tools/pyodide_contract_matrix.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const receiptPath = join(root, 'tests/e2e/pyodide-contract-receipt.json');

test('contract matrix covers exactly the authored pyodide definitions', () => {
  const matrix = buildPyodideContractMatrix(root);
  assert.ok(matrix.definitionCount > 0, 'no pyodide definitions found');
  const ids = matrix.definitions.map((item) => item.definitionId);
  assert.equal(new Set(ids).size, ids.length, 'duplicate definition ids in matrix');
  for (const definition of matrix.definitions) {
    assert.ok(definition.tests.trim(), `${definition.definitionId} has no test code`);
    assert.ok(definition.referenceSolver.trim(), `${definition.definitionId} has no reference solver`);
    const allowed = new Set(['numpy', 'sympy', 'mpmath']);
    for (const pkg of definition.packages) assert.ok(allowed.has(pkg), `${definition.definitionId} uses non-whitelisted package ${pkg}`);
  }
});

test('browser receipt proves every pyodide family ran in a real worker', (t) => {
  // A missing receipt means the browser proof has not run in this checkout
  // yet. Skip instead of fail so a clean checkout passes its unit gates, but
  // a skip is "proof not executed", never a passed browser verification.
  if (!existsSync(receiptPath)) {
    t.skip('tests/e2e/pyodide-contract-receipt.json fehlt: Browserbeweis noch nicht ausgeführt (npm run test:e2e)');
    return;
  }
  const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
  const matrix = buildPyodideContractMatrix(root);
  if (receipt.definitionCount !== matrix.definitionCount) {
    t.skip('Browserbeleg stammt aus einem älteren Familienkatalog');
    return;
  }
  assert.equal(receipt.schemaVersion, 1);
  assert.equal(receipt.browser, 'chromium');
  assert.ok(['dev', 'build'].includes(receipt.artifact));
  assert.equal(
    receipt.runtimeHash, matrix.runtimeHash,
    'Browserbeleg stammt aus einer anderen Laufzeit — npm run test:e2e erneut ausführen',
  );
  assert.equal(receipt.definitionCount, matrix.definitionCount);
  assert.equal(receipt.contractCount, matrix.contractCount);
  const byId = new Map(receipt.results.map((item) => [item.definitionId, item]));
  assert.deepEqual([...byId.keys()].sort(), matrix.definitions.map((item) => item.definitionId).sort(), 'browser receipt definition set is stale');
  for (const definition of matrix.definitions) {
    const entry = byId.get(definition.definitionId);
    assert.match(definition.verificationHash, /^[a-f0-9]{64}$/);
    assert.equal(entry.verificationHash, definition.verificationHash, `${definition.definitionId}: browser receipt verification hash is stale`);
    assert.equal(entry.referencePassed, true, `${definition.definitionId}: reference solver did not pass in the browser worker`);
    assert.equal(entry.brokenRejected, true, `${definition.definitionId}: broken solution was not rejected in the browser worker`);
    assert.ok(entry.referenceRun.tests > 0, `${definition.definitionId}: worker returned no test results`);
  }
  assert.equal(receipt.timeoutProbe.phase, 'timeout', 'timeout path not exercised');
  assert.equal(receipt.restartProbe.ok, true, 'worker restart path not exercised');
});

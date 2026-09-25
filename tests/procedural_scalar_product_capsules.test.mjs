// Procedural cases of formula-scalar-product: scalar-loop-output
// (predict-output) + column-vector-authored (vector) capsule gates.
// Run: node --test tests/procedural_scalar_product_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  generateScalarProductFamily,
  solveScalarProduct,
  SCALAR_PRODUCT_CONTRACT,
} from '../assets/js/core/foundations_linalg_families.mjs';
import { solveLinear2 } from '../assets/js/core/linalg_generators.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const doc = JSON.parse(readFileSync(join(root, 'content/families/formula-scalar-product.json'), 'utf8'));
const fixture = JSON.parse(readFileSync(join(root, 'tests/fixtures/scalar-product-literals.json'), 'utf8'));
const GEN_CASES = ['scalar-loop-output', 'column-vector-authored'];

const gen = (seed, caseId, difficulty = 'core') => generateScalarProductFamily({ seed, caseId, difficulty });

test('anchor: authored bodies stay complete, variants removed, contract null', () => {
  assert.equal(doc.contract, null);
  for (const caseId of GEN_CASES) {
    const body = doc.cases.find((entry) => entry.caseId === caseId);
    assert.ok(body, `${caseId}: anchor fehlt`);
    assert.equal(body.variants, undefined, `${caseId}: variants entfernt`);
    assert.ok(body.prompt.length > 20 && body.fullSolution.length > 20, `${caseId}: Texte erhalten`);
  }
});

test('fixture parity: all 20 authored instances reproduce under the generator semantics', () => {
  for (const entry of fixture['scalar-loop-output']) {
    const { A, x } = entry.parameters;
    const output = `[${A[0][0] * x[0] + A[0][1] * x[1]}, ${A[1][0] * x[0] + A[1][1] * x[1]}]`;
    assert.equal(output, entry.expected.output, `scalar-loop: ${JSON.stringify(entry.parameters)}`);
    // the drawn literals satisfy the generator's accepted space
    assert.ok(A.flat().every((v) => Number.isInteger(v) && v >= -5 && v <= 5));
    assert.ok(x.every((v) => Number.isInteger(v) && v >= -5 && v <= 5));
    assert.ok(!A.flat().every((v) => v === 0) && !(x[0] === 0 && x[1] === 0), 'wantShape accepted');
  }
  for (const entry of fixture['column-vector-authored']) {
    const { A, b } = entry.parameters;
    const solution = solveLinear2(A, b).map((v) => (v === 0 ? 0 : v));
    assert.deepEqual(solution, entry.expected.solution, `column: ${JSON.stringify(entry.parameters)}`);
    assert.equal(A[0][0] * solution[0] + A[0][1] * solution[1], b[0]);
    assert.equal(A[1][0] * solution[0] + A[1][1] * solution[1], b[1]);
    assert.ok(solution.every((v) => Math.abs(v) <= 9), 'authored x range');
    assert.ok(b.every((v) => Math.abs(v) <= 20), 'authored b bound');
  }
});

test('scalar-loop: emitted snippet reproduces output, solver agrees', () => {
  for (let seed = 0; seed < 200; seed += 1) {
    const g = gen(seed, 'scalar-loop-output');
    const p = g.parameters;
    assert.equal(g.activityType, 'predict-output');
    assert.equal(g.graderId, 'deterministic');
    assert.equal(p.form, 'scalar-loop-rows');
    assert.ok(p.snippet.includes(`A = ((${p.A[0][0]}, ${p.A[0][1]}), (${p.A[1][0]}, ${p.A[1][1]}))`), `${seed}: snippet carries draw`);
    assert.ok(p.snippet.includes(`x = (${p.x[0]}, ${p.x[1]})`), `${seed}: x literal`);
    const want = `[${p.A[0][0] * p.x[0] + p.A[0][1] * p.x[1]}, ${p.A[1][0] * p.x[0] + p.A[1][1] * p.x[1]}]`;
    assert.equal(g.expected.output, want, `${seed}: expected`);
    assert.deepEqual(solveScalarProduct(p), { output: want }, `${seed}: solver`);
    assert.ok(!g.prompt.includes(want), `${seed}: output not leaked in prompt`);
    assert.ok(!p.A.flat().every((v) => v === 0), `${seed}: A non-trivial`);
    assert.ok(!(p.x[0] === 0 && p.x[1] === 0), `${seed}: x non-trivial`);
  }
});

test('column-vector: det nonzero, b bound, solver reproduces integer pair', () => {
  for (let seed = 0; seed < 200; seed += 1) {
    const g = gen(seed, 'column-vector-authored');
    const p = g.parameters;
    assert.equal(g.activityType, 'vector');
    assert.equal(g.graderId, 'deterministic');
    assert.deepEqual(g.competencyIds, ['c-linalg-systems']);
    const det = p.A[0][0] * p.A[1][1] - p.A[0][1] * p.A[1][0];
    assert.notEqual(det, 0, `${seed}: det`);
    assert.ok(Math.abs(p.b[0]) <= 20 && Math.abs(p.b[1]) <= 20, `${seed}: b bound`);
    const solved = solveLinear2(p.A, p.b).map((v) => (v === 0 ? 0 : v));
    assert.deepEqual(g.expected.solution, solved, `${seed}: expected`);
    assert.deepEqual(solveScalarProduct(p), { solution: solved }, `${seed}: solver`);
    // prompt carries the columns, not the solution
    assert.ok(g.prompt.includes(`(${p.A[0][0]}, ${p.A[1][0]})`), `${seed}: col1 in prompt`);
    assert.ok(g.prompt.includes(`(${p.b[0]}, ${p.b[1]})`), `${seed}: target in prompt`);
  }
});

test('distinct floor: at least 60 distinct instances per case over 200 seeds', () => {
  for (const caseId of GEN_CASES) {
    const seen = new Set();
    for (let seed = 0; seed < 200; seed += 1) {
      seen.add(JSON.stringify(gen(seed, caseId).parameters));
    }
    assert.ok(seen.size >= 60, `${caseId}: nur ${seen.size} distinct`);
  }
});

test('determinism + dispatch + contract', () => {
  for (const caseId of GEN_CASES) {
    for (let seed = -10; seed < 10; seed += 1) {
      assert.deepEqual(gen(seed, caseId), gen(seed, caseId), `${caseId}:${seed}`);
    }
    const spec = SCALAR_PRODUCT_CONTRACT.caseTypes.find((entry) => entry.caseId === caseId);
    assert.equal(spec.propertyTest, undefined, `${caseId}: pool-eligible`);
  }
  // remaining static cases still route through the kit
  const staticCase = doc.cases.find((entry) => entry.caseId === 'matmul-entry-w05-e1');
  assert.ok(staticCase, 'static anchor bleibt');
  const seeded = gen(0, 'matmul-entry-seeded');
  assert.equal(seeded.parameters.form, 'matmul-entry');
  // error paths
  assert.throws(() => gen(0, 'nope'), /Unbekannter Fall|nicht gefunden|fehlt/i);
  assert.throws(() => gen(0.5, 'scalar-loop-output'), /ganze Zahl/);
  assert.throws(() => solveScalarProduct({ caseId: 'scalar-loop-output', form: 'scalar-loop-rows' }), TypeError);
});
